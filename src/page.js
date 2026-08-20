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

const defaultMaximumPageScrolls = 100;
const pageEndTolerance = 1;

function getMaximumPageScrolls(options) {
  const { maximumScrolls = defaultMaximumPageScrolls } = options;

  if (!Number.isSafeInteger(maximumScrolls) || maximumScrolls < 1) {
    throw new TypeError('maximumScrolls must be a positive safe integer.');
  }

  return maximumScrolls;
}

function getNextPageScroll(state, scrollCount, maximumScrolls) {
  const maximumScrollTop = Math.max(0, state.scrollHeight - state.clientHeight);
  const remainingScroll = maximumScrollTop - state.scrollTop;

  if (remainingScroll <= 0) {
    return null;
  }

  if (scrollCount >= maximumScrolls && remainingScroll > pageEndTolerance) {
    throw new Error(`Page traversal requires more than the configured limit of ${String(maximumScrolls)} viewport scrolls.`);
  }

  const nextScrollTop = Math.min(maximumScrollTop, state.scrollTop + state.clientHeight);

  if (nextScrollTop <= state.scrollTop) {
    throw new Error('Page traversal could not make forward progress.');
  }

  return {
    maximumScrollTop,
    nextScrollTop,
  };
}

function getDocumentScrollState() {
  const scrollingElement = document.scrollingElement;

  if (scrollingElement === null) {
    throw new Error('The document does not have a scrolling element.');
  }

  return {
    clientHeight: scrollingElement.clientHeight,
    scrollHeight: scrollingElement.scrollHeight,
    scrollTop: scrollingElement.scrollTop,
  };
}

function setDocumentScrollTop(scrollTop) {
  const scrollingElement = document.scrollingElement;

  if (scrollingElement === null) {
    throw new Error('The document does not have a scrolling element.');
  }

  scrollingElement.scrollTo({ behavior: 'instant', top: scrollTop });

  return scrollingElement.scrollTop;
}

async function waitForDocumentFonts() {
  await document.fonts.ready;

  const failedFonts = [...document.fonts].filter((font) => font.status === 'error');

  if (failedFonts.length > 0) {
    throw new Error(`${String(failedFonts.length)} document font face(s) failed to load.`);
  }
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

  const imagesToDecode = new Set(images.filter((image) => image.loading !== 'lazy' || image.complete));
  const deferredImages = images.filter((image) => image.loading === 'lazy' && !image.complete);

  if (deferredImages.length > 0) {
    await new Promise((resolvePromise) => {
      const pendingImages = new Set(deferredImages);
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          pendingImages.delete(entry.target);

          if (entry.isIntersecting || entry.target.complete) {
            imagesToDecode.add(entry.target);
          }
        }

        if (pendingImages.size === 0) {
          observer.disconnect();
          resolvePromise();
        }
      });

      for (const image of deferredImages) {
        observer.observe(image);
      }
    });
  }

  const sourcedImages = [...imagesToDecode].filter((image) => image.currentSrc !== '' || image.src !== '' || image.srcset !== '');
  const imageResults = await Promise.allSettled(sourcedImages.map(async (image) => await image.decode()));
  const failedImageCount = imageResults.filter((result) => result.status === 'rejected').length;

  if (failedImageCount > 0) {
    throw new Error(`${String(failedImageCount)} document image(s) failed to decode.`);
  }
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

export async function scrollThroughPage(page, options = {}) {
  const maximumScrolls = getMaximumPageScrolls(options);
  const initialState = await page.evaluate(getDocumentScrollState);
  let scrollCount = 0;

  try {
    await page.evaluate(setDocumentScrollTop, 0);

    while (true) {
      await waitForPageImages(page);
      await waitForPageRendering(page);

      const state = await page.evaluate(getDocumentScrollState);
      const nextScroll = getNextPageScroll(state, scrollCount, maximumScrolls);

      if (nextScroll === null) {
        break;
      }

      const actualScrollTop = await page.evaluate(setDocumentScrollTop, nextScroll.nextScrollTop);

      if (actualScrollTop <= state.scrollTop) {
        if (nextScroll.maximumScrollTop - state.scrollTop <= pageEndTolerance) {
          break;
        }

        throw new Error('Page traversal could not make forward progress.');
      }

      scrollCount += 1;
    }
  } finally {
    await page.evaluate(setDocumentScrollTop, initialState.scrollTop);
    await waitForPageImages(page);
    await waitForPageRendering(page);
  }
}

export async function navigateToPage(page, url) {
  const response = await page.goto(url);

  if (response === null) {
    throw new Error(`Navigation to "${url}" did not produce an HTTP response.`);
  }

  expect(response.ok(), `Navigation to "${url}" returned HTTP ${String(response.status())}.`).toBe(true);
  await expect(page).toHaveURL(url);

  return response;
}
