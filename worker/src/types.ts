export interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export interface Chunk {
  id: string;
  lessonId: string;
  sectionId: string;
  sectionTitle: string;
  lessonTitle: string;
  text: string;
  type: 'lesson' | 'question';
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
  sources: { lesson: string; section: string }[];
}
