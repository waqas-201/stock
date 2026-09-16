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
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Undo2,
  Package,
  Plus,
  Sliders,
  Filter,
} from 'lucide-react';
import { StockItem, StockFilter, GeminiAgentAction } from '../types';

export interface ExecutedActionRecord {
  id: string;
  type: string;
  itemName?: string;
  delta?: number;
  previousQuantity?: number;
  newQuantity?: number;
  unit?: string;
  reason?: string;
  timestamp: string;
  undo?: () => void;
  isUndone?: boolean;
  summary: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  executedActions?: ExecutedActionRecord[];
}

export interface GeminiStockChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  onApplyFilter?: (filter: StockFilter) => void;
  onSearchItem?: (query: string) => void;
  onQuickQuantityChange?: (item: StockItem, delta: number) => void;
  onExecuteAgentAction?: (action: GeminiAgentAction) => {
    success: boolean;
    message: string;
    undo?: () => void;
    previousQuantity?: number;
    newQuantity?: number;
  };
}

export const GeminiStockChatModal: React.FC<GeminiStockChatModalProps> = ({
  isOpen,
  onClose,
  items = [],
  onApplyFilter,
  onSearchItem,
  onQuickQuantityChange,
  onExecuteAgentAction,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const hasMedia = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      if (!SpeechRecognition && !hasMedia) {
        setSpeechSupported(false);
      }
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Set initial welcoming message when opened with inventory stats & actionable prompts
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const totalCount = items.length;
      const lowCount = items.filter((i) => {
        const thresh = i.lowStockThreshold ?? 5;
        return (i.quantity || 0) > 0 && (i.quantity || 0) <= thresh;
      }).length;
      const outCount = items.filter((i) => (i.quantity || 0) <= 0).length;

      const sampleItem = items.length > 0 ? items[0].itemName : 'Widget A';

      let welcome = `👋 Hello! I'm your **Active Gemini AI Inventory Agent**, connected in real time to your **${totalCount} products**.`;
      welcome += `\n\n⚡ **Direct Control Enabled**: You can operate your stock directly with natural language!\n`;
      welcome += `• *"Hey, ${sampleItem} increased by 10 today"*\n`;
      welcome += `• *"We used 5 ${sampleItem}"*\n`;
      welcome += `• *"What items are running low?"*`;

      if (outCount > 0 || lowCount > 0) {
        welcome += `\n\n⚠️ **Notice**: You currently have **${lowCount} low stock** and **${outCount} out of stock** items.`;
      }

      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          text: welcome,
          timestamp: new Date(),
          suggestions: [
            items.length > 0 ? `Hey, ${items[0].itemName} increased by 10 today` : 'What items are low on stock?',
            items.length > 1 ? `Deduct 5 from ${items[1].itemName}` : 'Give me a complete inventory summary',
            'What items need immediate reordering?',
            'Show items that are out of stock',
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

  // Fallback: Gemini Server-side Audio Recorder (Works everywhere)
  const startGeminiAudioRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError('Microphone recording is not supported in this browser.');
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        if (audioBlob.size < 200) {
          setSpeechStatus('No audio detected. Please try again.');
          return;
        }

        setIsTranscribing(true);
        setSpeechStatus('Transcribing your voice with Gemini AI...');

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            try {
              const res = await fetch('/api/gemini/transcribe-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType: mimeType || 'audio/webm',
                }),
              });
              const data = await res.json();
              if (data.transcript && data.transcript.trim()) {
                const transcribed = data.transcript.trim();
                setInputText(transcribed);
                setSpeechStatus(`Transcribed: "${transcribed}"`);
              } else {
                setSpeechStatus('No speech recognized. Please speak closer to the microphone.');
              }
            } catch (netErr: any) {
              console.error('Transcription error:', netErr);
              setSpeechError('Could not transcribe audio. Please check network connection.');
            } finally {
              setIsTranscribing(false);
            }
          };
        } catch (readErr) {
          console.error('Blob reading error:', readErr);
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setIsListening(true);
      setRecordingSeconds(0);
      setSpeechError(null);
      setSpeechStatus('Recording your voice for Gemini AI... Speak now!');

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start audio recording:', err);
      setIsListening(false);
      setSpeechError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was blocked. Please allow microphone access in your browser.'
          : 'Could not access microphone.'
      );
    }
  };

  // Handle Speech Recognition with permission verification & live real-time typing
  const startListening = async () => {
    setSpeechError(null);
    setSpeechStatus('Connecting to microphone...');

    // 1. Verify and request microphone permissions via getUserMedia
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release dummy stream so recognition or recorder has clean access
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission request failed:', err);
        setIsListening(false);
        setSpeechError(
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Microphone permission blocked. Please allow microphone access in your browser address bar.'
            : 'Could not access microphone hardware. Please check your audio settings.'
        );
        return;
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // 2. Primary: Web Speech API with real-time continuous typing
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechError(null);
          setSpeechStatus('Listening... Speak now (words will appear as you speak)');
        };

        recognition.onresult = (event: any) => {
          let finalWords = '';
          let interimWords = '';

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalWords += res[0].transcript + ' ';
            } else {
              interimWords += res[0].transcript;
            }
          }

          const combined = (finalWords + interimWords).trim();
          if (combined) {
            // TYPE DIRECTLY INTO THE INPUT FIELD IN REAL TIME
            setInputText(combined);
            setSpeechStatus(`Heard: "${combined}"`);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error);
          if (e.error === 'not-allowed') {
            setSpeechError(
              'Microphone access blocked. Click the lock/camera icon in your address bar to enable.'
            );
            setIsListening(false);
          } else if (e.error === 'no-speech') {
            setSpeechStatus('No speech detected. Please speak closer to your microphone.');
          } else if (e.error === 'network' || e.error === 'service-not-allowed') {
            console.log('Falling back to Gemini Audio recording due to browser speech service error...');
            try {
              recognition.abort();
            } catch {}
            startGeminiAudioRecording();
          } else {
            setSpeechStatus(`Listening paused (${e.error}). Tap mic to try again.`);
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (e) {
        console.warn('Web Speech start failed, falling back to Gemini Audio:', e);
      }
    }

    // 3. Fallback: Gemini Server-side Audio Recorder
    startGeminiAudioRecording();
  };

  const stopListening = () => {
    // Stop Web Speech API if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Stop MediaRecorder if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
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
      .replace(/\[ACTIONS\][\s\S]*?(\n\n|$)/gi, '')
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
    // Strip [ACTIONS] block if rawText still contains it
    let workingText = rawText.replace(/\[ACTIONS\][\s\S]*?(\n\n|$)/gi, '').trim();

    const parts = workingText.split(/\[SUGGESTIONS\]/i);
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

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // response was not JSON
      }

      if (!res.ok) {
        throw new Error(data?.error || `Server responded with HTTP ${res.status}`);
      }

      // Execute returned Agent Actions
      const executedActionsList: ExecutedActionRecord[] = [];
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0 && onExecuteAgentAction) {
        for (const act of data.actions) {
          try {
            const execResult = onExecuteAgentAction(act);
            executedActionsList.push({
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: act.type,
              itemName: act.itemName,
              delta: act.delta,
              previousQuantity: execResult.previousQuantity ?? act.previousQuantity,
              newQuantity:
                execResult.newQuantity ??
                (act.newQuantity !== undefined
                  ? act.newQuantity
                  : execResult.previousQuantity !== undefined && act.delta !== undefined
                  ? execResult.previousQuantity + act.delta
                  : undefined),
              unit: act.unit,
              reason: act.reason,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              undo: execResult.undo,
              isUndone: false,
              summary: execResult.message || `${act.type} executed successfully`,
            });
          } catch (e: any) {
            console.error('Failed to execute AI agent action:', act, e);
          }
        }
      }

      const { cleanText, suggestions } = parseSuggestions(data.reply || '');

      const modelMessageId = `model-${Date.now()}`;
      const modelMessage: Message = {
        id: modelMessageId,
        role: 'model',
        text: cleanText,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        executedActions: executedActionsList.length > 0 ? executedActionsList : undefined,
      };

      setMessages((prev) => [...prev, modelMessage]);

      if (autoSpeechEnabled) {
        speakText(cleanText, modelMessageId);
      }
    } catch (err: any) {
      console.error('Error communicating with Gemini:', err);
      const isFetchFailed = err?.message?.toLowerCase().includes('failed to fetch');
      const errorDetail = isFetchFailed
        ? 'Could not connect to the inventory AI service. Please check your network connection or try again in a moment.'
        : (err.message || 'Please ensure your GEMINI_API_KEY is configured in Settings > Secrets.');

      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to connect to AI**: ${errorDetail}`,
        timestamp: new Date(),
        suggestions: ["Try asking again", "Give me a complete inventory summary"],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Undo of an executed action
  const handleUndoAction = (actionRecord: ExecutedActionRecord, messageId: string) => {
    if (actionRecord.undo) {
      actionRecord.undo();
      actionRecord.isUndone = true;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.executedActions) return msg;
          return {
            ...msg,
            executedActions: msg.executedActions.map((a) =>
              a.id === actionRecord.id ? { ...a, isUndone: true } : a
            ),
          };
        })
      );
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
        className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col h-[92vh] sm:h-[680px] max-h-[820px] overflow-hidden animate-in zoom-in-95 duration-150"
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
                  Gemini AI Stock Agent
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  Active Agent
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate flex items-center gap-1.5">
                <span>Direct UI control on {items.length} items</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-emerald-200">
                  {items.reduce((s, i) => s + (i.quantity || 0), 0)} total stock
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
              title={
                autoSpeechEnabled
                  ? 'Voice readout is ON. Tap to mute'
                  : 'Voice readout is OFF. Tap to hear Gemini speak'
              }
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
                  className={`flex items-start gap-2.5 max-w-[95%] sm:max-w-[88%] ${
                    isModel ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isModel ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}
                  >
                    {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-2xs select-text ${
                      isModel
                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs leading-relaxed w-full'
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

                    {/* Render EXECUTED AGENT ACTIONS (Real UI Operations) */}
                    {isModel && msg.executedActions && msg.executedActions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>AI Agent Inventory Action Applied</span>
                        </span>

                        {msg.executedActions.map((actionRecord) => (
                          <div
                            key={actionRecord.id}
                            className={`p-3 rounded-xl border transition-all ${
                              actionRecord.isUndone
                                ? 'bg-slate-100/80 border-slate-200 opacity-60'
                                : 'bg-emerald-50/80 border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                      {actionRecord.itemName || 'Stock Item'}
                                    </span>
                                    {actionRecord.delta !== undefined && (
                                      <span
                                        className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded-md ${
                                          actionRecord.delta > 0
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-rose-600 text-white'
                                        }`}
                                      >
                                        {actionRecord.delta > 0 ? `+${actionRecord.delta}` : actionRecord.delta}{' '}
                                        {actionRecord.unit || ''}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    {actionRecord.summary}
                                  </p>
                                </div>
                              </div>

                              {/* Undo Button */}
                              {actionRecord.undo && (
                                <button
                                  type="button"
                                  disabled={actionRecord.isUndone}
                                  onClick={() => handleUndoAction(actionRecord, msg.id)}
                                  className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                                    actionRecord.isUndone
                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-2xs'
                                  }`}
                                >
                                  <Undo2 className="w-3 h-3" />
                                  <span>{actionRecord.isUndone ? 'Reverted' : 'Undo Action'}</span>
                                </button>
                              )}
                            </div>

                            {/* Mathematical Calculation Flow */}
                            {actionRecord.previousQuantity !== undefined &&
                              actionRecord.newQuantity !== undefined && (
                                <div className="mt-2 pt-1.5 border-t border-emerald-200/50 flex items-center justify-between text-[11px] font-mono text-slate-600">
                                  <span>Previous: {actionRecord.previousQuantity}</span>
                                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                                  <span className="font-bold text-emerald-800">
                                    New Total: {actionRecord.newQuantity} {actionRecord.unit || ''}
                                  </span>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom toolbar for model message: Speech Readout & Timestamp */}
                    {isModel && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
                            <Volume2
                              className={`w-3.5 h-3.5 ${
                                isSpeaking ? 'animate-pulse text-emerald-600' : ''
                              }`}
                            />
                            <span className="text-[11px]">
                              {isSpeaking ? 'Stop' : 'Listen'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested follow-up prompts from model */}
                {isModel && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2.5 ml-10 flex flex-wrap gap-1.5 max-w-[88%]">
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
                <span className="animate-pulse">Gemini is processing your request...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips Bar (Direct agent command templates) */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide shrink-0">
            Quick Commands:
          </span>
          {[
            {
              label: items.length > 0 ? `+10 to ${items[0].itemName}` : '+10 Stock',
              query:
                items.length > 0
                  ? `Hey, ${items[0].itemName} increased by 10 today`
                  : 'Add 10 to current stock',
            },
            {
              label: items.length > 0 ? `-5 from ${items[0].itemName}` : '-5 Stock',
              query:
                items.length > 0
                  ? `Deduct 5 from ${items[0].itemName}`
                  : 'Deduct 5 from stock',
            },
            {
              label: 'Low Stock Alert',
              query: 'What items are low on stock and need reordering?',
            },
            {
              label: 'Inventory Summary',
              query: 'Give me a complete inventory summary and stock count',
            },
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

        {/* Speech Error Banner if microphone was blocked */}
        {speechError && (
          <div className="mx-3 sm:mx-4 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{speechError}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={startListening}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="p-1 text-amber-700 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Live Speech Recognition Waveform & Action Banner */}
        {(isListening || isTranscribing) && (
          <div className="mx-3 sm:mx-4 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Animated Sound Wave Bars */}
              <div className="flex items-center gap-0.5 h-4 px-1 shrink-0">
                <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-rose-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-4 bg-rose-600 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
              </div>

              <div className="min-w-0">
                <p className="font-bold text-rose-900 truncate">
                  {isTranscribing
                    ? 'Transcribing audio with Gemini AI...'
                    : recordingSeconds > 0
                    ? `Recording voice (${recordingSeconds}s)... Speak now!`
                    : 'Listening live... Speak your stock update'}
                </p>
                {inputText && (
                  <p className="text-[11px] text-rose-700 truncate font-mono">
                    "{inputText}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={stopListening}
                className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Done
              </button>
              {inputText.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    handleSendMessage();
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Bar with Voice Recognition and Text */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Microphone Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isTranscribing}
                className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse ring-4 ring-rose-500/20'
                    : isTranscribing
                    ? 'bg-amber-100 text-amber-800 border-amber-300 cursor-wait'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200'
                }`}
                title={
                  isListening
                    ? 'Click to stop listening'
                    : isTranscribing
                    ? 'Transcribing...'
                    : 'Speak to Gemini: real-time voice typing'
                }
                aria-label={isListening ? 'Stop listening' : 'Speak to Gemini via microphone'}
              >
                {isTranscribing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
                ) : isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5 text-emerald-700" />
                )}
              </button>
            )}

            {/* Text Input */}
            <div className="relative flex-1">
              <input
                id="gemini-chat-input"
                type="text"
                placeholder={
                  isListening
                    ? 'Listening... say "Hey, Widget increased by 10 today"'
                    : 'Ask or say: "Hey, [item] increased by 15 today"...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isTranscribing}
                className={`w-full min-h-[44px] px-4 py-2.5 text-base sm:text-sm text-slate-900 bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white placeholder:text-slate-400 transition-all ${
                  isListening ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading || isTranscribing}
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

          {speechStatus && !isListening && !isTranscribing && (
            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{speechStatus}</span>
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
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
