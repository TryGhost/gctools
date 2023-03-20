import {join} from 'node:path';
import {URL} from 'node:url';
import {existsSync, mkdirSync} from 'node:fs';

const __dirname = new URL('.', import.meta.url).pathname;
const logPath = join(__dirname, '../', './logs');

if (!existsSync(logPath)){
    mkdirSync(logPath);
}

let logOpts = {
    name: 'gcTools',
    mode: 'long',
    level: 'info',
    transports: ['file'],
    path: logPath
};

export default logOpts;
