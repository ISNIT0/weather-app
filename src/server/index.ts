import md5 = require('md5');
import * as express from 'express';
import * as redis from 'redis';
import * as morgan from 'morgan';

import mongojs from 'mongojs';

const mongo = mongojs('mapTool');

const rClient = redis.createClient();

rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});

const app = express();

app.use(morgan('dev'));

app.get('/api/:model/:parameter/:run/:step/:region.png', (req, res) => {
    const { model, parameter, run, step, region } = req.params;
    const mapHash = <string>md5(`${model}-${parameter}-${run}-${step}-${region}`);

    mongo.renderedMaps.findOne({ hash: mapHash }, function (err: any, doc: any) {
        if (err) {
            console.error(`Error fetching [${mapHash}] from mongo:`, err);
            res.status(500).send({});
        } else {
            if (doc) {
                res.redirect(`http://209.250.243.93:5000/${mapHash}.png`);
            } else {
                console.log(`Map not found for hash [${mapHash}]`);
                res.status(404).send({});
            }
        }
    });
});

app.get('/api/mapRuns', function (req, res) {
    mongo.renderedMaps.find({}, function (err: any, docs: any) {
        if (err) {
            console.error(`Error fetching mapRuns from mongo:`, err);
            res.status(500).send({});
        } else {
            const stepsByRun = docs.reduce((acc: any, map: any) => {
                acc[map.run] = acc[map.run] || [];
                acc[map.run].push(map);
                acc[map.run] = acc[map.run].sort((a: any, b: any) => {
                    return parseInt(a.step) > parseInt(b.step) ? 1 : -1;
                });
                return acc;
            }, {});
            res.send(stepsByRun);
        }
    });
});

app.listen(8080);