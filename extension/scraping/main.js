
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');

async function queryXAI(title, description, url) {
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer xai-REPLACE_ME'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "You are a professional content writer and SEO expert. You'll be provided with website information and should generate a concise title, SEO description, and catchy slogan. Respond only with JSON."
                    },
                    {
                        role: "user",
                        content: `Based on this website information:
URL: ${url}
Original Title: ${title}
Original Description: ${description}

Please provide:
1. A clear, concise title (max 60 chars)
2. A proper description (max 155 chars, good for SEO)
3. A catchy one-line slogan (max 50 chars)

If the website provides a "sign-in"/"log-in" page, don't include that detail. Treat it as the actual page.
If the website contains 18+ content, invalidate the data by setting everything to "REDACTED".
Even if the provided data is in a foreign language, respond in English.

Format your response as valid JSON only:
{
    "title": "your title here",
    "description": "your description here",
    "slogan": "your slogan here"
}`
                    }
                ],
                model: "grok-beta",
                stream: false,
                temperature: 0
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        try {
            return JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw e;
        }
    } catch (error) {
        console.error('X.AI API error:', error);
        return null;
    }
}

class ResultManager {
    constructor(filename) {
        this.filename = filename;
        this.results = [];
        this.initialized = false;
        this.failedUrls = new Set();
    }

    async initialize() {
        try {
            await fs.access(this.filename);
            const content = await fs.readFile(this.filename, 'utf8');
            this.results = JSON.parse(content);
            // Create set of already processed URLs
            this.results.forEach(result => {
                if (result.statusCode === 'Error') {
                    this.failedUrls.add(result.url);
                }
            });
        } catch (error) {
            this.results = [];
            await this.saveAll();
        }
        this.initialized = true;
    }

    async addResult(result) {
        if (!this.initialized) await this.initialize();
        
        this.results.push(result);
        
        this.saveAll().catch(err => 
            console.error('Error saving results:', err)
        );
    }

    hasFailedBefore(url) {
        return this.failedUrls.has(url);
    }

    async saveAll() {
        const tempFile = `${this.filename}.temp`;
        await fs.writeFile(tempFile, JSON.stringify(this.results, null, 2));
        await fs.rename(tempFile, this.filename);
    }
}


async function processIcon(iconUrl, baseUrl, browser) {
    try {
        const response = await fetch(iconUrl);
        if (!response.ok) throw new Error(`Failed to fetch icon: ${response.status}`);
        
        // Create paths
        const urlHash = crypto.createHash('md5').update(baseUrl).digest('hex');
        const iconDir = path.join(process.cwd(), 'icons');
        const iconPath = path.join(iconDir, `${urlHash}.png`);
        
        // Ensure icons directory exists
        await fs.mkdir(iconDir, { recursive: true });

        // Create a new page for image processing
        const page = await browser.newPage();
        try {
            // Set viewport size
            await page.setViewport({ width: 128, height: 128 });

            // Create an HTML page with the image
            await page.setContent(`
                <html>
                    <body style="margin: 0; background: transparent;">
                        <img src="${iconUrl}" style="
                            width: 128px;
                            height: 128px;
                            object-fit: contain;
                            display: block;
                        ">
                    </body>
                </html>
            `);

            // Wait for image to load
            await page.waitForSelector('img', { timeout: 5000 });
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const img = document.querySelector('img');
                    if (img.complete) {
                        resolve();
                    } else {
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve); // Continue even if image fails
                    }
                });
            });

            // Take screenshot of the image
            const screenshot = await page.screenshot({
                omitBackground: true,
                type: 'png'
            });

            // Save the screenshot
            await fs.writeFile(iconPath, screenshot);
            
            return path.relative(process.cwd(), iconPath);
        } finally {
            await page.close();
        }
    } catch (error) {
        console.error(`Icon processing error for ${baseUrl}:`, error);
        return null;
    }
}

