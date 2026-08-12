# MemoryFlow Architecture

## System Design

┌─────────────────────────────────────────────────────┐
│ User Browser (Web) │
│ Next.js Frontend (React + TypeScript) │
└────────────────┬────────────────────────────────────┘
│ HTTPS/WebSocket
┌────────────┴────────────┐
│ │
┌───▼──────┐ ┌────────▼──────┐
│ Chat │ │ Dashboard │
│ Page │ │ (Memories) │
└───┬──────┘ └────────┬──────┘
│ │
└────────┬────────────────┘
│
┌────────▼──────────────────┐
│ Next.js API Routes │
│ ├─ /api/chat │
│ ├─ /api/conversations │
│ ├─ /api/memories │
│ └─ /api/auth │
└────────┬───────────────────┘
│
┌────────┴──────────────────────┐
│ │
┌───▼──────────┐ ┌────────────▼──────────────┐
│ AWS Lambda │ │ CockroachDB Cloud │
│ Handler │ │ ┌──────────────────────┐ │
│ (Optional) │ │ │ Tables: │ │
└──────────────┘ │ ├─ users │ │
│ ├─ conversations │ │
│ ├─ messages │ │
│ ├─ memories │ │
│ │ ├─ embedding (vec) │ │
│ ├─ agent_state │ │
│ └─ memory_embeddings │ │
│ Features: │ │
│ ├─ pgvector │ │
│ ├─ ACID Transactions │ │
│ └─ Distributed SQL │ │
└──────────┬───────────┘ │
│ │
┌──────▼────────┐
│ Groq LLM API │
│ llama-3.3-70b │
└───────────────┘


## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 | Full-stack React framework |
| | React 18 | UI components |
| | TypeScript | Type safety |
| | Tailwind CSS | Styling |
| | Framer Motion | Animations |
| **Backend** | Node.js | Runtime |
| | Next.js API Routes | REST API |
| | NextAuth.js | Authentication |
| **Database** | CockroachDB Cloud | Distributed SQL |
| | pgvector | Vector embeddings |
| | PostgreSQL | SQL compatibility |
| **AI/ML** | Groq API | LLM inference |
| | llama-3.3-70b | Language model |
| **Cloud** | AWS Lambda | Serverless compute |
| | AWS IAM | Security |
| **DevOps** | Docker | Containerization |
| | GitHub | Version control |

## Data Flow

### 1. User Authentication

User → Sign Up/Login → NextAuth.js → Hash Password → CockroachDB


### 2. Send Message

User Message → /api/chat → Retrieve Memories → Groq LLM → Generate Response → Store in DB


### 3. Vector Search

Message Text → Hash to Vector → pgvector Search → Similar Memories → Context


### 4. Memory Storage

User Context → Extract Info → Generate Embedding → Store in memories table


## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50), -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Memories Table (with pgvector)
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50), -- 'knowledge', 'goal', 'preference', etc.
  content TEXT,
  importance INTEGER (1-5),
  embedding vector(1536), -- pgvector support
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector search index
CREATE INDEX memories_embedding_idx ON memories USING HASH (embedding);
```

## Key Design Decisions

### 1. Persistent Memory as Core Feature
Memory is not an afterthought. Every conversation, every message, and every user interaction is stored as structured data that the AI can query and reason about.

### 2. Vector-Native Storage
Using pgvector directly in CockroachDB eliminates the need for a separate vector store. This reduces complexity and ensures consistency between transactional and semantic data.

### 3. Serverless with Stateful Backend
AWS Lambda processes chat requests, but all state is persisted in CockroachDB. This allows horizontal scaling without managing infrastructure.

### 4. TypeScript Throughout
Type safety across the entire stack reduces bugs and improves developer experience.

### 5. NextAuth for Security
Passwords are hashed with bcrypt and stored securely. Sessions use JWT tokens.

## Scalability

### Database
- CockroachDB auto-scales horizontally
- pgvector indexes support millions of embeddings
- ACID transactions guarantee data consistency

### API
- Stateless design allows infinite replicas
- Can be deployed to AWS Lambda or any container platform
- Load balancing distributes requests

### Frontend
- Next.js supports incremental static regeneration
- Vercel deployment auto-scales globally
- CDN caches static assets

## Security

✅ **Authentication:** NextAuth.js with bcrypt hashing  
✅ **Database:** CockroachDB with SSL encryption  
✅ **API:** HTTPS required, CORS configured  
✅ **Secrets:** Environment variables, not hardcoded  
✅ **SQL Injection:** Parameterized queries everywhere  
✅ **User Data:** All data isolated by user_id  

## Deployment

### Local Development
```bash
npm install
npm run db:init
npm run dev
```

### Production (Vercel)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t memoryflow .
docker run -p 3001:3001 memoryflow
```

### AWS Lambda
```bash
npm run lambda:build
npm run lambda:deploy
```

## Monitoring

- **Logs:** CloudWatch (Lambda) + console logs (Next.js)
- **Metrics:** Response time, error rates, memory usage
- **Alerts:** On errors, high latency, resource exhaustion

## Future Enhancements

- [ ] Multiple embedding models (OpenAI, Cohere, etc.)
- [ ] Fine-tuning on user data
- [ ] Streaming responses
- [ ] Multi-user collaboration
- [ ] Export/import conversations
- [ ] Custom memory retention policies
- [ ] Real-time collaboration features