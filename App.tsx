import React, { useState, useEffect, useCallback } from 'react';
import { ankiService } from './services/ankiService';
import { refineNoteWithGemini, analyzeCardContent } from './services/geminiService';
import { CurrentCardResponse, AppStatus, AppSettings, CardAnalysis } from './types';
import { DEFAULT_TARGET_FIELD, ICONS } from './constants';
import { SettingsModal } from './components/SettingsModal';

const POLLING_INTERVAL = 1000;

// Helper for SVG Icons
const Icon = ({ paths, className = "w-5 h-5" }: { paths: string[], className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);

// Frequency Bar Component
const FrequencyScale = ({ score, label }: { score: number, label: string }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-bold uppercase tracking-wider text-[10px]">Usage Freq</span>
        <span>{label}</span>
      </div>
      <div className="flex gap-1 h-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div 
            key={level}
            className={`flex-1 rounded-sm transition-all ${
              level <= score 
                ? score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-blue-500' : 'bg-amber-500'
                : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

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
  
  // New State for Analysis
  const [analysis, setAnalysis] = useState<CardAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'note' | 'analysis'>('note');

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
        setAnalysis(null);
        return;
      }

      // Check for changes
      const isNewNote = card.noteId !== lastNoteId;
      // We also check if content strings changed (e.g. flipping card from Q -> Q+A)
      const isContentChanged = !currentCard || 
                               card.question !== currentCard.question || 
                               card.answer !== currentCard.answer;

      if (isNewNote || isContentChanged) {
        setCurrentCard(card);
        
        // If it's a completely new note, reset everything
        if (isNewNote) {
          setLastNoteId(card.noteId);
          setAnalysis(null);
          // Only sync note content from Anki if it's a new card
          if (settings.autoSync) {
            setNoteContent(card.fields[settings.targetField]?.value || '');
          }
        }
        // If it's just a card flip (isContentChanged but not isNewNote), we KEEP the current noteContent draft.
      }
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorDetails(error.message || 'Unknown error');
    }
  }, [lastNoteId, settings, status, currentCard]);

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
    if (!currentCard || (!noteContent && !currentCard.question)) return;
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

  const handleAnalyze = async () => {
    if (!currentCard) return;
    setIsAnalyzing(true);
    setActiveTab('analysis');
    try {
      const result = await analyzeCardContent({
        question: currentCard.question,
        answer: currentCard.answer
      });
      setAnalysis(result);
    } catch (e) {
      showToast('Analysis Failed', 'error');
    } finally {
      setIsAnalyzing(false);
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
        <div className="flex gap-2">
           <button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                activeTab === 'analysis' ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
           >
             {isAnalyzing ? '...' : 'Analyze'}
           </button>
           <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
             <Icon paths={ICONS.SETTINGS} className="w-4 h-4" />
           </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {!currentCard ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
            <Icon paths={ICONS.CHECK} className="w-12 h-12 mb-2 opacity-20" />
            <p>Waiting for review...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Toggle Tabs (Only visible if analysis exists) */}
            {analysis && (
              <div className="flex border-b border-slate-800 bg-slate-900">
                <button 
                  onClick={() => setActiveTab('note')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'note' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500'}`}
                >
                  Notes
                </button>
                <button 
                   onClick={() => setActiveTab('analysis')}
                   className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'analysis' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500'}`}
                >
                  AI Insights
                </button>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {activeTab === 'note' ? (
                <>
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
                </>
              ) : (
                /* Analysis View */
                analysis ? (
                  <div className="space-y-6">
                    {/* Frequency */}
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <FrequencyScale score={analysis.frequency.score} label={analysis.frequency.label} />
                    </div>

                    {/* Mnemonic */}
                    <div className="space-y-1">
                       <h3 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                         <Icon paths={ICONS.MAGIC} className="w-3 h-3"/> Mnemonic
                       </h3>
                       <p className="text-slate-200 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 italic leading-relaxed">
                         "{analysis.mnemonic}"
                       </p>
                    </div>

                    {/* Kanji Analysis */}
                    {analysis.kanjiDetails.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Kanji Breakdown</h3>
                        <div className="grid gap-2">
                          {analysis.kanjiDetails.map((k, i) => (
                            <div key={i} className="flex gap-3 bg-slate-900 p-2 rounded border border-slate-800">
                              <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded text-xl font-serif text-white border border-slate-700">
                                {k.character}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                   <p className="text-sm font-medium text-slate-200 truncate">{k.meaning}</p>
                                   <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                     k.jlpt === 'N1' ? 'bg-rose-900 text-rose-200' :
                                     k.jlpt === 'N5' ? 'bg-emerald-900 text-emerald-200' :
                                     'bg-slate-700 text-slate-300'
                                   }`}>
                                     {k.jlpt}
                                   </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{k.readings}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-10">
                    {isAnalyzing ? 'Analyzing with Gemini...' : 'Click "Analyze" to see insights'}
                  </div>
                )
              )}
            </div>

            {/* Sticky Editor Footer (Always visible in Note tab, Hidden in Analysis tab) */}
            {activeTab === 'note' && (
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
            )}
            
            {/* Save to Note Button (In analysis tab) */}
            {activeTab === 'analysis' && analysis && (
               <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-3 z-10">
                 <button
                   onClick={() => {
                     const mnemonicText = `\n\n[Mnemonic]: ${analysis.mnemonic}`;
                     setNoteContent(prev => prev + mnemonicText);
                     setActiveTab('note');
                     showToast('Added to Notes');
                   }}
                   className="w-full py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-md text-xs font-medium transition-colors"
                 >
                   Append Mnemonic to Note
                 </button>
               </div>
            )}
          </div>
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