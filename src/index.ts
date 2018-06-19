import md5 = require('md5');
import * as path from 'path';
import exec = require('promised-exec');
import NRP = require('node-redis-pubsub');
import mongojs from 'mongojs';

const mongo = mongojs('mapTool');

import config from './config';

const nrp = new NRP({
    scope: ''
});

console.log('Started');

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
        const convertFunc = `gfsscraper grib2netcdf --inFile "${inFile}" --outFile "${outFile}"`;
        console.info(`Executing: [${convertFunc}]`);
        await exec(convertFunc);
        nrp.emit(`gfs:stepConverted`, { run, step });
    } catch (err) {
        console.error(`Failed to exec gfsscraper downloadStep:`, err);
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