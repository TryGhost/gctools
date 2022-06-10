import SywacApi from 'sywac/api';
import {buildParams, buildParamDescriptions, buildArguments} from '../lib/build-sywac-values.js';

const options = {
    params: {
        apiURL: {
            required: true,
            desc: 'URL to your Ghost API'
        },
        adminAPIKey: {
            required: true,
            desc: 'Admin API key'
        },
        jsonFile: {
            required: false,
            desc: 'A valid JSON file'
        }
    },
    arguments: {
        verbose: {
            type: 'boolean',
            flags: '-V --verbose',
            defaultValue: false,
            desc: 'Show verbose output'
        },
        visibility: {
            type: 'enumeration',
            flags: '--visibility',
            defaultValue: 'all',
            choices: ['all', 'public', 'members', 'paid'],
            desc: 'Post visibility'
        },
        status: {
            type: 'array',
            flags: '--status',
            defaultValue: 'public',
            choices: ['all', 'public', 'private', 'draft'],
            desc: 'Post visibility'
        },
        tag: {
            type: 'string',
            flags: '--tag',
            defaultValue: 'My New Tag',
            desc: 'Filter by tag'
        },
        howMany: {
            type: 'number',
            flags: '--howMany',
            defaultValue: 50,
            desc: 'The delay between API calls, in ms'
        }
    }
};

describe('Build Sywac values', function () {
    test('can create the parameter signature', async function () {
        const params = buildParams(options.params);
        expect(params).toBeString();
        expect(params).toEqual('<apiURL> <adminAPIKey> [jsonFile]');
    });

    it('can create a the Sywac parameter description array', async function () {
        const params = buildParamDescriptions(options.params);
        expect(params).toBeArray();
        expect(params).toHaveLength(3);
        expect(params[0]).toEqual('URL to your Ghost API');
        expect(params[1]).toEqual('Admin API key');
        expect(params[2]).toEqual('A valid JSON file');
    });

    it('can build Sywac options', async function () {
        const newish = SywacApi.get();
        buildArguments(newish, options.arguments);
        newish.parseAndExit();

        newish.parseAndExit().then(argv => {
            expect(argv).toEqual({
                _: [],
                V: false,
                howMany: 50,
                status: ['public'],
                tag: 'My New Tag',
                verbose: false,
                visibility: 'all'
            });
        });
    });
});
