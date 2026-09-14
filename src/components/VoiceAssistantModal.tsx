import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Search,
  Plus,
  Trash2,
  TrendingUp,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { StockItem, StockUnit } from '../types';
import {
  parseVoiceCommand,
  speakText,
  VoiceCommandResult,
} from '../lib/voiceNlp';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  units?: StockUnit[];
  onExecuteCommand: (command: VoiceCommandResult) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  items,
  units = [],
  onExecuteCommand,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Tap microphone to speak');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setStatusMessage('Voice recognition not supported in this browser. You can type commands below.');
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening... Speak now');
        setTranscript('');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          processCommand(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('Microphone access blocked. Please allow microphone permissions in browser.');
        } else if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Tap microphone and speak clearly.');
        } else {
          setStatusMessage(`Listening stopped (${event.error}). Try again or type below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setStatusMessage('Could not access microphone. You can type instructions below.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setStatusMessage('Tap microphone to speak');
  };

  const processCommand = (spokenText: string) => {
    if (!spokenText.trim()) return;

    const result = parseVoiceCommand(spokenText, items, units);
    setLastResult(result);
    setStatusMessage(result.feedback);

    // Speak audio feedback if unmuted
    if (!isMuted && result.spokenResponse) {
      speakText(result.spokenResponse);
    }

    // Execute the action in the main app
    onExecuteCommand(result);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    processCommand(textInput);
    setTextInput('');
  };

  const handleSampleClick = (sample: string) => {
    setTranscript(sample);
    processCommand(sample);
  };

  // Auto-start listening when modal opens if supported
  useEffect(() => {
    if (isOpen && speechSupported) {
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exampleCommands = [
    { label: 'Add 20 boxes of Green Tea', type: 'create' },
    { label: 'Search sugar', type: 'search' },
    { label: 'Increase tea by 5', type: 'update' },
    { label: 'How many sugar in stock', type: 'read' },
    { label: 'Filter low stock', type: 'filter' },
    { label: 'Delete item milk', type: 'delete' },
    { label: 'Show all items', type: 'filter' },
  ];

  return (
    <div
      id="voice-assistant-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="voice-assistant-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="voice-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate flex items-center gap-2"
              >
                <span>Voice Inventory Assistant</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  NLP Voice CRUD
                </span>
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Natural language voice search, add, check, update & delete
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Speech Synthesis Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={isMuted ? 'Unmute voice responses' : 'Mute voice responses'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Visual Microphone Pulse / Action Display */}
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <div className="relative mb-4">
              {/* Outer wave animation when listening */}
              {isListening && (
                <>
                  <div className="absolute inset-0 -m-3 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                  <div className="absolute inset-0 -m-6 rounded-full bg-emerald-300/20 animate-pulse pointer-events-none" />
                </>
              )}

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white scale-105 shadow-rose-600/30 ring-4 ring-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/30 hover:scale-105'
                }`}
                title={isListening ? 'Tap to stop listening' : 'Tap to start speaking'}
              >
                {isListening ? (
                  <Mic className="w-9 h-9 animate-pulse" />
                ) : (
                  <Mic className="w-9 h-9" />
                )}
              </button>
            </div>

            {/* Status / Live Transcript */}
            <div className="w-full max-w-sm">
              <p
                className={`text-sm font-bold tracking-tight mb-1 ${
                  isListening ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {isListening ? 'Listening to your voice...' : statusMessage}
              </p>

              {(transcript || interimTranscript) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 break-words shadow-2xs">
                  <span>“</span>
                  <span className="font-semibold">{transcript}</span>
                  {interimTranscript && (
                    <span className="text-slate-400 italic"> {interimTranscript}...</span>
                  )}
                  <span>”</span>
                </div>
              )}
            </div>
          </div>

          {/* Last Executed Action Badge */}
          {lastResult && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${
                lastResult.action === 'unknown'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              {lastResult.action === 'unknown' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <strong className="uppercase font-bold tracking-wider text-[10px] text-emerald-800">
                    Recognized Action: {lastResult.action.toUpperCase()}
                  </strong>
                </div>
                <p className="font-semibold">{lastResult.feedback}</p>
              </div>
            </div>
          )}

          {/* Text Instruction Input as backup / keyboard input */}
          <form onSubmit={handleTextSubmit} className="space-y-1.5">
            <label
              htmlFor="voice-text-input"
              className="text-xs font-bold text-slate-600 uppercase tracking-wider block"
            >
              Or Type Voice Instruction
            </label>
            <div className="flex gap-2">
              <input
                id="voice-text-input"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g. Add 25 kg sugar, search tea, increase milk by 5..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Execute</span>
              </button>
            </div>
          </form>

          {/* Quick Voice Prompt Shortcuts */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Natural Voice Examples (Tap to test):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {exampleCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => handleSampleClick(cmd.label)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl transition-colors cursor-pointer text-left flex items-center gap-1.5 active:scale-95"
                >
                  {cmd.type === 'create' && <Plus className="w-3 h-3 text-emerald-600 shrink-0" />}
                  {cmd.type === 'search' && <Search className="w-3 h-3 text-blue-600 shrink-0" />}
                  {cmd.type === 'update' && <TrendingUp className="w-3 h-3 text-amber-600 shrink-0" />}
                  {cmd.type === 'read' && <Eye className="w-3 h-3 text-teal-600 shrink-0" />}
                  {cmd.type === 'delete' && <Trash2 className="w-3 h-3 text-rose-600 shrink-0" />}
                  <span>“{cmd.label}”</span>
                </button>
              ))}
            </div>
          </div>

          {/* Supported Natural Commands Guide */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Natural Voice Cheatsheet:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Create / Add:</strong> “Add 50 boxes of tea”, “Create item sugar 20 kg with threshold 5”
              </li>
              <li>
                <strong>Read / Check:</strong> “How many tea do we have”, “Check stock of milk”, “Details of flour”
              </li>
              <li>
                <strong>Update:</strong> “Increase tea by 10”, “Add 5 to milk”, “Reduce sugar by 2”, “Set coffee stock to 30”
              </li>
              <li>
                <strong>Delete:</strong> “Delete item coffee”, “Remove milk from inventory”
              </li>
              <li>
                <strong>Search & Filter:</strong> “Search sugar”, “Filter low stock”, “Show out of stock”, “Show all items”
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Works in English & all natural variations</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
