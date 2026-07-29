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
import { createPlaywrightConfig, createPlaywrightProjects } from '../src/index.js';

test('creates the supported browser and device matrix', () => {
  const projects = createPlaywrightProjects();

  assert.equal(projects.length, 12);
  assert.equal(projects[0]?.use?.channel, 'chrome');
  assert.equal(projects[1]?.use?.channel, 'msedge');
  assert.equal(projects[2]?.use?.browserName, 'firefox');
  assert.equal(projects[3]?.use?.browserName, 'webkit');
  assert.deepEqual(projects[4]?.use?.viewport, {
    height: 732,
    width: 360,
  });
  assert.deepEqual(projects[11]?.use?.viewport, {
    height: 768,
    width: 1024,
  });
});

test('applies defaults without hiding Playwright overrides', () => {
  const config = createPlaywrightConfig({
    retries: 4,
    timeout: 1234,
    use: {
      baseURL: 'http://localhost:60000',
      locale: 'cs',
    },
    webServer: {
      command: 'example',
      timeout: 4321,
      url: 'http://localhost:60000/ready',
    },
  });

  assert.equal(config.projects?.length, 12);
  assert.equal(config.retries, 4);
  assert.equal(config.timeout, 1234);
  assert.equal(config.use?.baseURL, 'http://localhost:60000');
  assert.equal(config.use?.locale, 'cs');
  assert.equal(config.use?.screenshot, 'only-on-failure');
  assert.equal(Array.isArray(config.webServer), false);
  assert.equal(config.webServer?.reuseExistingServer, false);
  assert.equal(config.webServer?.timeout, 4321);
});
