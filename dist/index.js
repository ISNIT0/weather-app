"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var md5 = require("md5");
var path = require("path");
var exec = require("promised-exec");
var NRP = require("node-redis-pubsub");
var mongojs_1 = require("mongojs");
var request = require("request-promise-native");
var cheerio = require("cheerio");
var moment = require("moment");
var Redis = require("redis");
var redis = Redis.createClient();
var mongo = mongojs_1.default('mapTool');
var config_1 = require("./config");
var nrp = new NRP({
    scope: ''
});
console.log('Started');
function remember(func, timeout) {
    var lastVal = null;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (lastVal) {
            return lastVal;
        }
        else {
            var result = func.apply(void 0, args);
            lastVal = result;
            setTimeout(function () { return lastVal = null; }, timeout);
        }
    };
}
function getAvailableGfsRunSteps(gfsRunCode) {
    console.log("Getting latest available GFS step for run [" + gfsRunCode + "]");
    return request.get("http://www.ftp.ncep.noaa.gov/data/nccf/com/gfs/prod/gfs." + gfsRunCode + "/")
        .then(function (html) {
        var $ = cheerio.load(html);
        return $('a')
            .toArray()
            .map(function (el) { return $(el).attr('href'); })
            .filter(function (a) { return a; })
            .filter(function (href) { return href.startsWith('gfs.'); })
            .filter(function (file) { return file.slice(-5).match(/\.f[0-9]+$/); })
            .filter(function (file) { return !!~file.indexOf('.pgrb2.1'); })
            .map(function (file) { return file.split('.').slice(-1)[0]; })
            .map(function (href) { return href.slice(1); })
            .map(function (stepHour) { return parseInt(stepHour); });
    });
}
function getAvailableGfsRuns() {
    console.log("Getting latest available GFS runs");
    return request.get("http://www.ftp.ncep.noaa.gov/data/nccf/com/gfs/prod/")
        .then(function (html) {
        var $ = cheerio.load(html);
        return $('a')
            .toArray()
            .map(function (el) { return $(el).attr('href'); })
            .filter(function (a) { return a; })
            .filter(function (href) { return href.startsWith('gfs.'); })
            .map(function (href) {
            return href.replace(/[^0-9]/g, '');
        })
            .sort(function (a, b) {
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
function redisSet(key, value) {
    return new Promise(function (resolve, reject) {
        redis.set(key, value, function (err, res) {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}
function redisGet(key) {
    return new Promise(function (resolve, reject) {
        redis.get(key, function (err, res) {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}
function leftPad(number, targetLength) {
    var str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}
var getRuns = remember(getAvailableGfsRuns, 2000);
var getSteps = remember(getAvailableGfsRunSteps, 2000);
function pollForSteps() {
    return __awaiter(this, void 0, void 0, function () {
        var cursor, _a, runCursor, stepCursor, steps, stepCursorIndex, newStep, runs, runCursorIndex, newRun;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, redisGet('gfs:pollCursor')];
                case 1:
                    cursor = _b.sent();
                    if (!cursor) {
                        console.error("No Cursor Found!");
                        setTimeout(pollForSteps, 3000);
                        return [2 /*return*/]; //TODO: find from mongo
                    }
                    _a = JSON.parse(cursor), runCursor = _a.runCursor, stepCursor = _a.stepCursor;
                    console.log("Got [runCursor=" + runCursor + "] and [stepCursor=" + stepCursor + "]");
                    return [4 /*yield*/, getSteps(runCursor)];
                case 2:
                    steps = _b.sent();
                    console.log("Found [" + steps.length + "] steps");
                    stepCursorIndex = steps.indexOf(stepCursor);
                    console.log("StepCursorIndex is [" + stepCursorIndex + "]");
                    if (!(stepCursorIndex !== (steps.length - 1))) return [3 /*break*/, 3];
                    newStep = steps[stepCursorIndex + 1];
                    redisSet('gfs:pollCursor', JSON.stringify({ runCursor: runCursor, stepCursor: newStep }));
                    nrp.emit("gfs:stepAvailable", { run: runCursor, step: leftPad(stepCursor, 3) });
                    pollForSteps();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, getRuns()];
                case 4:
                    runs = _b.sent();
                    console.log("Got [" + runs.length + "] runs");
                    runCursorIndex = runs.indexOf(runCursor);
                    console.log("RunCursorIndex is [" + runCursorIndex + "]");
                    if (runCursorIndex !== (runs.length - 1)) {
                        newRun = runs[runCursorIndex + 1];
                        redisSet('gfs:pollCursor', JSON.stringify({ runCursor: newRun, stepCursor: 0 }));
                        nrp.emit("gfs:stepAvailable", { run: newRun, step: leftPad(0, 3) });
                        pollForSteps();
                    }
                    else {
                        setTimeout(pollForSteps, 3000);
                    }
                    _b.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
pollForSteps();
nrp.on("gfs:stepAvailable", function (_a) {
    var run = _a.run, step = _a.step;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            console.info("Got [gfs:stepAvailable] message: [run=" + run + "] [step=" + step + "]");
            mongo.mapConfigs.find({ model: 'gfs' }, function (err, maps) {
                return __awaiter(this, void 0, void 0, function () {
                    var phGroups, outDir, outFile, err_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!err) return [3 /*break*/, 1];
                                console.error("Failed to find map configs:", err);
                                return [3 /*break*/, 7];
                            case 1:
                                if (!!maps.length) return [3 /*break*/, 2];
                                console.info("Found no maps in mapConfig");
                                return [3 /*break*/, 7];
                            case 2:
                                phGroups = maps.map(function (m) { return m.parameter.replace(/_/g, ':'); }).join(' ');
                                outDir = path.join(config_1.default.downloadPath, run);
                                outFile = path.join(outDir, step + ".grib2");
                                _a.label = 3;
                            case 3:
                                _a.trys.push([3, 6, , 7]);
                                return [4 /*yield*/, exec("mkdir -p " + outDir)];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, exec("gfsscraper downloadStep --outFile \"" + outFile + "\" --run \"" + run + "\" --step \"" + step + "\" --parameterHeightGroups " + phGroups)];
                            case 5:
                                _a.sent();
                                nrp.emit("gfs:stepDownloaded", { run: run, step: step });
                                return [3 /*break*/, 7];
                            case 6:
                                err_1 = _a.sent();
                                console.error("Failed to exec gfsscraper downloadStep:", err_1);
                                return [3 /*break*/, 7];
                            case 7: return [2 /*return*/];
                        }
                    });
                });
            });
            return [2 /*return*/];
        });
    });
});
nrp.on("gfs:stepDownloaded", function (_a) {
    var run = _a.run, step = _a.step;
    return __awaiter(this, void 0, void 0, function () {
        var inFile, outFile, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.info("Got [gfs:stepDownloaded] message: [run=" + run + "] [step=" + step + "]");
                    inFile = path.join(config_1.default.downloadPath, run, step + ".grib2");
                    outFile = path.join(config_1.default.downloadPath, run, step + ".netcdf");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, exec("gfsscraper grib2netcdf --inFile \"" + inFile + "\" --outFile \"" + outFile + "\" --wgrib2 \"" + config_1.default.wgrib2 + "\"")];
                case 2:
                    _b.sent();
                    nrp.emit("gfs:stepConverted", { run: run, step: step });
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _b.sent();
                    console.error("Failed to exec gfsscraper convertStep:", err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
});
nrp.on("gfs:stepConverted", function (_a) {
    var run = _a.run, step = _a.step;
    console.info("Got [gfs:stepConverted] message: [run=" + run + "] [step=" + step + "]");
    mongo.mapConfigs.find({ model: 'gfs' }, function (err, mapsToGenerate) {
        return __awaiter(this, void 0, void 0, function () {
            var netcdfFile, _i, mapsToGenerate_1, _a, model, parameter, region, mapHash, outFile, makeMapPath, err_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!err) return [3 /*break*/, 1];
                        console.error("Failed to find map configs:", err);
                        return [3 /*break*/, 8];
                    case 1:
                        if (!!mapsToGenerate.length) return [3 /*break*/, 2];
                        console.info("Found no maps in mapConfig");
                        return [3 /*break*/, 8];
                    case 2:
                        netcdfFile = path.join(config_1.default.downloadPath, run, step + ".netcdf");
                        _i = 0, mapsToGenerate_1 = mapsToGenerate;
                        _b.label = 3;
                    case 3:
                        if (!(_i < mapsToGenerate_1.length)) return [3 /*break*/, 8];
                        _a = mapsToGenerate_1[_i], model = _a.model, parameter = _a.parameter, region = _a.region;
                        console.log("Generating map: " + model + "-" + parameter + "-" + run + "-" + step + "-" + region);
                        mapHash = md5(model + "-" + parameter + "-" + run + "-" + step + "-" + region);
                        outFile = path.join(config_1.default.imagePath, mapHash + ".png");
                        makeMapPath = path.join(__dirname, '../make-map.py');
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exec("python " + makeMapPath + " " + netcdfFile + " " + parameter + " " + outFile)];
                    case 5:
                        _b.sent();
                        nrp.emit("gfs:imageGenerated", { run: run, step: step, parameter: parameter, region: region, hash: mapHash });
                        return [3 /*break*/, 7];
                    case 6:
                        err_3 = _b.sent();
                        console.error("Failed to exec python ../make-map.py:", err_3);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [2 /*return*/];
                }
            });
        });
    });
});
nrp.on("gfs:imageGenerated", function (_a) {
    var run = _a.run, step = _a.step, parameter = _a.parameter, region = _a.region, hash = _a.hash;
    // Store map hash in mongo
    console.info("Got [gfs:imageGenerated] message: [run=" + run + "] [step=" + step + "] [parameter=" + parameter + "] [region=" + region + "] [hash=" + hash + "]");
    mongo.renderedMaps.insert({
        run: run,
        step: step,
        parameter: parameter,
        region: region,
        hash: hash,
        date: new Date()
    });
});
