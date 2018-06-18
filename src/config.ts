const config = {
    production: {
        downloadPath: '/home/user/download/gfs/',
        imagePath: '/home/user/images/'
    },
    development: {
        downloadPath: './download/gfs/',
        imagePath: './images/'
    }
};

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];