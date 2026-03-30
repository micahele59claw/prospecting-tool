// Netlify Function for job research API
// This replaces the Next.js API route for static hosting

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { jobUrl } = body;

  if (!jobUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Job URL is required' })
    };
  }

  try {
    // Fetch the job page
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobResearchBot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].split('|')[0].split('-')[0].trim() : 'Unknown Position';
    title = title.replace(/hiring|jobs?|careers?|position/gi, '').trim();

    // Extract company
    const companyPatterns = [
      /at\s+([A-Z][A-Za-z\s&]+?)(?:\s*-|\s*\||\s*hiring)/i,
      /(?:company|employer)[:\s]+([A-Z][A-Za-z\s&]+)/i,
      /"company":\s*"([^"]+)"/i,
      /data-company=["']([^"']+)["']/i,
    ];
    let company = 'Unknown Company';
    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match) {
        company = match[1].trim();
        break;
      }
    }

    // Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
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

    // Build result
    let website = 'Unknown';
    try {
      website = new URL(jobUrl).hostname.replace('www.', '');
    } catch {}

    const searchQuery = encodeURIComponent(`${company} ${title} hiring manager`);

    const result = {
      company,
      jobTitle: title,
      decisionMakers: [
        {
          name: 'LinkedIn Search',
          title: 'Hiring Manager',
          confidence: 'low',
          source: 'Manual research recommended',
          linkedin: `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`
        },
        {
          name: 'Company Page',
          title: 'HR Department',
          confidence: 'low',
          source: 'LinkedIn search',
          linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company)}`
        }
      ],
      companyInfo: {
        name: company,
        website,
        size: 'Research required',
        industry: 'Research required'
      },
      suggestions: [
        `Search LinkedIn for "${company}" employees`,
        `Check company website for team/leadership page`,
        `Look for recent news about ${company}`,
        `Connect with decision makers before applying`
      ]
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Research error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to research job posting',
        details: error.message
      })
    };
  }
}
