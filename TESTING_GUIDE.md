# MemoryFlow - Testing & Verification Guide

This guide walks through testing MemoryFlow before demo or submission.

---

## Phase 1: Setup Verification

### Step 1.1: Install Dependencies

```bash
cd memoryflow
npm install
```

**Expected:**
- ✅ All packages installed successfully
- ✅ No errors or warnings about missing packages
- ✅ node_modules directory created

**If fails:**
- Check Node.js version: `node --version` (should be 18+)
- Check npm version: `npm --version` (should be 8+)
- Clear cache: `npm cache clean --force && rm -rf node_modules && npm install`

### Step 1.2: Build Verification

```bash
npm run build
```

**Expected:**
- ✅ Build completes successfully
- ✅ .next directory created
- ✅ No TypeScript errors
- ✅ No build warnings

**If fails:**
- Check TypeScript errors: `npx tsc --noEmit`
- Check for missing types: look for `@types/...` in error messages
- Verify all imports are correct

### Step 1.3: Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `DATABASE_URL` - from CockroachDB
- `GROQ_API_KEY` - from Groq console

**Verify:**
```bash
echo "DATABASE_URL=$DATABASE_URL"  # Should show value, not empty
echo "GROQ_API_KEY=$GROQ_API_KEY"  # Should show value, not empty
```

---

## Phase 2: Database Verification

### Step 2.1: Database Connectivity

```bash
npm run db:init
```

**Expected:**
- ✅ "Creating schema..." message
- ✅ "✓ Executed statement" multiple times
- ✅ "✓ Schema created successfully" at end
- ✅ Exit code 0

**If fails:**
- Check DATABASE_URL format
- Verify CockroachDB cluster is running
- Check firewall/network access
- Verify IP is whitelisted in CockroachDB Cloud

### Step 2.2: Functionality Tests

```bash
npm run test:functionality
```

**Expected:**
- ✅ All 7 tests pass
- ✅ User creation successful
- ✅ Memory CRUD operations work
- ✅ Data isolation verified

**Sample output:**
```
🧪 MemoryFlow Functionality Tests

[1/7] Testing database connection...
✅ Database connection successful

[2/7] Testing user creation...
✅ User created: [UUID]

[3/7] Testing memory creation...
✅ Memory created: [UUID]

[4/7] Testing memory retrieval...
✅ Memory retrieved: "I prefer practical coding exercises"

[5/7] Testing memory update...
✅ Memory updated: "I prefer longer project-based exercises"

[6/7] Testing memory soft delete...
✅ Memory archived

[7/7] Testing user data isolation...
✅ User data properly isolated

═══════════════════════════════════════════════════════════
✅ ALL TESTS PASSED
═══════════════════════════════════════════════════════════
```

**If fails:**
- Check specific test error message
- Verify database tables were created
- Verify user UUIDs are valid (36 chars with hyphens)
- Check database logs for constraint violations

---

## Phase 3: Application Testing

### Step 3.1: Start Development Server

```bash
npm run dev
```

**Expected:**
- ✅ "ready - started server on 0.0.0.0:3000"
- ✅ No errors in console
- ✅ Hot reload working

### Step 3.2: Test Landing Page

1. Open http://localhost:3000
2. Verify you see:
   - ✅ MemoryFlow logo
   - ✅ Hero section with "An AI That Remembers"
   - ✅ Feature cards (Persistent Memory, Semantic Search, Privacy)
   - ✅ Navigation links to Chat and Dashboard
   - ✅ No console errors

### Step 3.3: Test Chat Page

1. Navigate to http://localhost:3000/chat
2. Verify:
   - ✅ Chat interface loads
   - ✅ Message input field visible
   - ✅ No errors in console

3. Check browser's localStorage:
   - Open DevTools → Application → Storage → Local Storage
   - Should see `memoryflow_user_id` with a UUID value
   - Note this UUID for testing

### Step 3.4: Test Memory Creation

**Scenario:** Create a memory via API

Open browser console and run:

```javascript
const userId = localStorage.getItem('memoryflow_user_id');

fetch('/api/memories', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    userId,
    type: 'preference',
    content: 'I prefer practical coding exercises',
    importance: 4
  })
})
.then(r => r.json())
.then(d => console.log('Memory created:', d.memory.id))
.catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ Response with `memory.id` (UUID)
- ✅ No errors in console
- ✅ HTTP 201 status

### Step 3.5: Test Memory Retrieval

```javascript
const userId = localStorage.getItem('memoryflow_user_id');

fetch(`/api/memories?userId=${userId}`)
  .then(r => r.json())
  .then(d => console.log('Memories:', d.memories))
  .catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ Array of memories in response
- ✅ Memory from step 3.4 appears in list
- ✅ HTTP 200 status

### Step 3.6: Test Dashboard

1. Navigate to http://localhost:3000/dashboard
2. Verify:
   - ✅ Dashboard loads
   - ✅ "Total Memories" shows count > 0
   - ✅ Memory from step 3.4 appears in cards
   - ✅ Memory type badge shows "Preferences"
   - ✅ Importance and confidence visible

---

## Phase 4: Chat with Agent

### Step 4.1: Basic Chat Test

1. Navigate to http://localhost:3000/chat
2. Type: "Hello, I want to learn Python"
3. Press Enter

**Expected:**
- ✅ Message appears in chat
- ✅ Agent responds (may take a few seconds)
- ✅ Response appears in chat
- ✅ No error messages
- ⚠️ Response might not be perfect yet

