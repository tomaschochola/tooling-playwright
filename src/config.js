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

import { defineConfig, devices } from '@playwright/test';

const webServerTimeout = 5 * 60 * 1000;

function applyWebServerDefaults(webServer, isContinuousIntegration) {
    const apply = (configuration) => ({
        reuseExistingServer: !isContinuousIntegration,
        timeout: webServerTimeout,
        ...configuration,
    });

    return Array.isArray(webServer) ? webServer.map(apply) : apply(webServer);
}

function cloneDevice(deviceName) {
    const { viewport, ...device } = devices[deviceName];

    return {
        ...device,
        viewport: {
            ...viewport,
        },
    };
}

export function createPlaywrightDesktopProjects() {
    return [
        {
            name: 'Playwright Chromium desktop landscape',
            use: {
                browserName: 'chromium',
                channel: 'chromium',
                viewport: {
                    height: 1080,
                    width: 1920,
                },
            },
        },
        {
            name: 'Firefox desktop landscape',
            use: {
                browserName: 'firefox',
                viewport: {
                    height: 1080,
                    width: 1920,
                },
            },
        },
        {
            name: 'WebKit desktop landscape',
            use: {
                browserName: 'webkit',
                viewport: {
                    height: 1080,
                    width: 1920,
                },
            },
        },
    ];
}

export function createPlaywrightPhoneProjects() {
    return [
        {
            name: 'Chromium Pixel 9 emulation portrait',
            use: {
                ...cloneDevice('Pixel 9'),
                channel: 'chromium',
            },
        },
        {
            name: 'Chromium Pixel 9 emulation landscape',
            use: {
                ...cloneDevice('Pixel 9 landscape'),
                channel: 'chromium',
            },
        },
        {
            name: 'WebKit iPhone SE (3rd gen) emulation portrait',
            use: {
                ...cloneDevice('iPhone SE (3rd gen)'),
            },
        },
        {
            name: 'WebKit iPhone SE (3rd gen) emulation landscape',
            use: {
                ...cloneDevice('iPhone SE (3rd gen) landscape'),
            },
        },
    ];
}

export function createPlaywrightTabletProjects() {
    return [
        {
            name: 'Chromium Galaxy Tab S9 emulation portrait',
            use: {
                ...cloneDevice('Galaxy Tab S9'),
                channel: 'chromium',
            },
        },
        {
            name: 'Chromium Galaxy Tab S9 emulation landscape',
            use: {
                ...cloneDevice('Galaxy Tab S9 landscape'),
                channel: 'chromium',
            },
        },
        {
            name: 'WebKit iPad Mini emulation portrait',
            use: {
                ...cloneDevice('iPad Mini'),
            },
        },
        {
            name: 'WebKit iPad Mini emulation landscape',
            use: {
                ...cloneDevice('iPad Mini landscape'),
            },
        },
    ];
}

export function createPlaywrightProjects() {
    return createPlaywrightDesktopProjects();
}

export function createPlaywrightConfig(configuration = {}) {
    const isContinuousIntegration = process.env['CI'] === 'true' || process.env['CI'] === '1';

    const {
        failOnFlakyTests = isContinuousIntegration,
        forbidOnly = isContinuousIntegration,
        projects = createPlaywrightProjects(),
        respectGitIgnore = true,
        retries = isContinuousIntegration ? 2 : 0,
        retryStrategy = isContinuousIntegration ? 'isolated' : 'immediate',
        testDir = './tests',
        use = {},
        webServer,
        workers = isContinuousIntegration ? 1 : undefined,
        ...rest
    } = configuration;

    return defineConfig({
        ...rest,
        failOnFlakyTests,
        forbidOnly,
        projects,
        respectGitIgnore,
        retries,
        retryStrategy,
        testDir,
        use: {
            locale: 'en',
            screenshot: 'only-on-failure',
            timezoneId: 'UTC',
            trace: 'retain-on-first-failure',
            ...use,
        },
        ...(webServer === undefined
            ? {}
            : {
                  webServer: applyWebServerDefaults(webServer, isContinuousIntegration),
              }),
        workers,
    });
}
