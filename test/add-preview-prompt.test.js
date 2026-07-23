import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import addPreviewPrompt from '../prompts/add-preview.js';

describe('Add public preview prompt', function () {
    test('uses Inquirer input for the preview position', function () {
        const previewPosition = addPreviewPrompt.options.find(option => option.name === 'previewPosition');

        assert.ok(previewPosition);
        assert.strictEqual(previewPosition.type, 'input');
    });
});
