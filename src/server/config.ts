const config = {
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

export default config[process.env.NODE_ENV === 'production' ? 'production' : 'development'];