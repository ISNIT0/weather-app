import grib2jsonMod = require('grib2json');
import * as Jimp from 'jimp';

const grib2json = grib2jsonMod.default;

function keyDataByCoordinates(header: any, data: any) { // TODO: consider only storing coordinates within BBOX
    const keyedValues: any = {};
    data.forEach((val: any, index: number) => {
        const row = Math.floor(index / header.nx);
        const xCoord = header.lo1 + (header.dx * (index % header.nx))
        const yCoord = header.la1 - (row * header.dy);

        const newXCoord = ((xCoord + 180) % 360) - 180; // Allow for funny 0-360 vs -180-180 conversion

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

function getValuesForBBox(coordinateData: any, bbox: number[]) {
    const [xMin, yMax, xMax, yMin] = bbox;
    const slicedValues: number[][] = [];
    Object.keys(coordinateData)
        .map(x => Number(x))
        .filter(x => x >= xMin && x <= xMax)
        .sort((a, b) => a == b ? 0 : a > b ? 1 : -1)
        .forEach((xKey, index) => {
            slicedValues[index] = slicedValues[index] || [];
            Object.keys(coordinateData[xKey])
                .map(y => Number(y))
                .filter(y => y <= yMax && y >= yMin)
                .sort((a, b) => a == b ? 0 : a < b ? 1 : -1)
                .forEach((yKey) => slicedValues[index].push(coordinateData[xKey][yKey]));
        });
    return slicedValues;
}

function makeLayer(layer: any, bbox: number[]) {
    return new Promise((resolve, reject) => {
        const grib = layer.grib;
        const header = grib.header;
        const data = grib.data;

        const coordinateData = keyDataByCoordinates(header, data);

        const pixelValues = getValuesForBBox(coordinateData, bbox);

        new (<any>Jimp)(pixelValues.length, pixelValues[0].length, function (err: any, image: any) {
            if (err) return reject(err);
            if (layer.custom) {
                layer.custom(image, pixelValues)
                    .then(() => resolve(image));
            } else {
                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x: any, y: any, idx: any) {
                    // var red = this.bitmap.data[idx + 0];
                    // var green = this.bitmap.data[idx + 1];
                    // var blue = this.bitmap.data[idx + 2];
                    // var alpha = this.bitmap.data[idx + 3];

                    const {
                        value,
                        lon,
                        lat
                    }: any = pixelValues[x][y];
                    const [r, g, b, a] = layer.getPixel(value, lon, lat, pixelValues, x, y);
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


export function makeMap(layers, bbox) {
    return Promise.all(
        layers
            .map(layer => makeLayer(layer, bbox))
    )
        .then((imageLayers) => {
            const largestXY = imageLayers.reduce((acc, image:any) => {
                return [
                    Math.max(acc[0], image.bitmap.width),
                    Math.max(acc[1], image.bitmap.height)
                ];
            }, [0, 0]);

            return new Promise((resolve, reject) => {
                new (<any>Jimp)(largestXY[0], largestXY[1], function (err, outputImage) {
                    if (err) return reject(err);
                    imageLayers.forEach((layer:any) => {
                        layer.scaleToFit(largestXY[0], largestXY[1]);
                        outputImage.composite(layer, 0, 0)
                    });
                    resolve(outputImage);
                });
            });
        });
}



export function getGrib(gribFilePath, opts) {
    return new Promise((resolve, reject) => {
        grib2json(gribFilePath, opts, function (err, json) {
            if (err) reject(err);
            else resolve(json);
        });
    });
}


export function flatten(arrArr) {
    return arrArr.reduce((acc, arr) => acc.concat(arr));
}