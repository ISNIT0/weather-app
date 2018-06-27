"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    production: {
        mysql: {
            user: 'dev',
            password: 'password',
            database: 'weather'
        }
    },
    development: {
        mysql: {
            user: 'dev',
            password: 'password',
            database: 'weather'
        }
    }
};
exports.default = config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];
