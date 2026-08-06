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

import { defineConfig, devices, expect } from '@playwright/test';

const defaultTimeout = 5 * 60 * 1000;

function applyWebServerDefaults(webServer) {
  const apply = (configuration) => ({
    reuseExistingServer: false,
    timeout: defaultTimeout,
    ...configuration,
  });

  return Array.isArray(webServer) ? webServer.map(apply) : apply(webServer);
}

export function createPlaywrightProjects() {
  return [
    {
      name: 'Google Chrome stable desktop landscape (1920x1080)',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: {
          height: 1080,
          width: 1920,
        },
      },
    },
    {
      name: 'Microsoft Edge stable desktop landscape (1920x1080)',
      use: {
        browserName: 'chromium',
        channel: 'msedge',
        viewport: {
          height: 1080,
          width: 1920,
        },
      },
    },
    {
      name: 'Firefox desktop landscape (1920x1080)',
      use: {
        browserName: 'firefox',
        viewport: {
          height: 1080,
          width: 1920,
        },
      },
    },
    {
      name: 'WebKit desktop landscape (1920x1080)',
      use: {
        browserName: 'webkit',
        viewport: {
          height: 1080,
          width: 1920,
        },
      },
    },
    {
      name: 'Chromium Pixel 9 emulation portrait (360x732)',
      use: {
        ...devices['Pixel 9'],
      },
    },
    {
      name: 'Chromium Pixel 9 emulation landscape (756x308)',
      use: {
        ...devices['Pixel 9 landscape'],
      },
    },
    {
      name: 'WebKit iPhone SE (3rd gen) emulation portrait (375x667)',
      use: {
        ...devices['iPhone SE (3rd gen)'],
      },
    },
    {
      name: 'WebKit iPhone SE (3rd gen) emulation landscape (667x375)',
      use: {
        ...devices['iPhone SE (3rd gen) landscape'],
      },
    },
    {
      name: 'Chromium Galaxy Tab S9 emulation portrait (640x1024)',
      use: {
        ...devices['Galaxy Tab S9'],
      },
    },
    {
      name: 'Chromium Galaxy Tab S9 emulation landscape (1024x640)',
      use: {
        ...devices['Galaxy Tab S9 landscape'],
      },
    },
    {
      name: 'WebKit iPad Mini emulation portrait (768x1024)',
      use: {
        ...devices['iPad Mini'],
      },
    },
    {
      name: 'WebKit iPad Mini emulation landscape (1024x768)',
      use: {
        ...devices['iPad Mini landscape'],
      },
    },
  ];
}

export function createPlaywrightConfig(configuration = {}) {
  const isContinuousIntegration = process.env['CI'] === 'true';

  const {
    failOnFlakyTests = isContinuousIntegration,
    forbidOnly = isContinuousIntegration,
    projects = createPlaywrightProjects(),
    respectGitIgnore = true,
    retries = isContinuousIntegration ? 2 : 0,
    testDir = './tests',
    timeout = defaultTimeout,
    use = {},
    webServer,
    ...rest
  } = configuration;

  return defineConfig({
    ...rest,
    failOnFlakyTests,
    forbidOnly,
    projects,
    respectGitIgnore,
    retries,
    testDir,
    timeout,
    use: {
      locale: 'en',
      screenshot: 'only-on-failure',
      trace: 'retain-on-first-failure',
      ...use,
    },
    ...(webServer === undefined
      ? {}
      : {
          webServer: applyWebServerDefaults(webServer),
        }),
  });
}

export async function waitForIdle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const images = [];
    const roots = [document];

    for (const root of roots) {
      for (const element of root.querySelectorAll('*')) {
        if (element instanceof HTMLImageElement) {
          images.push(element);
        }

        if (element.shadowRoot !== null) {
          roots.push(element.shadowRoot);
        }
      }
    }

    await document.fonts.ready;
    await Promise.all(images.map((image) => image.decode()));
    await new Promise((resolvePromise) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolvePromise);
      });
    });
  });
}

export async function assertAxe(page) {
  const { default: AxeBuilder } = await import('@axe-core/playwright');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'ACT', 'EN-301-549']).analyze();

  expect(results.violations).toEqual([]);

  return results;
}
