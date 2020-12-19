#!/usr/bin/env node

const prettyCLI = require('@tryghost/pretty-cli');

prettyCLI.preface('Command line utilities for working with Ghost content');

prettyCLI.commandDirectory('../commands');

prettyCLI.style({
    usageCommandPlaceholder: () => '<source or utility>'
});

prettyCLI.groupOrder([
    'Tools:',
    'Content:',
    'Global Options:'
]);

prettyCLI.parseAndExit();
