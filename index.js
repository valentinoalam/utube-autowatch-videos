const { connect } = require("puppeteer-real-browser");
const { faker } = require('@faker-js/faker');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
async function checkForAds(page) {
    try {
        // Check for various types of ads
        const adSelectors = [
            '.ytp-ad-module', // YouTube ad overlay
            '.video-ads', // Video ads container
            '.ytp-ad-player-overlay', // Ad player overlay
            '.ytp-ad-skip-button', // Skip ad button
            '.ytp-ad-preview-text', // Ad preview text
            '.ad-showing' // General ad indicator
        ];

        // Wait a moment for ads to load
        await sleep(2000);

        // Check each ad selector
        for (const selector of adSelectors) {
            const adElement = await page.$(selector);
            if (adElement) {
                console.log('Ad detected with selector:', selector);
                
                // Try to click skip button if available
                try {
                    const skipButton = await page.$('.ytp-ad-skip-button, .ytp-skip-ad-button');
                    if (skipButton) {
                        await skipButton.click();
                        console.log('Skipped ad');
                        await sleep(1000); // Wait for skip to process
                    }
                } catch (skipError) {
                    console.log('Could not skip ad:', skipError.message);
                }
                
                return true; // Ad was found
            }
        }

        // Additional check: Look for ad text in page content
        const pageContent = await page.content();
        const adKeywords = ['ad', 'sponsored', 'commercial', 'promoted'];
        const hasAdText = adKeywords.some(keyword => 
            pageContent.toLowerCase().includes(keyword)
        );

        if (hasAdText) {
            console.log('Ad text detected in page content');
            return true;
        }

        return false; // No ads found

    } catch (error) {
        console.log('Error checking for ads:', error.message);
        return false;
    }
}

