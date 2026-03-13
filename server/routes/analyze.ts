import express from 'express';
import * as cheerio from 'cheerio';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Groq from 'groq-sdk';

const router = express.Router();

async function scrapeWebsite(url: string) {
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

  const data = await response.text();
  const $ = cheerio.load(data);

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

router.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const content = await scrapeWebsite(url);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-report', authenticate, async (req: AuthRequest, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

    const systemPrompt = `You are a senior SaaS product engineer and AI conversion architect.
Analyze website content and return a JSON object with EXACTLY this structure (no extra keys):
{
  "score": <number 0-100 representing conversion readiness>,
  "first_impression": "<string: does homepage immediately explain the product and value>",
  "value_proposition": "<string: how clearly does the website communicate its benefits>",
  "ux_problems": [{"issue": "<string>", "explanation": "<string>"}],
  "messaging_problems": [{"issue": "<string>", "original": "<quote weak text>", "suggested_improvement": "<rewrite>"}],
  "seo_analysis": ["<string>"],
  "trust_signals": ["<string>"],
  "conversion_blockers": [{"issue": "<string>", "explanation": "<string>"}],
  "quick_wins": ["<string x5>"],
  "advanced_recommendations": ["<string x3>"]
}
Respond with valid JSON only. No markdown, no explanation outside the JSON.`;

    const userPrompt = `Analyze this website data:
Title: ${content.title}
Meta Description: ${content.metaDesc}
Hero Text: ${content.heroText}
Headings: ${content.headings.join(' | ')}
CTAs: ${content.ctas.join(' | ')}
Paragraphs: ${content.paragraphs?.join(' | ') || ''}
Nav Items: ${content.navItems?.join(' | ') || ''}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate AI report' });
  }
});

router.post('/save', authenticate, async (req: AuthRequest, res) => {
  const { url, analysis } = req.body;
  const userId = req.user?.id;

  if (!url || !analysis) return res.status(400).json({ error: 'URL and analysis are required' });

  try {
    const { data: user, error: userError } = await db
      .from('users')
      .select('roasts_count, subscription_plan')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new Error('User not found');

    if (user.subscription_plan === 'free' && user.roasts_count >= 2) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        message: 'Free users are limited to 2 analyses per month. Please upgrade to Pro.',
      });
    }

    const { data: report, error: reportError } = await db
      .from('reports')
      .insert([{
        user_id: userId,
        url,
        score: analysis.score,
        full_analysis: JSON.stringify(analysis),
        tone: 'professional',
      }])
      .select()
      .single();

    if (reportError) throw reportError;

    await db.rpc('increment_roasts_count', { user_id: userId });

    res.json({ id: report.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
