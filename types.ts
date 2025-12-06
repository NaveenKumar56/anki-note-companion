export interface AnkiConnectResponse<T> {
  result: T | null;
  error: string | null;
}

export interface CurrentCardResponse {
  answer: string;
  question: string;
  deckName: string;
  modelName: string;
  fieldOrder: number;
  fields: Record<string, { value: string; order: number }>;
  template: string;
  cardId: number;
  buttons: number[];
  nextReviews: string[];
  noteId: number;
}

export interface NoteInfo {
  noteId: number;
  tags: string[];
  fields: Record<string, { value: string; order: number }>;
  modelName: string;
  cards: number[];
}

export enum AppStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  SAVING = 'SAVING',
  ERROR = 'ERROR'
}

export interface AppSettings {
  targetField: string;
  autoSync: boolean;
}