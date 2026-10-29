import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { glob } from 'glob';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Every module in these directories must be importable: a broken import chain
// (a renamed file, a dropped dependency, an ESM/CJS mismatch) fails here even
// when no other test exercises the module
const moduleFiles = async (pattern) => {
    const files = await glob(pattern, { cwd: repoRoot, posix: true });
    assert.ok(files.length > 0, `found no modules matching ${pattern}`);
    return files.sort();
};

const importModule = (file) => import(pathToFileURL(path.join(repoRoot, file)).href);

describe('Module smoke test', function () {
    test('every command module imports and exports a command definition', async function () {
        for (const file of await moduleFiles('commands/*.js')) {
            const module = await importModule(file);
            assert.ok(module.default, `${file} has no default export`);
            assert.strictEqual(
                typeof module.default,
                'object',
                `${file} default export is not an object`,
            );
            assert.strictEqual(typeof module.default.id, 'string', `${file} has no command id`);
            assert.strictEqual(
                typeof module.default.run,
                'function',
                `${file} has no run function`,
            );
        }
    });

    test('every prompt module imports and exports a prompt definition', async function () {
        for (const file of await moduleFiles('prompts/*.js')) {
            const module = await importModule(file);
            assert.ok(module.default, `${file} has no default export`);
            assert.strictEqual(
                typeof module.default,
                'object',
                `${file} default export is not an object`,
            );
            if (file !== 'prompts/index.js') {
                assert.strictEqual(
                    typeof module.default.run,
                    'function',
                    `${file} has no run function`,
                );
                assert.strictEqual(
                    typeof module.default.choice,
                    'object',
                    `${file} has no choice object`,
                );
            }
        }
    });

    test('every task module imports and exports a default', async function () {
        for (const file of await moduleFiles('tasks/*.js')) {
            const module = await importModule(file);
            assert.ok(module.default, `${file} has no default export`);
        }
    });

    test('every lib module imports', async function () {
        for (const file of await moduleFiles('lib/**/*.js')) {
            const module = await importModule(file);
            assert.ok(module, `${file} did not resolve`);
        }
    });

    test('every question module imports', async function () {
        for (const file of await moduleFiles('questions/*.js')) {
            const module = await importModule(file);
            assert.ok(module, `${file} did not resolve`);
        }
    });
});
