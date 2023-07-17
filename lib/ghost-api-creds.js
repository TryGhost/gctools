import inquirer from 'inquirer';
import {join} from 'node:path';
import {homedir} from 'node:os';
import fs from 'fs-extra';
import GhostAdminAPI from '@tryghost/admin-api';

// /Users/yournamehere/.gctools/gctools_sites.json
// ~/.gctools/gctools_sites.json
const sitesJSONFile = join(homedir(), '.gctools', 'gctools_sites.json');

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
                    url: site.url.replace('localhost', '127.0.0.1'),
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

const opts = [
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
    },
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

const adminClient = async () => {
    return await inquirer.prompt(opts).then(async (answers) => {
        answers.api = new GhostAdminAPI({
            url: answers.apiURL.replace('localhost', '127.0.0.1'),
            key: answers.adminAPIKey,
            version: 'v5.0'
        });

        return answers;
    });
};

// TODO: Remove this default export when all tools have been updated
export default opts;
export {
    adminClient
};
