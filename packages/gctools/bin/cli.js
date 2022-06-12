#!/usr/bin/env node

import prettyCLI from '@tryghost/pretty-cli';

// The first 2 values are the node.js path and the path to this file
// Usable values are from the 3rd onwards, so remove them for this list
const args = process.argv.slice(2);

import * as tools from '../lib/commands.js';
import interactive from '../lib/interactive.js';

// If the only arg supplied is `i`, show the list of tolls
if (args.length === 1 && args[0] === 'i') {
    interactive();
} else {
    prettyCLI.preface('Command line utilities for working with Ghost content');

    // Note: sywac does not fully support ESM yet. `commandDirectory`
    // relies on `require()`, but this workaround _does_ work
    Object.values(tools).forEach((tool) => {
        prettyCLI.command(tool.flags, tool);
    });

    prettyCLI.style({
        usageCommandPlaceholder: () => '<source or utility>'
    });

    prettyCLI.groupOrder([
        'Tools:',
        'Content:',
        'Global Options:'
    ]);

    prettyCLI.parseAndExit();
}
