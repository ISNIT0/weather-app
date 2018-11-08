"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jimp_1 = require("jimp");
var util_1 = require("./util");
function makeTemperatureMap(gribFilePath, bbox) {
    return Promise.all([
        util_1.getGrib(gribFilePath, {
            scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
            names: true,
            data: true,
            category: 0,
            parameter: 218,
            surfaceType: 1,
            surfaceValue: 0,
        }),
        util_1.getGrib(gribFilePath, {
            scriptPath: 'grib2json-0.8.0-SNAPSHOT/bin/grib2json',
            names: true,
            data: true,
            category: 0,
            parameter: 0,
            surfaceType: 1,
            surfaceValue: 0,
        })
    ]).then(function (_a) {
        var landGrib = _a[0], tempGrib = _a[1];
        var layers = [{
                grib: tempGrib[0],
                getPixel: function getPixel(value, lon, lat, values, x, y) {
                    value -= 272.15;
                    var r = 0, g = 0, b = 0;
                    if (value < 0) {
                        r = 0;
                        g = 0;
                        b = 100;
                    }
                    else if (value <= 20) {
                        r = 97;
                        g = 170;
                        b = 134;
                    }
                    else if (value <= 30) {
                        r = 223;
                        g = 165;
                        b = 64;
                    }
                    else {
                        r = 207;
                        g = 90;
                        b = 76;
                    }
                    return [r, g, b, 255];
                }
            }, {
                grib: landGrib[0],
                getPixel: function getPixel(value, lon, lat, values, x, y) {
                    var r = 0, g = 0, b = 0, a = 0;
                    if (value === 0) {
                        r = 67;
                        g = 165;
                        b = 222;
                        a = 255;
                    }
                    else {
                        var val = values[x][y].value;
                        var neighbourDiffers = !(((values[x - 1] || [])[y] || {}).value === val &&
                            ((values[x + 1] || [])[y] || {}).value === val &&
                            ((values[x] || [])[y - 1] || {}).value === val &&
                            ((values[x] || [])[y + 1] || {}).value === val);
                        if (neighbourDiffers) {
                            a = 255;
                        }
                    }
                    return [r, g, b, a];
                }
            },
            {
                grib: tempGrib[0],
                custom: function custom(image, data) {
                    return jimp_1.default.loadFont(jimp_1.default.FONT_SANS_8_WHITE).then(function (font) {
                        var density = 30;
                        Array(density).slice().map(function (_, xI) { return Array(density).slice().forEach(function (_, yI) {
                            var xLength = image.bitmap.width;
                            var yLength = image.bitmap.height;
                            var xMult = xLength / density;
                            var yMult = yLength / density;
                            var columns = data.slice(Math.floor(xI * xMult), Math.ceil((xI + 1) * xMult));
                            var rows = columns.map(function (col) { return col.slice(Math.floor(yI * yMult), Math.ceil((yI + 1) * yMult)); });
                            var values = util_1.flatten(rows).map(function (_a) {
                                var value = _a.value;
                                return value - 272.15;
                            });
                            var avgValue = values.reduce(function (acc, value) { return value + acc; }, 0) / values.length;
                            var xCellSize = image.bitmap.width / density;
                            var xPos = xCellSize * xI + (xCellSize / 3);
                            var yCellSize = image.bitmap.height / density;
                            var yPos = yCellSize * yI + (yCellSize / 3);
                            image.print(font, xPos, yPos, "" + Math.floor(avgValue), xCellSize); // print a message on an image with text wrapped at width
                        }); });
                    });
                }
            }
        ];
        return util_1.makeMap(layers, bbox);
    });
}
exports.default = makeTemperatureMap;
