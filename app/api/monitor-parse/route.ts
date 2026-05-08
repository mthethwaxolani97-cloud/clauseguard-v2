// app/api/monitor-parse/route.ts
// Parses natural language like "Monitor my FTMO Standard 10k account"
// into structured data. Runs server-side so GROQ_API_KEY is secure.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { promptText } = await req.json();
    if (!promptText) return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });

    const prompt = `You are an AI assistant for ClauseGuard, a legal monitoring tool for prop firm traders.

The user said: "${promptText}"

Extract the monitoring details. Return ONLY valid JSON, no markdown:
{
  "firmName": "Name of the prop firm or company",
  "accountType": "Specific account type or challenge — say Unknown if not mentioned",
  "accountSize": "Dollar amount if mentioned — say Not specified if not mentioned",
  "suggestedUrl": "Best guess at their T&C URL based on the firm name — leave empty string if unsure",
  "monitorDescription": "A one-line plain English description of what to monitor",
  "confidence": "high" | "medium" | "low"
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
      }),
    });

    if (!res.ok) throw new Error('Groq API error');
    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}