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
var config_1 = require("./config");
var express = require("express");
var redis = require("redis");
var morgan = require("morgan");
var mysql2 = require("mysql2");
var mysql = mysql2.createConnection(config_1.default.mysql);
function querySQL(query) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return new Promise(function (resolve, reject) {
        mysql.query(query, args, function (err, results) {
            if (err)
                reject(err);
            else
                resolve(results);
        });
    });
}
var rClient = redis.createClient();
rClient.on("error", function (err) {
    console.error("Redis Error ", err);
});
var app = express();
app.use(morgan('dev'));
app.use(express.static('dist/client'));
var bboxes = {
    gbr: '-1268069.9600000000,-4760425.7990000000,665953.5476000000,-3306272.7860000000',
    ger: '468425.218589,7383071.671322,1770893.071311,5939997.905069'
};
var styles = {
    TMP_2maboveground: 'temp',
    PRES_surface: 'pressure'
};
app.get('/api/:model/:parameter/:run/:step/:region.png', function (req, res) {
    var _a = req.params, model = _a.model, parameter = _a.parameter, run = _a.run, step = _a.step, region = _a.region;
    var bbox = bboxes[region];
    var style = styles[parameter];
    res.redirect("http://maps.fastweather.io/map/" + style + "/" + model + "/" + run + "/" + step + "/" + parameter + ".png?bbox=" + bbox + "&width=1280&height=962");
});
app.get('/api/mapRuns/:model/:parameter', function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, model, parameter, stepsAndRuns, stepsByRun;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = req.params, model = _a.model, parameter = _a.parameter;
                    return [4 /*yield*/, querySQL("SELECT DISTINCT * FROM steps_avail WHERE \n        model = ? AND\n        parameter = ? AND\n        run IN (SELECT * FROM (\n            SELECT DISTINCT run \n            FROM steps_avail WHERE\n                model = ? AND\n                parameter = ?\n                ORDER BY step_time DESC LIMIT 6\n        ) tmp) ORDER BY step_time ASC;", model, parameter, model, parameter)];
                case 1:
                    stepsAndRuns = _b.sent();
                    stepsByRun = stepsAndRuns.reduce(function (acc, step) {
                        acc[step.run] = acc[step.run] || [];
                        acc[step.run].push(step);
                        acc[step.run] = acc[step.run].sort(function (a, b) {
                            return parseInt(a.step) > parseInt(b.step) ? 1 : -1;
                        });
                        return acc;
                    }, {});
                    res.send(stepsByRun);
                    return [2 /*return*/];
            }
        });
    });
});
app.listen(8080);
