"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var md5 = require("md5");
var express = require("express");
var redis = require("redis");
var morgan = require("morgan");
var mongojs_1 = require("mongojs");
var mongo = mongojs_1.default('mapTool');
var rClient = redis.createClient();
rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});
var app = express();
app.use(morgan('dev'));
app.get('/api/:model/:parameter/:run/:step/:region.png', function (req, res) {
    var _a = req.params, model = _a.model, parameter = _a.parameter, run = _a.run, step = _a.step, region = _a.region;
    var mapHash = md5(model + "-" + parameter + "-" + run + "-" + step + "-" + region);
    mongo.renderedImages.findOne({ hash: mapHash }, function (err, doc) {
        if (err) {
            console.error("Error fetching [" + mapHash + "] from mongo:", err);
            res.status(500).send({});
        }
        else {
            if (doc) {
                res.redirect("http://209.250.243.93:5000/" + mapHash + ".png");
            }
            else {
                console.log("Map not found for hash [" + mapHash + "]");
                res.status(404).send({});
            }
        }
    });
});
app.get('/api/mapRuns', function (req, res) {
    mongo.renderedImages.find({}, function (err, docs) {
        if (err) {
            console.error("Error fetching mapRuns from mongo:", err);
            res.status(500).send({});
        }
        else {
            var stepsByRun = docs.reduce(function (acc, map) {
                acc[map.run] = acc[map.run] || [];
                acc[map.run].push(map);
                acc[map.run] = acc[map.run].sort(function (a, b) {
                    return parseInt(a.step) > parseInt(b.step) ? 1 : -1;
                });
                return acc;
            }, {});
            res.send(stepsByRun);
        }
    });
});
app.listen(8080);
