import config from './config';
import md5 = require('md5');
import * as express from 'express';
import * as redis from 'redis';
import * as morgan from 'morgan';
import * as mysql2 from 'mysql2';
import * as exec from 'promised-exec';

const mysql = mysql2.createConnection(config.mysql);

function querySQL<T>(query: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        mysql.query(query, args, function (err: any, results: any) {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

const maxWorkers = 3;
let currentWorkers = 0;

const queue: any[] = [];
function enqueue(func: () => Promise<any>) {
    return new Promise(async (resolve, reject) => {
        if (currentWorkers >= maxWorkers) {
            queue.push(async function () {
                await func();
                resolve();
            });
        } else {
            currentWorkers += 1;
            await func();
            currentWorkers -= 1;
            resolve();
        }
    });
}

async function workOnQueue() {
    if (queue.length && currentWorkers < maxWorkers) {
        console.info(`Queue is [${queue.length}] items long`);
        currentWorkers += 1;
        await queue.pop()();
        currentWorkers -= 1;
        workOnQueue();
        console.info(`Queue is [${queue.length}] items long`);
    } else {
        setTimeout(workOnQueue, 100);
    }
}
workOnQueue();

const rClient = redis.createClient();

rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});

const app = express();

app.use(morgan('dev'));

app.use(express.static('dist/client'));
app.use(express.static('images'));

let bboxes: any = {
    gbr: [-13.291912, 2.763414, 49.731026, 61.046795],
    ger: [-10.9333000000, 53.6500000000, 2.5000000000, 59.2333000000]
};

let styles: any = {
    TMIN_2maboveground: 'temp',
    TMAX_2maboveground: 'temp',
    TMP_2maboveground: 'temp',
    PRES_surface: 'pressure'
};

app.get('/api/:model/:parameter/:run/:step/:region.png', async (req, res) => {
    const { model, parameter, run, step, region } = req.params;
    const bbox = bboxes[region];
    const style = styles[parameter];

    // res.redirect(`http://maps.fastweather.app/map/${style}/${model}/${run}/${step}/${parameter}.png?bbox=${bbox}&width=1280&height=962`);
    let fileExists = false;
    try {
        const imgPath = `${config.imgDir}/${model}/${run}/${step}/${parameter}/${region}.png`;
        require('fs').statSync(imgPath)
        fileExists = true;
    } catch (e) {
        fileExists = false;
    }
    if (fileExists) {
        res.redirect(`${config.urlPath}/images/${model}/${run}/${step}/${parameter}/${region}.png`);
    } else {
        try {
            await enqueue(async () => {
                return exec(`mkdir -p ${config.imgDir}/${model}/${run}/${step}/${parameter}`)
                    .then(() => exec(`python map-generators/${style}.py ${config.gribDir}/${model}/${run}/${step}/${parameter}.grib2 ${bbox.join(' ')} ${config.imgDir}/${model}/${run}/${step}/${parameter}/${region}.png`));
            });
            res.redirect(`${config.urlPath}/images/${model}/${run}/${step}/${parameter}/${region}.png`);
        } catch (err) {
            console.error(err);
            // res.status(500).send({ error: true, msg: 'Failed to generate map' });
            res.redirect(`${config.urlPath}/images/${model}/${run}/${step}/${parameter}/${region}.png`);
        }
    }
});

app.get('/api/mapRuns/:model/:parameter', async function (req, res) {
    const { model, parameter } = req.params;
    const stepsAndRuns = await querySQL<any[]>(`SELECT DISTINCT * FROM steps_avail WHERE 
        model = ? AND
        parameter = ? AND
        run IN (SELECT * FROM (
            SELECT DISTINCT run 
            FROM steps_avail WHERE
                model = ? AND
                parameter = ?
                ORDER BY step_time DESC LIMIT 6
        ) tmp) ORDER BY step_time ASC;`, model, parameter, model, parameter);

    const stepsByRun = stepsAndRuns.reduce((acc: any, step: any) => {
        acc[step.run] = acc[step.run] || [];
        acc[step.run].push(step);
        acc[step.run] = acc[step.run].sort((a: any, b: any) => {
            return parseInt(a.step) > parseInt(b.step) ? 1 : -1;
        });
        return acc;
    }, {});
    res.send(stepsByRun);
});

app.listen(8080);