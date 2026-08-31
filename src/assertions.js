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

import { expect } from '@playwright/test';
import { assertNoAxeViolations } from './accessibility.js';
import { navigateToPage, scrollThroughPage, waitForPageResources } from './page.js';

const criticalResourceTypes = new Set(['document', 'font', 'image', 'manifest', 'script', 'stylesheet']);
const maximumFailureDetails = 200;

function recordFailure(failures, failure) {
    failures.push(failure);
    failures.length = Math.min(failures.length, maximumFailureDetails);
}

function getDocumentCompatibilityMode() {
    return document.compatMode;
}

function getDocumentIdViolations() {
    const getIdViolation = (element, ids) => {
        if (!element.hasAttribute('id')) {
            return null;
        }

        const id = element.getAttribute('id');

        if (id === '') {
            return 'An id must contain at least one character.';
        }

        if (/[\t\n\f\r ]/u.test(id)) {
            return `${JSON.stringify(id)} must not contain ASCII whitespace.`;
        }

        if (ids.has(id)) {
            return `${JSON.stringify(id)} must be unique within its tree.`;
        }

        ids.add(id);

        return null;
    };
    const idViolations = [];
    const roots = [document];

    for (const root of roots) {
        const ids = new Set();

        for (const element of root.querySelectorAll('*')) {
            const idViolation = getIdViolation(element, ids);

            if (idViolation !== null) {
                idViolations.push(idViolation);
            }

            if (element.shadowRoot !== null) {
                roots.push(element.shadowRoot);
            }
        }
    }

    return idViolations;
}

async function getConsoleErrorMessages(page) {
    const errors = (await page.consoleMessages()).filter((message) => message.type() === 'error');

    return errors.map((message) => message.text());
}

async function getPageErrorMessages(page) {
    const errors = await page.pageErrors();

    return errors.map((error) => error.message);
}

function observePageFailures(page) {
    const consoleErrors = [];
    const pageErrors = [];
    const pendingResources = new Set();
    const resourceErrors = [];
    const handleConsoleMessage = (message) => {
        if (message.type() === 'error') {
            recordFailure(consoleErrors, message.text());
        }
    };
    const handlePageError = (error) => {
        recordFailure(pageErrors, error.message);
    };
    const handleRequest = (request) => {
        if (criticalResourceTypes.has(request.resourceType())) {
            pendingResources.add(request);
        }
    };
    const handleRequestFailed = (request) => {
        if (pendingResources.delete(request)) {
            recordFailure(resourceErrors, `failed ${request.resourceType()} ${request.url()}`);
        }
    };
    const handleRequestFinished = (request) => {
        pendingResources.delete(request);
    };
    const handleResponse = (response) => {
        const request = response.request();
        const resourceType = request.resourceType();

        if (pendingResources.has(request) && response.status() >= 400) {
            recordFailure(resourceErrors, `${String(response.status())} ${resourceType} ${response.url()}`);
        }
    };

    page.on('console', handleConsoleMessage);
    page.on('pageerror', handlePageError);
    page.on('request', handleRequest);
    page.on('requestfailed', handleRequestFailed);
    page.on('requestfinished', handleRequestFinished);
    page.on('response', handleResponse);

    return {
        async assertNoFailures() {
            const [retainedConsoleErrors, retainedPageErrors] = await Promise.all([getConsoleErrorMessages(page), getPageErrorMessages(page)]);

            expect(
                {
                    consoleErrors: [...new Set([...retainedConsoleErrors, ...consoleErrors])],
                    criticalResourceErrors: resourceErrors,
                    pageErrors: [...new Set([...retainedPageErrors, ...pageErrors])],
                    pendingCriticalResources: pendingResources.size,
                },
                'The page must be free of browser and critical-resource failures.',
            ).toEqual({
                consoleErrors: [],
                criticalResourceErrors: [],
                pageErrors: [],
                pendingCriticalResources: 0,
            });
        },
        async waitForResources() {
            await expect.poll(() => pendingResources.size, 'The page must finish loading its critical resources.').toBe(0);
        },
        stop() {
            page.off('console', handleConsoleMessage);
            page.off('pageerror', handlePageError);
            page.off('request', handleRequest);
            page.off('requestfailed', handleRequestFailed);
            page.off('requestfinished', handleRequestFinished);
            page.off('response', handleResponse);
        },
    };
}

async function assertPageIdentity(page, expectation) {
    await expect(page).toHaveURL(expectation.url);
    await expect(page.locator('head > title')).toHaveCount(1);
    await expect(page).toHaveTitle(expectation.title);

    const heading = page.getByRole('heading', { level: 1 });

    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveAccessibleName(expectation.heading);
    await expect(heading).toBeVisible();
}

async function assertPageStructure(page, expectation) {
    await assertPageIdentity(page, expectation);
    await assertPageStandardsMode(page);
    await assertValidIds(page);
}

export async function assertNoConsoleErrors(page) {
    const errors = await getConsoleErrorMessages(page);

    expect(errors).toEqual([]);
}

export async function assertValidIds(page) {
    const idViolations = await page.evaluate(getDocumentIdViolations);

    expect(idViolations, 'Every id must be valid and unique within its document or open shadow root.').toEqual([]);
}

export async function assertNoPageErrors(page) {
    const errors = await getPageErrorMessages(page);

    expect(errors).toEqual([]);
}

export async function assertPageStandardsMode(page) {
    const compatibilityMode = await page.evaluate(getDocumentCompatibilityMode);

    expect(compatibilityMode, 'The page must render in standards mode.').toBe('CSS1Compat');
}

export async function assertPage(page, expectation, options = {}) {
    const { waitForReady, ...traversalOptions } = options;
    const failures = observePageFailures(page);

    try {
        await assertNoPageErrors(page);
        await assertNoConsoleErrors(page);
        await navigateToPage(page, expectation.url);
        await waitForReady?.(page);
        await assertPageIdentity(page, expectation);
        await waitForPageResources(page);
        await scrollThroughPage(page, traversalOptions);
        await waitForPageResources(page);
        await assertPageStructure(page, expectation);
        await assertNoAxeViolations(page);
        await failures.waitForResources();
        await assertPageStructure(page, expectation);
        await failures.assertNoFailures();
    } finally {
        failures.stop();
    }
}
