export type MemoryType =
  | 'user_profile'
  | 'goal'
  | 'preference'
  | 'progress'
  | 'task'
  | 'episodic'
  | 'semantic';

export type MemoryStatus = 'active' | 'archived' | 'superseded';

export interface Memory {
  id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  importance: number; // 1-5
  confidence: number; // 0.0-1.0
  source: string; // 'user_input', 'agent_extraction', 'user_correction'
  status: MemoryStatus;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
}

export interface MemoryEmbedding {
  id: string;
  memory_id: string;
  embedding: number[];
  model: string;
  created_at: Date;
}

export interface MemoryEvent {
  id: string;
  memory_id?: string;
  user_id: string;
  event_type: 'created' | 'updated' | 'accessed' | 'deleted' | 'retrieved';
  previous_value?: string;
  new_value?: string;
  confidence_change: number;
  created_at: Date;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AgentState {
  id: string;
  user_id: string;
  conversation_id?: string;
  current_task?: string;
  context_memories: string[];
  memory_operations: Record<string, any>;
  agent_reasoning: string;
  created_at: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: Date;
  updated_at: Date;
}
