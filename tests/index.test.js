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
import { createPlaywrightConfig, createPlaywrightProjects, waitForIdle } from '../src/index.js';

test('creates the supported browser and device matrix', () => {
  const projects = createPlaywrightProjects();

  assert.equal(projects.length, 12);
  assert.equal(new Set(projects.map(({ name }) => name)).size, projects.length);
  assert.equal(projects[0]?.use?.channel, 'chrome');
  assert.equal(projects[1]?.use?.channel, 'msedge');
  assert.equal(projects[2]?.use?.browserName, 'firefox');
  assert.equal(projects[3]?.use?.browserName, 'webkit');
  assert.equal(projects[4]?.use?.defaultBrowserType, 'chromium');
  assert.equal(projects[6]?.use?.defaultBrowserType, 'webkit');
  assert.equal(projects[8]?.use?.defaultBrowserType, 'chromium');
  assert.equal(projects[10]?.use?.defaultBrowserType, 'webkit');
  assert.deepEqual(projects[4]?.use?.viewport, {
    height: 732,
    width: 360,
  });
  assert.deepEqual(projects[11]?.use?.viewport, {
    height: 768,
    width: 1024,
  });
});

test('applies web server defaults to every configuration without mutating inputs', () => {
  const webServer = [
    {
      command: 'first',
      port: 3000,
    },
    {
      command: 'second',
      reuseExistingServer: true,
      timeout: 1234,
      url: 'http://localhost:3001/ready',
    },
  ];

  const config = createPlaywrightConfig({ webServer });

  assert.equal(Array.isArray(config.webServer), true);
  assert.deepEqual(config.webServer, [
    {
      command: 'first',
      port: 3000,
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: 'second',
      reuseExistingServer: true,
      timeout: 1234,
      url: 'http://localhost:3001/ready',
    },
  ]);
  assert.equal(webServer[0]?.reuseExistingServer, undefined);
  assert.equal(webServer[0]?.timeout, undefined);
});

test('applies defaults without hiding Playwright overrides', () => {
  const config = createPlaywrightConfig({
    failOnFlakyTests: false,
    forbidOnly: false,
    respectGitIgnore: false,
    retries: 4,
    testDir: './specs',
    timeout: 1234,
    use: {
      baseURL: 'http://localhost:60000',
      locale: 'cs',
      trace: 'off',
    },
    webServer: {
      command: 'example',
      timeout: 4321,
      url: 'http://localhost:60000/ready',
    },
  });

  assert.equal(config.projects?.length, 12);
  assert.equal(config.failOnFlakyTests, false);
  assert.equal(config.forbidOnly, false);
  assert.equal(config.respectGitIgnore, false);
  assert.equal(config.retries, 4);
  assert.equal(config.testDir, './specs');
  assert.equal(config.timeout, 1234);
  assert.equal(config.use?.baseURL, 'http://localhost:60000');
  assert.equal(config.use?.locale, 'cs');
  assert.equal(config.use?.screenshot, 'only-on-failure');
  assert.equal(config.use?.trace, 'off');
  assert.equal(Array.isArray(config.webServer), false);
  assert.equal(config.webServer?.reuseExistingServer, false);
  assert.equal(config.webServer?.timeout, 4321);
});

test('applies local and CI policy defaults', () => {
  const originalCI = process.env['CI'];

  try {
    delete process.env['CI'];

    const localConfig = createPlaywrightConfig();

    assert.equal(localConfig.failOnFlakyTests, false);
    assert.equal(localConfig.forbidOnly, false);
    assert.equal(localConfig.retries, 0);

    process.env['CI'] = 'true';

    const continuousIntegrationConfig = createPlaywrightConfig();

    assert.equal(continuousIntegrationConfig.failOnFlakyTests, true);
    assert.equal(continuousIntegrationConfig.forbidOnly, true);
    assert.equal(continuousIntegrationConfig.respectGitIgnore, true);
    assert.equal(continuousIntegrationConfig.retries, 2);
    assert.equal(continuousIntegrationConfig.testDir, './tests');
    assert.equal(continuousIntegrationConfig.use?.screenshot, 'only-on-failure');
    assert.equal(continuousIntegrationConfig.use?.trace, 'retain-on-first-failure');
  } finally {
    if (originalCI === undefined) {
      delete process.env['CI'];
    } else {
      process.env['CI'] = originalCI;
    }
  }
});

test('waits for page loading, fonts, light DOM images, shadow DOM images, and rendering', async () => {
  const originalDocument = globalThis.document;
  const originalHtmlImageElement = globalThis.HTMLImageElement;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const loadStates = [];
  const decodedImages = [];

  let animationFrames = 0;

  class TestImage {
    constructor(name) {
      this.name = name;
      this.shadowRoot = null;
    }

    async decode() {
      decodedImages.push(this.name);
    }
  }

  const shadowImage = new TestImage('shadow');

  const shadowRoot = {
    querySelectorAll: () => [shadowImage],
  };

  const lightImage = new TestImage('light');
  const host = { shadowRoot };

  try {
    globalThis.document = {
      fonts: {
        ready: Promise.resolve(),
      },
      querySelectorAll: () => [lightImage, host],
    };
    globalThis.HTMLImageElement = TestImage;

    globalThis.requestAnimationFrame = (callback) => {
      animationFrames += 1;
      callback();
    };

    await waitForIdle({
      evaluate: async (callback) => await callback(),
      waitForLoadState: async (state) => {
        loadStates.push(state);
      },
    });
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalHtmlImageElement === undefined) {
      delete globalThis.HTMLImageElement;
    } else {
      globalThis.HTMLImageElement = originalHtmlImageElement;
    }

    if (originalRequestAnimationFrame === undefined) {
      delete globalThis.requestAnimationFrame;
    } else {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    }
  }

  assert.deepEqual(loadStates, ['domcontentloaded', 'load', 'networkidle']);
  assert.deepEqual(decodedImages, ['light', 'shadow']);
  assert.equal(animationFrames, 2);
});
