import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { companyName, jobTitle, groqApiKey } = await req.json();

    // Tavily key is hardcoded in backend - users don't need to provide it
    const tavilyApiKey = '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';

    if (!groqApiKey) {
      return NextResponse.json({ error: 'Groq API key is required' }, { status: 400 });
    }

    // Step 1: Search with Tavily
    const searchQueries = [
      `${companyName} hiring manager ${jobTitle}`,
      `${companyName} HR director recruiter`,
      `${companyName} ${jobTitle} hiring team`,
    ];

    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        query: searchQueries.join(' | '),
        search_depth: 'advanced',
        include_raw_content: true,
        max_results: 10,
      }),
    });

    if (!tavilyResponse.ok) {
      const err = await tavilyResponse.json().catch(() => ({}));
      throw new Error(err.error || `Tavily error: ${tavilyResponse.status}`);
    }

    const tavilyData = await tavilyResponse.json();
    const searchResults = tavilyData.results?.map((r: { title: string; url: string; content: string }) => 
      `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
    ).join('\n\n') || 'No results found';

    // Step 2: Extract structured data with Groq
    const extractPrompt = `You are analyzing real search results to find hiring decision makers at "${companyName}" for a "${jobTitle}" position.

SEARCH RESULTS:
${searchResults}

Extract any real people mentioned who could be decision makers for hiring. Format each contact as:

NAME: [Full Name]
TITLE: [Job Title]
LINKEDIN: [LinkedIn URL if found, otherwise "Search on LinkedIn"]
EMAIL: [Email if found, otherwise "Not available"]
CONFIDENCE: [high/medium/low - based on how certain you are this person is relevant]

Rules:
- Only include REAL people found in the search results
- If no specific people are found, say "No specific contacts found in search results"
- Be honest about confidence levels
- Include 1-5 contacts if found`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You extract structured contact information from search results. Only report real people found in the data.' },
          { role: 'user', content: extractPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const extractedContent = groqData.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      searchResults: tavilyData.results,
      extractedContent,
      sources: tavilyData.results?.slice(0, 5).map((r: { title: string; url: string }) => ({ title: r.title, url: r.url })),
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
