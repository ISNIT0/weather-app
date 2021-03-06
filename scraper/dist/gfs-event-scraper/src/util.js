"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var grib2json = require("grib2json");
var Jimp = require("jimp");
function keyDataByCoordinates(header, data) {
    var keyedValues = {};
    data.forEach(function (val, index) {
        var row = Math.floor(index / header.nx);
        var xCoord = header.lo1 + (header.dx * (index % header.nx));
        var yCoord = header.la1 - (row * header.dy);
        var newXCoord = ((xCoord + 180) % 360) - 180; // Allow for funny 0-360 vs -180-180 conversion
        keyedValues[newXCoord] = keyedValues[newXCoord] || {};
        keyedValues[newXCoord][yCoord] = {
            value: val,
            index: index,
            lon: newXCoord,
            lat: yCoord
        };
    });
    return keyedValues;
}
function getValuesForBBox(coordinateData, bbox) {
    var xMin = bbox[0], yMax = bbox[1], xMax = bbox[2], yMin = bbox[3];
    var slicedValues = [];
    Object.keys(coordinateData)
        .map(function (x) { return Number(x); })
        .filter(function (x) { return x >= xMin && x <= xMax; })
        .sort(function (a, b) { return a == b ? 0 : a > b ? 1 : -1; })
        .forEach(function (xKey, index) {
        slicedValues[index] = slicedValues[index] || [];
        Object.keys(coordinateData[xKey])
            .map(function (y) { return Number(y); })
            .filter(function (y) { return y <= yMax && y >= yMin; })
            .sort(function (a, b) { return a == b ? 0 : a < b ? 1 : -1; })
            .forEach(function (yKey) { return slicedValues[index].push(coordinateData[xKey][yKey]); });
    });
    return slicedValues;
}
function makeLayer(layer, bbox) {
    return new Promise(function (resolve, reject) {
        var grib = layer.grib;
        var header = grib.header;
        var data = grib.data;
        var coordinateData = keyDataByCoordinates(header, data);
        var pixelValues = getValuesForBBox(coordinateData, bbox);
        new Jimp(pixelValues.length, pixelValues[0].length, function (err, image) {
            if (err)
                return reject(err);
            if (layer.custom) {
                layer.custom(image, pixelValues)
                    .then(function () { return resolve(image); });
            }
            else {
                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                    // var red = this.bitmap.data[idx + 0];
                    // var green = this.bitmap.data[idx + 1];
                    // var blue = this.bitmap.data[idx + 2];
                    // var alpha = this.bitmap.data[idx + 3];
                    var _a = pixelValues[x][y], value = _a.value, lon = _a.lon, lat = _a.lat;
                    var _b = layer.getPixel(value, lon, lat, pixelValues, x, y), r = _b[0], g = _b[1], b = _b[2], a = _b[3];
                    this.bitmap.data[idx + 0] = r;
                    this.bitmap.data[idx + 1] = g;
                    this.bitmap.data[idx + 2] = b;
                    this.bitmap.data[idx + 3] = a;
                    if (x == image.bitmap.width - 1 &&
                        y == image.bitmap.height - 1) {
                        resolve(image);
                    }
                });
            }
        });
    });
}
function makeMap(layers, bbox) {
    return Promise.all(layers
        .map(function (layer) { return makeLayer(layer, bbox); }))
        .then(function (imageLayers) {
        var largestXY = imageLayers.reduce(function (acc, image) {
            return [
                Math.max(acc[0], image.bitmap.width),
                Math.max(acc[1], image.bitmap.height)
            ];
        }, [0, 0]);
        return new Promise(function (resolve, reject) {
            new Jimp(largestXY[0], largestXY[1], function (err, outputImage) {
                if (err)
                    return reject(err);
                imageLayers.forEach(function (layer) {
                    layer.scaleToFit(largestXY[0], largestXY[1]);
                    outputImage.composite(layer, 0, 0);
                });
                resolve(outputImage);
            });
        });
    });
}
exports.makeMap = makeMap;
function getGrib(gribFilePath, opts) {
    return new Promise(function (resolve, reject) {
        grib2json(gribFilePath, opts, function (err, json) {
            if (err)
                reject(err);
            else
                resolve(json);
        });
    });
}
exports.getGrib = getGrib;
function flatten(arrArr) {
    return arrArr.reduce(function (acc, arr) { return acc.concat(arr); });
}
exports.flatten = flatten;
