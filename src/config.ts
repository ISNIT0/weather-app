const config = {
    production: {
        downloadPath: './download/gfs/',
        imagePath: './images'
    },
    development: {
        downloadPath: './download/gfs/',
        imagePath: './images'
    }
};

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];