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

async function waitForDocumentFonts() {
  await document.fonts.ready;
}

async function waitForDocumentImages() {
  const images = [];
  const roots = [document];

  for (const root of roots) {
    for (const element of root.querySelectorAll('*')) {
      if (element instanceof HTMLImageElement) {
        images.push(element);
      }

      if (element.shadowRoot !== null) {
        roots.push(element.shadowRoot);
      }
    }
  }

  await Promise.all(images.map((image) => image.decode()));
}

async function waitForDocumentRendering() {
  await new Promise((resolvePromise) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolvePromise);
    });
  });
}

export async function waitForPageDomContentLoaded(page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function waitForPageLoad(page) {
  await page.waitForLoadState('load');
}

export async function waitForPageNetworkIdle(page) {
  await page.waitForLoadState('networkidle');
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
  await waitForPageLoad(page);
  await waitForPageResourcesAfterLoad(page);
}

export async function waitForPageReady(page) {
  await waitForPageDomContentLoaded(page);
  await waitForPageLoad(page);
  await waitForPageNetworkIdle(page);
  await waitForPageResourcesAfterLoad(page);
}

export async function navigateToPage(page, url) {
  const response = await page.goto(url);

  if (response === null) {
    throw new Error(`Navigation to "${url}" did not produce an HTTP response.`);
  }

  expect(response.ok(), `Navigation to "${url}" returned HTTP ${String(response.status())}.`).toBe(true);
  await expect(page).toHaveURL(url);
  await waitForPageResources(page);

  return response;
}
