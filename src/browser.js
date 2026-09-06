/**
 * @file
 * @author Tomáš Chochola <tomaschochola@tomaschochola.cz>
 * @copyright © 2026 Tomáš Chochola <tomaschochola@tomaschochola.cz>
 *
 * @license CC-BY-ND-4.0
 *
 * @see {@link https://creativecommons.org/licenses/by-nd/4.0/}
 * @see {@link https://github.com/tomaschochola}
 * @see {@link https://github.com/sponsors/tomaschochola}
 */

export function getDocumentCompatibilityMode() {
    return document.compatMode;
}

export function getDocumentIdViolations() {
    const getIdViolation = (element, ids) => {
        if (!element.hasAttribute('id')) {
            return null;
        }

        const id = element.getAttribute('id');

        if (id === '') {
            return 'An id must contain at least one character.';
        }

        if (/[\t\n\f\r ]/u.test(id)) {
            return `${JSON.stringify(id)} must not contain ASCII whitespace.`;
        }

        if (ids.has(id)) {
            return `${JSON.stringify(id)} must be unique within its tree.`;
        }

        ids.add(id);

        return null;
    };
    const idViolations = [];
    const roots = [document];

    for (const root of roots) {
        const ids = new Set();

        for (const element of root.querySelectorAll('*')) {
            const idViolation = getIdViolation(element, ids);

            if (idViolation !== null) {
                idViolations.push(idViolation);
            }

            if (element.shadowRoot !== null) {
                roots.push(element.shadowRoot);
            }
        }
    }

    return idViolations;
}

export function getDocumentScrollState() {
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

export function setDocumentScrollTop(scrollTop) {
    const scrollingElement = document.scrollingElement;

    if (scrollingElement === null) {
        throw new Error('The document does not have a scrolling element.');
    }

    scrollingElement.scrollTo({ behavior: 'instant', top: scrollTop });

    return scrollingElement.scrollTop;
}

export async function waitForDocumentFonts() {
    await document.fonts.ready;

    const failedFonts = [...document.fonts].filter((font) => font.status === 'error');

    if (failedFonts.length > 0) {
        throw new Error(`${String(failedFonts.length)} document font face(s) failed to load.`);
    }
}

export async function waitForDocumentImages() {
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

export async function waitForDocumentRendering() {
    await new Promise((resolvePromise) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolvePromise);
        });
    });
}
