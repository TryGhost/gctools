import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('CLI smoke test', function () {
    test('`node bin/cli.js --help` exits cleanly and lists the registered commands', async function () {
        const { stdout } = await execFileAsync('node', ['bin/cli.js', '--help'], {
            cwd: repoRoot,
        });

        // A sample from each command group proves pretty-cli booted and every
        // command module registered: Interactive, Tools, Content, and Members
        assert.match(stdout, /^\s*i\s{2,}/m, 'lists the interactive command');
        assert.match(stdout, /zip-split/, 'lists zip-split (Tools)');
        assert.match(stdout, /random-posts/, 'lists random-posts (Content)');
        assert.match(stdout, /delete-labels/, 'lists delete-labels (Members)');
        assert.match(stdout, /seed-demo/, 'lists seed-demo');
        assert.match(stdout, /update-posts-from-json/, 'lists update-posts-from-json');
        assert.match(stdout, /update-staff-bio/, 'lists update-staff-bio (Staff)');
    });

    test('`node bin/cli.js --help` for a single command prints its options', async function () {
        const { stdout } = await execFileAsync('node', ['bin/cli.js', 'delete-labels', '--help'], {
            cwd: repoRoot,
        });

        assert.match(stdout, /delete-labels <apiURL> <adminAPIKey>/);
        assert.match(stdout, /--dryRun/);
    });

    test('update-staff-bio help documents CSV input and update options', async function () {
        const { stdout } = await execFileAsync(
            'node',
            ['bin/cli.js', 'update-staff-bio', '--help'],
            {
                cwd: repoRoot,
            },
        );

        assert.match(stdout, /update-staff-bio <apiURL> <adminAPIKey> <csvPath>/);
        assert.match(stdout, /slug, bio/);
        assert.match(stdout, /--delayBetweenCalls/);
        assert.match(stdout, /--verbose/);
    });
});
