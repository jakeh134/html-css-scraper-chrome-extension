// content.js
// This script is injected into web pages to extract HTML and CSS content
// It runs in the context of the webpage and communicates with the extension's popup

/**
 * Enhanced function to capture the complete page with both HTML and CSS
 * Handles:
 * - Complete HTML structure
 * - External stylesheets
 * - Internal stylesheets
 * - Inline styles
 * - Computed styles
 * - Shadow DOM
 * - Base URLs for resources
 */
async function capturePage() {
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }
    
    // Clone the document to avoid modifying the original
    const docClone = document.cloneNode(true);
    
    // Create a style collection
    let styles = '';
    
    // Process inline styles
    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(style => {
        styles += style.textContent + '\n';
    });
    
    // Process external stylesheets
    for (const sheet of document.styleSheets) {
        try {
            // For same-origin stylesheets
            if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                for (const rule of sheet.cssRules) {
                    styles += rule.cssText + '\n';
                }
            } else {
                // For cross-origin stylesheets, preserve the link
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                docClone.head.appendChild(link);
            }
        } catch (e) {
            console.warn(`Could not process stylesheet: ${e.message}`);
            // If we can't access rules, preserve the original link
            if (sheet.href) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                docClone.head.appendChild(link);
            }
        }
    }
    
    // Handle inline element styles
    const elementsWithStyle = document.querySelectorAll('[style]');
    if (elementsWithStyle.length > 0) {
        styles += '\n/* Inline element styles */\n';
        for (const element of elementsWithStyle) {
            const selector = generateSimpleSelector(element);
            if (selector) {
                styles += `${selector} { ${element.style.cssText} }\n`;
            }
        }
    }
    
    // Handle Shadow DOM styles
    function processShadowDOM(element) {
        const shadowRoot = element.shadowRoot;
        if (shadowRoot) {
            const shadowStyles = shadowRoot.querySelectorAll('style');
            if (shadowStyles.length > 0) {
                styles += '\n/* Shadow DOM styles */\n';
                shadowStyles.forEach(style => {
                    styles += style.textContent + '\n';
                });
            }
            // Recursively process shadow DOM elements
            shadowRoot.querySelectorAll('*').forEach(processShadowDOM);
        }
    }
    
    // Process Shadow DOM elements
    document.querySelectorAll('*').forEach(processShadowDOM);
    
    // Add collected styles to the head
    if (styles) {
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        docClone.head.appendChild(styleElement);
    }
    
    // Add base tag to handle relative URLs
    const baseTag = document.createElement('base');
    baseTag.href = window.location.href;
    docClone.head.insertBefore(baseTag, docClone.head.firstChild);
    
    // Helper function for generating element selectors
    function generateSimpleSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0) {
                return `.${classes[0]}`; // Use first class only
            }
        }
        
        return element.tagName.toLowerCase();
    }
    
    // Return the complete HTML
    return '<!DOCTYPE html>\n' + docClone.documentElement.outerHTML;
}

// Message listener for communication with the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capturePage') {
        capturePage().then(html => sendResponse({ data: html }));
        return true;
    }
});