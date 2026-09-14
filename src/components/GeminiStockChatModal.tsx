import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Tag,
  Package,
  Layers,
} from 'lucide-react';
import { StockItem, StockFilter } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

interface GeminiStockChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  onApplyFilter?: (filter: StockFilter) => void;
  onSearchItem?: (query: string) => void;
}

export const GeminiStockChatModal: React.FC<GeminiStockChatModalProps> = ({
  isOpen,
  onClose,
  items = [],
  onApplyFilter,
  onSearchItem,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Set initial welcoming message when opened with inventory stats
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const totalCount = items.length;
      const lowCount = items.filter((i) => {
        const thresh = i.lowStockThreshold ?? 5;
        return (i.quantity || 0) > 0 && (i.quantity || 0) <= thresh;
      }).length;
      const outCount = items.filter((i) => (i.quantity || 0) <= 0).length;

      let welcome = `Hello! I'm your **Gemini AI Stock Assistant**, connected directly to your real-time inventory of **${totalCount} items**.`;
      if (outCount > 0 || lowCount > 0) {
        welcome += `\n\n⚠️ **Quick Notice**: You currently have **${lowCount} items low on stock** and **${outCount} out of stock**.`;
      }
      welcome += `\n\nAsk me anything about your stock quantities, reorder needs, production dates, or product categories!`;

      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          text: welcome,
          timestamp: new Date(),
          suggestions: [
            "What items are running low on stock?",
            "Give me a complete inventory summary",
            "Which items need immediate reordering?",
            "What items are out of stock?",
          ],
        },
      ]);
    }
  }, [isOpen, items]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Handle Speech Recognition
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
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInputText(transcript);
          // Send immediately when user finishes speaking
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
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
  };

  // Text-to-Speech Playback
  const speakText = (text: string, messageId: string) => {
    if (!synthRef.current) return;

    if (speakingMessageId === messageId) {
      synthRef.current.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synthRef.current.cancel();

    // Strip markdown formatting for cleaner speech output
    const cleanText = text
      .replace(/\[SUGGESTIONS\][\s\S]*$/gi, '')
      .replace(/[*_~`#>-]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    synthRef.current.speak(utterance);
  };

  // Parse suggested follow-ups from Gemini response
  const parseSuggestions = (rawText: string): { cleanText: string; suggestions: string[] } => {
    const parts = rawText.split(/\[SUGGESTIONS\]/i);
    const cleanText = parts[0].trim();
    const suggestions: string[] = [];

    if (parts.length > 1) {
      const lines = parts[1].split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^[\s*-•\d.]+/, '').trim();
        if (cleaned) {
          suggestions.push(cleaned);
        }
      }
    }

    return { cleanText, suggestions };
  };

  // Send message to Gemini server-side endpoint
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query || isLoading) return;

    setInputText('');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build history payload for Gemini multi-turn conversation
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/gemini/stock-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          stockItems: items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to talk with Gemini AI.');
      }

      const { cleanText, suggestions } = parseSuggestions(data.reply || '');

      const modelMessageId = `model-${Date.now()}`;
      const modelMessage: Message = {
        id: modelMessageId,
        role: 'model',
        text: cleanText,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };

      setMessages((prev) => [...prev, modelMessage]);

      if (autoSpeechEnabled) {
        speakText(cleanText, modelMessageId);
      }
    } catch (err: any) {
      console.error('Error communicating with Gemini:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to fetch response**: ${err.message || 'Please ensure your GEMINI_API_KEY is configured in Settings > Secrets.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    if (synthRef.current) synthRef.current.cancel();
    setSpeakingMessageId(null);
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-stock-chat-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col h-[92vh] sm:h-[640px] max-h-[800px] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Talk with Gemini AI
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate flex items-center gap-1.5">
                <span>Real-time analysis on {items.length} items</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-emerald-200">
                  {items.reduce((s, i) => s + (i.quantity || 0), 0)} units total
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Auto-read Toggle */}
            <button
              type="button"
              onClick={() => {
                setAutoSpeechEnabled(!autoSpeechEnabled);
                if (speakingMessageId && synthRef.current) {
                  synthRef.current.cancel();
                  setSpeakingMessageId(null);
                }
              }}
              title={autoSpeechEnabled ? 'Voice readout is ON. Tap to mute' : 'Voice readout is OFF. Tap to hear Gemini speak'}
              className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                autoSpeechEnabled
                  ? 'bg-white text-emerald-800 border-white font-bold'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              {autoSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={clearChat}
              title="Reset conversation"
              className="min-h-[38px] min-w-[38px] p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center ml-1"
              aria-label="Close Gemini stock chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            const isSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] ${
                    isModel ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isModel
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-2xs select-text ${
                      isModel
                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs leading-relaxed'
                        : 'bg-emerald-600 text-white font-medium rounded-tr-xs leading-relaxed'
                    }`}
                  >
                    {/* Render message body with formatted markdown elements */}
                    <div className="space-y-2 whitespace-pre-wrap break-words">
                      {msg.text.split('\n\n').map((paragraph, idx) => {
                        return (
                          <p key={idx} className="leading-relaxed">
                            {formatTextWithBold(paragraph)}
                          </p>
                        );
                      })}
                    </div>

                    {/* Bottom toolbar for model message: Speech Readout & Quick Actions */}
                    {isModel && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Speak aloud button */}
                          <button
                            type="button"
                            onClick={() => speakText(msg.text, msg.id)}
                            className={`min-h-[28px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              isSpeaking
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title={isSpeaking ? 'Stop speaking' : 'Read aloud with voice'}
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-emerald-600' : ''}`} />
                            <span className="text-[11px]">{isSpeaking ? 'Stop' : 'Listen'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested follow-up prompts from model */}
                {isModel && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2.5 ml-10 flex flex-wrap gap-1.5 max-w-[85%]">
                    {msg.suggestions.map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-xs font-semibold text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-left transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <span className="animate-pulse">Gemini is analyzing your stock...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Chips Bar */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide shrink-0">
            Quick Ask:
          </span>
          {[
            { label: 'Low Stock Alert', query: 'What items are low on stock and need reordering?' },
            { label: 'Inventory Value', query: 'What is our total stock count and summary?' },
            { label: 'Out of Stock', query: 'Which items are completely out of stock?' },
            { label: 'By Tags', query: 'Break down our inventory by product categories and tags' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSendMessage(chip.query)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Recognition and Text */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Microphone Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse ring-4 ring-rose-500/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200'
                }`}
                title={isListening ? 'Stop listening' : 'Talk with Gemini via microphone'}
                aria-label={isListening ? 'Stop listening' : 'Talk with Gemini via microphone'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-700" />}
              </button>
            )}

            {/* Text Input */}
            <div className="relative flex-1">
              <input
                id="gemini-chat-input"
                type="text"
                placeholder={isListening ? 'Listening... speak now' : 'Ask Gemini anything about your stock...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className={`w-full min-h-[44px] px-4 py-2.5 text-base sm:text-sm text-slate-900 bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white placeholder:text-slate-400 transition-all ${
                  isListening ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {isListening && (
            <div className="mt-2 text-xs text-rose-600 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Listening to your voice... Speak your question and it will be sent automatically.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to format basic markdown bolding in paragraphs
function formatTextWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
