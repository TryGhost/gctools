import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';

const readCSV = (options) => {
    return {
        title: 'Reading members CSV',
        task: async (ctx, task) => {
            ctx.members = await fsUtils.csv.parseCSV(options.csvPath);
            ctx.membersA = [];
            ctx.membersB = [];

            task.output = `Read ${ctx.members.length} members from ${options.csvPath}`;
        }
    };
};

const sortAndSplit = () => {
    return {
        title: 'Sorting and splitting members',
        task: (ctx, task) => {
            ctx.members.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            ctx.membersA = ctx.members.filter((member, i) => i % 2 === 0);
            ctx.membersB = ctx.members.filter((member, i) => i % 2 === 1);

            task.output = `Split ${ctx.members.length} members into A (${ctx.membersA.length}) and B (${ctx.membersB.length})`;
        }
    };
};

const writeCSVFiles = (options) => {
    return {
        title: 'Writing CSV files',
        task: async (ctx, task) => {
            const outputDir = options.output || '.';
            const baseName = options.baseName || 'members';

            await fs.ensureDir(outputDir);

            const allPath = `${outputDir}/${baseName}-all.csv`;
            const aPath = `${outputDir}/${baseName}-a.csv`;
            const bPath = `${outputDir}/${baseName}-b.csv`;

            await fs.writeFile(allPath, fsUtils.csv.jsonToCSV(ctx.members));
            await fs.writeFile(aPath, fsUtils.csv.jsonToCSV(ctx.membersA));
            await fs.writeFile(bPath, fsUtils.csv.jsonToCSV(ctx.membersB));

            task.output = `Wrote ${allPath}, ${aPath}, ${bPath}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        readCSV(options),
        sortAndSplit(),
        writeCSVFiles(options)
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    readCSV,
    getFullTaskList,
    getTaskRunner
};
