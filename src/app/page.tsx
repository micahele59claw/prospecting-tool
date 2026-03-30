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
  companyInfo: {
    name?: string;
    size?: string;
    industry?: string;
    website?: string;
    location?: string;
  };
  suggestions: string[];
}

export default function Home() {
  const [jobUrl, setJobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl }),
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
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">
          🔍 Job Prospecting Tool
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Paste a job posting URL to find decision makers and contact info
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://www.upwork.com/job/... or any job posting URL"
              className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Researching...' : 'Research'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">{result.company}</h2>
              <p className="text-gray-400 mb-4">Position: {result.jobTitle}</p>
              
              {result.companyInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {result.companyInfo.website && (
                    <div>
                      <span className="text-gray-500">Website:</span>
                      <p className="text-blue-400">{result.companyInfo.website}</p>
                    </div>
                  )}
                  {result.companyInfo.industry && (
                    <div>
                      <span className="text-gray-500">Industry:</span>
                      <p>{result.companyInfo.industry}</p>
                    </div>
                  )}
                  {result.companyInfo.size && (
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p>{result.companyInfo.size}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Decision Makers */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">
                👥 Decision Makers ({result.decisionMakers.length})
              </h3>
              
              <div className="space-y-4">
                {result.decisionMakers.map((dm, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-lg">{dm.name}</h4>
                        <p className="text-gray-400">{dm.title}</p>
                      </div>
                      <span className={`text-sm ${getConfidenceColor(dm.confidence)}`}>
                        {dm.confidence} confidence
                      </span>
                    </div>
                    
                    <div className="mt-3 flex gap-3">
                      {dm.linkedin && (
                        <a
                          href={dm.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm"
                        >
                          🔗 LinkedIn
                        </a>
                      )}
                      {dm.email && (
                        <a
                          href={`mailto:${dm.email}`}
                          className="text-green-400 hover:underline text-sm"
                        >
                          ✉️ {dm.email}
                        </a>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Source: {dm.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">💡 Next Steps</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400">→</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Researching job posting with Grok...</p>
          </div>
        )}

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="font-bold mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Paste a job posting URL (Upwork, LinkedIn, Indeed, etc.)</li>
              <li>Tool extracts company and position info</li>
              <li>Grok API researches decision makers</li>
              <li>Get contact info: emails, LinkedIn profiles</li>
            </ol>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-500">
                Powered by Grok via Puter.js - uses AI search to find contact information
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
