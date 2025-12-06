import { ANKI_CONNECT_URL, ANKI_CONNECT_VERSION } from '../constants';
import { AnkiConnectResponse, CurrentCardResponse } from '../types';

class AnkiConnectionError extends Error {
  constructor(message: string, public code: 'CONNECTION_REFUSED' | 'CORS_ERROR' | 'UNKNOWN') {
    super(message);
    this.name = 'AnkiConnectionError';
  }
}

async function invoke<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(ANKI_CONNECT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, version: ANKI_CONNECT_VERSION, params }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AnkiConnectionError(`HTTP Error: ${response.status}`, 'UNKNOWN');
    }

    const json = (await response.json()) as AnkiConnectResponse<T>;

    if (json.error) {
      throw new Error(json.error);
    }

    return json.result as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error) {
      // AbortError usually means the server didn't respond in time (hung or not running)
      if (err.name === 'AbortError') {
         throw new AnkiConnectionError('Connection timed out. Is Anki running?', 'CONNECTION_REFUSED');
      }
      // TypeError with 'Failed to fetch' usually means network connection refused or CORS
      if (err.message.includes('Failed to fetch')) {
         // It's hard to distinguish CORS from Refused in JS, but usually Refused if local
         throw new AnkiConnectionError('Could not connect to Anki. Check if Anki is open and AnkiConnect is installed.', 'CONNECTION_REFUSED');
      }
    }
    throw err;
  }
}

export const ankiService = {
  requestPermission: async (): Promise<string> => {
    return invoke<string>('requestPermission');
  },

  getCurrentCard: async (): Promise<CurrentCardResponse | null> => {
    return invoke<CurrentCardResponse>('guiCurrentCard');
  },

  updateNoteFields: async (noteId: number, fields: Record<string, string>): Promise<null> => {
    return invoke<null>('updateNoteFields', {
      note: {
        id: noteId,
        fields: fields,
      },
    });
  },

  getModelFieldNames: async (modelName: string): Promise<string[]> => {
     return invoke<string[]>('modelFieldNames', { modelName });
  }
};