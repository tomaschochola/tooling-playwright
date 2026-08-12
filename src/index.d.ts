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

/** Required expectations for a standard HTML page. */
export interface PageExpectation {
  /** Accessible name of the page's single visible level-one heading. */
  readonly heading: string;

  /** Exact document title. */
  readonly title: string;

  /** URL passed to Playwright navigation and required as the final URL. */
  readonly url: string;
}

/**
 * Assert that Axe finds no violation among its available rules for a cumulative WCAG 2.2
 * Level AAA target, best practices, ACT and EN 301 549, excluding deprecated and obsolete rules.
 * Automated results are not proof of conformance.
 */
export declare function assertNoAxeViolations(page: Page): Promise<AxeResults>;

/** Assert that the page has not emitted a console message with error severity. */
export declare function assertNoConsoleErrors(page: Page): Promise<void>;

/** Assert that the page has not raised an unhandled JavaScript error. */
export declare function assertNoPageErrors(page: Page): Promise<void>;

/** Navigate to and assert the standard title, heading, resource, accessibility, and error-free contract of a page. */
export declare function assertPage(page: Page, expectation: PageExpectation): Promise<void>;

/** Apply the fleet defaults while preserving every explicitly supplied Playwright override. */
export declare function createPlaywrightConfig(configuration?: PlaywrightTestConfig): PlaywrightTestConfig;

/** Create the default desktop browser projects. */
export declare function createPlaywrightDesktopProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default emulated phone projects. */
export declare function createPlaywrightPhoneProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default desktop, phone, and tablet browser project matrix. */
export declare function createPlaywrightProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Create the default emulated tablet projects. */
export declare function createPlaywrightTabletProjects(): NonNullable<PlaywrightTestConfig['projects']>;

/** Navigate to an HTTP page, require a successful response and final URL, and wait for its resources. */
export declare function navigateToPage(page: Page, url: string): Promise<Response>;

/** Wait for the page's DOMContentLoaded lifecycle state. */
export declare function waitForPageDomContentLoaded(page: Page): Promise<void>;

/** Wait for all document fonts to finish loading. */
export declare function waitForPageFonts(page: Page): Promise<void>;

/** Wait for all light/open-shadow DOM images to decode. */
export declare function waitForPageImages(page: Page): Promise<void>;

/** Wait for the page's load lifecycle state. */
export declare function waitForPageLoad(page: Page): Promise<void>;

/**
 * Wait for the discouraged Playwright networkidle lifecycle state.
 * Prefer application-specific assertions unless a bounded page is known to become network-idle.
 */
export declare function waitForPageNetworkIdle(page: Page): Promise<void>;

/**
 * Wait for DOMContentLoaded, load, network idle, document fonts and images, and two rendering frames.
 * Use only for bounded pages known to become network-idle; this does not replace application-specific readiness assertions.
 */
export declare function waitForPageReady(page: Page): Promise<void>;

/** Wait for two animation frames so pending rendering work can be presented. */
export declare function waitForPageRendering(page: Page): Promise<void>;

/** Wait for document loading, fonts, light/open-shadow DOM images, and two rendering frames. */
export declare function waitForPageResources(page: Page): Promise<void>;
