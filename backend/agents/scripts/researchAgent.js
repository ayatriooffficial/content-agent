import { DuckDuckGoSearchClient } from '@agent-infra/duckduckgo-search';
import { fetchTranscript } from 'youtube-transcript';
import * as cheerio from 'cheerio';
import ollama from 'ollama';

const searchClient = new DuckDuckGoSearchClient({});

// 1. General Web Search via DuckDuckGo
async function fetchGeneralWeb(query, count = 3) {
  try {
    const res = await searchClient.search({ query, count });
    return res.results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
  } catch (err) {
    return `DDG Web Search Error: ${err.message}`;
  }
}

// 2. Reddit Search via DuckDuckGo
async function fetchRedditPosts(query, count = 3) {
  try {
    const res = await searchClient.search({ query: `site:reddit.com ${query}`, count });
    return res.results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
  } catch (err) {
    return `Reddit Search Error: ${err.message}`;
  }
}

// 3. YouTube Transcript Extractor
async function fetchYouTubeTranscript(videoUrlOrId) {
  try {
    const transcriptObj = await fetchTranscript(videoUrlOrId);
    return transcriptObj.map(item => item.text).join(' ');
  } catch (err) {
    return `YouTube Transcript Error: ${err.message}`;
  }
}

// 4. Lightweight Web Page Scraper (Clean Text Extractor)
async function scrapePageText(url) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and navigation tags
    $('script, style, nav, footer, header').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
    
    return cleanText.substring(0, 4000); // Truncate to first 4,000 chars
  } catch (err) {
    return `Scraper Error: ${err.message}`;
  }
}

// 5. Parallel Orchestrator
async function runConcurrentResearch(query, targetUrl, youtubeVideoId) {
  console.log(`🚀 Firing all 4 research streams in parallel for: "${query}"...\n`);

  // Promise.allSettled runs all 4 Promises concurrently
  const [webResult, redditResult, ytResult, pageResult] = await Promise.allSettled([
    fetchGeneralWeb(query),
    fetchRedditPosts(query),
    fetchYouTubeTranscript(youtubeVideoId),
    scrapePageText(targetUrl)
  ]);

  const collectedData = {
    web: webResult.status === 'fulfilled' ? webResult.value : webResult.reason,
    reddit: redditResult.status === 'fulfilled' ? redditResult.value : redditResult.reason,
    youtube: ytResult.status === 'fulfilled' ? ytResult.value : ytResult.reason,
    scrapedPage: pageResult.status === 'fulfilled' ? pageResult.value : pageResult.reason
  };

  return collectedData;
}

// --- Execution ---
(async () => {
  const query = "B.Com placement realities in Tier 3 colleges India";
  const targetUrl = "https://www.quora.com/What-is-the-average-salary-after-B-Com";
  const youtubeVideoId = "dQw4w9WgXcQ"; // Replace with a real YouTube video ID

  const researchData = await runConcurrentResearch(query, targetUrl, youtubeVideoId);

  console.log("--- Multi-Channel Research Complete ---");
  console.log("Web Results Count:", Array.isArray(researchData.web) ? researchData.web.length : "Failed");
  console.log("Reddit Results Count:", Array.isArray(researchData.reddit) ? researchData.reddit.length : "Failed");
  console.log("YouTube Transcript Length:", typeof researchData.youtube === 'string' ? researchData.youtube.length : 0);
  console.log("Scraped Page Content Length:", typeof researchData.scrapedPage === 'string' ? researchData.scrapedPage.length : 0);

  // Send aggregated data to local Ollama LLM
  console.log("\n--- Sending to Local Ollama Model (deepseek-r1:8b) ---");
  const prompt = `
  Analyze these multi-source research inputs about "${query}":
  - Web Snippets: ${JSON.stringify(researchData.web)}
  - Reddit Snippets: ${JSON.stringify(researchData.reddit)}
  - YouTube Text: ${String(researchData.youtube).substring(0, 1000)}

  Extract the top 3 student pain points and career anxieties.
  `;

  const response = await ollama.chat({
    model: 'deepseek-r1:8b',
    messages: [{ role: 'user', content: prompt }]
  });

  console.log("\n--- Extracted Insights ---");
  console.log(response.message.content);
})();