import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, '..', 'bin', 'cli.js');

function runCLI(args) {
    return new Promise((resolve) => {
        execFile('node', [cliPath, ...args], {timeout: 10000}, (error, stdout, stderr) => {
            resolve({
                exitCode: error ? error.code : 0,
                stdout,
                stderr
            });
        });
    });
}

describe('CLI smoke test', function () {
    test('--help loads all commands without errors', async function () {
        const result = await runCLI(['--help']);

        assert.strictEqual(result.exitCode, 0, `CLI exited with code ${result.exitCode}.\nstderr: ${result.stderr}`);
        assert.strictEqual(result.stderr, '', `Unexpected stderr output: ${result.stderr}`);
        assert.ok(result.stdout.includes('Commands:') || result.stdout.includes('Usage:'),
            'Expected help output to contain usage information');
    });
});
