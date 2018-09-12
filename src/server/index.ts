import config from './config';
import md5 = require('md5');
import * as express from 'express';
import * as redis from 'redis';
import * as morgan from 'morgan';
import * as mysql2 from 'mysql2';
import * as exec from 'promised-exec';
import { resolve } from 'url';

const mysql = mysql2.createConnection(config.mysql);

function querySQL<T>(query: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        mysql.query(query, args, function (err: any, results: any) {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

const maxWorkers = 5;
let currentWorkers = 0;

//This is all pretty horrible
async function claimWorker() {
    return new Promise((resolve, reject) => {
        if (currentWorkers < maxWorkers) {
            currentWorkers++;
            console.info(`Claiming worker [${currentWorkers}]`);
            resolve();
        } else {
            setTimeout(() => {
                claimWorker().then(resolve);
            }, 100);
        }
    });
}

async function releaseWorker() {
    console.info(`Releasing Worker`);
    currentWorkers--;
    return Promise.resolve();
}

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
    ger: [4.110260, 16.699219, 46.860191, 55.140817]
};

let styles: any = {
    TMIN_2maboveground: 'temp',
    TMAX_2maboveground: 'temp',
    TMP_2maboveground: 'temp',
    PRES_surface: 'pressure',
    APCP_surface: 'precip'
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
            await claimWorker();
            await exec(`mkdir -p ${config.imgDir}/${model}/${run}/${step}/${parameter}`);
            await exec(`python map-generators/${style}.py ${config.gribDir}/${model}/${run}/${step}/${parameter}.grib2 ${bbox.join(' ')} ${config.imgDir}/${model}/${run}/${step}/${parameter}/${region}.png`);
            await releaseWorker();
            res.redirect(`${config.urlPath}/images/${model}/${run}/${step}/${parameter}/${region}.png`);
        } catch (err) {
            await releaseWorker();
            console.error(err);
            res.status(500).send({ error: true, msg: 'Failed to generate map' });
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