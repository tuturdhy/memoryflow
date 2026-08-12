# MemoryFlow Quick Start Guide

Get MemoryFlow running locally in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- CockroachDB Cloud account (free tier: https://cockroachlabs.cloud)
- Groq API key (free tier: https://console.groq.com)

## Step 1: Clone & Install

```bash
git clone https://github.com/yourusername/memoryflow.git
cd memoryflow
npm install
```

## Step 2: Setup CockroachDB

1. Go to https://cockroachlabs.cloud
2. Create a free cluster
3. Create a database named `memoryflow`
4. Generate SQL user credentials
5. Copy the connection string

## Step 3: Get Groq API Key

1. Go to https://console.groq.com
2. Sign up or login
3. Create an API key
4. Copy the key

## Step 4: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL=postgresql://user:password@host:26257/memoryflow?sslmode=require
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Initialize Database

```bash
npm run db:init
```

You should see:
```
✓ Schema created successfully
```

## Step 6: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Try It Out

1. **Chat Page** (http://localhost:3000/chat)
   - Tell the agent: "My name is Alice and I want to learn Python"
   - Watch it save memories

2. **Memory Dashboard** (http://localhost:3000/dashboard)
   - See all stored memories
   - Filter by type
   - Search for specific memories

3. **Verify Persistence**
   - Refresh the page
   - Start a new conversation
   - Agent remembers your preferences!

## Troubleshooting

### Database Connection Error
- Verify DATABASE_URL is correct
- Ensure CockroachDB cluster is running
- Check SSL certificates

### LLM Error (Groq)
- Verify GROQ_API_KEY is set correctly
- Check API quota at console.groq.com
- Try with a different model in agentService.ts

### Port 3000 Already In Use
```bash
npm run dev -- -p 3001
```

### Build Errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Next Steps

- Read the full [README.md](README.md)
- Check [API Endpoints](README.md#api-endpoints)
- Deploy to [AWS Lambda](README.md#deployment)
- Explore the [Database Schema](README.md#database-schema)

## Support

If you run into issues:
1. Check the README.md FAQ section
2. Review server logs: `npm run dev` shows all output
3. Check database connection: `psql <DATABASE_URL>`
4. Verify API keys are correct

---

**Ready to explore AI with memory?** 🧠✨
