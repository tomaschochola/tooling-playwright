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
import { navigateToPage } from './page.js';

export async function assertPage(page, expectation) {
  await navigateToPage(page, expectation.url);
  await expect(page).toHaveTitle(expectation.title);

  const heading = page.getByRole('heading', { level: 1 });

  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveAccessibleName(expectation.heading);
  await expect(heading).toBeVisible();
  await assertNoAxeViolations(page);
}
