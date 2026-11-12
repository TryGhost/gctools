import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { silentRenderer } from './helpers/silent-renderer.js';

const mockRead = mock.fn();
mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return { posts: { read: mockRead } };
    },
});

const { default: inlineMedia } = await import('../tasks/inline-media.js');

async function discoverRawMedia(format, urls, assetDomains) {
    const html = urls.map((url) => `<a href="${url}">Download</a>`).join('');
    const content =
        format === 'lexical'
            ? { root: { children: [{ type: 'html', html }] } }
            : { cards: [['html', { html }]] };
    mockRead.mock.mockImplementation(async () => ({
        id: 'post-1',
        title: 'Raw HTML links',
        [format]: JSON.stringify(content),
    }));

    const context = { errors: [] };
    await inlineMedia
        .getTaskRunner({
            ...silentRenderer,
            apiURL: 'https://my-site.example',
            adminAPIKey: 'key',
            type: ['posts'],
            id: 'post-1',
            dryRun: true,
            assetDomains,
        })
        .run(context);
    assert.deepEqual(context.errors, []);
    return context.posts[0].externalMedia;
}

describe('Inline media raw-content discovery', () => {
    for (const format of ['lexical', 'mobiledoc']) {
        test(`discovers and deduplicates links in ${format}`, async () => {
            const url = 'https://assets.example.com/file.pdf';
            assert.deepEqual(await discoverRawMedia(format, [url, url], ['assets.example.com']), [
                url,
            ]);
        });

        test(`treats regex characters in ${format} asset domains literally`, async () => {
            const domains = ['assets+media.example.com', 'assets(media).example.com'];
            const urls = domains.map((domain) => `https://${domain}/file.pdf`);
            assert.deepEqual(await discoverRawMedia(format, urls, domains), urls);
        });

        for (const domain of ['assets[.example.com', String.raw`assets\\(.example.com`]) {
            test(`handles ${JSON.stringify(domain)} without aborting ${format} discovery`, async () => {
                const url = 'https://assets.example.com/file.pdf';
                assert.deepEqual(
                    await discoverRawMedia(format, [url], [domain, 'assets.example.com']),
                    [url],
                );
            });
        }
    }
});
