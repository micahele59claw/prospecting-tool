# Job Prospecting Tool

Automatically find decision makers and contact info from job postings using Grok AI - **no API key required**!

## Features

- **Free to Use**: Uses Puter.js which works without API keys
- **Job URL Input**: Paste any job posting URL
- **AI Research**: Uses Grok to find hiring managers and decision makers
- **Contact Info**: Extracts emails and LinkedIn profiles
- **Company Info**: Gets company details and suggestions

## Quick Start

```bash
cd /home/node/.openclaw/workspace/prospecting-tool

# Install dependencies
pnpm install

# Run development server (no API key needed!)
pnpm dev
```

Open http://localhost:3000

## How It Works

1. **Extract**: Pulls job title and company from posting URL
2. **Research**: Queries Grok AI (via Puter - free!) for decision makers
3. **Parse**: Structures results into actionable contacts
4. **Suggest**: Provides next steps for outreach

## No API Keys Needed!

Puter.js provides free access to Grok AI without requiring an API key. Just run and use!

## API Endpoints

### POST /api/research

Research a job posting for decision makers.

**Request:**
```json
{
  "jobUrl": "https://www.upwork.com/job/example"
}
```

**Response:**
```json
{
  "company": "Acme Corp",
  "jobTitle": "Senior Developer",
  "decisionMakers": [
    {
      "name": "John Smith",
      "title": "CTO",
      "linkedin": "https://linkedin.com/in/johnsmith",
      "email": "john@acme.com",
      "confidence": "medium"
    }
  ],
  "suggestions": ["Connect with John Smith on LinkedIn"]
}
```

## Supported Job Boards

- Upwork
- LinkedIn Jobs
- Indeed
- RemoteOK
- Any public job posting

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS
- **AI**: Grok via Puter.js (free!)
- **Language**: TypeScript
