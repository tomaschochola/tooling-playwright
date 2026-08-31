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
import { assertNoAxeViolations, assertNoConsoleErrors, assertNoPageErrors, assertPage, createPlaywrightProjects, navigateToPage, scrollThroughPage, waitForPageResources } from '../src/index.js';

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
                    await context.route('https://example.test/browser-project', async (route) => {
                        await route.fulfill({
                            body: '<!doctype html><html lang="en"><head><title>Browser project</title></head><body><main><h1>Browser project</h1></main></body></html>',
                            contentType: 'text/html',
                            status: 200,
                        });
                    });

                    const page = await context.newPage();

                    await assertPage(page, {
                        heading: 'Browser project',
                        title: 'Browser project',
                        url: 'https://example.test/browser-project',
                    });

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

            await waitForPageResources(page);

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

test('settles relevant resources without triggering deferred lazy images in every browser engine', async (testContext) => {
    const imageSource = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='green'/%3E%3C/svg%3E";

    for (const [browserName, browserType] of Object.entries(browserTypes)) {
        await testContext.test(browserName, async () => {
            const browser = await browserType.launch();

            try {
                const page = await browser.newPage({ viewport: { height: 600, width: 800 } });

                await page.setContent(`
          <!doctype html>
          <style>html { scroll-behavior: smooth; }</style>
          <script>
            globalThis.scrollEvents = 0;
            addEventListener('scroll', () => {
              globalThis.scrollEvents += 1;
            });
          </script>
          <img id="eager" alt="Eager" loading="eager" src="${imageSource}#eager">
          <img id="visible-lazy" alt="Visible lazy" loading="lazy" src="${imageSource}#visible-lazy">
          <div style="height: 20000px"></div>
          <img id="deferred-lazy" alt="Deferred lazy" loading="lazy" src="${imageSource}#deferred-lazy">
          <img id="hidden-lazy" alt="Hidden lazy" loading="lazy" style="display: none" src="${imageSource}#hidden-lazy">
          <img id="source-less" alt="Source-less placeholder">
        `);

                await waitForPageResources(page);

                assert.deepEqual(
                    await page.locator('img').evaluateAll((images) => images.map((image) => ({ complete: image.complete, loading: image.getAttribute('loading'), naturalWidth: image.naturalWidth }))),
                    [
                        { complete: true, loading: 'eager', naturalWidth: 10 },
                        { complete: true, loading: 'lazy', naturalWidth: 10 },
                        { complete: false, loading: 'lazy', naturalWidth: 0 },
                        { complete: false, loading: 'lazy', naturalWidth: 0 },
                        { complete: true, loading: null, naturalWidth: 0 },
                    ],
                );
                assert.deepEqual(await page.evaluate(() => ({ scrollEvents: globalThis.scrollEvents, scrollY })), { scrollEvents: 0, scrollY: 0 });

                await scrollThroughPage(page);

                assert.deepEqual(await page.locator('#deferred-lazy').evaluate((image) => ({ complete: image.complete, loading: image.getAttribute('loading'), naturalWidth: image.naturalWidth })), {
                    complete: true,
                    loading: 'lazy',
                    naturalWidth: 10,
                });
                assert.deepEqual(await page.locator('#hidden-lazy').evaluate((image) => ({ complete: image.complete, loading: image.getAttribute('loading'), naturalWidth: image.naturalWidth })), {
                    complete: false,
                    loading: 'lazy',
                    naturalWidth: 0,
                });
                assert.ok((await page.evaluate(() => globalThis.scrollEvents)) > 0);
                assert.equal(await page.evaluate(() => scrollY), 0);

                await page.setContent('<!doctype html><style>@font-face{font-family:Broken;src:url(data:font/woff2;base64,AA==)}body{font-family:Broken}</style><p>Text</p>');
                await assert.rejects(waitForPageResources(page), /1 document font face\(s\) failed to load/);
            } finally {
                await browser.close();
            }
        });
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

test('reports page and console errors independently', async () => {
    const browser = await chromium.launch({ channel: 'chromium' });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await assertNoPageErrors(page);
            await assertNoConsoleErrors(page);

            await page.evaluate(() => {
                console.error('Expected console error.');
            });

            await assert.rejects(assertNoConsoleErrors(page), /Expected console error/);
            await assertNoPageErrors(page);

            await Promise.all([
                page.waitForEvent('pageerror'),
                page.evaluate(() => {
                    setTimeout(() => {
                        throw new Error('Expected page error.');
                    }, 0);
                }),
            ]);

            await assert.rejects(assertNoPageErrors(page), /Expected page error/);
        } finally {
            await context.close();
        }
    } finally {
        await browser.close();
    }
});

test('navigates to and enforces the strict page policy', async () => {
    const browser = await chromium.launch({ channel: 'chromium' });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            let releaseSlowImage;
            let reportSlowImageRequest;
            const slowImageRelease = new Promise((resolvePromise) => {
                releaseSlowImage = resolvePromise;
            });
            const slowImageRequest = new Promise((resolvePromise) => {
                reportSlowImageRequest = resolvePromise;
            });

            await context.route('https://example.test/', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Example page</title></head><body><main><h1>Example page</h1><svg role="img" aria-label="Green square" viewBox="0 0 10 10"><title>Green square</title><rect width="10" height="10" fill="green"/></svg></main><script>console.log("Expected informational message.")</script></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/console-error', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Console error</title></head><body><main><h1>Console error</h1></main><script>console.error("Expected scoped console error.")</script></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/page-error', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Page error</title></head><body><main><h1>Page error</h1></main><script>throw new Error("Expected scoped page error.")</script></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/quirks', async (route) => {
                await route.fulfill({
                    body: '<html lang="en"><head><title>Quirks page</title></head><body><main><h1>Quirks page</h1></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/whole', async (route) => {
                await route.fulfill({
                    body: `<!doctype html><html lang="en"><head><title>Whole page</title></head><body><main><h1>Whole page</h1><div style="height: 20000px"></div><img id="lazy" alt="Green square" loading="lazy" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='green'/%3E%3C/svg%3E"></main><script>globalThis.scrollEvents = 0; addEventListener('scroll', () => { globalThis.scrollEvents += 1; });</script></body></html>`,
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/duplicate-id', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Duplicate id</title></head><body><main><h1>Duplicate id</h1><p id="duplicate">First</p><p id="duplicate">Second</p></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/invalid-id', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Invalid id</title></head><body><main><h1>Invalid id</h1><p id="">Empty</p><p id="with space">Whitespace</p></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/changed-url', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Stable identity</title></head><body><main><h1>Stable identity</h1><div style="height:2000px"></div></main><script>addEventListener("scroll", () => history.replaceState(null, "", "/unexpected"), { once: true });</script></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/changed-identity', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Stable identity</title></head><body><main><h1>Stable identity</h1><div style="height:2000px"></div></main><script>addEventListener("scroll", () => { document.title = "Changed identity"; document.querySelector("h1").textContent = "Changed identity"; }, { once: true });</script></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/broken-resource', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Broken resource</title><link rel="stylesheet" href="/missing.css"></head><body><main><h1>Broken resource</h1></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/missing.css', async (route) => {
                await route.fulfill({
                    body: 'Not Found',
                    contentType: 'text/css',
                    status: 404,
                });
            });
            await context.route('https://example.test/slow-lazy', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Slow lazy image</title></head><body><main><h1>Slow lazy image</h1><div style="height:1000px"></div><img alt="Green square" loading="lazy" src="/slow.svg"></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/slow.svg', async (route) => {
                reportSlowImageRequest();
                await slowImageRelease;
                await route.fulfill({
                    body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>',
                    contentType: 'image/svg+xml',
                    status: 200,
                });
            });
            await context.route('https://example.test/broken-network', async (route) => {
                await route.fulfill({
                    body: '<!doctype html><html lang="en"><head><title>Broken network</title><script src="/aborted.js"></script></head><body><main><h1>Broken network</h1></main></body></html>',
                    contentType: 'text/html',
                    status: 200,
                });
            });
            await context.route('https://example.test/aborted.js', async (route) => {
                await route.abort('failed');
            });

            const response = await navigateToPage(page, 'https://example.test/');

            assert.equal(response.status(), 200);

            await assertPage(page, {
                heading: 'Example page',
                title: 'Example page',
                url: 'https://example.test/',
            });

            await assert.rejects(
                assertPage(page, {
                    heading: 'Quirks page',
                    title: 'Quirks page',
                    url: 'https://example.test/quirks',
                }),
                /standards mode/,
            );

            let waitForReadyCalls = 0;

            await assertPage(
                page,
                {
                    heading: 'Whole page',
                    title: 'Whole page',
                    url: 'https://example.test/whole',
                },
                {
                    maximumScrolls: 100,
                    waitForReady: async (currentPage) => {
                        waitForReadyCalls += 1;
                        assert.equal(currentPage, page);
                        await currentPage.locator('h1').waitFor({ state: 'visible' });
                    },
                },
            );
            assert.equal(waitForReadyCalls, 1);
            assert.deepEqual(await page.locator('#lazy').evaluate((image) => ({ complete: image.complete, loading: image.getAttribute('loading'), naturalWidth: image.naturalWidth })), {
                complete: true,
                loading: 'lazy',
                naturalWidth: 10,
            });
            assert.ok((await page.evaluate(() => globalThis.scrollEvents)) > 0);
            assert.equal(await page.evaluate(() => scrollY), 0);

            const slowPageAssertion = assertPage(page, {
                heading: 'Slow lazy image',
                title: 'Slow lazy image',
                url: 'https://example.test/slow-lazy',
            });
            let slowPageAssertionState = 'pending';
            const trackedSlowPageAssertion = slowPageAssertion.then(
                () => {
                    slowPageAssertionState = 'fulfilled';
                },
                () => {
                    slowPageAssertionState = 'rejected';
                },
            );

            await slowImageRequest;
            await new Promise((resolvePromise) => {
                setImmediate(resolvePromise);
            });
            assert.equal(slowPageAssertionState, 'pending');
            releaseSlowImage();
            await trackedSlowPageAssertion;
            assert.equal(slowPageAssertionState, 'fulfilled');

            await assert.rejects(
                assertPage(page, {
                    heading: 'Duplicate id',
                    title: 'Duplicate id',
                    url: 'https://example.test/duplicate-id',
                }),
                /Every id must be valid and unique/,
            );

            const assertNewPageRejects = async (expectation, pattern) => {
                const failingPage = await context.newPage();

                try {
                    await assert.rejects(assertPage(failingPage, expectation), pattern);
                } finally {
                    await failingPage.close();
                }
            };

            const contaminatedPage = await context.newPage();

            try {
                await contaminatedPage.evaluate(() => {
                    console.error('Expected historical console error.');
                });
                await assert.rejects(
                    assertPage(contaminatedPage, {
                        heading: 'Example page',
                        title: 'Example page',
                        url: 'https://example.test/',
                    }),
                    /Expected historical console error/,
                );
            } finally {
                await contaminatedPage.close();
            }

            await assertNewPageRejects(
                {
                    heading: 'Invalid id',
                    title: 'Invalid id',
                    url: 'https://example.test/invalid-id',
                },
                /Every id must be valid and unique/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Stable identity',
                    title: 'Stable identity',
                    url: 'https://example.test/changed-url',
                },
                /unexpected/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Stable identity',
                    title: 'Stable identity',
                    url: 'https://example.test/changed-identity',
                },
                /Changed identity/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Console error',
                    title: 'Console error',
                    url: 'https://example.test/console-error',
                },
                /Expected scoped console error/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Page error',
                    title: 'Page error',
                    url: 'https://example.test/page-error',
                },
                /Expected scoped page error/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Broken resource',
                    title: 'Broken resource',
                    url: 'https://example.test/broken-resource',
                },
                /missing\.css/,
            );
            await assertNewPageRejects(
                {
                    heading: 'Broken network',
                    title: 'Broken network',
                    url: 'https://example.test/broken-network',
                },
                /aborted\.js/,
            );

            await context.route('https://example.test/failure', async (route) => {
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
