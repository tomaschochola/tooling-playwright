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

import type { AxeBuilder } from '@axe-core/playwright';
import type { Page, PlaywrightTestConfig, Response } from '@playwright/test';

/** Results produced by the Axe accessibility engine. */
export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

/** Expected identity for the strict standard-page policy. */
export interface PageExpectation {
    /** Accessible name of the page's single visible level-one heading. */
    readonly heading: string;

    /** Exact document title. */
    readonly title: string;

    /** URL passed to Playwright navigation and required as the final URL. */
    readonly url: string;
}

/** Operational limits for vertical traversal of a finite document. */
export interface PageTraversalOptions {
    /** Positive safe-integer maximum of viewport scrolls before traversal fails safely. Defaults to 100. */
    readonly maximumScrolls?: number;
}

/** Optional application-specific synchronization for the strict page policy. */
export interface PageAssertionOptions extends PageTraversalOptions {
    /** Wait for application readiness after navigation and before the generic page scan. */
    readonly waitForReady?: (page: Page) => Promise<void>;
}

/**
 * Assert that Axe finds no violation among its available rules for a cumulative WCAG 2.2
 * Level AAA target, best practices, ACT and EN 301 549, excluding deprecated and obsolete rules.
 * Automated results are not proof of conformance.
 */
export declare function assertNoAxeViolations(page: Page): Promise<AxeResults>;

/** Assert that the Page's retained console-message history contains no error-severity message. */
export declare function assertNoConsoleErrors(page: Page): Promise<void>;

/** Assert that the Page's retained page-error history contains no unhandled JavaScript error. */
export declare function assertNoPageErrors(page: Page): Promise<void>;

/**
 * Navigate to and enforce this package's high-level policy for a finite standard HTML page in its
 * default state. The policy vertically traverses the document and verifies retained and operation-scoped
 * errors, expected identity before and after traversal, critical resources, standards mode, valid ids, attempted fonts, revealed images,
 * and automated accessibility. It restores the initial scroll position and fails at a bounded traversal
 * limit rather than scrolling indefinitely.
 *
 * Supply waitForReady when the application has a domain-specific hydration or data-readiness signal; generic
 * network idleness cannot establish that state safely. Use the granular helpers for infinite or virtualized
 * pages, nested scrolling regions, additional interactive states, or pages that intentionally emit errors.
 * Automated assertions do not prove visual correctness or complete accessibility conformance.
 */
export declare function assertStandardPage(page: Page, expectation: PageExpectation, options?: PageAssertionOptions): Promise<void>;

/** Assert that the document renders in standards mode rather than quirks mode. */
export declare function assertPageStandardsMode(page: Page): Promise<void>;

/** Assert that every id is non-empty, contains no ASCII whitespace, and is unique within its document or open shadow root. */
export declare function assertValidIds(page: Page): Promise<void>;

/** Apply the fleet defaults while preserving explicit overrides. CI defaults apply only when CI is "true" or "1". */
export declare function createPlaywrightConfig(configuration?: PlaywrightTestConfig): PlaywrightTestConfig;

/** Create the default desktop browser projects. */
export declare function createPlaywrightDesktopProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create optional Google Chrome and Microsoft Edge desktop browser projects. */
export declare function createPlaywrightBrandedDesktopProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default emulated phone projects. */
export declare function createPlaywrightPhoneProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default portable desktop browser project matrix. */
export declare function createPlaywrightProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default emulated tablet projects. */
export declare function createPlaywrightTabletProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Navigate to an HTTP page and require a successful response and final URL. */
export declare function navigateToPage(page: Page, url: string): Promise<Response>;

/** Wait for document fonts to settle and reject when an attempted font face failed to load. */
export declare function waitForPageFonts(page: Page): Promise<void>;

/** Wait for eager, completed, and viewport-intersecting lazy light/open-shadow DOM images to decode without triggering deferred offscreen images. */
export declare function waitForPageImages(page: Page): Promise<void>;

/** Wait across two requestAnimationFrame callbacks, allowing a rendering opportunity between them. */
export declare function waitForPageRendering(page: Page): Promise<void>;

/** Wait for document loading, settled fonts, currently relevant light/open-shadow DOM images, and two rendering frames. */
export declare function waitForPageResources(page: Page): Promise<void>;

/**
 * Traverse a finite document vertically one viewport at a time, waiting for relevant lazy images at every
 * step and after restoring the initial scroll position. Fails after 100 scrolls by default; increase the
 * explicit safety limit for an intentionally longer finite document.
 */
export declare function scrollThroughPage(page: Page, options?: PageTraversalOptions): Promise<void>;
