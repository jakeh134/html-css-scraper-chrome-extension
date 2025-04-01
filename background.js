/**
 * Background script for handling cross-origin requests and other privileged operations
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchStylesheet') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        // Validate URL before fetching
        try {
            const url = new URL(request.url);
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch (e) {
            clearTimeout(timeoutId);
            sendResponse({ error: 'Invalid URL' });
            return true;
        }

        fetch(request.url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'text/css,text/plain,*/*'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(css => {
            clearTimeout(timeoutId);
            sendResponse({ css });
        })
        .catch(error => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                sendResponse({ error: 'Request timed out' });
            } else {
                sendResponse({ error: error.message });
            }
        });
        return true; // Keep connection open for async response
    }
}); 