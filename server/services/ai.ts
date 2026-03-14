import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function generateReport(content: any) {
  const groq = new Groq({ apiKey: env.GROQ_API_KEY });
  logger.debug('Sending data to Groq AI limit tracking...');

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

  try {
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
    return JSON.parse(text);
  } catch (error: any) {
    logger.error('Groq AI API Error:', error);
    throw new Error('Failed to generate AI report due to API limits or temporary outage.');
  }
}
