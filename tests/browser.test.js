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
import { chromium, firefox, webkit } from '@playwright/test';
import { assertNoAxeViolations, assertPage, createPlaywrightProjects, navigateToPage, waitForPageReady } from '../src/index.js';

const browserTypes = { chromium, firefox, webkit };

test('launches every configured browser project with its declared context', async (testContext) => {
  const browsers = new Map();

  try {
    for (const project of createPlaywrightProjects()) {
      await testContext.test(project.name, async () => {
        const { browserName, channel, defaultBrowserType, ...contextOptions } = project.use ?? {};
        const resolvedBrowserName = browserName ?? defaultBrowserType;

        assert.ok(resolvedBrowserName in browserTypes);

        const browserKey = `${resolvedBrowserName}:${channel ?? 'default'}`;
        let browser = browsers.get(browserKey);

        if (browser === undefined) {
          browser = await browserTypes[resolvedBrowserName].launch(channel === undefined ? {} : { channel });
          browsers.set(browserKey, browser);
        }

        const context = await browser.newContext(contextOptions);

        try {
          const page = await context.newPage();

          await page.setContent('<!doctype html><html lang="en"><head><title>Browser project</title></head><body><main><h1>Browser project</h1></main></body></html>');

          assert.deepEqual(page.viewportSize(), contextOptions.viewport);
        } finally {
          await context.close();
        }
      });
    }
  } finally {
    await Promise.all([...browsers.values()].map(async (browser) => await browser.close()));
  }
});

test('settles real browser resources and accepts an accessible document', async () => {
  const browser = await chromium.launch({ channel: 'chromium' });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.setContent(`
        <!doctype html>
        <html lang="en">
          <head>
            <title>Accessible document</title>
          </head>
          <body>
            <main>
              <h1>Accessible document</h1>
              <img alt="A green square" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Cpath fill='green' d='M0 0h1v1H0z'/%3E%3C/svg%3E">
              <browser-shadow></browser-shadow>
            </main>
            <script>
              const host = document.querySelector('browser-shadow');
              const root = host.attachShadow({ mode: 'open' });
              const image = document.createElement('img');

              image.alt = 'A blue square';
              image.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Cpath fill='blue' d='M0 0h1v1H0z'/%3E%3C/svg%3E";
              root.append(image);
            </script>
          </body>
        </html>
      `);

      await waitForPageReady(page);

      const results = await assertNoAxeViolations(page);
      const auditedRuleIds = new Set([...results.inapplicable, ...results.incomplete, ...results.passes, ...results.violations].map(({ id }) => id));

      assert.deepEqual(results.violations, []);
      assert.ok(results.passes.length > 0);
      assert.equal(auditedRuleIds.size, 100);
      assert.equal(auditedRuleIds.has('color-contrast-enhanced'), true);
      assert.equal(auditedRuleIds.has('css-orientation-lock'), true);
      assert.equal(auditedRuleIds.has('target-size'), true);
      assert.equal(auditedRuleIds.has('aria-roledescription'), false);
      assert.equal(auditedRuleIds.has('audio-caption'), false);
      assert.equal(auditedRuleIds.has('duplicate-id'), false);
      assert.equal(auditedRuleIds.has('duplicate-id-active'), false);
      assert.equal(auditedRuleIds.has('landmark-complementary-is-top-level'), false);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('reports an Axe violation from an inaccessible document', async () => {
  const browser = await chromium.launch({ channel: 'chromium' });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.setContent('<!doctype html><html lang="en"><head><title>Inaccessible document</title></head><body><main><h1>Inaccessible document</h1><button></button></main></body></html>');

      await assert.rejects(assertNoAxeViolations(page), /button-name/);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('navigates to and asserts the standard page contract', async () => {
  const browser = await chromium.launch({ channel: 'chromium' });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.route('https://example.test/', async (route) => {
        await route.fulfill({
          body: '<!doctype html><html lang="en"><head><title>Example page</title></head><body><main><h1>Example page</h1></main></body></html>',
          contentType: 'text/html',
          status: 200,
        });
      });

      const response = await navigateToPage(page, 'https://example.test/');

      assert.equal(response.status(), 200);

      await assertPage(page, {
        heading: 'Example page',
        title: 'Example page',
        url: 'https://example.test/',
      });

      await page.route('https://example.test/failure', async (route) => {
        await route.fulfill({
          body: 'Internal Server Error',
          contentType: 'text/plain',
          status: 500,
        });
      });

      await assert.rejects(navigateToPage(page, 'https://example.test/failure'), /returned HTTP 500/);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('enforces WCAG AAA and 2.2 rules that stock Axe leaves disabled', async () => {
  const browser = await chromium.launch({ channel: 'chromium' });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.setContent(
        '<!doctype html><html lang="en"><head><title>Strict WCAG rules</title><style>a{display:inline-block;width:10px;height:10px;margin:0}</style></head><body style="background:#fff"><main><h1>Strict WCAG rules</h1><p style="color:#666">This text passes AA contrast but does not pass AAA contrast.</p><a href="#first" aria-label="First target"></a><a href="#second" aria-label="Second target"></a></main></body></html>',
      );

      await assert.rejects(assertNoAxeViolations(page), (error) => {
        assert.match(error.message, /color-contrast-enhanced/);
        assert.match(error.message, /target-size/);

        return true;
      });
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
