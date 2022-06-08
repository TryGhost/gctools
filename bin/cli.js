#!/usr/bin/env node

import prettyCLI from '@tryghost/pretty-cli';

prettyCLI.preface('Command line utilities for working with Ghost content');

// Note: sywac does not fully support ESM yet. `commandDirectory`
// relies on `require()`, but this workaround _does_ work
import * as tools from '../commands/index.js';
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
