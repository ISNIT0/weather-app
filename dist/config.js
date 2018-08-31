"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    production: {
        downloadPath: '/srv/gribs/gfs',
        imagePath: '/srv/images/',
        wgrib2: '/home/user/grib2/wgrib2/wgrib2',
        mysql: {
            user: 'dev',
            password: 'password',
            database: 'weather'
        }
    },
    development: {
        downloadPath: './download/gfs/',
        imagePath: './images/',
        wgrib2: 'wgrib2',
        mysql: {
            database: 'weather'
        }
    }
};
exports.default = config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];
