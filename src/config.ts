const config = {
    production: {
        downloadPath: '/home/user/download/gfs/',
        imagePath: '/srv/images/',
        wgrib2: '/home/user/grib2/wgrib2/wgrib2'
    },
    development: {
        downloadPath: './download/gfs/',
        imagePath: './images/',
        wgrib2: 'wgrib2'
    }
};

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];