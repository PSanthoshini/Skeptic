import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

export async function scrapeWebsite(url: string) {
  logger.debug(`Starting scrape for ${url}`);
  
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Website blocked scraping (403). Please try another URL.');
    }
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }

  // Prevent OOM: if website returns crazy payload, abort. 
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    throw new Error('Website payload is too large (> 5MB) to analyze safely.');
  }

  const data = await response.text();
  const $ = cheerio.load(data);

  // Clean DOM
  $('script, style, noscript, iframe').remove();

  const title = $('title').text() || '';
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const heroText = $('h1').first().parent().text().trim().replace(/\s+/g, ' ').substring(0, 500);

  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text) headings.push(`${el.tagName.toUpperCase()}: ${text}`);
  });

  const ctas: string[] = [];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text && text.length < 50) ctas.push(text);
  });

  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text.length > 20) paragraphs.push(text);
  });

  const images: string[] = [];
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt) images.push(alt.trim());
  });

  const navItems: string[] = [];
  $('nav a, header a').each((_, el) => {
    const text = $(el).text().trim();
    if (text) navItems.push(text);
  });

  logger.debug(`Successfully scraped ${url}`);

  return {
    title,
    metaDesc,
    heroText,
    headings: headings.slice(0, 20),
    ctas: Array.from(new Set(ctas)).slice(0, 20),
    paragraphs: paragraphs.slice(0, 15),
    images: images.slice(0, 15),
    navItems: Array.from(new Set(navItems)).slice(0, 15),
  };
}
