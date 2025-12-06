import React, { useState, useEffect, useCallback } from 'react';
import { ankiService } from './services/ankiService';
import { refineNoteWithGemini } from './services/geminiService';
import { CurrentCardResponse, AppStatus, AppSettings } from './types';
import { DEFAULT_TARGET_FIELD, ICONS } from './constants';
import { SettingsModal } from './components/SettingsModal';

const POLLING_INTERVAL = 1000;

// Helper for SVG Icons
const Icon = ({ paths, className = "w-5 h-5" }: { paths: string[], className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.DISCONNECTED);
  const [currentCard, setCurrentCard] = useState<CurrentCardResponse | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [lastNoteId, setLastNoteId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ targetField: DEFAULT_TARGET_FIELD, autoSync: true });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCurrentCard = useCallback(async () => {
    try {
      const card = await ankiService.getCurrentCard();
      
      // Connection successful
      if (status !== AppStatus.CONNECTED && status !== AppStatus.SAVING) {
        setStatus(AppStatus.CONNECTED);
        setErrorDetails(null);
      }

      // Handle no card (not reviewing)
      if (!card) {
        setCurrentCard(null);
        setLastNoteId(null);
        return;
      }

      // Handle new card loaded
      if (card.noteId !== lastNoteId) {
        setLastNoteId(card.noteId);
        setCurrentCard(card);
        if (settings.autoSync) {
          setNoteContent(card.fields[settings.targetField]?.value || '');
        }
      }
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorDetails(error.message || 'Unknown error');
    }
  }, [lastNoteId, settings, status]);

  useEffect(() => {
    ankiService.requestPermission().catch(() => {});
    const interval = setInterval(fetchCurrentCard, POLLING_INTERVAL);
    fetchCurrentCard(); // Initial fetch
    return () => clearInterval(interval);
  }, [fetchCurrentCard]);

  const handleSave = async () => {
    if (!currentCard) return;
    setStatus(AppStatus.SAVING);
    try {
      await ankiService.updateNoteFields(currentCard.noteId, { [settings.targetField]: noteContent });
      setStatus(AppStatus.CONNECTED);
      showToast('Saved to Anki', 'success');
    } catch (e: any) {
      setStatus(AppStatus.ERROR);
      showToast('Save Failed', 'error');
      setErrorDetails(e.message);
    }
  };

  const handleAiRefine = async () => {
    if (!currentCard || !noteContent && !currentCard.question) return;
    setIsAiProcessing(true);
    try {
      const refined = await refineNoteWithGemini(noteContent, {
        question: currentCard.question,
        answer: currentCard.answer
      });
      setNoteContent(refined);
      showToast('Note Refined', 'success');
    } catch (e) {
      showToast('AI Error', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Render Error / Setup View
  if (status === AppStatus.ERROR) {
    return (
      <div className="h-screen bg-slate-950 p-4 flex flex-col items-center justify-center text-center overflow-y-auto">
        <div className="bg-rose-900/20 p-4 rounded-full mb-4 ring-1 ring-rose-500/50">
          <Icon paths={ICONS.REFRESH} className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Connection Failed</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">{errorDetails}</p>
        
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-left w-full max-w-sm">
          <p className="text-xs text-slate-500 uppercase font-bold mb-2">AnkiConnect Config</p>
          <pre className="text-[10px] bg-slate-950 p-2 rounded text-slate-300 overflow-x-auto">
{`{
  "webCorsOriginList": [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]
}`}
          </pre>
        </div>
        
        <button 
          onClick={fetchCurrentCard}
          className="mt-6 px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 font-sans text-sm">
      {/* Header */}
      <header className="h-10 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === AppStatus.CONNECTED ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-bold tracking-tight text-slate-100">AnkiNote</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
          <Icon paths={ICONS.SETTINGS} className="w-4 h-4" />
        </button>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {!currentCard ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
            <Icon paths={ICONS.CHECK} className="w-12 h-12 mb-2 opacity-20" />
            <p>Waiting for review...</p>
          </div>
        ) : (
          <>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Question</h3>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300" 
                     dangerouslySetInnerHTML={{ __html: currentCard.question }} />
              </div>
              
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Answer</h3>
                <div className="prose prose-invert prose-sm max-w-none text-emerald-100/80" 
                     dangerouslySetInnerHTML={{ __html: currentCard.answer }} />
              </div>
            </div>

            {/* Sticky Editor Footer */}
            <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-3 shadow-xl z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {settings.targetField}
                </span>
                <button 
                  onClick={handleAiRefine}
                  disabled={isAiProcessing}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  {isAiProcessing ? <span className="animate-spin">⟳</span> : <Icon paths={ICONS.MAGIC} className="w-3.5 h-3.5" />}
                  AI Polish
                </button>
              </div>
              
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 's' && (e.preventDefault(), handleSave())}
                placeholder="Type notes here..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 mb-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none placeholder:text-slate-700"
              />
              
              <button 
                onClick={handleSave}
                disabled={status === AppStatus.SAVING}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98]"
              >
                {status === AppStatus.SAVING ? 'Saving...' : 'Save Note (Ctrl+S)'}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-50
          ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500/30' : 'bg-rose-900/90 text-rose-200 border border-rose-500/30'}`}>
          <Icon paths={toast.type === 'success' ? ICONS.CHECK : ICONS.REFRESH} className="w-3 h-3" />
          {toast.msg}
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onSave={setSettings} 
        currentModelName={currentCard?.modelName || null} 
      />
    </div>
  );
}