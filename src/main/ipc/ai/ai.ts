import { webContents, WebContents } from 'electron';

/**
 * Extract text content from the specified tab
 * @param tabId - The ID of the tab to extract content from
 * @returns Promise<string> - The text content of the page
 */
export async function extractPageContent(tabId: string): Promise<string> {
  try {
    // Find the webContents for the given tab ID
    const allWebContents = webContents.getAllWebContents();
    const targetWebContents = allWebContents.find(wc => {
      return wc.id.toString() === tabId || wc.getURL().includes(tabId);
    });

    if (!targetWebContents) {
      // If no specific tab found, use the focused web contents
      const focusedWebContents = webContents.getFocusedWebContents();
      if (!focusedWebContents) {
        throw new Error('No active tab found to extract content from');
      }
      
      // Extract text content from the page
      const textContent = await focusedWebContents.executeJavaScript(`
        (() => {
          // Get the main text content WITHOUT removing elements
          const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';

          // Clean up extra whitespace
          return bodyText.replace(/\s+/g, ' ').trim();
        })()
      `);
      
      return textContent || '';
    }

    // Extract text content from the specific tab
    const textContent = await targetWebContents.executeJavaScript(`
      (() => {
        // Get the main text content WITHOUT removing elements
        const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';

        // Clean up extra whitespace
        return bodyText.replace(/\s+/g, ' ').trim();
      })()
    `);
    
    return textContent || '';
    
  } catch (error) {
    console.error('Failed to extract page content:', error);
    throw new Error(`Page content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get page metadata from the specified tab
 * @param tabId - The ID of the tab to get metadata from
 * @returns Promise<object> - Object containing title, description, url, and text
 */
export async function getPageMetadata(tabId: string): Promise<{title: string, description: string, url: string, text: string}> {
  try {
    // Find the webContents for the given tab ID
    const allWebContents = webContents.getAllWebContents();
    const targetWebContents = allWebContents.find(wc => {
      return wc.id.toString() === tabId || wc.getURL().includes(tabId);
    });

    if (!targetWebContents) {
      // If no specific tab found, use the focused web contents
      const focusedWebContents = webContents.getFocusedWebContents();
      if (!focusedWebContents) {
        throw new Error('No active tab found to get metadata from');
      }
      
      // Extract metadata from the page
      const metadata = await focusedWebContents.executeJavaScript(`
        (() => {
          const title = document.title || '';
          const url = window.location.href || '';

          // Get description from meta tags
          const descriptionMeta = document.querySelector('meta[name="description"]') ||
                                 document.querySelector('meta[property="og:description"]');
          const description = descriptionMeta ? descriptionMeta.getAttribute('content') || '' : '';

          // Get text content WITHOUT removing elements
          const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';
          const text = bodyText.replace(/\s+/g, ' ').trim();

          return { title, description, url, text };
        })()
      `);
      
      return metadata;
    }

    // Extract metadata from the specific tab
    const metadata = await targetWebContents.executeJavaScript(`
      (() => {
        const title = document.title || '';
        const url = window.location.href || '';

        // Get description from meta tags
        const descriptionMeta = document.querySelector('meta[name="description"]') ||
                               document.querySelector('meta[property="og:description"]');
        const description = descriptionMeta ? descriptionMeta.getAttribute('content') || '' : '';

        // Get text content WITHOUT removing elements
        const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';
        const text = bodyText.replace(/\s+/g, ' ').trim();

        return { title, description, url, text };
      })()
    `);
    
    return metadata;
    
  } catch (error) {
    console.error('Failed to get page metadata:', error);
    throw new Error(`Page metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Capture a screenshot of the specified tab
 * @param tabId - The ID of the tab to capture
 * @returns Promise<string> - Base64 encoded screenshot data
 */
export async function captureTabScreenshot(tabId: string): Promise<string> {
  try {
    console.log('[AI] Attempting to capture screenshot for tab:', tabId);

    // Parse tab ID to number for proper matching
    const parsedTabId = parseInt(tabId, 10);
    if (isNaN(parsedTabId)) {
      console.log('[AI] Invalid tab ID, using focused WebContents');
    }

    // Find the webContents for the given tab ID
    const allWebContents = webContents.getAllWebContents();
    console.log('[AI] Available WebContents IDs:', allWebContents.map(wc => wc.id));

    let targetWebContents: WebContents | undefined = undefined;
    if (!isNaN(parsedTabId)) {
      targetWebContents = allWebContents.find(wc => wc.id === parsedTabId);
    }

    if (!targetWebContents) {
      console.log('[AI] Target tab not found, using focused WebContents');
      // If no specific tab found, use the focused web contents
      const focusedWebContents = webContents.getFocusedWebContents();
      if (!focusedWebContents) {
        throw new Error('No active tab found to capture');
      }

      // Ensure the WebContents is ready
      if (focusedWebContents.isDestroyed()) {
        throw new Error('Target WebContents is destroyed');
      }

      // Wait for the page to be ready if it's loading
      if (focusedWebContents.isLoading()) {
        console.log('[AI] Waiting for page to finish loading...');
        await new Promise<void>((resolve) => {
          const onFinishLoad = () => {
            focusedWebContents.off('did-finish-load', onFinishLoad);
            resolve();
          };
          focusedWebContents.on('did-finish-load', onFinishLoad);

          // Timeout after 3 seconds
          setTimeout(() => {
            focusedWebContents.off('did-finish-load', onFinishLoad);
            resolve();
          }, 3000);
        });
      }

      // Capture the page
      console.log('[AI] Capturing page screenshot...');
      const image = await focusedWebContents.capturePage();

      // Convert to base64 data URL
      const buffer = image.toPNG();
      const base64 = buffer.toString('base64');
      console.log('[AI] Screenshot captured successfully, size:', base64.length);
      return `data:image/png;base64,${base64}`;
    }

    // Ensure the target WebContents is ready
    if (targetWebContents.isDestroyed()) {
      throw new Error('Target WebContents is destroyed');
    }

    // Wait for the page to be ready if it's loading
    if (targetWebContents.isLoading()) {
      console.log('[AI] Waiting for target page to finish loading...');
      await new Promise<void>((resolve) => {
        const onFinishLoad = () => {
          targetWebContents!.off('did-finish-load', onFinishLoad);
          resolve();
        };
        targetWebContents.on('did-finish-load', onFinishLoad);

        // Timeout after 3 seconds
        setTimeout(() => {
          targetWebContents!.off('did-finish-load', onFinishLoad);
          resolve();
        }, 3000);
      });
    }

    // Capture the specific tab
    console.log('[AI] Capturing specific tab screenshot...');
    const image = await targetWebContents.capturePage();

    // Convert to base64 data URL
    const buffer = image.toPNG();
    const base64 = buffer.toString('base64');
    console.log('[AI] Screenshot captured successfully, size:', base64.length);
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    console.error('[AI] Failed to capture screenshot:', error);
    throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// IPC handlers are registered in handlers.ts