**If agent doesn't respond:**
- Check browser console for errors
- Check GROQ_API_KEY is valid
- Verify Groq API quotas at console.groq.com
- Try simpler message

### Step 4.2: Verify Memory Creation from Chat

After agent responds:

```javascript
const userId = localStorage.getItem('memoryflow_user_id');

fetch(`/api/memories?userId=${userId}`)
  .then(r => r.json())
  .then(d => {
    console.log('Total memories:', d.memories.length);
    console.log('Latest memories:');
    d.memories.slice(-3).forEach(m => {
      console.log(`- ${m.type}: ${m.content.substring(0, 60)}...`);
    });
  });
```

**Expected:**
- ✅ Memory count increased
- ✅ New memories related to Python learning visible

---

## Phase 5: Session Persistence Test

### Step 5.1: Create Memories

1. Chat: "My goal is to learn Python"
2. Chat: "I prefer practical exercises"
3. Wait for agent responses and memory creation
4. Go to dashboard, verify memories are saved

### Step 5.2: New Session (Same Browser)

1. Open new tab or refresh page
2. Navigate to http://localhost:3000/chat
3. **Important:** Should have same `memoryflow_user_id` in localStorage

### Step 5.3: Verify Persistence

1. Chat: "What should I work on?"
2. **Expected:** Agent response should reference learning Python
3. Agent should say something like "Based on your goal to learn Python..."

**If persistence doesn't work:**
- Check localStorage UUID is same in both sessions
- Verify database has the memories for that user
- Check agent is actually retrieving memories

### Step 5.4: Check Dashboard Persistence

1. Navigate to dashboard
2. **Expected:** Same memories from session 5.1 still there

---

## Phase 6: Advanced Features

### Step 6.1: Test Memory Update

In console:

```javascript
const userId = localStorage.getItem('memoryflow_user_id');

// First get a memory ID
fetch(`/api/memories?userId=${userId}`)
  .then(r => r.json())
  .then(d => {
    if (d.memories.length === 0) {
      console.log('No memories to update');
      return;
    }
    
    const memoryId = d.memories[0].id;
    
    // Update it
    return fetch('/api/memories', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        userId,
        id: memoryId,
        content: 'Updated: I now prefer project-based exercises',
        importance: 5
      })
    })
  })
  .then(r => r.json())
  .then(d => console.log('Updated memory:', d.memory))
  .catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ Memory updated successfully
- ✅ New content and importance in response

### Step 6.2: Test Memory Delete

```javascript
const userId = localStorage.getItem('memoryflow_user_id');

fetch(`/api/memories?userId=${userId}`)
  .then(r => r.json())
  .then(d => {
    if (d.memories.length < 2) {
      console.log('Need at least 2 memories for this test');
      return;
    }
    
    const memoryId = d.memories[1].id;
    
    return fetch('/api/memories', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userId, id: memoryId })
    })
  })
  .then(r => r.json())
  .then(d => console.log('Deleted:', d.success ? 'Yes' : 'No'))
  .catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ `success: true` in response
- ✅ Memory count decreases in dashboard

---

## Phase 7: Error Handling

### Step 7.1: Test Missing Parameters

```javascript
// Try to create memory without required fields
fetch('/api/memories', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({})
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ HTTP 400 status
- ✅ Error message about missing fields
- ✅ No server crash

### Step 7.2: Test Invalid User ID

```javascript
fetch('/api/memories', {
  method: 'GET',
  headers: {'Content-Type': 'application/json'}
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

**Expected:**
- ✅ HTTP 400 status
- ✅ Error about missing userId
- ✅ No crash

---

## Final Verification Checklist

- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] Database connection works
- [ ] `npm run test:functionality` passes all 7 tests
- [ ] Landing page loads
- [ ] Chat page loads
- [ ] Dashboard loads
- [ ] Memory creation works (API + chat)
- [ ] Memory retrieval works
- [ ] Memory update works
- [ ] Memory delete works (soft delete)
- [ ] Session persistence works
- [ ] Agent responds to chat
- [ ] Error handling works
- [ ] No console errors

---

## Known Issues & Troubleshooting

### "GROQ_API_KEY not configured"
- Make sure GROQ_API_KEY is in .env.local
- Restart dev server after changing .env.local

### "DATABASE_URL not set"
- Make sure DATABASE_URL is in .env.local
- Check format: `postgresql://user:pass@host:26257/db?sslmode=require`

### "Cannot find embedding provider"
- Groq embedding API may not be available
- System still works without embeddings
- Vectors just won't be generated

### Agent doesn't respond
- Check console errors first
- Verify Groq API key is valid
- Check API quota at console.groq.com
- Verify LLM model name is correct

### Memory not persisting
- Check browser console for API errors
- Verify user UUID is consistent
- Check database has the memories
- Verify API returns correct memories

### Dashboard shows no memories
- Make sure memories were created
- Check localStorage UUID matches
- Try refreshing or hard refresh (Ctrl+F5)
- Check API response in console

---

## Testing for Demo

### Quick Pre-Demo Checklist (10 minutes)

```bash
# 1. Clean start
npm run dev

# 2. Test in browser
# - Load http://localhost:3000/chat
# - Send message: "I want to learn Python"
# - Wait for response
# - Go to dashboard
# - Verify memory appears

# 3. Test persistence
# - Refresh browser
# - Chat: "What should I learn?"
# - Verify agent remembers Python goal

# 4. Record demo
```

---

**Good luck with testing! Report any issues in detail for debugging.**
