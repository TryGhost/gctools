import {jest} from '@jest/globals';
import errors from '@tryghost/errors';

// Shared mockApi object
const mockApi = {
    members: {
        browse: jest.fn(),
        edit: jest.fn()
    }
};

describe('add-member-comp-from-csv', () => {
    let fsUtils;
    let getTiers;
    let addMemberCompFromCsv;
    let mockFsUtils;

    beforeAll(async () => {
        await jest.unstable_mockModule('@tryghost/mg-fs-utils', () => ({
            default: {
                csv: {
                    parseCSV: jest.fn()
                }
            }
        }));

        await jest.unstable_mockModule('@tryghost/admin-api', () => ({
            default: jest.fn(() => mockApi)
        }));

        await jest.unstable_mockModule('../lib/admin-api-call.js', () => ({
            getTiers: jest.fn()
        }));

        fsUtils = (await import('@tryghost/mg-fs-utils')).default;
        getTiers = (await import('../lib/admin-api-call.js')).getTiers;
        addMemberCompFromCsv = (await import('../tasks/add-member-comp-from-csv.js')).default;
    });

    beforeEach(() => {
        // Reset all mock functions
        mockApi.members.browse.mockReset();
        mockApi.members.edit.mockReset();
        mockFsUtils = fsUtils;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should successfully process valid CSV rows', async () => {
        const csvData = [
            {email: 'test1@example.com', expireAt: '2024-12-31', tierName: 'Premium'},
            {email: 'test2@example.com', expireAt: '2024-12-31', tierName: 'Basic'}
        ];
        mockFsUtils.csv.parseCSV.mockResolvedValue(csvData);

        mockApi.members.browse.mockImplementation(({filter}) => {
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
        getTiers.mockImplementation(() => Promise.resolve(tiers));

        mockApi.members.edit.mockImplementation(({id}) => {
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

        expect(mockApi.members.browse).toHaveBeenCalledTimes(2);
        expect(mockApi.members.edit).toHaveBeenCalledTimes(2);
    });

    test('should handle missing members', async () => {
        const csvData = [
            {email: 'nonexistent@example.com', expireAt: '2024-12-31', tierName: 'Premium'}
        ];
        mockFsUtils.csv.parseCSV.mockResolvedValue(csvData);

        mockApi.members.browse.mockResolvedValue([]);

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await expect(task.run()).rejects.toThrow('Failed to process some rows');
    });

    test('should handle missing tiers', async () => {
        const csvData = [
            {email: 'test@example.com', expireAt: '2024-12-31', tierName: 'NonexistentTier'}
        ];
        mockFsUtils.csv.parseCSV.mockResolvedValue(csvData);

        mockApi.members.browse.mockResolvedValue([{id: '1', email: 'test@example.com'}]);

        const tiers = [{id: 'tier1', name: 'Premium'}];
        getTiers.mockImplementation(() => Promise.resolve(tiers));

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await expect(task.run()).rejects.toThrow('Failed to process some rows');
    });

    test('should handle API errors', async () => {
        const csvData = [
            {email: 'test@example.com', expireAt: '2024-12-31', tierName: 'Premium'}
        ];
        mockFsUtils.csv.parseCSV.mockResolvedValue(csvData);

        mockApi.members.browse.mockResolvedValue([{id: '1', email: 'test@example.com'}]);

        const tiers = [{id: 'tier1', name: 'Premium'}];
        getTiers.mockImplementation(() => Promise.resolve(tiers));

        mockApi.members.edit.mockRejectedValue(new errors.ValidationError({
            message: 'Invalid data',
            context: 'The provided data is invalid'
        }));

        const task = addMemberCompFromCsv.getTaskRunner({
            apiURL: 'http://localhost:2368',
            adminAPIKey: 'test-key',
            csvPath: 'test.csv'
        });

        await expect(task.run()).rejects.toThrow('Failed to process some rows');
    });
}); 