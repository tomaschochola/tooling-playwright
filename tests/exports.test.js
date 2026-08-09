/**
 * @file
 * @author Tomáš Chochola <tomaschochola@tomaschochola.cz>
 * @copyright © 2026 Tomáš Chochola <tomaschochola@tomaschochola.cz>
 *
 * @license CC-BY-ND-4.0
 *
 * @see {@link https://creativecommons.org/licenses/by-nd/4.0/} License
 * @see {@link https://github.com/tomaschochola} GitHub Profile
 * @see {@link https://github.com/sponsors/tomaschochola} GitHub Sponsors
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import * as tooling from '@tomaschochola/tooling-playwright';

test('exposes only the supported root API', () => {
  assert.deepEqual(Object.keys(tooling).sort(), [
    'assertNoAxeViolations',
    'createPlaywrightConfig',
    'createPlaywrightDesktopProjects',
    'createPlaywrightPhoneProjects',
    'createPlaywrightProjects',
    'createPlaywrightTabletProjects',
    'waitForPageDomContentLoaded',
    'waitForPageFonts',
    'waitForPageImages',
    'waitForPageLoad',
    'waitForPageNetworkIdle',
    'waitForPageReady',
    'waitForPageRendering',
    'waitForPageResources',
  ]);
});

test('keeps implementation modules private', async () => {
  await assert.rejects(import('@tomaschochola/tooling-playwright/config'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
});
