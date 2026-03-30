import { NextRequest, NextResponse } from 'next/server';

interface DecisionMaker {
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

interface ResearchResult {
  company: string;
  jobTitle: string;
  decisionMakers: DecisionMaker[];
  companyInfo: {
    size?: string;
    industry?: string;
    website?: string;
  };
  suggestions: string[];
}

// Use Grok API to search for decision makers
// Grok has excellent real-time search capabilities
async function searchWithGrok(company: string, jobTitle: string): Promise<DecisionMaker[]> {
  // Try Grok direct API first (requires API key)
  const GROK_API_KEY = process.env.GROK_API_KEY;
  
  // If no Grok key, use Puter.js free API
  if (!GROK_API_KEY) {
    return searchWithPuter(company, jobTitle);
  }
  
  const prompt = `You are a professional researcher. Find decision makers who would hire for a "${jobTitle}" position at "${company}".

Search for and provide:
1. Full names of hiring managers, HR directors, department heads, or C-level executives
2. Their job titles
3. LinkedIn profile URLs if found
4. Email addresses if publicly available

Format each person as:
NAME: [Full Name]
TITLE: [Job Title]
LINKEDIN: [LinkedIn URL or "Not found"]
EMAIL: [Email or "Not found"]
CONFIDENCE: [high/medium/low]
---

Focus on real, verifiable people. If you cannot find specific individuals, provide the most likely titles and departments to contact.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a professional researcher specializing in finding business contacts. You have access to real-time information and can search for people. Always provide factual, verifiable information.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return parseGrokResponse(content);
  } catch (error) {
    console.error('Grok search failed:', error);
    return searchWithPuter(company, jobTitle);
  }
}

// Free fallback using Puter.js
async function searchWithPuter(company: string, jobTitle: string): Promise<DecisionMaker[]> {
  const prompt = `Find decision makers for "${jobTitle}" position at "${company}".

List people who would be involved in hiring:
- HR managers, recruiters
- Department heads, directors
- C-level executives (CTO, CEO, etc.)

For each person provide:
NAME: [name]
TITLE: [title]
LINKEDIN: [URL or Not found]
EMAIL: [email or Not found]
CONFIDENCE: [high/medium/low]`;

  try {
    // Puter.js free API
    const response = await fetch('https://api.puter.com/drivers/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interface: 'puter-chat',
        driver: 'grok',
        method: 'complete',
        args: {
          messages: [
            { role: 'system', content: 'You are a business research assistant. Find real people. Be factual.' },
            { role: 'user', content: prompt }
          ]
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Puter API failed');
    }

    const data = await response.json();
    const content = data.result?.message?.content || data.message?.content || '';
    const parsed = parseGrokResponse(content);
    
    return parsed.length > 0 ? parsed : generateFallbackResults(company, jobTitle);
  } catch (error) {
    console.error('Puter search failed:', error);
    return generateFallbackResults(company, jobTitle);
  }
}

function parseGrokResponse(content: string): DecisionMaker[] {
  const results: DecisionMaker[] = [];
  
  // Split by the separator pattern
  const blocks = content.split(/NAME:|---/).filter(s => s.trim());
  
  for (const block of blocks) {
    if (!block.includes('TITLE:')) continue;
    
    const nameMatch = block.match(/^[^\n]+/);
    const titleMatch = block.match(/TITLE:\s*([^\n]+)/);
    const linkedinMatch = block.match(/LINKEDIN:\s*([^\n]+)/);
    const emailMatch = block.match(/EMAIL:\s*([^\n]+)/);
    const confidenceMatch = block.match(/CONFIDENCE:\s*(high|medium|low)/i);
    
    if (nameMatch && titleMatch) {
      results.push({
        name: nameMatch[0].trim(),
        title: titleMatch[1].trim(),
        linkedin: linkedinMatch?.[1]?.trim() !== 'Not found' ? linkedinMatch?.[1]?.trim() : undefined,
        email: emailMatch?.[1]?.trim() !== 'Not found' ? emailMatch?.[1]?.trim() : undefined,
        confidence: (confidenceMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
        source: 'Grok AI Search'
      });
    }
  }
  
  return results.length > 0 ? results : [];
}

function generateFallbackResults(company: string, jobTitle: string): DecisionMaker[] {
  return [
    {
      name: 'Search LinkedIn',
      title: 'Hiring Manager',
      confidence: 'low',
      source: 'Manual search required',
      linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company)} ${encodeURIComponent(jobTitle)} hiring`
    }
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, jobTitle } = body;

    if (!company || !jobTitle) {
      return NextResponse.json({ error: 'Company and job title are required' }, { status: 400 });
    }

    console.log(`Researching: ${company} - ${jobTitle}`);

    // Search using Grok
    const decisionMakers = await searchWithGrok(company, jobTitle);

    const result: ResearchResult = {
      company,
      jobTitle,
      decisionMakers,
      companyInfo: {
        website: company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
      },
      suggestions: [
        `Verify the contacts on LinkedIn before reaching out`,
        `Check recent company news for conversation starters`,
        `Look for mutual connections for warm introductions`,
      ]
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Failed to research. Please try again.' },
      { status: 500 }
    );
  }
}
