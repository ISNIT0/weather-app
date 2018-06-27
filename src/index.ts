import * as mysql2 from 'mysql2';
import * as path from 'path';
import exec = require('promised-exec');
import NRP = require('node-redis-pubsub');
import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
import * as moment from 'moment';
import * as Redis from 'redis';

const redis = Redis.createClient();

import config from './config';

const nrp = new NRP({
    scope: ''
});

const mysql = mysql2.createConnection(config.mysql);

function querySQL<T>(query: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        mysql.query(query, args, function (err, results) {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

console.log('Started');


function remember(func: (...args: any[]) => any, timeout: number) {
    let lastVal: any = null;
    return function (...args: any[]) {
        if (lastVal) {
            return lastVal;
        } else {
            const result = func(...args);
            lastVal = result;
            setTimeout(() => lastVal = null, timeout);
            return result;
        }
    }
}

function getAvailableGfsRunSteps(gfsRunCode: string): Promise<number[]> {
    console.log(`Getting latest available GFS step for run [${gfsRunCode}]`);
    return request.get(`http://www.ftp.ncep.noaa.gov/data/nccf/com/gfs/prod/gfs.${gfsRunCode}/`)
        .then((html: string) => {
            const $ = cheerio.load(html);
            return $('a')
                .toArray()
                .map((el: any) => <string>$(el).attr('href'))
                .filter(a => a)
                .filter(href => href.startsWith('gfs.'))
                .filter(file => file.slice(-5).match(/\.f[0-9]+$/))
                .filter(file => !!~file.indexOf('.pgrb2.1'))
                .map(file => file.split('.').slice(-1)[0])
                .map(href => href.slice(1))
                .map(stepHour => parseInt(stepHour));
        });
}

function getAvailableGfsRuns() {
    console.log(`Getting latest available GFS runs`);
    return request.get(`http://www.ftp.ncep.noaa.gov/data/nccf/com/gfs/prod/`)
        .then((html: string) => {
            const $ = cheerio.load(html);
            return $('a')
                .toArray()
                .map(el => $(el).attr('href'))
                .filter(a => a)
                .filter(href => href.startsWith('gfs.'))
                .map(href => {
                    return href.replace(/[^0-9]/g, '');
                })
                .sort((a, b) => {
                    return moment(a, 'YYYYMMDDHH').valueOf() > moment(b, 'YYYYMMDDHH').valueOf() ? 1 : -1;
                });
        });
}

//every 5 minutes
/*
//check prev checked run for new steps
//if new step
    // push to redis
    // update step cursor
    // loop immediately
//else if new run exists
    // update run cursor
    // loop immediately
*/

function redisSet(key: string, value: any): Promise<any> {
    return new Promise((resolve, reject) => {
        redis.set(key, value, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    });
}

function redisGet(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
        redis.get(key, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    });
}

function leftPad(number: any, targetLength: number) {
    const str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}

const getRuns = remember(getAvailableGfsRuns, 1000 * 60 * 2);
const getSteps = remember(getAvailableGfsRunSteps, 1000 * 60 * 2);

async function pollForSteps() {
    const cursor = await redisGet('pollCursor');
    if (!cursor) {
        console.error(`No Cursor Found!`);
        setTimeout(pollForSteps, 1000 * 60 * 3);
        return; //TODO: find from mongo
    }
    const { runCursor, stepCursor } = JSON.parse(cursor);
    console.log(`Got [runCursor=${runCursor}] and [stepCursor=${stepCursor}]`);

    const steps = await getSteps(runCursor);
    console.log(`Found [${steps.length}] steps`);
    const stepCursorIndex = steps.indexOf(stepCursor);
    console.log(`StepCursorIndex is [${stepCursorIndex}]`);
    if (stepCursorIndex !== (steps.length - 1)) {
        const newStep = steps[stepCursorIndex + 1];
        redisSet('pollCursor', JSON.stringify({ runCursor, stepCursor: newStep }));
        nrp.emit(`stepAvailable`, { run: runCursor, step: leftPad(stepCursor, 3), model: 'gfs' });
        setTimeout(() => pollForSteps(), 1000);
    } else {
        const runs = await getRuns();
        console.log(`Got [${runs.length}] runs`);
        const runCursorIndex = runs.indexOf(runCursor);
        console.log(`RunCursorIndex is [${runCursorIndex}]`);
        if (runCursorIndex !== (runs.length - 1)) {
            const newRun = runs[runCursorIndex + 1];
            redisSet('pollCursor', JSON.stringify({ runCursor: newRun, stepCursor: 0 }));
            nrp.emit(`stepAvailable`, { run: newRun, step: leftPad(0, 3), model: 'gfs' });
            setTimeout(() => pollForSteps(), 1000);
        } else {
            setTimeout(pollForSteps, 1000 * 60 * 3);
        }
    }
}

pollForSteps();

nrp.on(`stepAvailable`, async function ({ run, step, model }: any) { // Download Step
    console.info(`Got [stepAvailable] message: [run=${run}] [step=${step}]`);

    try {
        const maps = await querySQL<any[]>('SELECT * from `map_configs` WHERE `model` = ?', model);

        const phGroups = maps.map(m => m.parameter);

        for (let ph of phGroups) {
            const outDir = path.join(config.downloadPath, run, step);
            const outFile = path.join(outDir, `${ph.replace(/:/g, '_')}.grib2`);
            await exec(`mkdir -p ${outDir}`);
            await exec(`gfsscraper downloadStep --outFile "${outFile}" --run "${run}" --step "${step}" --parameterHeightGroups ${ph}`);
            nrp.emit(`stepDownloaded`, { run, step, model, parameter: ph });
        }
    } catch (err) {
        console.error(`Failed to exec gfsscraper downloadStep:`, err);
    }
});

// nrp.on(`stepDownloaded`, async function ({ run, step }: any) { // Convert Step
//     console.info(`Got [stepDownloaded] message: [run=${run}] [step=${step}]`);
//     const inFile = path.join(config.downloadPath, run, `${step}.grib2`);
//     const outFile = path.join(config.downloadPath, run, `${step}.netcdf`);
//     try {
//         await exec(`gfsscraper grib2netcdf --inFile "${inFile}" --outFile "${outFile}" --wgrib2 "${config.wgrib2}"`);
//         nrp.emit(`stepConverted`, { run, step });
//     } catch (err) {
//         console.error(`Failed to exec gfsscraper convertStep:`, err);
//     }
// });

nrp.on(`stepDownloaded`, async function ({ run, step, model, parameter }: any) { // Make Map
    console.info(`Got [stepDownloaded] message: [run=${run}] [step=${step}]`);
    parameter = parameter.replace(/:/g, '_');
    const inFile = path.join(config.downloadPath, run, step, `${parameter}.grib2`);
    const warpedFile = path.join(config.downloadPath, run, step, `${parameter}.warped.grib2`);

    try {
        //GDAL Warp
        await exec(`gdalwarp -t_srs EPSG:3857 ${inFile} ${warpedFile}`);
        //GDAL Translate
        // await exec(`gdal_translate -of Gtiff -b 1 ${warpedFile} ${outFile}`);
        //Cleanup
        //await exec(`rm ${inFile} && rm ${warpedFile}`);

        nrp.emit(`stepProcessed`, { run, step, model, parameter });
    } catch (err) {
        console.error(`Failed to exec gfsscraper downloadStep:`, err);
    }
});

nrp.on(`stepProcessed`, async function ({ run, step, model, parameter }: any) {
    // Store map hash in mongo
    console.info(`Got [stepProcessed] message: [run=${run}] [step=${step}] [parameter=${parameter}] [model=${model}]`);
    const stepTime = moment(run, 'YYYYMMDDHH').add(+step, 'hour').toDate();
    await querySQL('INSERT IGNORE `steps_avail` (run, step, model, parameter, step_time) VALUES (?, ?, ?, ?)', run, step, model, parameter, stepTime);
});