async function getBestIconUrl(page, baseUrl) {
    try {
        const icons = await page.evaluate(() => {
            const getAbsoluteUrl = (url, base) => {
                try {
                    return new URL(url, base).href;
                } catch {
                    return null;
                }
            };

            const icons = [];
            
            // Check manifest first
            const manifest = document.querySelector('link[rel="manifest"]');
            if (manifest) {
                icons.push({
                    url: manifest.href,
                    size: 512,
                    isManifest: true
                });
            }

            // Check MS tile image
            const msTile = document.querySelector('meta[name="msapplication-TileImage"]');
            if (msTile?.content) {
                icons.push({
                    url: getAbsoluteUrl(msTile.content, window.location.href),
                    size: 144
                });
            }

            // Check OG image
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage?.content) {
                icons.push({
                    url: getAbsoluteUrl(ogImage.content, window.location.href),
                    size: 500
                });
            }
            
            // Check apple-touch-icon
            document.querySelectorAll('link[rel*="apple-touch-icon"]').forEach(link => {
                const sizes = link.sizes?.value?.split('x')[0] || 0;
                icons.push({
                    url: link.href,
                    size: parseInt(sizes) || 180
                });
            });
            
            // Check other icons
            document.querySelectorAll('link[rel*="icon"]').forEach(link => {
                const sizes = link.sizes?.value?.split('x')[0] || 0;
                icons.push({
                    url: link.href,
                    size: parseInt(sizes) || 32
                });
            });

            // Check for image/png favicons specifically
            document.querySelectorAll('link[type="image/png"]').forEach(link => {
                const sizes = link.sizes?.value?.split('x')[0] || 0;
                icons.push({
                    url: link.href,
                    size: parseInt(sizes) || 32
                });
            });

            return icons;
        });

        // Handle manifest if present
        const manifestIcon = icons.find(i => i.isManifest);
        if (manifestIcon) {
            try {
                const manifestResponse = await fetch(manifestIcon.url);
                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json();
                    if (manifest.icons && manifest.icons.length > 0) {
                        const largestIcon = manifest.icons
                            .sort((a, b) => {
                                const sizeA = parseInt(a.sizes?.split('x')[0]) || 0;
                                const sizeB = parseInt(b.sizes?.split('x')[0]) || 0;
                                return sizeB - sizeA;
                            })[0];
                        if (largestIcon?.src) {
                            return new URL(largestIcon.src, baseUrl).href;
                        }
                    }
                }
            } catch (error) {
                console.error(`Manifest processing error for ${baseUrl}:`, error);
            }
        }

        // Filter and sort remaining icons
        const sortedIcons = icons
            .filter(icon => icon.url && !icon.isManifest)
            .sort((a, b) => b.size - a.size);

        if (sortedIcons.length > 0) {
            return sortedIcons[0].url;
        }

        // Last resort: try favicon.ico
        return new URL('/favicon.ico', baseUrl).href;
    } catch (error) {
        console.error(`Error getting icon URL for ${baseUrl}:`, error);
        return null;
    }
}

// Update the scrapeWebsites function to pass the browser instance to processIcon
async function scrapeWebsites() {
    try {
        const websites = (await fs.readFile('websites.txt', 'utf8'))
            .split('\n')
            .map(site => site.trim())
            .filter(site => site);

        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });

        const resultManager = new ResultManager('scraping_results.json');
        await resultManager.initialize();

        const batchSize = 5;
        for (let i = 0; i < websites.length; i += batchSize) {
            const batch = websites.slice(i, i + batchSize);
            const promises = batch.map(async website => {
                try {
                    const url = website.startsWith('http') ? website : `https://${website}`;
                    
                    if (resultManager.hasFailedBefore(url)) {
                        console.log(`Skipping previously failed URL: ${url}`);
                        return;
                    }

                    console.log(`Scraping: ${url}`);
                    const page = await browser.newPage();

                    await page.setDefaultNavigationTimeout(45000);
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    
                    await page.setRequestInterception(true);
                    page.on('request', (request) => {
                        if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                            request.abort();
                        } else {
                            request.continue();
                        }
                    });

                    const response = await Promise.race([
                        page.goto(url, {
                            waitUntil: 'domcontentloaded',
                            timeout: 45000
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Custom timeout')), 45000)
                        )
                    ]);

                    await page.waitForSelector('title, meta[name="description"], meta[property="og:description"]', {
                        timeout: 5000
                    }).catch(() => console.log('Metadata selectors timeout - continuing anyway'));

                    // Get icon URL
                    const iconUrl = await getBestIconUrl(page, url);
                    
                    // Process icon in parallel with other data collection
                    const iconPromise = iconUrl ? processIcon(iconUrl, url, browser) : Promise.resolve(null);

                    const data = await page.evaluate(() => {
                        const title = document.title || '';
                        const metaDescription = document.querySelector('meta[name="description"]')?.content || 
                                             document.querySelector('meta[property="og:description"]')?.content || '';
                        return { title, description: metaDescription };
                    });

                    if (data.title || data.description) {
                        console.log(`Getting enhanced content for ${url}...`);
                        const [enhancedContent, iconPath] = await Promise.all([
                            queryXAI(data.title, data.description, url),
                            iconPromise
                        ]);

                        if (enhancedContent) {
                            await resultManager.addResult({
                                url,
                                original: {
                                    title: data.title,
                                    description: data.description,
                                },
                                enhanced: enhancedContent,
                                iconPath: iconPath,
                                statusCode: response?.status() || 'Unknown'
                            });
                        }
                    }

                    await page.close();

                } catch (error) {
                    console.error(`Failed for ${website}: ${error.message}`);
                    resultManager.failedUrls.add(website);
                }
            });

            await Promise.all(promises);
        }

        await browser.close();
        await resultManager.saveAll();

        const successCount = resultManager.results.length;
        const failedCount = resultManager.failedUrls.size;
        
        console.log('\nScraping completed!');
        console.log(`Successfully processed: ${successCount} websites`);
        console.log(`Failed/Skipped: ${failedCount} websites`);
        console.log('Results saved to scraping_results.json');
        console.log('Icons saved in ./icons directory');
        
        return resultManager.results;

    } catch (error) {
        console.error('Fatal error:', error);
        throw error;
    }
}

scrapeWebsites().catch(console.error);