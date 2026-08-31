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

export { assertNoAxeViolations } from './accessibility.js';
export { assertNoConsoleErrors, assertNoPageErrors, assertPage, assertPageStandardsMode, assertValidIds } from './assertions.js';
export { createPlaywrightConfig, createPlaywrightDesktopProjects, createPlaywrightPhoneProjects, createPlaywrightProjects, createPlaywrightTabletProjects } from './config.js';
export {
    navigateToPage,
    scrollThroughPage,
    waitForPageDomContentLoaded,
    waitForPageFonts,
    waitForPageImages,
    waitForPageLoad,
    waitForPageNetworkIdle,
    waitForPageRendering,
    waitForPageResources,
} from './page.js';
