'use client';

import { useState } from 'react';

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
  suggestions: string[];
  sources?: { title: string; url: string }[];
}

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [useSearch, setUseSearch] = useState(true);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (!groqApiKey) {
      setError('Please enter your Groq API key');
      setLoading(false);
      return;
    }

    if (useSearch && !tavilyApiKey) {
      setError('Please enter your Tavily API key (or disable search)');
      setLoading(false);
      return;
    }

    try {
      if (useSearch) {
        // Use Tavily + Groq for real search-based results
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            jobTitle,
            tavilyApiKey,
            groqApiKey,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        const decisionMakers = parseResponse(data.extractedContent, companyName, jobTitle);

        setResult({
          company: companyName,
          jobTitle,
          decisionMakers,
          sources: data.sources,
          suggestions: [
            `Verify these contacts on LinkedIn before reaching out`,
            `Check ${companyName}'s careers page for specific recruiters`,
            `Look for mutual connections for warm introductions`,
          ],
        });
      } else {
        // Fallback: Groq-only mode (hallucination warning)
        const prompt = `For a "${jobTitle}" position at "${companyName}", list hiring managers, HR directors, and department heads who would be involved in hiring. Provide realistic contacts. Format each as:

NAME: [Full Name]
TITLE: [Job Title]
LINKEDIN: [LinkedIn URL or "Search on LinkedIn"]
EMAIL: [Email or "Not available"]
CONFIDENCE: [high/medium/low]

List 3-5 contacts. Be realistic about titles and departments.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that researches company decision makers. Always respond with structured data in the format requested.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const decisionMakers = parseResponse(content, companyName, jobTitle);

        setResult({
          company: companyName,
          jobTitle,
          decisionMakers,
          suggestions: [
            `⚠️ Results may not be accurate - no real search was performed`,
            `Verify these contacts on LinkedIn before reaching out`,
            `Enable Tavily search for real results`,
          ],
        });
      }
    } catch (err) {
      console.error('Research error:', err);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function parseResponse(content: string, company: string, job: string): DecisionMaker[] {
    const results: DecisionMaker[] = [];
    const blocks = content.split(/NAME:|---/).filter((s) => s.trim());

    for (const block of blocks) {
      if (!block.includes('TITLE:')) continue;

      const nameMatch = block.match(/^[^\n]+/);
      const titleMatch = block.match(/TITLE:\s*([^\n]+)/);
      const linkedinMatch = block.match(/LINKEDIN:\s*([^\n]+)/);
      const emailMatch = block.match(/EMAIL:\s*([^\n]+)/);
      const confidenceMatch = block.match(/CONFIDENCE:\s*(high|medium|low)/i);

      if (nameMatch && titleMatch) {
        const name = nameMatch[0].trim();
        const title = titleMatch[1].trim();

        if (name.toLowerCase().includes('note') || name.length < 3 || name.toLowerCase().includes('no specific')) continue;

        results.push({
          name,
          title,
          linkedin: linkedinMatch?.[1]?.includes('Search') ? undefined : linkedinMatch?.[1]?.trim(),
          email: emailMatch?.[1]?.includes('Not') ? undefined : emailMatch?.[1]?.trim(),
          confidence: (confidenceMatch?.[1]?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          source: 'AI Research',
        });
      }
    }

    return results.length > 0 ? results : [
      {
        name: 'Search LinkedIn',
        title: 'Hiring Manager',
        confidence: 'low',
        source: 'Fallback',
        linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company)}%20${encodeURIComponent(job)}`,
      },
    ];
  }

  const getConfidenceColor = (c: string) =>
    c === 'high' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-red-400';

  const getConfidenceBg = (c: string) =>
    c === 'high' ? 'border-green-500 bg-green-500/10' : c === 'medium' ? 'border-yellow-500 bg-yellow-500/10' : 'border-red-500 bg-red-500/10';

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">🔍 Job Prospecting Tool</h1>
        <p className="text-gray-400 text-center mb-8">
          Real search with Tavily + Groq AI for accurate results
        </p>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <form onSubmit={handleResearch} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSearch}
                  onChange={(e) => setUseSearch(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">Use Tavily Search (recommended)</span>
              </label>
              {useSearch && (
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  ✓ Real results
                </span>
              )}
            </div>

            {useSearch && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tavily API Key</label>
                <input
                  type="password"
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                  placeholder="tvly-..."
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  required={useSearch}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Free at <a href="https://tavily.com" target="_blank" className="text-blue-400 hover:underline">tavily.com</a> (1,000 searches/month)
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Groq API Key</label>
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Free at <a href="https://console.groq.com" target="_blank" className="text-blue-400 hover:underline">console.groq.com</a>
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Google, Microsoft"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  {useSearch ? 'Searching...' : 'AI is thinking...'}
                </>
              ) : (
                '🔍 Find Decision Makers'
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{result.company}</h2>
                  <p className="text-gray-400">{result.jobTitle}</p>
                </div>
                <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
                  {result.decisionMakers.length} contacts
                </span>
              </div>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-2 text-gray-400">📚 Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener"
                      className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 text-blue-400"
                    >
                      {s.title.slice(0, 40)}...
                    </a>
                  ))}
                </div>
              </div>
            )}

            {result.decisionMakers.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">👥 Decision Makers</h3>
                <div className="space-y-4">
                  {result.decisionMakers.map((dm, i) => (
                    <div key={i} className={`border-l-4 rounded-lg p-4 ${getConfidenceBg(dm.confidence)}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-lg">{dm.name}</h4>
                          <p className="text-gray-400">{dm.title}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(dm.confidence)} bg-gray-700`}>
                          {dm.confidence}
                        </span>
                      </div>
                      {dm.linkedin && (
                        <a href={dm.linkedin} target="_blank" rel="noopener" className="mt-2 text-blue-400 hover:underline text-sm inline-block">
                          🔗 {dm.linkedin}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">💡 Next Steps</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="font-bold mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Get free API keys from Tavily and Groq</li>
              <li>Enter company name and job title</li>
              <li>Tavily searches for real hiring information</li>
              <li>Groq AI extracts structured contact data</li>
              <li>Get verified contacts with confidence levels</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
