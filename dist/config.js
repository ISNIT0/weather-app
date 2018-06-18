"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    production: {
        downloadPath: '/home/user/download/gfs/',
        imagePath: '/home/user/images/'
    },
    development: {
        downloadPath: './download/gfs/',
        imagePath: './images/'
    }
};
exports.default = config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];
