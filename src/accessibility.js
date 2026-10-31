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
