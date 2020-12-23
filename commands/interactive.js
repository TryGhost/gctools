const inquirer = require('inquirer');
const tasks = require('../tasks');
const _ = require('lodash');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'i';

exports.group = 'Tools:';

// The command to run and any params
exports.flags = 'i';

// Description for the top level command
exports.desc = 'An interactive tool to work with Ghost content';

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
exports.run = async () => {
    const map = new Map(Object.entries(tasks));
    const choices = [];
    for (let value of map.values()) {
        choices.push(value.choice);
    }

    var toolsPrompt = {
        type: 'rawlist',
        name: 'tool',
        message: 'Which tool would you like to go?',
        choices: [
            ...choices,
            new inquirer.Separator(),
            {
                name: 'Abort',
                value: 'abort'
            }
        ]
    };

    inquirer.prompt(toolsPrompt).then((answers) => {
        if (answers.tool === 'abort') {
            ui.log.info('Aborted');
            process.exit(1);
        }

        let thisTool = _.filter(tasks, x => x.choice.value === answers.tool);
        thisTool[0].run();
    });
};
