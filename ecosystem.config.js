module.exports = {
    apps: [{
        name: "weather-scraper",
        script: "./scraper/dist/index.js",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }, {
        name: "weather-front-end",
        script: "./front-end/dist/server/index.js",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
}