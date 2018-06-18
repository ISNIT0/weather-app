import md5 = require('md5');
import * as express from 'express';
import * as redis from 'redis';
import * as morgan from 'morgan';

const rClient = redis.createClient();

rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});

const app = express();

app.use(morgan('dev'));

app.get('/api/:model/:parameter/:run/:step/:region.png', (req, res) => {
    const { model, parameter, run, step, region } = req.params;
    const mapHash = <string>md5(`${model}-${parameter}-${run}-${step}-${region}`);

    rClient.get(mapHash, function (err, reply) {
        if (err) {
            console.error(`Error fetching [${mapHash}] from redis:`, err);
            res.status(500).send({});
        } else {
            if (reply) {
                res.redirect(`http://209.250.243.93:5000/${mapHash}.png`);
            } else {
                console.log(`Map not found for hash [${mapHash}]`);
                res.status(404).send({});
            }
        }
    });
});

app.listen(8080);