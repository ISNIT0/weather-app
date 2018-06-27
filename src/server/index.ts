import config from './config';
import md5 = require('md5');
import * as express from 'express';
import * as redis from 'redis';
import * as morgan from 'morgan';
import * as mysql2 from 'mysql2';

const mysql = mysql2.createConnection(config.mysql);

function querySQL<T>(query: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        mysql.query(query, args, function (err: any, results: any) {
            if (err) reject(err);
            else resolve(results);
        });
    });
}


const rClient = redis.createClient();

rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});

const app = express();

app.use(morgan('dev'));

app.use(express.static('dist/client'));

let bboxes: any = {
    gbr: '-1268069.9600000000,-4760425.7990000000,665953.5476000000,-3306272.7860000000',
    ger: '468425.218589,7383071.671322,1770893.071311,5939997.905069'
};

app.get('/api/:model/:parameter/:run/:step/:region.png', (req, res) => {
    const { model, parameter, run, step, region } = req.params;
    const bbox = bboxes[region];

    res.redirect(`http://178.128.34.87:1337/map/${model}/${run}/${step}/${parameter}.png?bbox=${bbox}&width=1280&height=962`);
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