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

import type AxeBuilder from '@axe-core/playwright';
import type { Page, PlaywrightTestConfig } from '@playwright/test';

export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

export declare function assertAxe(page: Page): Promise<AxeResults>;

export declare function createPlaywrightConfig(configuration?: PlaywrightTestConfig): PlaywrightTestConfig;

export declare function createPlaywrightProjects(): NonNullable<PlaywrightTestConfig['projects']>;

export declare function waitForIdle(page: Page): Promise<void>;
