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
import {
    createPlaywrightBrandedDesktopProjects,
    createPlaywrightConfig,
    createPlaywrightDesktopProjects,
    createPlaywrightPhoneProjects,
    createPlaywrightProjects,
    createPlaywrightTabletProjects,
} from '../src/index.js';

test('creates a portable default browser matrix and explicit opt-in project factories', () => {
    const brandedDesktopProjects = createPlaywrightBrandedDesktopProjects();
    const desktopProjects = createPlaywrightDesktopProjects();
    const phoneProjects = createPlaywrightPhoneProjects();
    const tabletProjects = createPlaywrightTabletProjects();
    const projects = createPlaywrightProjects();

    assert.equal(brandedDesktopProjects.length, 2);
    assert.equal(desktopProjects.length, 3);
    assert.equal(phoneProjects.length, 4);
    assert.equal(tabletProjects.length, 4);
    assert.equal(projects.length, 3);
    assert.equal(new Set([...projects, ...brandedDesktopProjects, ...phoneProjects, ...tabletProjects].map(({ name }) => name)).size, 13);
    assert.deepEqual(projects, desktopProjects);

    assert.deepEqual(
        desktopProjects.map(({ use }) => [use?.browserName, use?.channel]),
        [
            ['chromium', 'chromium'],
            ['firefox', undefined],
            ['webkit', undefined],
        ],
    );

    assert.deepEqual(
        brandedDesktopProjects.map(({ use }) => [use?.browserName, use?.channel]),
        [
            ['chromium', 'chrome'],
            ['chromium', 'msedge'],
        ],
    );

    assert.deepEqual(
        [...phoneProjects, ...tabletProjects].map(({ use }) => [use?.defaultBrowserType, use?.channel, use?.viewport]),
        [
            ['chromium', 'chromium', { height: 732, width: 360 }],
            ['chromium', 'chromium', { height: 308, width: 756 }],
            ['webkit', undefined, { height: 667, width: 375 }],
            ['webkit', undefined, { height: 375, width: 667 }],
            ['chromium', 'chromium', { height: 1024, width: 640 }],
            ['chromium', 'chromium', { height: 640, width: 1024 }],
            ['webkit', undefined, { height: 1024, width: 768 }],
            ['webkit', undefined, { height: 768, width: 1024 }],
        ],
    );

    assert.notEqual(createPlaywrightPhoneProjects()[0]?.use?.viewport, phoneProjects[0]?.use?.viewport);
});

test('applies web server defaults without mutating caller input', () => {
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

    assert.deepEqual(config.webServer, [
        {
            command: 'first',
            port: 3000,
            reuseExistingServer: !['true', '1'].includes(process.env['CI']),
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
    const projects = [];
    const config = createPlaywrightConfig({
        failOnFlakyTests: false,
        forbidOnly: false,
        projects,
        respectGitIgnore: false,
        retries: 4,
        retryStrategy: 'immediate',
        testDir: './specs',
        timeout: 1234,
        use: {
            baseURL: 'http://localhost:60000',
            locale: 'cs',
            timezoneId: 'Europe/Prague',
            trace: 'off',
        },
        webServer: {
            command: 'example',
            reuseExistingServer: false,
            timeout: 4321,
            url: 'http://localhost:60000/ready',
        },
        workers: '50%',
    });

    assert.equal(config.failOnFlakyTests, false);
    assert.equal(config.forbidOnly, false);
    assert.equal(config.projects, projects);
    assert.equal(config.respectGitIgnore, false);
    assert.equal(config.retries, 4);
    assert.equal(config.retryStrategy, 'immediate');
    assert.equal(config.testDir, './specs');
    assert.equal(config.timeout, 1234);
    assert.equal(config.use?.baseURL, 'http://localhost:60000');
    assert.equal(config.use?.locale, 'cs');
    assert.equal(config.use?.screenshot, 'only-on-failure');
    assert.equal(config.use?.timezoneId, 'Europe/Prague');
    assert.equal(config.use?.trace, 'off');
    assert.equal(config.webServer?.reuseExistingServer, false);
    assert.equal(config.webServer?.timeout, 4321);
    assert.equal(config.workers, '50%');
});

test('applies deterministic local and continuous integration policies', () => {
    const originalContinuousIntegration = process.env['CI'];

    try {
        delete process.env['CI'];

        const localConfig = createPlaywrightConfig();

        assert.equal(localConfig.failOnFlakyTests, false);
        assert.equal(localConfig.forbidOnly, false);
        assert.equal(localConfig.retries, 0);
        assert.equal(localConfig.retryStrategy, 'immediate');
        assert.equal(localConfig.respectGitIgnore, true);
        assert.equal(localConfig.testDir, './tests');
        assert.equal(localConfig.timeout, undefined);
        assert.equal(localConfig.use?.locale, 'en');
        assert.equal(localConfig.use?.screenshot, 'only-on-failure');
        assert.equal(localConfig.use?.timezoneId, 'UTC');
        assert.equal(localConfig.use?.trace, 'retain-on-first-failure');
        assert.equal(localConfig.webServer, undefined);
        assert.equal(localConfig.workers, undefined);

        const localWebServerConfig = createPlaywrightConfig({ webServer: { command: 'local', port: 3000 } });

        assert.equal(localWebServerConfig.webServer?.reuseExistingServer, true);

        const isolatedLocalConfig = createPlaywrightConfig({ webServer: { command: 'local', port: 3000, reuseExistingServer: false } });

        assert.equal(isolatedLocalConfig.webServer?.reuseExistingServer, false);

        process.env['CI'] = 'true';

        const continuousIntegrationConfig = createPlaywrightConfig();

        assert.equal(continuousIntegrationConfig.failOnFlakyTests, true);
        assert.equal(continuousIntegrationConfig.forbidOnly, true);
        assert.equal(continuousIntegrationConfig.retries, 2);
        assert.equal(continuousIntegrationConfig.retryStrategy, 'isolated');
        assert.equal(continuousIntegrationConfig.workers, 1);

        const continuousIntegrationWebServerConfig = createPlaywrightConfig({ webServer: { command: 'continuous integration', port: 3000 } });

        assert.equal(continuousIntegrationWebServerConfig.webServer?.reuseExistingServer, false);

        const reusedContinuousIntegrationConfig = createPlaywrightConfig({ webServer: { command: 'continuous integration', port: 3000, reuseExistingServer: true } });

        assert.equal(reusedContinuousIntegrationConfig.webServer?.reuseExistingServer, true);

        process.env['CI'] = '1';
        assert.deepEqual(createPlaywrightConfig(), continuousIntegrationConfig);

        for (const value of ['', '0', 'false', 'TRUE', 'unexpected']) {
            process.env['CI'] = value;
            assert.deepEqual(createPlaywrightConfig(), localConfig);
        }
    } finally {
        if (originalContinuousIntegration === undefined) {
            delete process.env['CI'];
        } else {
            process.env['CI'] = originalContinuousIntegration;
        }
    }
});
