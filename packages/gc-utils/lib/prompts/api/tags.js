import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import _ from 'lodash';
import {getResources} from '../../batch-ops.js';
import input from '../basic/input.js';

async function fetchTags(args = {}) {
    let apiTags = await getResources({
        api: args.api,
        type: 'tags',
        order: 'slug ASC'
    });

    let theTags = [];

    apiTags.forEach(function (tag){
        theTags.push({
            name: `${tag.name} - ${tag.slug} - ${tag.count.posts} posts`,
            value: tag
        });
    });

    if (args.addNew === true) {
        theTags.push({
            name: 'Add new tag',
            value: {
                addNewTag: true
            }
        });
    }

    return theTags;
}

async function tags(args = {}) {
    const options = [
        {
            type: 'search-checkbox',
            name: 'tags',
            message: args.message || `Tags ${chalk.yellow('[Type to search]')}`,
            pageSize: 20,
            choices: function () {
                return fetchTags({
                    api: args.api,
                    addNew: args.addNew
                });
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        if (args.addNew === true) {
            const showNewTagPrompt = _.find(answers.tags, {addNewTag: true});
            if (showNewTagPrompt) {
                const newTagname = await input({
                    message: 'New tag name (not slug)'
                });

                answers.tags = _.reject(answers.tags, {addNewTag: true});

                answers.tags.push({
                    name: newTagname,
                    slug: newTagname
                });
            }
        }

        return answers.tags;
    });
}

export default tags;
