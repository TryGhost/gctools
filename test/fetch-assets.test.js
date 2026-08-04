import {describe, test, mock, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import errors from '@tryghost/errors';

const jsonDir = '/tmp/mg/abc123/zip';

const mockWriteUpdatedJson = mock.fn(() => Promise.resolve());
const mockInit = mock.fn(() => Promise.resolve());
const mockGetTasks = mock.fn(() => []);

mock.module('@tryghost/mg-assetscraper-db', {
    defaultExport: function MgAssetScraperDb() {
        return {
            init: mockInit,
            getTasks: mockGetTasks,
            writeUpdatedJson: mockWriteUpdatedJson
        };
    }
});

const mockZipWrite = mock.fn(() => Promise.resolve({path: '/tmp/out.zip', size: 1024}));

mock.module('@tryghost/mg-fs-utils', {
    defaultExport: {
        FileCache: function FileCache() {
            return {
                jsonDir: jsonDir,
                zipDir: jsonDir,
                defaultZipFileName: 'gh-example-123.zip'
            };
        },
        zip: {
            write: mockZipWrite
        }
    }
});

describe('Fetch assets', function () {
    beforeEach(() => {
        mockWriteUpdatedJson.mock.resetCalls();
        mockZipWrite.mock.resetCalls();
    });

    test('writes the updated JSON to a file path, not to the JSON directory', async function () {
        const fetchAssets = await import('../tasks/fetch-assets.js');
        const runner = fetchAssets.default.getTaskRunner({
            jsonFile: '/tmp/example.ghost.json',
            zip: false,
            verbose: false
        });

        await runner.run({errors: []});

        assert.strictEqual(mockWriteUpdatedJson.mock.callCount(), 1);

        const [outputPath] = mockWriteUpdatedJson.mock.calls[0].arguments;
        assert.notStrictEqual(outputPath, jsonDir, 'must not pass the directory itself — writeFile would throw EISDIR');
        assert.strictEqual(outputPath, join(jsonDir, 'ghost-import.json'));
    });
});

describe('Fetch assets command', function () {
    beforeEach(() => {
        mockWriteUpdatedJson.mock.resetCalls();
        mockZipWrite.mock.resetCalls();
    });

    test('does not throw when an earlier task failed and no zip was produced', async function () {
        mockWriteUpdatedJson.mock.mockImplementationOnce(() => {
            return Promise.reject(new errors.InternalServerError({message: 'EISDIR: illegal operation on a directory'}));
        });

        const command = await import('../commands/fetch-assets.js');

        await assert.doesNotReject(async () => {
            await command.default.run({jsonFile: '/tmp/example.ghost.json', zip: true, verbose: false});
        });

        assert.strictEqual(mockZipWrite.mock.callCount(), 0, 'zip must not be reported when it never ran');
    });
});
