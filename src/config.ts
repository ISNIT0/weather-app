const config = {
    production: {
        downloadPath: '/srv/gribs',
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

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];