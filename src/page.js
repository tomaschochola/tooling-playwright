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
import { getDocumentScrollState, setDocumentScrollTop, waitForDocumentFonts, waitForDocumentImages, waitForDocumentRendering } from './browser.js';

const defaultMaximumPageScrolls = 100;
const pageEndTolerance = 1;

function getMaximumPageScrolls(options) {
    const { maximumScrolls = defaultMaximumPageScrolls } = options;

    if (!Number.isSafeInteger(maximumScrolls) || maximumScrolls < 1) {
        throw new TypeError('maximumScrolls must be a positive safe integer.');
    }

    return maximumScrolls;
}

function getNextPageScroll(state, scrollCount, maximumScrolls) {
    const maximumScrollTop = Math.max(0, state.scrollHeight - state.clientHeight);
    const remainingScroll = maximumScrollTop - state.scrollTop;

    if (remainingScroll <= 0) {
        return null;
    }

    if (scrollCount >= maximumScrolls && remainingScroll > pageEndTolerance) {
        throw new Error(`Page traversal requires more than the configured limit of ${String(maximumScrolls)} viewport scrolls.`);
    }

    const nextScrollTop = Math.min(maximumScrollTop, state.scrollTop + state.clientHeight);

    if (nextScrollTop <= state.scrollTop) {
        throw new Error('Page traversal could not make forward progress.');
    }

    return {
        maximumScrollTop,
        nextScrollTop,
    };
}

export async function waitForPageFonts(page) {
    await page.evaluate(waitForDocumentFonts);
}

export async function waitForPageImages(page) {
    await page.evaluate(waitForDocumentImages);
}

export async function waitForPageRendering(page) {
    await page.evaluate(waitForDocumentRendering);
}

async function waitForPageResourcesAfterLoad(page) {
    await waitForPageFonts(page);
    await waitForPageImages(page);
    await waitForPageRendering(page);
}

export async function waitForPageResources(page) {
    await page.waitForLoadState('load');
    await waitForPageResourcesAfterLoad(page);
}

export async function scrollThroughPage(page, options = {}) {
    const maximumScrolls = getMaximumPageScrolls(options);
    const initialState = await page.evaluate(getDocumentScrollState);
    let scrollCount = 0;
    const failures = [];

    try {
        await page.evaluate(setDocumentScrollTop, 0);

        while (true) {
            await waitForPageImages(page);
            await waitForPageRendering(page);

            const state = await page.evaluate(getDocumentScrollState);
            const nextScroll = getNextPageScroll(state, scrollCount, maximumScrolls);

            if (nextScroll === null) {
                break;
            }

            const actualScrollTop = await page.evaluate(setDocumentScrollTop, nextScroll.nextScrollTop);

            if (actualScrollTop <= state.scrollTop) {
                if (nextScroll.maximumScrollTop - state.scrollTop <= pageEndTolerance) {
                    break;
                }

                throw new Error('Page traversal could not make forward progress.');
            }

            scrollCount += 1;
        }
    } catch (error) {
        failures.push(error);
    }

    try {
        await page.evaluate(setDocumentScrollTop, initialState.scrollTop);
        await waitForPageImages(page);
        await waitForPageRendering(page);
    } catch (error) {
        failures.push(error);
    }

    if (failures.length === 1) {
        throw failures[0];
    }

    if (failures.length > 1) {
        throw new AggregateError(failures, 'Page traversal and scroll restoration both failed.');
    }
}

export async function navigateToPage(page, url) {
    const response = await page.goto(url);

    if (response === null) {
        throw new Error(`Navigation to "${url}" did not produce an HTTP response.`);
    }

    expect(response.ok(), `Navigation to "${url}" returned HTTP ${String(response.status())}.`).toBe(true);
    await expect(page).toHaveURL(url);

    return response;
}
