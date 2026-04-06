# Job Prospecting Tool

Automatically find decision makers and contact info for job applications using **Groq AI** - fast and free tier available!

## Features

- **Fast AI**: Uses Groq's Llama 3.3 70B model for quick responses
- **Free Tier**: Groq offers generous free API access
- **Simple Input**: Enter company name + job title
- **AI Research**: Finds hiring managers, HR directors, and department heads
- **Contact Info**: Provides LinkedIn profiles and contact hints
- **Confidence Levels**: High/Medium/Low confidence ratings for each contact

## Quick Start

```bash
cd /home/node/.openclaw/workspace/prospecting-tool

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open http://localhost:3000

## Usage

1. Get a free Groq API key from [console.groq.com](https://console.groq.com)
2. Enter your API key in the app
3. Enter company name and job title
4. Click "Find Decision Makers"
5. View results!

## How It Works

1. **Input**: Enter company name and job title
2. **Research**: Groq AI (Llama 3.3 70B) searches for decision makers
3. **Parse**: Results structured into actionable contacts
4. **Suggest**: Provides next steps for outreach

## API Cost

Groq offers a **free tier** with generous limits:
- ~14,000 requests/day on free tier
- Very fast inference (sub-second responses)
- No credit card required to start

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **AI**: Groq API (Llama 3.3 70B)
- **Language**: TypeScript

## Model Used

The app uses `llama-3.3-70b-versatile` via Groq - a powerful model excellent at structured data extraction and following formatting instructions.

## Troubleshooting

**"API error: 401"**: Check that your Groq API key is correct.

**"API error: 429"**: You've hit the rate limit. Wait a moment and try again.

**Empty results**: The AI sometimes returns unstructured data. The parser extracts what it can and falls back to a LinkedIn search link.