async function main(){
  // Get user input for search term
  const srch1 = await new Promise((resolve) => {
      readline.question('Enter search term: ', (input) => {
          resolve(input);
      });
  });
  // const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const wsChromeEndpointurl = 'ws://localhost:9222/devtools/browser/41a0b5f0–6747–446a-91b6–5ba30c87e951';
  const { browser } = await connect({
    browserWSEndpoint: wsChromeEndpointurl,
    // executablePath: executablePath,
    // headless: false,
    // defaultViewport: {width: 1280, height: 720},
    devtools: true,
    args: [
      // Security & Sandbox (choose one approach)
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      
      // GPU Acceleration (FIXED - remove conflicts)
      '--enable-gpu-rasterization',
      '--enable-zero-copy',
      '--ignore-gpu-blocklist',
      '--enable-hardware-overlays',
      
      // Performance Optimization
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas', // Keep this for memory savings
      '--no-first-run',
      '--no-zygote',
      
      // Stealth & Automation
      '--disable-blink-features=AutomationControlled',
      
      // Memory & Resource Management
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--memory-pressure-off',
      
      // Network & Loading
      '--disable-default-apps',
      '--disable-translate',
      '--disable-sync',
      
      // Window & UI
      '--window-size=1280,720',
      '--start-maximized'
    ],
    // Additional performance settings
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    dumpio: false, // Reduce console noise
    customConfig: {},
    turnstile: true,
    connectOption: {},
    disableXvfb: true,
    ignoreAllFlags: false,
    // proxy:{
    //     host:'<proxy-host>',
    //     port:'<proxy-port>',
    //     username:'<proxy-username>',
    //     password:'<proxy-password>'
    // }
  });
    
  const page = await browser.newPage();
  
  const headers = {
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': faker.internet.userAgent(),
    'X-Forwarded-For': faker.internet.ip(),
    'X-Real-IP': faker.internet.ip(),
    'Referer': faker.internet.url(),
    'DNT': '1',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Upgrade-Insecure-Requests': '1',

    'Pragma': 'no-cache'
  };

  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setExtraHTTPHeaders(headers);
  const maxOpenedVid = 20

  try {
    // Navigate to YouTube
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

    // Search input
    await page.waitForSelector('input[name="search_query"]', { timeout: 300000 });
    await page.click('input[name="search_query"]');
    await page.type('input[name="search_query"]', srch1 || '@hilsyah4655');
    await page.keyboard.press('Enter');

    // Wait for search results to load
    await sleep(3000);

    // Filter by channel
    await page.waitForSelector('button[aria-label="Search filters"]', { timeout: 30000 });
    await page.click('button[aria-label="Search filters"]');

    // Click on channel filter
    await page.waitForSelector('div[title="Search for Channel"]', { timeout: 30000 });
    await page.click('div[title="Search for Channel"]');

    // Wait for filter to apply
    await sleep(2000);

    // Find and click on the first channel result
    await page.waitForSelector('ytd-channel-renderer a', { timeout: 30000 });
    const firstChannel = await page.$('ytd-channel-renderer a');
    const channelUrl = await page.evaluate(el => el.href, firstChannel);
    
    // Navigate to channel page
    await page.goto(channelUrl, { waitUntil: 'networkidle2' });

    // Click on Videos tab
    await page.waitForSelector('yt-tab-shape[tab-title="Videos"]', { timeout: 30000 });
    await page.click('yt-tab-shape[tab-title="Videos"]');

    // Wait for videos to load
    await sleep(3000);

    // Scroll to load more videos
    for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await sleep(2000);
    }

    // Find all video links
    let videoLinks = await page.$$eval('ytd-rich-grid-media a#video-title-link', 
        links => links.map(link => ({
            href: link.href,
            text: link.textContent
        }))
    );
    if(videoLinks.length === 0) return await browser.close();
    console.log(`Found ${videoLinks.length} videos on the channel`);

    // Properly shuffle the video list
    videoLinks = videoLinks.slice(0, maxOpenedVid);
    for (let i = videoLinks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videoLinks[i], videoLinks[j]] = [videoLinks[j], videoLinks[i]];
    }

    console.log(`Starting to watch ${videoLinks.length} videos`);
      

    // Watch each video to completion
    for (var i = 0; i < videoLinks.length; i++) {
        videoUrl = videoLinks[i].href;
        console.log(`Playing video ${i+1}: ${videoUrl}`);

        console.log(`Watching video ${i + 1}/${videoLinks.length}: ${videoUrl}`);
        
        // Navigate to video
        await page.goto(videoUrl, { waitUntil: 'networkidle2' });
        await sleep(2000);
        // Check for ads and skip if found
        const hasAd = await checkForAds(page);
        
        if (hasAd) {
            console.log('Ad detected, skipping video...');
        }

        // 1. open settings-button
        const settingsButton = await page.waitForSelector('.ytp-settings-button');
        await settingsButton.click();

        // 2. open quality-menu item
        const menuItems = await page.$$('.ytp-panel-menu .ytp-menuitem');
        for (let i = 0; i < menuItems.length; i++) {
            const menuItem = menuItems[i];
            const label = await menuItem.$eval('.ytp-menuitem-label', el => el.textContent);
            if (label.includes('Quality')) {
                console.log("enter quality menu")
                await menuItem.click();
                break;
            }
        }

        await sleep(1000);

        // 3. select 480p quality item
        await page.waitForSelector('.ytp-quality-menu', {timeout: 60000});
        const qualityMenuItems = await page.$$('.ytp-quality-menu .ytp-menuitem');
        for (let i = 0; i < qualityMenuItems.length; i++) {
            const menuItem = qualityMenuItems[i];
            const label = await menuItem.$eval('.ytp-menuitem-label', el => el.textContent);
            if (label.includes('144p')) {
                console.log("select 144p quality")
                await menuItem.click();
                break;
            }
        }
        await sleep(1000);
        // Wait for video player to load
        await page.waitForSelector('#movie_player', { timeout: 10000 });
        const videoDuration = await page.$eval('video', (video) => video.duration);
        console.log('video duration: ', videoDuration);
        // Click play button if needed
        const playButton = await page.waitForSelector('button.ytp-play-button.ytp-button');
        if (playButton.length > 0) {
          await playButton[0].click();
        }
        
        // Wait for video to completely finish using YouTube's time display
        await new Promise(async (resolve) => {
        let lastProgress = 0;
        let stuckCount = 0;
        let lastStuckTime = 0;
        const maxStuckChecks = 5;
        const checkIntervalMs = 6000;

        const parseTime = (timeStr) => {
          if (!timeStr) return 0;
          const parts = timeStr.split(':').reverse();
          return parts.reduce((total, val, i) => total + (parseInt(val, 10) || 0) * Math.pow(60, i), 0);
        };

        const checkInterval = setInterval(async () => {
          try {
            const videoStatus = await page.evaluate(() => {
              const currentTimeEl = document.querySelector('.ytp-time-current');
              const durationEl = document.querySelector('.ytp-time-duration');
              const video = document.querySelector('video');
              const bufferingSpinner = document.querySelector('.ytp-spinner');
              const errorDisplay = document.querySelector('.ytp-error');

              if (!currentTimeEl || !durationEl || !video) {
                return { found: false };
              }

              return {
                found: true,
                currentTimeText: currentTimeEl.textContent.trim(),
                durationText: durationEl.textContent.trim(),
                currentTime: video.currentTime,
                duration: video.duration,
                ended: video.ended,
                paused: video.paused,
                buffering: !!bufferingSpinner,
                error: !!errorDisplay,
                readyState: video.readyState,
                networkState: video.networkState,
              };
            });

            if (!videoStatus.found) {
              console.log('Time display not found, exiting.');
              clearInterval(checkInterval);
              resolve();
              return;
            }

            // --- End / Error detection ---
            if (videoStatus.ended) {
              console.log('Video ended.');
              clearInterval(checkInterval);
              resolve();
              return;
            }
            if (videoStatus.error) {
              console.log('Video error detected.');
              clearInterval(checkInterval);
              resolve();
              return;
            }

            // --- Progress & Stuck Detection ---
            const now = Date.now();
            if (videoStatus.currentTime === lastProgress) {
              stuckCount++;
              if (now - lastStuckTime > 10000 && videoStatus.buffering) {
                console.log(`Video stuck at ${videoStatus.currentTimeText} (count: ${stuckCount})`);

                if (stuckCount >= maxStuckChecks) {
                  console.log(`Attempting recovery...`);
                  await page.evaluate(() => {
                    const video = document.querySelector('video');
                    if (!video || video.ended) return;

                    // Seek forward a bit
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);

                    // Ensure playback
                    if (video.paused) {
                      video.play().catch(() => {
                        const btn = document.querySelector('.ytp-play-button');
                        if (btn) btn.click();
                      });
                    }
                  });

                  await new Promise(r => setTimeout(r, 2000));
                  stuckCount = Math.floor(maxStuckChecks / 2); // half reset
                  lastStuckTime = now;
                }
              }
            } else {
              stuckCount = 0;
              lastProgress = videoStatus.currentTime;
              lastStuckTime = now;
            }

            // --- Completion check ---
            if (videoStatus.duration > 0 && videoStatus.currentTime >= videoStatus.duration - 2) {
              console.log(`Near end: ${videoStatus.currentTimeText}/${videoStatus.durationText}`);
              clearInterval(checkInterval);
              resolve();
              return;
            }

            console.log(`Progress: ${videoStatus.currentTimeText}/${videoStatus.durationText}`);
          } catch (err) {
            console.log('Error checking video status:', err);
          }
        }, checkIntervalMs);

        // --- Timeout fallback ---
        const timeoutDuration = await page.evaluate(() => {
          const durationEl = document.querySelector('.ytp-time-duration');
          if (!durationEl) return 15 * 60 * 1000; // default 15 mins

          const parseTime = (timeStr) => {
            const parts = timeStr.split(':').reverse();
            return parts.reduce((total, val, i) => total + (parseInt(val, 10) || 0) * Math.pow(60, i), 0);
          };

          const seconds = parseTime(durationEl.textContent.trim());
          return (seconds + 120) * 1000; // add 2 min buffer
        });

        setTimeout(() => {
          console.log('Timeout reached, stopping watch.');
          clearInterval(checkInterval);
          resolve();
        }, timeoutDuration);
      });
        console.log(`Finished watching video ${i + 1}`);
    } 
    console.log('Finished watching all videos');
    // browser.close()
    watchVideos()
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await browser.close();
  }
};

main();

// let urls = await tab.$$('#contents a[aria-hidden="true"]');
//     let hrefs = [];
//     for(let i =0;i<urls.length;i++){
//         const handle = urls[i];
//         const yourHref = await tab.evaluate(anchor => anchor.getAttribute('href'), handle);

//         hrefs.push("https://youtube.com" + yourHref);
//     }
//     console.log(hrefs);
//        for(let i =0;i<hrefs.length;i++){
//         await tab.goto(hrefs[i]);
//         await tab.waitForSelector('#top-level-buttons > ytd-toggle-button-renderer:nth-child(1) > a > #button',{visible:true}); // select the element
//         await delay(1500);
//         await tab.click('#top-level-buttons > ytd-toggle-button-renderer:nth-child(1) > a > #button');
// }