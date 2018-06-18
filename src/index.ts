import md5 = require('md5');
import * as path from 'path';
import exec = require('promised-exec');
import NRP from 'node-redis-pubsub';
import mongojs from 'mongojs';

const mongo = mongojs('mapTool');

import config from './config';

const nrp = new NRP({
    scope: 'demo'
});

nrp.on(`gfs:stepAvailable`, async function ({ run, step }: any) { // Download Step
    mongo.mapConfigs.find({ model: 'gfs' }, async function (err: any, maps: any[]) {
        if (err) {
            console.error(`Failed to find map configs:`, err);
        } else {
            const phGroups = maps.map(m => m.parameter.replace(/_/g, ':')).join(' ');
            const outFile = path.join(config.downloadPath, run, `${step}.grib2`);
            await exec(`gfsscraper downloadStep --outFile "${outFile}" --run "${run}" --step "${step}" --parameterHeightGroups ${phGroups}`);
            nrp.emit(`gfs:stepDownloaded`);
        }
    });
});

nrp.on(`gfs:stepDownloaded`, async function ({ run, step }: any) { // Convert Step
    const inFile = path.join(config.downloadPath, run, `${step}.grib2`);
    const outFile = path.join(config.downloadPath, run, `${step}.netcdf`);
    await exec(`gfsscraper grib2netcdf --inFile "${inFile}" --outFile "${outFile}"`);
    nrp.emit(`gfs:stepConverted`, { run, step });
});

nrp.on(`gfs:stepConverted`, function ({ run, step }: any) { // Make Map
    mongo.mapConfigs.find({ model: 'gfs' }, async function (err: any, mapsToGenerate: any[]) {
        if (err) {
            console.error(`Failed to find map configs:`, err);
        } else {
            const netcdfFile = path.join(config.downloadPath, run, `${step}.netcdf`);
            for (let { model, parameter, region } of mapsToGenerate) {
                console.log(`Generating map: ${model}-${parameter}-${run}-${step}-${region}`);
                const mapHash = <string>md5(`${model}-${parameter}-${run}-${step}-${region}`);
                const outFile = path.join(config.imagePath, `${mapHash}.png`);
                await exec(`python ./make-map.py ${netcdfFile} ${parameter} ${outFile}`)
                nrp.emit(`gfs:imageGenerated`, { run, step, parameter, region });
            }
        }
    });
});

nrp.on(`gfs:imageGenerated`, function ({ run, step, parameter, region }: any) {
    // Store map hash in mongo
    console.log(`Image was generated:`, arguments[0]);
});