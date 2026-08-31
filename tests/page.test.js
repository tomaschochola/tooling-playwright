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
import {
    assertPageStandardsMode,
    assertValidIds,
    navigateToPage,
    scrollThroughPage,
    waitForPageDomContentLoaded,
    waitForPageFonts,
    waitForPageImages,
    waitForPageLoad,
    waitForPageNetworkIdle,
    waitForPageRendering,
    waitForPageResources,
} from '../src/index.js';

test('rejects navigation without an HTTP response', async () => {
    await assert.rejects(
        navigateToPage(
            {
                goto: async () => null,
            },
            '/same-document-navigation',
        ),
        /did not produce an HTTP response/,
    );
});

test('distinguishes standards mode from quirks mode', async () => {
    const originalDocument = globalThis.document;
    const page = {
        evaluate: async (callback) => await callback(),
    };

    try {
        globalThis.document = { compatMode: 'CSS1Compat' };
        await assertPageStandardsMode(page);

        globalThis.document = { compatMode: 'BackCompat' };
        await assert.rejects(assertPageStandardsMode(page), /standards mode/);
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});

test('requires ids to be valid and unique within each document and shadow root', async () => {
    const originalDocument = globalThis.document;
    const page = {
        evaluate: async (callback) => await callback(),
    };
    const createElement = (id, shadowRoot = null) => ({
        getAttribute: () => id,
        hasAttribute: (name) => name === 'id' && id !== null,
        shadowRoot,
    });
    const shadowRoot = {
        querySelectorAll: () => [createElement('shared'), createElement('shadow-duplicate'), createElement('shadow-duplicate')],
    };

    try {
        globalThis.document = {
            querySelectorAll: () => [createElement(null), createElement(''), createElement('with space'), createElement('shared'), createElement('unique', shadowRoot)],
        };
        await assert.rejects(assertValidIds(page), (error) => {
            assert.match(error.message, /at least one character/);
            assert.match(error.message, /with space/);
            assert.match(error.message, /shadow-duplicate/);

            return true;
        });

        globalThis.document.querySelectorAll = () => [createElement('shared'), createElement('unique', shadowRoot)];
        shadowRoot.querySelectorAll = () => [createElement('shared')];
        await assertValidIds(page);
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});

test('exposes exact Playwright lifecycle and rendering waits independently', async () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const loadStates = [];
    let animationFrames = 0;
    const page = {
        evaluate: async (callback) => await callback(),
        waitForLoadState: async (state) => {
            loadStates.push(state);
        },
    };

    try {
        globalThis.requestAnimationFrame = (callback) => {
            animationFrames += 1;
            callback();
        };

        await waitForPageDomContentLoaded(page);
        await waitForPageLoad(page);
        await waitForPageNetworkIdle(page);
        await waitForPageRendering(page);
    } finally {
        if (originalRequestAnimationFrame === undefined) {
            delete globalThis.requestAnimationFrame;
        } else {
            globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        }
    }

    assert.deepEqual(loadStates, ['domcontentloaded', 'load', 'networkidle']);
    assert.equal(animationFrames, 2);
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

test('waits for fonts, light and open-shadow DOM images, and rendering after document load', async () => {
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
                *[Symbol.iterator]() {},
            },
            querySelectorAll: () => [lightImage, host, plainElement],
        };
        globalThis.HTMLImageElement = TestImage;
        globalThis.requestAnimationFrame = (callback) => {
            animationFrames += 1;
            callback();
        };

        await waitForPageResources({
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

    assert.deepEqual(loadStates, ['load']);
    assert.deepEqual(decodedImages, ['light', 'shadow', 'nested']);
    assert.equal(animationFrames, 2);
});

test('decodes eager, completed lazy, and viewport-intersecting lazy images without triggering deferred images', async () => {
    const originalDocument = globalThis.document;
    const originalHtmlImageElement = globalThis.HTMLImageElement;
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    const decodedImages = [];
    const observedImages = [];

    let observerDisconnects = 0;

    class TestImage {
        constructor(name, loading, complete, isIntersecting) {
            this.complete = complete;
            this.isIntersecting = isIntersecting;
            this.loading = loading;
            this.name = name;
            this.shadowRoot = null;
        }

        async decode() {
            decodedImages.push(this.name);
        }
    }

    class TestIntersectionObserver {
        constructor(callback) {
            this.callback = callback;
        }

        disconnect() {
            observerDisconnects += 1;
        }

        observe(image) {
            observedImages.push(image.name);

            if (image.completeOnObserve === true) {
                image.complete = true;
            }

            this.callback([{ isIntersecting: image.isIntersecting, target: image }]);
        }
    }

    const eagerImage = new TestImage('eager', 'eager', false, false);
    const completedLazyImage = new TestImage('completed lazy', 'lazy', true, false);
    const visibleLazyImage = new TestImage('visible lazy', 'lazy', false, true);
    const deferredLazyImage = new TestImage('deferred lazy', 'lazy', false, false);
    const completedWhileObservedImage = new TestImage('completed while observed', 'lazy', false, false);
    const sourceLessImage = new TestImage('source-less', 'eager', true, true);

    completedWhileObservedImage.completeOnObserve = true;
    sourceLessImage.currentSrc = '';
    sourceLessImage.src = '';
    sourceLessImage.srcset = '';

    try {
        globalThis.document = {
            querySelectorAll: () => [eagerImage, completedLazyImage, visibleLazyImage, deferredLazyImage, completedWhileObservedImage, sourceLessImage],
        };
        globalThis.HTMLImageElement = TestImage;
        globalThis.IntersectionObserver = TestIntersectionObserver;

        await waitForPageImages({
            evaluate: async (callback) => await callback(),
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

        if (originalIntersectionObserver === undefined) {
            delete globalThis.IntersectionObserver;
        } else {
            globalThis.IntersectionObserver = originalIntersectionObserver;
        }
    }

    assert.deepEqual(observedImages, ['visible lazy', 'deferred lazy', 'completed while observed']);
    assert.deepEqual(decodedImages, ['eager', 'completed lazy', 'visible lazy', 'completed while observed']);
    assert.equal(observerDisconnects, 1);
});

test('rejects attempted font faces that failed to load', async () => {
    const originalDocument = globalThis.document;

    try {
        globalThis.document = {
            fonts: {
                ready: Promise.resolve(),
                *[Symbol.iterator]() {
                    yield { status: 'loaded' };
                    yield { status: 'error' };
                },
            },
        };

        await assert.rejects(
            waitForPageFonts({
                evaluate: async (callback) => await callback(),
            }),
            /1 document font face\(s\) failed to load/,
        );
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});

test('propagates image decoding failures', async () => {
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
                        throw new Error('Image decoding failed.');
                    }
                }

                try {
                    globalThis.document = {
                        fonts: {
                            ready: Promise.resolve(),
                            *[Symbol.iterator]() {},
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
        /1 document image\(s\) failed to decode/,
    );
});

test('traverses a finite page by viewport and restores its initial scroll position', async () => {
    const originalDocument = globalThis.document;
    const originalHtmlImageElement = globalThis.HTMLImageElement;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const scrollPositions = [];
    const scrollingElement = {
        clientHeight: 100,
        scrollHeight: 250,
        scrollTop: 40,
        scrollTo({ top }) {
            scrollPositions.push(top);
        },
    };

    Object.defineProperty(scrollingElement, 'scrollTop', {
        configurable: true,
        get() {
            return scrollPositions.at(-1) ?? 40;
        },
    });

    try {
        globalThis.document = {
            querySelectorAll: () => [],
            scrollingElement,
        };
        globalThis.HTMLImageElement = class {};
        globalThis.requestAnimationFrame = (callback) => callback();

        await scrollThroughPage(
            {
                evaluate: async (callback, argument) => await callback(argument),
            },
            { maximumScrolls: 2 },
        );
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

    assert.deepEqual(scrollPositions, [0, 100, 150, 40]);
});

test('rejects page traversal without a document scrolling element', async () => {
    const originalDocument = globalThis.document;

    try {
        globalThis.document = { scrollingElement: null };

        await assert.rejects(
            scrollThroughPage({
                evaluate: async (callback, argument) => await callback(argument),
            }),
            /does not have a scrolling element/,
        );
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});

test('restores page traversal when scrolling becomes unavailable', async () => {
    const originalDocument = globalThis.document;

    try {
        globalThis.document = { scrollingElement: null };

        await assert.rejects(
            scrollThroughPage({
                evaluate: async (callback, argument) => {
                    if (callback.name === 'getDocumentScrollState') {
                        return { clientHeight: 100, scrollHeight: 200, scrollTop: 25 };
                    }

                    return await callback(argument);
                },
            }),
            /does not have a scrolling element/,
        );
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});

test('rejects page traversal that cannot make progress', async () => {
    let scrollTop = 0;

    await assert.rejects(
        scrollThroughPage({
            evaluate: async (callback, argument) => {
                if (callback.name === 'getDocumentScrollState') {
                    return { clientHeight: 0, scrollHeight: 1, scrollTop };
                }

                if (callback.name === 'setDocumentScrollTop') {
                    scrollTop = argument;
                }
            },
        }),
        /could not make forward progress/,
    );
});

test('rejects page traversal when the browser refuses the requested scroll', async () => {
    await assert.rejects(
        scrollThroughPage({
            evaluate: async (callback) => {
                if (callback.name === 'getDocumentScrollState') {
                    return { clientHeight: 100, scrollHeight: 200, scrollTop: 0 };
                }

                if (callback.name === 'setDocumentScrollTop') {
                    return 0;
                }
            },
        }),
        /could not make forward progress/,
    );
});

test('bounds traversal of pages that do not have a finite end', async () => {
    let scrollTop = 0;

    await assert.rejects(
        scrollThroughPage(
            {
                evaluate: async (callback, argument) => {
                    if (callback.name === 'getDocumentScrollState') {
                        return { clientHeight: 1, scrollHeight: 1000, scrollTop };
                    }

                    if (callback.name === 'setDocumentScrollTop') {
                        scrollTop = argument;
                    }
                },
            },
            { maximumScrolls: 2 },
        ),
        /configured limit of 2 viewport scrolls/,
    );
    assert.equal(scrollTop, 0);
});

test('rejects invalid page traversal limits', async () => {
    await assert.rejects(scrollThroughPage({}, { maximumScrolls: 0 }), /positive safe integer/);
    await assert.rejects(scrollThroughPage({}, { maximumScrolls: 1.5 }), /positive safe integer/);
});
