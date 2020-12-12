#!/usr/bin/env node

// console.log("Hello world");

const prettyCLI = require('@tryghost/pretty-cli');

prettyCLI.preface('Command line utilities for working with Ghost content');

prettyCLI.commandDirectory('../commands');

prettyCLI.style({
    usageCommandPlaceholder: () => '<source or utility>'
});

prettyCLI.groupOrder([
    'Tools:',
    'Global Options:'
]);

prettyCLI.parseAndExit();
