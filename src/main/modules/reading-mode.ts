import { WebContents } from "electron";
import { getSettingValueById } from "@/saving/settings";
import { debugPrint } from "@/modules/output";

export interface ReadingModeOptions {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  maxWidth: number;
  theme: "light" | "dark" | "sepia";
}

export interface ReadingModeContent {
  title: string;
  content: string;
  byline?: string;
  excerpt?: string;
  siteName?: string;
  url: string;
}

class ReadingModeManager {
  private readingModePages = new Map<number, ReadingModeContent>();

  constructor() {
    this.setupReadingMode();
  }

  private setupReadingMode() {
    debugPrint("READING_MODE", "Reading mode manager initialized");
  }

  public async extractContent(webContents: WebContents): Promise<ReadingModeContent | null> {
    try {
      const isEnabled = getSettingValueById("enableReadingMode") as boolean;
      if (!isEnabled) {
        debugPrint("READING_MODE", "Reading mode is disabled");
        return null;
      }

      // Execute readability script in the page
      const result = await webContents.executeJavaScript(`
        (function() {
          // Simple content extraction - in a real implementation, you'd use Readability.js
          const article = document.querySelector('article') || 
                         document.querySelector('[role="main"]') || 
                         document.querySelector('main') || 
                         document.querySelector('.content') ||
                         document.querySelector('#content') ||
                         document.body;
          
          if (!article) return null;
          
          // Get title
          const title = document.title || 
                       document.querySelector('h1')?.textContent || 
                       'Untitled';
          
          // Get byline (author)
          const bylineSelectors = [
            '[rel="author"]',
            '.author',
            '.byline',
            '[class*="author"]',
            '[class*="byline"]'
          ];
          
          let byline = '';
          for (const selector of bylineSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
              byline = element.textContent.trim();
              break;
            }
          }
          
          // Get site name
          const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                          document.querySelector('meta[name="application-name"]')?.getAttribute('content') ||
                          window.location.hostname;
          
          // Extract main content
          const contentElements = article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li');
          let content = '';
          
          contentElements.forEach(el => {
            if (el.tagName === 'P') {
              content += '<p>' + el.innerHTML + '</p>\\n';
            } else if (el.tagName.match(/^H[1-6]$/)) {
              content += '<' + el.tagName.toLowerCase() + '>' + el.textContent + '</' + el.tagName.toLowerCase() + '>\\n';
            } else if (el.tagName === 'BLOCKQUOTE') {
              content += '<blockquote>' + el.innerHTML + '</blockquote>\\n';
            } else if (el.tagName === 'UL') {
              content += '<ul>' + el.innerHTML + '</ul>\\n';
            } else if (el.tagName === 'OL') {
              content += '<ol>' + el.innerHTML + '</ol>\\n';
            }
          });
          
          // Get excerpt
          const excerpt = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         '';
          
          return {
            title: title,
            content: content,
            byline: byline,
            excerpt: excerpt,
            siteName: siteName,
            url: window.location.href
          };
        })();
      `);

      if (result) {
        this.readingModePages.set(webContents.id, result);
        debugPrint("READING_MODE", `Content extracted for page: ${result.title}`);
        return result;
      }

      return null;
    } catch (error) {
      debugPrint("READING_MODE", `Error extracting content: ${error}`);
      return null;
    }
  }

  public getReadingModeContent(webContentsId: number): ReadingModeContent | null {
    return this.readingModePages.get(webContentsId) || null;
  }

  public removeReadingModeContent(webContentsId: number): void {
    this.readingModePages.delete(webContentsId);
  }

  public async toggleReadingMode(webContents: WebContents): Promise<boolean> {
    const content = await this.extractContent(webContents);
    if (!content) return false;

    // Generate reading mode HTML
    const readingModeHtml = this.generateReadingModeHtml(content);
    
    // Navigate to reading mode
    await webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(readingModeHtml)}`);
    
    return true;
  }

  private generateReadingModeHtml(content: ReadingModeContent): string {
    const options = this.getReadingModeOptions();
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.title} - Reading Mode</title>
        <style>
          :root {
            --bg-color: ${options.theme === 'dark' ? '#1a1a1a' : options.theme === 'sepia' ? '#f4f1ea' : '#ffffff'};
            --text-color: ${options.theme === 'dark' ? '#e0e0e0' : options.theme === 'sepia' ? '#5c4b37' : '#333333'};
            --accent-color: ${options.theme === 'dark' ? '#4a9eff' : options.theme === 'sepia' ? '#8b4513' : '#0066cc'};
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: ${options.fontFamily};
            font-size: ${options.fontSize}px;
            line-height: ${options.lineHeight};
            color: var(--text-color);
            background-color: var(--bg-color);
            padding: 2rem;
            transition: all 0.3s ease;
          }
          
          .reading-container {
            max-width: ${options.maxWidth}px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          .header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--text-color);
            opacity: 0.3;
          }
          
          .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
            line-height: 1.2;
          }
          
          .byline {
            font-size: 1.1rem;
            color: var(--accent-color);
            margin-bottom: 0.5rem;
          }
          
          .site-info {
            font-size: 0.9rem;
            opacity: 0.7;
          }
          
          .content {
            font-size: inherit;
            line-height: inherit;
          }
          
          .content p {
            margin-bottom: 1.5rem;
          }
          
          .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            margin: 2rem 0 1rem 0;
            font-weight: bold;
          }
          
          .content h1 { font-size: 2rem; }
          .content h2 { font-size: 1.7rem; }
          .content h3 { font-size: 1.4rem; }
          .content h4 { font-size: 1.2rem; }
          .content h5 { font-size: 1.1rem; }
          .content h6 { font-size: 1rem; }
          
          .content blockquote {
            margin: 1.5rem 0;
            padding: 1rem 1.5rem;
            border-left: 4px solid var(--accent-color);
            background-color: var(--text-color);
            opacity: 0.1;
            font-style: italic;
          }
          
          .content ul, .content ol {
            margin: 1rem 0 1rem 2rem;
          }
          
          .content li {
            margin-bottom: 0.5rem;
          }
          
          .toolbar {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: var(--bg-color);
            border: 1px solid var(--text-color);
            border-radius: 8px;
            padding: 0.5rem;
            opacity: 0.8;
            transition: opacity 0.3s ease;
          }
          
          .toolbar:hover {
            opacity: 1;
          }
          
          .toolbar button {
            background: none;
            border: none;
            color: var(--text-color);
            padding: 0.5rem;
            margin: 0 0.25rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
          }
          
          .toolbar button:hover {
            background-color: var(--accent-color);
            color: var(--bg-color);
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="history.back()">← Back</button>
          <button onclick="window.print()">Print</button>
        </div>
        
        <div class="reading-container">
          <div class="header">
            <h1 class="title">${content.title}</h1>
            ${content.byline ? `<div class="byline">By ${content.byline}</div>` : ''}
            <div class="site-info">${content.siteName} • ${new URL(content.url).hostname}</div>
          </div>
          
          <div class="content">
            ${content.content}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReadingModeOptions(): ReadingModeOptions {
    return {
      fontSize: 18,
      fontFamily: 'Georgia, "Times New Roman", serif',
      lineHeight: 1.6,
      maxWidth: 700,
      theme: "light"
    };
  }
}

export const readingModeManager = new ReadingModeManager();
