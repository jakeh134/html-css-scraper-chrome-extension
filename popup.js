// popup.js
// Handles the extension's popup interface and user interactions

document.addEventListener('DOMContentLoaded', function() {
    // State variables to track current data and type
    let currentData = '';
    let dataType = '';
    const output = document.getElementById('output');
    const outputTitle = document.getElementById('outputTitle');
    
    /**
     * Executes the content script in the active tab and retrieves data
     * @param {string} action - The type of data to scrape ('scrapeCSS' or 'scrapeHTML')
     * @returns {Promise<string>} The scraped data or error message
     */
    async function executeScriptInActiveTab(action) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      try {
        // Inject the content script if it's not already there
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Send message to content script and get response
        const response = await chrome.tabs.sendMessage(tab.id, { action: action });
        return response.data;
      } catch (error) {
        return `Error: ${error.message}. Make sure you're on a regular web page (not a chrome:// or extension page).`;
      }
    }
    
    // Event listener for HTML scraping button
    document.getElementById('scrapeHTML').addEventListener('click', async function() {
      outputTitle.textContent = 'HTML Output';
      dataType = 'html';
      output.textContent = 'Loading HTML...';
      
      const htmlData = await executeScriptInActiveTab('scrapeHTML');
      currentData = htmlData;
      output.textContent = htmlData;
    });
    
    // Event listener for CSS scraping button
    document.getElementById('scrapeCSS').addEventListener('click', async function() {
      outputTitle.textContent = 'CSS Output';
      dataType = 'css';
      output.textContent = 'Loading CSS...';
      
      const cssData = await executeScriptInActiveTab('scrapeCSS');
      currentData = cssData;
      output.textContent = cssData;
    });
    
    // Event listener for copy button
    document.getElementById('copyButton').addEventListener('click', function() {
      if (currentData) {
        navigator.clipboard.writeText(currentData)
          .then(() => {
            // Show feedback when copied
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            setTimeout(() => {
              this.textContent = originalText;
            }, 1500);
          })
          .catch(err => {
            console.error('Could not copy text: ', err);
          });
      }
    });
    
    // Event listener for download button
    document.getElementById('downloadData').addEventListener('click', function() {
      if (!currentData) return;
      
      // Create and trigger download
      const blob = new Blob([currentData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `page-${dataType}.${dataType === 'html' ? 'html' : 'css'}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revoObjectURL(url);
      }, 0);
    });
  });