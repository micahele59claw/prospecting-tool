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
  companyInfo?: {
    website?: string;
  };
  suggestions: string[];
}

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Call our API which uses Grok to search
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName, jobTitle }),
      });

      if (!response.ok) {
        throw new Error('Research failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceBg = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'border-green-500 bg-green-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-500';
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">
          🔍 Job Prospecting Tool
        </h1>
        <p className="text-gray-400 text-center mb-8">
          AI-powered search for decision makers using Grok
        </p>

        {/* Input Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <form onSubmit={handleResearch} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Google, Microsoft, Stripe"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Job Title
              </label>
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Searching with Grok...
                </>
              ) : (
                '🔍 Find Decision Makers'
              )}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8">
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Company Header */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{result.company}</h2>
                  <p className="text-gray-400">{result.jobTitle}</p>
                </div>
                <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
                  {result.decisionMakers.length} contacts found
                </span>
              </div>
            </div>

            {/* Decision Makers */}
            {result.decisionMakers.length > 0 ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">👥 Decision Makers</h3>
                
                <div className="space-y-4">
                  {result.decisionMakers.map((dm, i) => (
                    <div key={i} className={`border-l-4 rounded-lg p-4 ${getConfidenceBg(dm.confidence)}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-lg">{dm.name}</h4>
                          <p className="text-gray-400">{dm.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Source: {dm.source}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(dm.confidence)} bg-gray-700`}>
                          {dm.confidence} confidence
                        </span>
                      </div>
                      
                      {(dm.linkedin || dm.email) && (
                        <div className="mt-3 flex gap-3">
                          {dm.linkedin && (
                            <a
                              href={dm.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-sm flex items-center gap-1"
                            >
                              🔗 {dm.linkedin}
                            </a>
                          )}
                          {dm.email && (
                            <a
                              href={`mailto:${dm.email}`}
                              className="text-green-400 hover:underline text-sm flex items-center gap-1"
                            >
                              ✉️ {dm.email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                No decision makers found. Try a different search.
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">💡 Next Steps</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400">→</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="font-bold mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Enter the company name and job title</li>
              <li>Grok AI searches for real decision makers</li>
              <li>Get names, titles, LinkedIn profiles, and emails</li>
              <li>Reach out to hiring managers directly</li>
            </ol>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-500">
                🤖 Powered by Grok AI - Real-time intelligent search
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
