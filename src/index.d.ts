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
import type { Page, PlaywrightTestConfig } from '@playwright/test';

/** Results produced by the Axe accessibility engine. */
export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

/**
 * Assert that Axe finds no violation among its available rules for a cumulative WCAG 2.2
 * Level AAA target, best practices, ACT and EN 301 549, excluding deprecated and obsolete rules.
 * Automated results are not proof of conformance.
 */
export declare function assertNoAxeViolations(page: Page): Promise<AxeResults>;

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
