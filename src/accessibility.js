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

import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import axe from 'axe-core';

const axeRuleIds = axe
    .getRules()
    .filter(({ tags }) => !tags.some((tag) => tag === 'deprecated' || tag.endsWith('-obsolete')))
    .map(({ ruleId }) => ruleId);

export async function assertNoAxeViolations(page) {
    const results = await new AxeBuilder({ axeSource: axe.source, page }).withRules(axeRuleIds).analyze();

    expect(results.violations).toEqual([]);

    return results;
}
