const opts = [
    {
        type: 'input',
        name: 'apiURL',
        message: 'Enter the URL to your Ghost API',
        filter: function (val) {
            let def = val.trim();
            process.env.GC_TOOLS_apiURL = def;
            return def;
        },
        default: function () {
            return process.env.GC_TOOLS_apiURL || false;
        }
    },
    {
        type: 'input',
        name: 'adminAPIKey',
        message: 'Enter the Admin API key',
        filter: function (val) {
            let def = val.trim();
            process.env.GC_TOOLS_adminAPIKey = def;
            return def;
        },
        default: function () {
            return process.env.GC_TOOLS_adminAPIKey || false;
        }
    }
];

module.exports = opts;
