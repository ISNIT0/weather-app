import md5 = require('md5');
import * as path from 'path';
import exec = require('promised-exec');
import NRP = require('node-redis-pubsub');
import mongojs from 'mongojs';
import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
import * as moment from 'moment';
import * as Redis from 'redis';

const redis = Redis.createClient();

const mongo = mongojs('mapTool');

import config from './config';

const nrp = new NRP({
    scope: ''
});

console.log('Started');


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

async function pollForSteps() {
    const cursor = await redisGet('gfs:pollCursor');
    if (!cursor) {
        console.error(`No Cursor Found!`);
        setTimeout(pollForSteps, 3000);
        return; //TODO: find from mongo
    }
    const { runCursor, stepCursor } = JSON.parse(cursor);
    console.log(`Got [runCursor=${runCursor}] and [stepCursor=${stepCursor}]`);

    const steps = await getAvailableGfsRunSteps(runCursor);
    console.log(`Found [${steps.length}] steps`);
    const stepCursorIndex = steps.indexOf(stepCursor);
    console.log(`StepCursorIndex is [${stepCursorIndex}]`);
    if (stepCursorIndex !== (steps.length - 1)) {
        const newStep = steps[stepCursorIndex + 1];
        redisSet('gfs:pollCursor', JSON.stringify({ runCursor, stepCursor: newStep }));
        nrp.emit(`gfs:stepAvailable`, { run: runCursor, step: leftPad(stepCursor, 3) });
        pollForSteps();
    } else {
        const runs = await getAvailableGfsRuns();
        console.log(`Got [${runs.length}] runs`);
        const runCursorIndex = runs.indexOf(runCursor);
        console.log(`RunCursorIndex is [${runCursorIndex}]`);
        if (runCursorIndex !== (runs.length - 1)) {
            const newRun = runs[runCursorIndex + 1];
            redisSet('gfs:pollCursor', JSON.stringify({ runCursor: newRun, stepCursor: 0 }));
            nrp.emit(`gfs:stepAvailable`, { run: newRun, step: leftPad(0, 3) });
            pollForSteps();
        }
    }
    setTimeout(pollForSteps, 3000);
}

pollForSteps();






nrp.on(`gfs:stepAvailable`, async function ({ run, step }: any) { // Download Step
    console.info(`Got [gfs:stepAvailable] message: [run=${run}] [step=${step}]`);
    mongo.mapConfigs.find({ model: 'gfs' }, async function (err: any, maps: any[]) {
        if (err) {
            console.error(`Failed to find map configs:`, err);
        } else if (!maps.length) {
            console.info(`Found no maps in mapConfig`);
        } else {
            const phGroups = maps.map(m => m.parameter.replace(/_/g, ':')).join(' ');
            const outDir = path.join(config.downloadPath, run);
            const outFile = path.join(outDir, `${step}.grib2`);
            try {
                await exec(`mkdir -p ${outDir}`);
                await exec(`gfsscraper downloadStep --outFile "${outFile}" --run "${run}" --step "${step}" --parameterHeightGroups ${phGroups}`);
                nrp.emit(`gfs:stepDownloaded`, { run, step });
            } catch (err) {
                console.error(`Failed to exec gfsscraper downloadStep:`, err);
            }
        }
    });
});

nrp.on(`gfs:stepDownloaded`, async function ({ run, step }: any) { // Convert Step
    console.info(`Got [gfs:stepDownloaded] message: [run=${run}] [step=${step}]`);
    const inFile = path.join(config.downloadPath, run, `${step}.grib2`);
    const outFile = path.join(config.downloadPath, run, `${step}.netcdf`);
    try {
        await exec(`gfsscraper grib2netcdf --inFile "${inFile}" --outFile "${outFile}" --wgrib2 "${config.wgrib2}"`);
        nrp.emit(`gfs:stepConverted`, { run, step });
    } catch (err) {
        console.error(`Failed to exec gfsscraper convertStep:`, err);
    }
});

nrp.on(`gfs:stepConverted`, function ({ run, step }: any) { // Make Map
    console.info(`Got [gfs:stepConverted] message: [run=${run}] [step=${step}]`);
    mongo.mapConfigs.find({ model: 'gfs' }, async function (err: any, mapsToGenerate: any[]) {
        if (err) {
            console.error(`Failed to find map configs:`, err);
        } else if (!mapsToGenerate.length) {
            console.info(`Found no maps in mapConfig`);
        } else {
            const netcdfFile = path.join(config.downloadPath, run, `${step}.netcdf`);
            for (let { model, parameter, region } of mapsToGenerate) {
                console.log(`Generating map: ${model}-${parameter}-${run}-${step}-${region}`);
                const mapHash = <string>md5(`${model}-${parameter}-${run}-${step}-${region}`);
                const outFile = path.join(config.imagePath, `${mapHash}.png`);
                const makeMapPath = path.join(__dirname, '../make-map.py');
                try {
                    await exec(`python ${makeMapPath} ${netcdfFile} ${parameter} ${outFile}`)
                    nrp.emit(`gfs:imageGenerated`, { run, step, parameter, region, hash: mapHash });
                } catch (err) {
                    console.error(`Failed to exec python ../make-map.py:`, err);
                }
            }
        }
    });
});

nrp.on(`gfs:imageGenerated`, function ({ run, step, parameter, region, hash }: any) {
    // Store map hash in mongo
    console.info(`Got [gfs:imageGenerated] message: [run=${run}] [step=${step}] [parameter=${parameter}] [region=${region}] [hash=${hash}]`);
    mongo.renderedMaps.insert({
        run,
        step,
        parameter,
        region,
        hash,
        date: new Date()
    });
});