import {describe, test, mock, before, beforeEach} from 'node:test';
import assert from 'node:assert/strict';

// Shared mockApi object
const mockApi = {
    members: {
        browse: mock.fn(),
        edit: mock.fn()
    }
};

const mockParseCSV = mock.fn();
const mockGetTiers = mock.fn();

// Mock bluebird to use native Promise — avoids V8 structured clone
// serialization issues with bluebird promise objects in node:test IPC
const NativePromise = Promise;
NativePromise.mapSeries = async (arr, fn) => {
    const results = [];
    for (let i = 0; i < arr.length; i++) {
        results.push(await fn(arr[i], i));
    }
    return results;
};
NativePromise.delay = ms => new NativePromise(resolve => setTimeout(resolve, ms));
mock.module('bluebird', {
    defaultExport: NativePromise
});

mock.module('@tryghost/mg-fs-utils', {
    defaultExport: {
        csv: {
            parseCSV: mockParseCSV
        }
    }
});

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return mockApi;
    }
});

mock.module('../lib/admin-api-call.js', {
    namedExports: {getTiers: mockGetTiers}
});

// Mock @tryghost/errors to avoid serialization issues with custom error classes
// in the node:test child process IPC
class MockInternalServerError extends Error {
    constructor({message, context}) {
        super(message);
        this.context = context;
    }
}
mock.module('@tryghost/errors', {
    defaultExport: {InternalServerError: MockInternalServerError}
});

describe('add-member-comp-from-csv', () => {
    let addMemberCompFromCsv;

    before(async () => {
        addMemberCompFromCsv = (await import('../tasks/add-member-comp-from-csv.js')).default;
    });

    beforeEach(() => {
        mockApi.members.browse.mock.resetCalls();
        mockApi.members.edit.mock.resetCalls();
        mockParseCSV.mock.resetCalls();
        mockGetTiers.mock.resetCalls();
    });

    test('should successfully process valid CSV rows', async () => {
        const csvData = [
            {email: 'test1@example.com', expireAt: '2024-12-31', tierName: 'Premium'},
            {email: 'test2@example.com', expireAt: '2024-12-31', tierName: 'Basic'}
        ];
        mockParseCSV.mock.mockImplementation(() => Promise.resolve(csvData));

        mockApi.members.browse.mock.mockImplementation(({filter}) => {
            if (filter === 'email:test1@example.com') {
                return Promise.resolve([{id: '1', email: 'test1@example.com'}]);
            }
            if (filter === 'email:test2@example.com') {
                return Promise.resolve([{id: '2', email: 'test2@example.com'}]);
            }
            return Promise.resolve([]);
        });

        const tiers = [
            {id: 'tier1', name: 'Premium'},
            {id: 'tier2', name: 'Basic'}
        ];
        mockGetTiers.mock.mockImplementation(() => Promise.resolve(tiers));

        mockApi.members.edit.mock.mockImplementation(({id}) => {
            return Promise.resolve({
                id,
                email: id === '1' ? 'test1@example.com' : 'test2@example.com',
                tiers: [{id: id === '1' ? 'tier1' : 'tier2', name: id === '1' ? 'Premium' : 'Basic'}]
            });
        });

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await task.run();

        assert.strictEqual(mockApi.members.browse.mock.callCount(), 2);
        assert.strictEqual(mockApi.members.edit.mock.callCount(), 2);
    });

    test('should handle missing members', async () => {
        const csvData = [
            {email: 'nonexistent@example.com', expireAt: '2024-12-31', tierName: 'Premium'}
        ];
        mockParseCSV.mock.mockImplementation(() => Promise.resolve(csvData));

        mockApi.members.browse.mock.mockImplementation(() => Promise.resolve([]));

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await assert.rejects(task.run(), /Failed to process some rows/);
    });

    test('should handle missing tiers', async () => {
        const csvData = [
            {email: 'test@example.com', expireAt: '2024-12-31', tierName: 'NonexistentTier'}
        ];
        mockParseCSV.mock.mockImplementation(() => Promise.resolve(csvData));

        mockApi.members.browse.mock.mockImplementation(() => Promise.resolve([{id: '1', email: 'test@example.com'}]));

        const tiers = [{id: 'tier1', name: 'Premium'}];
        mockGetTiers.mock.mockImplementation(() => Promise.resolve(tiers));

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await assert.rejects(task.run(), /Failed to process some rows/);
    });

    test('should handle API errors', async () => {
        const csvData = [
            {email: 'test@example.com', expireAt: '2024-12-31', tierName: 'Premium'}
        ];
        mockParseCSV.mock.mockImplementation(() => Promise.resolve(csvData));

        mockApi.members.browse.mock.mockImplementation(() => Promise.resolve([{id: '1', email: 'test@example.com'}]));

        const tiers = [{id: 'tier1', name: 'Premium'}];
        mockGetTiers.mock.mockImplementation(() => Promise.resolve(tiers));

        const validationError = new MockInternalServerError({
            message: 'Invalid data',
            context: 'The provided data is invalid'
        });
        mockApi.members.edit.mock.mockImplementation(() => Promise.reject(validationError));

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await assert.rejects(task.run(), /Failed to process some rows/);
    });
});
