// content.js
// This script is injected into web pages to extract HTML and CSS content
// It runs in the context of the webpage and communicates with the extension's popup

/**
 * Enhanced function to extract all CSS from the current webpage
 * This includes:
 * - External stylesheets
 * - Internal stylesheets
 * - Inline styles
 * - @import rules
 * Handles CORS restrictions and provides source information for each stylesheet
 */
function getAllCSS() {
    let cssContent = '';
    const processedImports = new Set(); // Track processed @import rules to avoid duplicates
    
    /**
     * Recursive function to process a stylesheet and its imports
     * @param {CSSStyleSheet} sheet - The stylesheet to process
     * @param {string} indentation - Current indentation level for nested imports
     */
    function processStylesheet(sheet, indentation = '') {
      if (!sheet) return;
      
      // Add source information for each stylesheet
      cssContent += `${indentation}/* From ${sheet.href || 'inline stylesheet'} */\n`;
      
      // Handle cross-origin stylesheets (CORS restrictions)
      if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
        cssContent += `${indentation}/* External stylesheet ${sheet.href} (inaccessible due to CORS) */\n`;
        return;
      }
      
      try {
        // Process each CSS rule in the stylesheet
        for (const rule of sheet.cssRules) {
          // Special handling for @import rules
          if (rule.type === CSSRule.IMPORT_RULE) {
            const importSheet = rule.styleSheet;
            if (importSheet && !processedImports.has(importSheet)) {
              processedImports.add(importSheet);
              cssContent += `${indentation}/* Processing @import: ${rule.href} */\n`;
              processStylesheet(importSheet, indentation + '  ');
            } else {
              cssContent += `${indentation}${rule.cssText}\n`;
            }
          } else {
            cssContent += `${indentation}${rule.cssText}\n`;
          }
        }
      } catch (e) {
        cssContent += `${indentation}/* Error accessing rules: ${e.message} */\n`;
      }
    }
    
    // Process all stylesheets in the document
    for (const sheet of document.styleSheets) {
      processStylesheet(sheet);
      cssContent += '\n';
    }
    
    // Extract inline styles from elements with style attributes
    const elementsWithStyle = document.querySelectorAll('[style]');
    if (elementsWithStyle.length > 0) {
      cssContent += '\n/* Inline styles from elements with style attributes */\n';
      for (const element of elementsWithStyle) {
        // Create a CSS selector for the element
        const selector = element.tagName.toLowerCase() + 
                        (element.id ? `#${element.id}` : '') + 
                        (element.className ? `.${element.className.replace(/\s+/g, '.')}` : '');
        cssContent += `${selector} { ${element.style.cssText} }\n`;
      }
    }
    
    return cssContent || 'No CSS found or accessible on this page.';
  }
  
  /**
   * Function to get the complete HTML of the current page
   * @returns {string} The full HTML content of the page
   */
  function getHTML() {
    return document.documentElement.outerHTML;
  }
  
  /**
   * Message listener for communication with the extension popup
   * Handles two types of requests:
   * - 'scrapeCSS': Returns all CSS from the page
   * - 'scrapeHTML': Returns the complete HTML of the page
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeCSS') {
      sendResponse({ data: getAllCSS() });
    } else if (request.action === 'scrapeHTML') {
      sendResponse({ data: getHTML() });
    }
    return true; // Required for async sendResponse
  });