import chalk from 'chalk';
import indentString from 'indent-string';
import elegantSpinner from 'elegant-spinner';

const pointer = chalk.yellow('›');
const skipped = chalk.yellow('↓');

export const isDefined = x => x !== null && x !== undefined;

export const getSymbol = (task, options) => {
    if (!task.spinner) {
        task.spinner = elegantSpinner();
    }

    if (task.isPending()) {
        if (options.showSubtasks !== false && task.subtasks && task.subtasks.length) {
            return pointer;
        } else {
            return chalk.yellow(task.spinner());
        }
    }

    if (task.isCompleted()) {
        return chalk.green('✔');
    }

    if (task.hasFailed()) {
        return task.subtasks.length > 0 ? pointer : chalk.red('✖');
    }

    if (task.isSkipped()) {
        return skipped;
    }

    return ' ';
};

export const indentedString = (string, level) => indentString(string, level, '  ');

/**
 * Outputs the task number in the form 05/10, so that the output doesn't jump around
 */
export const taskNumber = (index, tasks) => {
    // Quick and dirty left pad
    let padSize = String(tasks.length).length;
    let padding = new Array(padSize).join(0);
    let taskNum = `${padding}${index + 1}`.slice(-padSize);

    return `${taskNum}/${tasks.length}`;
};
