# gctools - Ghost Content Tools

CLI utilities for working with Ghost CMS content via the Admin API.

**Use `yarn` (not npm) for running scripts and installing dependencies.**

## Architecture Overview

```
gctools/
├── bin/cli.js          # Entry point - registers all commands with prettyCLI
├── commands/           # CLI command definitions (flags, options, run function)
├── tasks/              # Core business logic (API calls, data processing)
├── prompts/            # Interactive mode definitions (inquirer prompts)
├── lib/                # Shared utilities
└── test/               # Jest tests
```

## Adding a New Feature

To add a new command, create/modify these files:

### 1. `tasks/<feature>.js` - Business Logic

```javascript
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => ({
    title: 'Initialising API connection',
    task: (ctx, task) => {
        ctx.api = new GhostAdminAPI({
            url: options.apiURL.replace('localhost', '127.0.0.1'),
            key: options.adminAPIKey,
            version: 'v5.0'
        });
        ctx.updated = [];
    }
});

const getFullTaskList = (options) => [
    initialise(options),
    {
        title: 'Fetch content',
        task: async (ctx, task) => {
            ctx.posts = await discover({api: ctx.api, type: 'posts', ...});
        }
    },
    {
        title: 'Process content',
        task: async (ctx) => {
            // Return nested task runner for per-item progress
            return makeTaskRunner(tasks, {concurrent: 1});
        }
    }
];

const getTaskRunner = (options) => {
    return makeTaskRunner(getFullTaskList(options), {topLevel: true, ...options});
};

export default { initialise, getFullTaskList, getTaskRunner };
```

### 2. `commands/<feature>.js` - CLI Definition

```javascript
import {ui} from '@tryghost/pretty-cli';
import featureTask from '../tasks/<feature>.js';

const id = 'feature-name';
const group = 'Content:';  // or 'Members:', 'Tools:', 'Beta:'
const flags = 'feature-name <apiURL> <adminAPIKey>';
const desc = 'Description of what this does';
const paramsDesc = ['URL to your Ghost API', 'Admin API key'];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {defaultValue: false, desc: 'Show verbose output'});
    sywac.string('--option', {defaultValue: null, desc: 'Option description'});
    sywac.enumeration('--choice', {defaultValue: 'all', choices: ['all', 'a', 'b']});
};

const run = async (argv) => {
    let context = {errors: []};
    let runner = featureTask.getTaskRunner(argv);
    await runner.run(context);
    ui.log.ok(`Successfully updated ${context.updated.length} items.`);
};

export default { id, group, flags, desc, paramsDesc, setup, run };
```

### 3. `prompts/<feature>.js` - Interactive Mode

```javascript
import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import {ui} from '@tryghost/pretty-cli';
import featureTask from '../tasks/<feature>.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {getAPITagsObj, getAPIAuthorsObj} from '../lib/ghost-api-choices.js';

const choice = {
    name: 'Menu item name',
    value: 'featureName'  // Used to identify in interactive.js
};

const options = [
    ...ghostAPICreds,  // API URL and key prompts
    // Add feature-specific prompts
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let context = {errors: []};
        let runner = featureTask.getTaskRunner(answers);
        await runner.run(context);
        ui.log.ok(`Done.`);
    });
}

export default { choice, options, run };
```

### 4. Register the Feature

**`prompts/index.js`** - Add import and export:
```javascript
import featureName from './feature-name.js';
// In export default: featureName,
```

**`commands/interactive.js`** - Add to menu (find appropriate section):
```javascript
{
    name: tasks.featureName.choice.name,
    value: tasks.featureName.choice.value
},
```

**`bin/cli.js`** - Register CLI command:
```javascript
import featureName from '../commands/feature-name.js';
// ...
prettyCLI.command(featureName);
```

## Key Libraries

- `@tryghost/admin-api` - Ghost Admin API client
- `@tryghost/listr-smart-renderer` - Task runner with progress display (`makeTaskRunner`)
- `@tryghost/pretty-cli` - CLI framework (wraps sywac)
- `inquirer` - Interactive prompts

**Note:** Use native promises and `async/await`, not Bluebird. Use `sleep()` from `lib/utils.js` for delays.

## Common Patterns

### Filtering Posts
```javascript
let filter = [];
if (options.status !== 'all') filter.push(`status:[${options.status}]`);
if (options.visibility !== 'all') filter.push(`visibility:[${options.visibility}]`);
if (options.tag) filter.push(`tags:[${transformToCommaString(options.tag, 'slug')}]`);
if (options.author) filter.push(`author:[${transformToCommaString(options.author, 'slug')}]`);
// Join with '+' for AND logic
discover({...options, filter: filter.join('+')});
```

### API Edit Call
```javascript
await ctx.api.posts.edit({
    id: post.id,
    updated_at: post.updated_at,  // Required for optimistic locking
    // ... fields to update
});
```

### Processing Items with Progress
```javascript
import {sleep} from '../lib/utils.js';

for (const post of ctx.posts) {
    tasks.push({
        title: post.title,
        task: async () => {
            // Process post
            await sleep(options.delayBetweenCalls);
        }
    });
}
return makeTaskRunner(tasks, {concurrent: 1});
```

## Utility Functions (`lib/utils.js`)

- `transformToCommaString(array, key)` - Convert `[{slug: 'a'}, {slug: 'b'}]` to `'a,b'`
- `maybeStringToArray(input)` - Convert `'a, b, c'` to `['a', 'b', 'c']`
- `sleep(ms)` - Promise-based delay

## Testing

```bash
yarn test  # Runs Jest + ESLint
```

Tests are in `test/` directory. Mock the Ghost API client for unit tests.

## Command Groups

- `Interactive:` - The `i` command for menu-driven mode
- `Tools:` - File utilities (zip, json splitting)
- `Content:` - Post/page API operations
- `Members:` - Member API operations
- `Beta:` - Experimental features
