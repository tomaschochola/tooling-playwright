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

import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForPageDomContentLoaded, waitForPageLoad, waitForPageNetworkIdle, waitForPageReady, waitForPageResources } from '../src/index.js';

test('exposes each Playwright lifecycle state as an independent wait', async () => {
  const loadStates = [];
  const page = {
    waitForLoadState: async (state) => {
      loadStates.push(state);
    },
  };

  await waitForPageDomContentLoaded(page);
  await waitForPageLoad(page);
  await waitForPageNetworkIdle(page);

  assert.deepEqual(loadStates, ['domcontentloaded', 'load', 'networkidle']);
});

test('waits for loaded document resources without requiring network idle', async () => {
  const loadStates = [];

  await waitForPageResources({
    evaluate: async () => {},
    waitForLoadState: async (state) => {
      loadStates.push(state);
    },
  });

  assert.deepEqual(loadStates, ['load']);
});

test('waits for the complete page lifecycle, fonts, light and open-shadow DOM images, and rendering', async () => {
  const originalDocument = globalThis.document;
  const originalHtmlImageElement = globalThis.HTMLImageElement;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const loadStates = [];
  const decodedImages = [];

  let animationFrames = 0;

  class TestImage {
    constructor(name) {
      this.name = name;
      this.shadowRoot = null;
    }

    async decode() {
      decodedImages.push(this.name);
    }
  }

  const nestedImage = new TestImage('nested');
  const nestedHost = {
    shadowRoot: {
      querySelectorAll: () => [nestedImage],
    },
  };
  const shadowImage = new TestImage('shadow');
  const host = {
    shadowRoot: {
      querySelectorAll: () => [shadowImage, nestedHost],
    },
  };
  const lightImage = new TestImage('light');
  const plainElement = { shadowRoot: null };

  try {
    globalThis.document = {
      fonts: {
        ready: Promise.resolve(),
      },
      querySelectorAll: () => [lightImage, host, plainElement],
    };
    globalThis.HTMLImageElement = TestImage;
    globalThis.requestAnimationFrame = (callback) => {
      animationFrames += 1;
      callback();
    };

    await waitForPageReady({
      evaluate: async (callback) => await callback(),
      waitForLoadState: async (state) => {
        loadStates.push(state);
      },
    });
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalHtmlImageElement === undefined) {
      delete globalThis.HTMLImageElement;
    } else {
      globalThis.HTMLImageElement = originalHtmlImageElement;
    }

    if (originalRequestAnimationFrame === undefined) {
      delete globalThis.requestAnimationFrame;
    } else {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    }
  }

  assert.deepEqual(loadStates, ['domcontentloaded', 'load', 'networkidle']);
  assert.deepEqual(decodedImages, ['light', 'shadow', 'nested']);
  assert.equal(animationFrames, 2);
});

test('propagates image decoding failures', async () => {
  const error = new Error('Image decoding failed.');

  await assert.rejects(
    waitForPageResources({
      evaluate: async (callback) => {
        const originalDocument = globalThis.document;
        const originalHtmlImageElement = globalThis.HTMLImageElement;
        const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

        class BrokenImage {
          constructor() {
            this.shadowRoot = null;
          }

          async decode() {
            throw error;
          }
        }

        try {
          globalThis.document = {
            fonts: {
              ready: Promise.resolve(),
            },
            querySelectorAll: () => [new BrokenImage()],
          };
          globalThis.HTMLImageElement = BrokenImage;
          globalThis.requestAnimationFrame = (animationFrameCallback) => animationFrameCallback();

          await callback();
        } finally {
          globalThis.document = originalDocument;
          globalThis.HTMLImageElement = originalHtmlImageElement;
          globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        }
      },
      waitForLoadState: async () => {},
    }),
    error,
  );
});
