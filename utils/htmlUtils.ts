
/**
 * Cleans HTML content, specifically removing MS Word-specific junk while 
 * preserving basic formatting (bold, italic, lists, headers).
 */
export const cleanHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove MS Word specific classes, styles, and attributes
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
        el.removeAttribute('class');
        el.removeAttribute('style');
        el.removeAttribute('lang');
        el.removeAttribute('xml:lang');
        el.removeAttribute('dir');

        // Remove data- attributes
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                el.removeAttribute(attr.name);
            }
        });

        // Strip styles except for basics
        const style = el.getAttribute('style');
        if (style) {
            const cleanedStyle = style
                .split(';')
                .filter(prop => {
                    const propName = prop.split(':')[0].trim().toLowerCase();
                    return ['text-align', 'font-weight', 'font-style', 'text-decoration'].includes(propName);
                })
                .join(';');
            if (cleanedStyle) {
                el.setAttribute('style', cleanedStyle);
            } else {
                el.removeAttribute('style');
            }
        }
    });

    // Remove unwanted elements
    const unwantedSelectors = ['o\\:p', 'xml', 'meta', 'link', 'style', 'script'];
    unwantedSelectors.forEach(selector => {
        try {
            tempDiv.querySelectorAll(selector).forEach(el => el.remove());
        } catch (e) {
            // Invalid selector, skip
        }
    });

    // Remove elements with Mso classes or styles
    tempDiv.querySelectorAll('[class*="Mso"]').forEach(el => el.remove());
    tempDiv.querySelectorAll('[style*="mso-"]').forEach(el => {
        const style = el.getAttribute('style');
        if (style) {
            const cleanedStyle = style.split(';').filter(prop => !prop.includes('mso-')).join(';');
            if (cleanedStyle) {
                el.setAttribute('style', cleanedStyle);
            } else {
                el.removeAttribute('style');
            }
        }
    });

    // Keep only allowed tags
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a'];
    const allElementsArray = Array.from(tempDiv.querySelectorAll('*'));
    allElementsArray.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        if (!allowedTags.includes(tagName) && el.parentNode) {
            while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
            }
            el.parentNode.removeChild(el);
        }
    });

    // Final cleanup of empty paragraphs and extra whitespace
    let cleanedHtml = tempDiv.innerHTML
        .replace(/<p><\/p>/g, '<br>')
        .replace(/<p>\s*<\/p>/g, '<br>')
        .replace(/<p>\s*<br>\s*<\/p>/g, '<br>')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

    return cleanedHtml;
};
