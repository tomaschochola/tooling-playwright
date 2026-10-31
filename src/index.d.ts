import type { AxeBuilder } from '@axe-core/playwright';
import type { Page, PlaywrightTestConfig, Response } from '@playwright/test';

export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

export interface PageExpectation {
    readonly heading: string;

    readonly title: string;

    readonly url: string;
}

export interface PageTraversalOptions {
    readonly maximumScrolls?: number;
}

export interface PageAssertionOptions extends PageTraversalOptions {
    readonly waitForReady?: (page: Page) => Promise<void>;
}

export declare function assertNoAxeViolations(page: Page): Promise<AxeResults>;

export declare function assertNoConsoleErrors(page: Page): Promise<void>;

export declare function assertNoPageErrors(page: Page): Promise<void>;

export declare function assertStandardPage(page: Page, expectation: PageExpectation, options?: PageAssertionOptions): Promise<void>;

export declare function assertPageStandardsMode(page: Page): Promise<void>;

export declare function assertValidIds(page: Page): Promise<void>;

export declare function createPlaywrightConfig(configuration?: PlaywrightTestConfig): PlaywrightTestConfig;

export declare function createPlaywrightDesktopProjects(): NonNullable<PlaywrightTestConfig['projects']>;

export declare function createPlaywrightPhoneProjects(): NonNullable<PlaywrightTestConfig['projects']>;

export declare function createPlaywrightProjects(): NonNullable<PlaywrightTestConfig['projects']>;

export declare function createPlaywrightTabletProjects(): NonNullable<PlaywrightTestConfig['projects']>;

export declare function navigateToPage(page: Page, url: string): Promise<Response>;

export declare function waitForPageFonts(page: Page): Promise<void>;

export declare function waitForPageImages(page: Page): Promise<void>;

export declare function waitForPageRendering(page: Page): Promise<void>;

export declare function waitForPageResources(page: Page): Promise<void>;

export declare function scrollThroughPage(page: Page, options?: PageTraversalOptions): Promise<void>;
