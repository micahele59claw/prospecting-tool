import { NextRequest, NextResponse } from 'next/server';

interface ResearchRequest {
  jobUrl: string;
  jobTitle?: string;
  company?: string;
}

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
    location?: string;
  };
  suggestions: string[];
}

// Puter.js Grok integration - works without API key!
async function searchWithPuterGrok(query: string): Promise<string> {
  // Puter.js SDK call - no API key required
  // Uses their free tier at puter.com
  const response = await fetch('https://api.puter.com/drivers/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Puter works without auth for basic usage
      'Authorization': 'Bearer anon',
    },
    body: JSON.stringify({
      interface: 'puter-chat',
      driver: 'grok',
      method: 'complete',
      args: {
        messages: [
          {
            role: 'system',
            content: `You are a research assistant specializing in finding business information. 
            
When given a company name and job title, find:
1. Decision makers who would hire for that role
2. Their names and titles (HR managers, department heads, CTOs, CEOs)
3. LinkedIn profile URLs if available
4. Email addresses if publicly available

Format your response as structured data:
DECISION_MAKER: Name | Title | LinkedIn URL | Email
Repeat for each person found.

Be factual and only include information you can verify. If uncertain, mark confidence as "low".`
          },
          {
            role: 'user',
            content: query
          }
        ],
        model: 'grok-2-1212'
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Puter API error:', error);
    throw new Error(`Puter API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result?.message?.content || data.message?.content || data.result || '';
}

// Alternative: Use Puter's web interface approach
async function searchWithPuterCloud(query: string): Promise<string> {
  // Puter Cloud API - free tier available
  const response = await fetch('https://puter-cloud-api.puter.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are a business research assistant. Find decision makers for job positions. Format as: Name | Title | LinkedIn | Email'
        },
        {
          role: 'user',
          content: query
        }
      ]
    })
  });

  if (response.ok) {
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  // Fallback to alternative approach
  return searchWithPuterGrok(query);
}

// Extract job details from URL
async function extractJobDetails(url: string): Promise<{ title: string; company: string; description: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobResearchBot/1.0)'
      }
    });
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].split('|')[0].split('-')[0].trim() : 'Unknown Position';
    
    // Clean up title
    title = title.replace(/hiring|jobs?|careers?|position/gi, '').trim();
    
    // Extract company - try multiple patterns
    const companyPatterns = [
      /at\s+([A-Z][A-Za-z\s&]+?)(?:\s*-|\s*\||\s*hiring)/i,
      /(?:company|employer)[:\s]+([A-Z][A-Za-z\s&]+)/i,
      /"company":\s*"([^"]+)"/i,
      /data-company=["']([^"']+)["']/i,
    ];
    
    let company = '';
    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match) {
        company = match[1].trim();
        break;
      }
    }
    
    // Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch && !company) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.hiringOrganization?.name) {
          company = jsonLd.hiringOrganization.name;
        }
        if (jsonLd.title) {
          title = jsonLd.title;
        }
      } catch {}
    }
    
    return { 
      title: title || 'Unknown Position', 
      company: company || 'Unknown Company', 
      description: html.substring(0, 3000) 
    };
  } catch (error) {
    console.error('Failed to fetch job URL:', error);
    return { title: 'Unknown Position', company: 'Unknown Company', description: '' };
  }
}

// Parse decision makers from Grok response
function parseDecisionMakers(response: string): DecisionMaker[] {
  const decisionMakers: DecisionMaker[] = [];
  
  // Look for our formatted lines
  const lines = response.split('\n');
  for (const line of lines) {
    // Try pipe-separated format
    const match = line.match(/DECISION_MAKER:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|\s*(.*)/i);
    if (match) {
      decisionMakers.push({
        name: match[1].trim(),
        title: match[2].trim(),
        linkedin: match[3].trim() || undefined,
        email: match[4].trim() || undefined,
        confidence: (match[3] || match[4]) ? 'medium' : 'low',
        source: 'Grok via Puter'
      });
      continue;
    }
    
    // Try bullet point format
    const bulletMatch = line.match(/^[\*\-]\s*(.+?)\s*[-–]\s*(.+?)(?:\s*\(([^)]+)\))?/);
    if (bulletMatch) {
      decisionMakers.push({
        name: bulletMatch[1].trim(),
        title: bulletMatch[2].trim(),
        linkedin: bulletMatch[3]?.includes('linkedin') ? bulletMatch[3] : undefined,
        confidence: 'low',
        source: 'Grok via Puter'
      });
    }
  }
  
  return decisionMakers;
}

// Research decision makers
async function findDecisionMakers(company: string, jobTitle: string): Promise<DecisionMaker[]> {
  const query = `Find the hiring manager or decision makers for a "${jobTitle}" position at ${company}.

List people who would be involved in hiring for this role:
- HR managers or recruiters
- Department heads or managers
- C-level executives (CTO, CEO, etc.)

For each person, provide:
1. Full name
2. Job title  
3. LinkedIn profile URL (if available)
4. Email address (if publicly available)

Format each as:
DECISION_MAKER: Name | Title | LinkedIn URL | Email`;

  try {
    const result = await searchWithPuterCloud(query);
    const decisionMakers = parseDecisionMakers(result);
    
    if (decisionMakers.length > 0) {
      return decisionMakers;
    }
    
    // Generate fallback if parsing failed
    return generateFallbackResults(company, jobTitle);
  } catch (error) {
    console.error('Grok search failed:', error);
    return generateFallbackResults(company, jobTitle);
  }
}

function generateFallbackResults(company: string, jobTitle: string): DecisionMaker[] {
  const searchQuery = encodeURIComponent(`${company} ${jobTitle} hiring manager`);
  
  return [
    {
      name: 'Manual Research Required',
      title: 'Hiring Manager',
      confidence: 'low',
      source: 'Fallback - Grok unavailable',
      linkedin: `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`
    },
    {
      name: 'Company Page',
      title: 'HR Department',
      confidence: 'low',
      source: 'LinkedIn search',
      linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company)}`
    }
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { jobUrl } = body;

    if (!jobUrl) {
      return NextResponse.json({ error: 'Job URL is required' }, { status: 400 });
    }

    console.log('Researching job URL:', jobUrl);

    // Step 1: Extract job details from URL
    const jobDetails = await extractJobDetails(jobUrl);
    console.log('Extracted:', jobDetails);

    // Step 2: Find decision makers using Puter/Grok (no API key needed)
    const decisionMakers = await findDecisionMakers(
      jobDetails.company,
      jobDetails.title
    );

    // Step 3: Build company info
    let website = '';
    try {
      website = new URL(jobUrl).hostname.replace('www.', '');
    } catch {
      website = 'Unknown';
    }

    const companyInfo = {
      name: jobDetails.company,
      size: 'Research required',
      industry: 'Research required',
      website,
    };

    // Step 4: Generate suggestions
    const suggestions = [
      `Search LinkedIn for "${jobDetails.company}" employees`,
      `Check company website for team/leadership page`,
      `Look for recent news about ${jobDetails.company} for conversation starters`,
      `Connect with decision makers before applying`,
    ];

    const result: ResearchResult = {
      company: jobDetails.company,
      jobTitle: jobDetails.title,
      decisionMakers,
      companyInfo,
      suggestions,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Failed to research job posting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
