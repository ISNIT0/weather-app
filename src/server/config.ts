const config = {
    production: {
        mysql: {
            user: 'dev',
            password: 'password',
            database: 'weather'
        },
        gribDir: '/srv/gribs',
        imgDir: '/srv/images',
        urlPath: 'https://maps.fastweather.app'
    },
    development: {
        mysql: {
            user: 'dev',
            password: 'password',
            database: 'weather'
        },
        gribDir: '.',
        imgDir: './images',
        urlPath: 'http://localhost:8080'
    }
};

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];