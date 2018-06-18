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
var mongo = mongojs_1.default('mapTool');
var config_1 = require("./config");
var nrp = new NRP({
    scope: ''
});
console.log('Started');
nrp.on("gfs:stepAvailable", function (_a) {
    var run = _a.run, step = _a.step;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            console.info("Got [gfs:stepAvailable] message: [run=" + run + "] [step=" + step + "]");
            mongo.mapConfigs.find({ model: 'gfs' }, function (err, maps) {
                return __awaiter(this, void 0, void 0, function () {
                    var phGroups, outFile;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!err) return [3 /*break*/, 1];
                                console.error("Failed to find map configs:", err);
                                return [3 /*break*/, 3];
                            case 1:
                                phGroups = maps.map(function (m) { return m.parameter.replace(/_/g, ':'); }).join(' ');
                                outFile = path.join(config_1.default.downloadPath, run, step + ".grib2");
                                return [4 /*yield*/, exec("gfsscraper downloadStep --outFile \"" + outFile + "\" --run \"" + run + "\" --step \"" + step + "\" --parameterHeightGroups " + phGroups)];
                            case 2:
                                _a.sent();
                                nrp.emit("gfs:stepDownloaded");
                                _a.label = 3;
                            case 3: return [2 /*return*/];
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
        var inFile, outFile;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.info("Got [gfs:stepDownloaded] message: [run=" + run + "] [step=" + step + "]");
                    inFile = path.join(config_1.default.downloadPath, run, step + ".grib2");
                    outFile = path.join(config_1.default.downloadPath, run, step + ".netcdf");
                    return [4 /*yield*/, exec("gfsscraper grib2netcdf --inFile \"" + inFile + "\" --outFile \"" + outFile + "\"")];
                case 1:
                    _b.sent();
                    nrp.emit("gfs:stepConverted", { run: run, step: step });
                    return [2 /*return*/];
            }
        });
    });
});
nrp.on("gfs:stepConverted", function (_a) {
    var run = _a.run, step = _a.step;
    console.info("Got [gfs:stepConverted] message: [run=" + run + "] [step=" + step + "]");
    mongo.mapConfigs.find({ model: 'gfs' }, function (err, mapsToGenerate) {
        return __awaiter(this, void 0, void 0, function () {
            var netcdfFile, _i, mapsToGenerate_1, _a, model, parameter, region, mapHash, outFile;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!err) return [3 /*break*/, 1];
                        console.error("Failed to find map configs:", err);
                        return [3 /*break*/, 5];
                    case 1:
                        netcdfFile = path.join(config_1.default.downloadPath, run, step + ".netcdf");
                        _i = 0, mapsToGenerate_1 = mapsToGenerate;
                        _b.label = 2;
                    case 2:
                        if (!(_i < mapsToGenerate_1.length)) return [3 /*break*/, 5];
                        _a = mapsToGenerate_1[_i], model = _a.model, parameter = _a.parameter, region = _a.region;
                        console.log("Generating map: " + model + "-" + parameter + "-" + run + "-" + step + "-" + region);
                        mapHash = md5(model + "-" + parameter + "-" + run + "-" + step + "-" + region);
                        outFile = path.join(config_1.default.imagePath, mapHash + ".png");
                        return [4 /*yield*/, exec("python ../make-map.py " + netcdfFile + " " + parameter + " " + outFile)];
                    case 3:
                        _b.sent();
                        nrp.emit("gfs:imageGenerated", { run: run, step: step, parameter: parameter, region: region });
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    });
});
nrp.on("gfs:imageGenerated", function (_a) {
    var run = _a.run, step = _a.step, parameter = _a.parameter, region = _a.region;
    // Store map hash in mongo
    console.log("Image was generated:", arguments[0]);
});
