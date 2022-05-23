const inquirer = require('inquirer');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const input = require('./basic/input');

// /Users/yournamehere/.gctools/gctools_sites.json
// ~/.gctools/gctools_sites.json
const sitesJSONFile = path.join(os.homedir(), '.gctools', 'gctools_sites.json');

// Ensure that the `sitesJSONFile` exists, creating the file with an empty object if it does not yet exist
fs.ensureFileSync(sitesJSONFile);
fs.readFile(sitesJSONFile, 'utf8', (err, value) => {
    if (err) {
        throw err;
    }

    if (value === '') {
        fs.writeFile(sitesJSONFile, JSON.stringify([], null, 2));
    }
});

async function getStoredSites() {
    const storedSites = await fs.readJson(sitesJSONFile);
    let theSites = [];

    if (storedSites) {
        storedSites.forEach((site) => {
            theSites.push({
                name: `${site.name} - ${site.url}`,
                value: {
                    url: site.url,
                    key: site.key
                }
            });
        });
    }

    theSites.push({
        name: '+ Add new site',
        value: false
    });

    return theSites;
}

async function storeNewSite(options) {
    let storedSites = await fs.readJson(sitesJSONFile);
    storedSites.push(options);
    return await fs.writeFile(sitesJSONFile, JSON.stringify(storedSites, null, 2));
}

const savedSitesPrompts = [
    {
        type: 'list',
        name: 'sites',
        message: 'Select an existing site:',
        choices: async function () {
            return getStoredSites();
        },
        filter: (val) => {
            if (val) {
                process.env.GC_TOOLS_apiURL = val.url;
                process.env.GC_TOOLS_adminAPIKey = val.key;
            }

            return val;
        }
    }
];

const newSitePrompts = [
    {
        type: 'input',
        name: 'apiURL',
        message: 'URL to Ghost API:',
        filter: (val) => {
            let trimmedVal = val.trim();
            process.env.GC_TOOLS_apiURL = trimmedVal;
            return trimmedVal;
        },
        default: () => {
            return process.env.GC_TOOLS_apiURL || false;
        }
    },
    {
        type: 'input',
        name: 'adminAPIKey',
        message: 'Admin API key:',
        filter: (val) => {
            let trimmedVal = val.trim();
            process.env.GC_TOOLS_adminAPIKey = trimmedVal;
            return trimmedVal;
        },
        default: () => {
            return process.env.GC_TOOLS_adminAPIKey || false;
        }
    },
    {
        type: 'list',
        name: 'saveKey',
        message: 'Save this key?',
        choices: ['No', 'Yes'],
        default: 'No',
        when: (answers) => {
            return !answers.sites;
        }
    },
    {
        type: 'input',
        name: 'adminAPIName',
        message: 'Name:',
        when: (answers) => {
            return !answers.sites && answers.saveKey === 'Yes';
        },
        filter: async (answer) => {
            await storeNewSite({
                name: answer.trim(),
                url: process.env.GC_TOOLS_apiURL,
                key: process.env.GC_TOOLS_adminAPIKey
            });
            return answer;
        }
    }
];

async function ask(args = {}) {
    let {list, apiURL, adminAPIKey} = args;

    let discoverFromList = null;

    // If `-L` or `--list` is supplied, first offer the lost of saved sites
    if (list) {
        discoverFromList = await inquirer.prompt(savedSitesPrompts).then(async (answers) => {
            if (answers.sites === false) {
                return false;
            }

            return answers;
        });
    }

    // If a saved site was selected, set those values
    if (discoverFromList) {
        apiURL = discoverFromList.sites.url;
        adminAPIKey = discoverFromList.sites.key;
    }

    // If `-L` or `--list` was supplied and no site was selected, init the prompts to create & save a new site
    if (list && !discoverFromList) {
        await inquirer.prompt(newSitePrompts).then(async (answers) => {
            apiURL = answers.apiURL;
            adminAPIKey = answers.adminAPIKey;
        });
    }

    // If no API URL is found, prompt for it
    if (!apiURL) {
        const askForApiURL = await input.ask({
            message: `Admin API URL:`
        });
        apiURL = askForApiURL.result;
    }

    // If no API KEY is found, prompt for it
    if (!adminAPIKey) {
        const askForAdminAPIKey = await input.ask({
            message: `Admin API key:`
        });
        adminAPIKey = askForAdminAPIKey.result;
    }

    // Finally return the URL and KEY values
    return {
        apiURL,
        adminAPIKey
    };
}

module.exports.ask = ask;
