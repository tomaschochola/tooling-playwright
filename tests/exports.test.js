import assert from 'node:assert/strict';
import test from 'node:test';
import * as tooling from '@tomaschochola/tooling-playwright';

test('exposes only the supported root API', () => {
    assert.deepEqual(Object.keys(tooling).sort(), [
        'assertNoAxeViolations',
        'assertNoConsoleErrors',
        'assertNoPageErrors',
        'assertPageStandardsMode',
        'assertStandardPage',
        'assertValidIds',
        'createPlaywrightConfig',
        'createPlaywrightDesktopProjects',
        'createPlaywrightPhoneProjects',
        'createPlaywrightProjects',
        'createPlaywrightTabletProjects',
        'navigateToPage',
        'scrollThroughPage',
        'waitForPageFonts',
        'waitForPageImages',
        'waitForPageRendering',
        'waitForPageResources',
    ]);
});

test('keeps implementation modules private', async () => {
    await Promise.all(
        ['browser', 'config'].map(
            async (moduleName) =>
                await assert.rejects(import(`@tomaschochola/tooling-playwright/${moduleName}`), {
                    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
                }),
        ),
    );
});
