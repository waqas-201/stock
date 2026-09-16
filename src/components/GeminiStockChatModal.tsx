import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Languages,
  ArrowLeft,
  Check,
  MessageSquare,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { StockItem, StockFilter, GeminiAgentAction } from '../types';

export function isUrduText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

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

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  executedActions?: ExecutedActionRecord[];
  isVoiceInput?: boolean;
}

export interface GeminiStockChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  onApplyFilter?: (filter: StockFilter) => void;
  onSearchItem?: (query: string) => void;
  onQuickQuantityChange?: (itemId: string, newQuantity: number) => void;
  onExecuteAgentAction?: (action: GeminiAgentAction) => {
    success: boolean;
    message: string;
    previousQuantity?: number;
    newQuantity?: number;
    undo?: () => void;
  };
  initialMode?: 'voice' | 'chat';
}

export const GeminiStockChatModal: React.FC<GeminiStockChatModalProps> = ({
  isOpen,
  onClose,
  items = [],
  onApplyFilter,
  onSearchItem,
  onQuickQuantityChange,
  onExecuteAgentAction,
  initialMode = 'voice',
}) => {
  // Main view state: 'voice' (ChatGPT / WhatsApp calm voice orb) vs 'chat' (classic message log)
  const [viewMode, setViewMode] = useState<'voice' | 'chat'>(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<'auto' | 'ur' | 'roman_ur' | 'en'>('auto');

  // Real-time audio frequency visualizer state
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0 to 1
  const [latestVoiceAction, setLatestVoiceAction] = useState<ExecutedActionRecord | null>(null);
  const [latestTranscript, setLatestTranscript] = useState<string>('');
  const [agentStatusText, setAgentStatusText] = useState<string>('Ready to listen');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const shouldAutoSubmitRef = useRef(false);

  // Helper to format recording timer display (e.g. 00:05)
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMedia = Boolean(navigator?.mediaDevices?.getUserMedia);
      if (!hasMedia && !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        setSpeechSupported(false);
      }
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Set initial welcome prompt on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const totalCount = items.length;
      const lowCount = items.filter((i) => {
        const thresh = i.lowStockThreshold ?? 5;
        return (i.quantity || 0) > 0 && (i.quantity || 0) <= thresh;
      }).length;
      const outCount = items.filter((i) => (i.quantity || 0) <= 0).length;
      const sampleItem = items.length > 0 ? items[0].itemName : 'Widget A';

      let welcome = `👋 Hello! I'm your **Stock Voice Agent**, connected to **${totalCount} products**.`;
      welcome += `\n\n🇵🇰 **Speak calmly in Urdu, Roman Urdu, or English:**\n`;
      welcome += `• *"Hey, ${sampleItem} increased by 10 today"* / *"${sampleItem} mein 10 add kardo"*\n`;
      welcome += `• *"${sampleItem} کے 5 ڈبے فروخت ہو گئے"* (Deduct 5)\n`;
      welcome += `• *"اسٹاک کتنا بچا ہے؟"* / *"What items are low on stock?"*`;

      if (outCount > 0 || lowCount > 0) {
        welcome += `\n\n⚠️ **Stock Status**: **${lowCount} low stock** and **${outCount} out of stock** items.`;
      }

      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          text: welcome,
          timestamp: new Date(),
          suggestions: [
            items.length > 0 ? `${items[0].itemName} mein 10 add kardo` : 'اسٹاک کی صورتحال بتاؤ',
            'اسٹاک کتنا بچا ہے؟ (Total Stock Report)',
            'کم اسٹاک والی اشیاء دکھاؤ (Low Stock Items)',
            'Show out of stock items',
          ],
        },
      ]);
    }
  }, [isOpen, items, messages.length]);

  // Scroll to bottom in chat view
  useEffect(() => {
    if (isOpen && viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, viewMode]);

  // AudioContext cleanup helper
  const stopAudioVisualization = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Text-to-Speech Playback (calm and concise)
  const speakText = useCallback(
    (text: string, messageId: string) => {
      if (!synthRef.current || !autoSpeechEnabled) return;

      if (speakingMessageId === messageId) {
        synthRef.current.cancel();
        setSpeakingMessageId(null);
        return;
      }

      try {
        synthRef.current.cancel();

        // Clean text for speech synthesis
        const cleanText = text
          .replace(/\[SUGGESTIONS\][\s\S]*$/gi, '')
          .replace(/\[ACTIONS\][\s\S]*?(\n\n|$)/gi, '')
          .replace(/[*_~`#>-]/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const hasUrdu = isUrduText(cleanText);
        if (hasUrdu || languageMode === 'ur') {
          utterance.lang = 'ur-PK';
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices?.() || [];
            const urduOrHindiVoice = voices.find(
              (v) => v.lang.startsWith('ur') || v.lang.startsWith('hi')
            );
            if (urduOrHindiVoice) {
              utterance.voice = urduOrHindiVoice;
            }
          }
        } else {
          utterance.lang = 'en-US';
        }

        utterance.onstart = () => {
          setSpeakingMessageId(messageId);
          setAgentStatusText('Speaking response...');
        };
        utterance.onend = () => {
          setSpeakingMessageId(null);
          setAgentStatusText('Ready to listen');
        };
        utterance.onerror = () => {
          setSpeakingMessageId(null);
          setAgentStatusText('Ready to listen');
        };

        synthRef.current.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
        setSpeakingMessageId(null);
      }
    },
    [autoSpeechEnabled, languageMode, speakingMessageId]
  );

  // Stop everything immediately: recording, audio tracks, synth, and close modal
  const handleCleanExit = useCallback(() => {
    // 1. Stop timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // 2. Stop media recorder and clear chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    // 3. Stop mic stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 4. Stop audio visualizer
    stopAudioVisualization();

    // 5. Cancel any speech
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {}
    }

    // 6. Reset states
    setIsListening(false);
    setIsTranscribing(false);
    setSpeakingMessageId(null);
    setSpeechError(null);

    // 7. Exit back to inventory table
    onClose();
  }, [onClose, stopAudioVisualization]);

  // Clean exit when modal is unmounted or isOpen toggled off
  useEffect(() => {
    if (!isOpen) {
      handleCleanExit();
    }
  }, [isOpen, handleCleanExit]);

  // Send message to Gemini server-side endpoint
  const handleSendMessage = async (textToSend?: string, isVoice: boolean = false) => {
    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query || isLoading) return;

    setInputText('');
    setSpeechError(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date(),
      isVoiceInput: isVoice,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setAgentStatusText('Stock Agent is thinking...');

    try {
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
          languageMode,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        throw new Error(data?.error || `Server responded with HTTP ${res.status}`);
      }

      // Execute returned Agent Actions
      const executedActionsList: ExecutedActionRecord[] = [];
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0 && onExecuteAgentAction) {
        for (const act of data.actions) {
          try {
            const execResult = onExecuteAgentAction(act);
            const actRecord: ExecutedActionRecord = {
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
            };
            executedActionsList.push(actRecord);
            setLatestVoiceAction(actRecord);
          } catch (e: any) {
            console.error('Failed to execute AI agent action:', act, e);
          }
        }
      }

      // Parse suggestions
      let cleanText = (data.reply || '').replace(/\[ACTIONS\][\s\S]*?(\n\n|$)/gi, '').trim();
      const parts = cleanText.split(/\[SUGGESTIONS\]/i);
      cleanText = parts[0].trim();
      const suggestions: string[] = [];

      if (parts.length > 1) {
        const lines = parts[1].split('\n');
        for (const line of lines) {
          const cleaned = line.replace(/^[\s*-•\d.]+/, '').trim();
          if (cleaned) suggestions.push(cleaned);
        }
      }

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
      setAgentStatusText('Response ready');

      // Speak back calmly if voice mode or auto-speech is enabled
      if (autoSpeechEnabled || isVoice) {
        speakText(cleanText, modelMessageId);
      }
    } catch (err: any) {
      console.error('Error in handleSendMessage:', err);
      const isFetchFailed = err?.message?.toLowerCase().includes('failed to fetch');
      const errorDetail = isFetchFailed
        ? 'Could not connect to the inventory AI service. Please check your network connection.'
        : (err.message || 'Please check your GEMINI_API_KEY in Settings.');

      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to connect**: ${errorDetail}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAgentStatusText('Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Start Voice Recording (WhatsApp / ChatGPT voice mode style)
  const startRecording = async () => {
    if (isLoading || isTranscribing) return;

    // Cancel any active speech
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeakingMessageId(null);
    }

    setSpeechError(null);
    setLatestTranscript('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError('Microphone recording is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Setup Web Audio API volume visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(1, avg / 90);
            setAudioLevel(normalized);
            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (audioVisErr) {
        console.warn('AudioContext visualization setup:', audioVisErr);
      }

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg',
        ];
        for (const t of supportedTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            mimeType = t;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        stopAudioVisualization();

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        // Release hardware mic stream immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // If recording was cancelled, audio chunks are empty
        if (audioChunksRef.current.length === 0) {
          setAgentStatusText('Recording cancelled');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType,
        });
        audioChunksRef.current = [];

        if (audioBlob.size < 400) {
          setSpeechError('Audio was too brief. Please tap to speak and say your stock command.');
          setAgentStatusText('Ready to listen');
          return;
        }

        setIsTranscribing(true);
        setAgentStatusText('Understanding your voice with Gemini...');

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
                  mimeType: recorder.mimeType || mimeType,
                }),
              });

              const data = await res.json();
              const transcript = data?.transcript ? data.transcript.trim() : '';

              if (transcript) {
                setLatestTranscript(transcript);
                setInputText(transcript);
                setAgentStatusText(`Heard: "${transcript}"`);
                // Automatically execute the voice command
                await handleSendMessage(transcript, true);
              } else {
                setSpeechError('Could not detect clear speech. Please tap to speak again.');
                setAgentStatusText('Ready to listen');
              }
            } catch (err: any) {
              console.error('Transcription error:', err);
              setSpeechError('Could not transcribe audio. Please check network connection.');
              setAgentStatusText('Ready to listen');
            } finally {
              setIsTranscribing(false);
            }
          };
        } catch (readErr) {
          console.error('Blob reading error:', readErr);
          setIsTranscribing(false);
          setAgentStatusText('Ready to listen');
        }
      };

      recorder.start(200);
      setIsListening(true);
      setRecordingSeconds(0);
      setAgentStatusText('Listening calmly...');

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setIsListening(false);
      stopAudioVisualization();

      const isBlocked =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError';

      if (isBlocked) {
        setSpeechError('Microphone permission was blocked. Please enable it in browser settings.');
      } else {
        setSpeechError('Could not connect to microphone. You can type in the Chat view.');
      }
      setAgentStatusText('Ready to listen');
    }
  };

  // Mark Done: Immediately stops recording, releases mic, and triggers transcription
  const markDoneAndSubmit = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
    }
  };

  // Cancel Recording: Discards audio chunks, stops tracks, leaves without submitting
  const cancelRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    stopAudioVisualization();
    setIsListening(false);
    setAgentStatusText('Ready to listen');
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

      if (latestVoiceAction && latestVoiceAction.id === actionRecord.id) {
        setLatestVoiceAction({ ...latestVoiceAction, isUndone: true });
      }
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
    setLatestTranscript('');
    setLatestVoiceAction(null);
    setAgentStatusText('Ready to listen');
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-stock-chat-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleCleanExit}
    >
      <div
        className="bg-slate-900 text-white w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-[94vh] sm:h-[680px] max-h-[820px] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
          {/* Back Button ("when I click back, it should leave just like your one") */}
          <button
            id="btn-voice-agent-back"
            type="button"
            onClick={handleCleanExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer border border-slate-700/60 shadow-xs"
            title="Leave and return to inventory"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Central Title & Mode Status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isListening
                    ? 'bg-rose-500 animate-ping'
                    : isTranscribing || isLoading
                    ? 'bg-amber-400 animate-pulse'
                    : speakingMessageId
                    ? 'bg-teal-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-bold text-slate-200 text-xs truncate">
                {isListening
                  ? `Listening (${formatTimer(recordingSeconds)})`
                  : isTranscribing
                  ? 'Transcribing...'
                  : isLoading
                  ? 'Processing...'
                  : speakingMessageId
                  ? 'Speaking...'
                  : 'Voice Agent'}
              </span>
            </div>
          </div>

          {/* Right Action Controls: Mode Switcher & TTS Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle View Mode: Voice Orb vs Chat Log */}
            <button
              id="btn-toggle-view-mode"
              type="button"
              onClick={() => {
                // If currently listening, stop first
                if (isListening) markDoneAndSubmit();
                setViewMode(viewMode === 'voice' ? 'chat' : 'voice');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title={viewMode === 'voice' ? 'Switch to Chat History' : 'Switch to Calm Voice Mode'}
            >
              {viewMode === 'voice' ? (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Chat History</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden sm:inline">Voice Mode</span>
                </>
              )}
            </button>

            {/* Audio Voice readout toggle */}
            <button
              type="button"
              onClick={() => {
                setAutoSpeechEnabled(!autoSpeechEnabled);
                if (speakingMessageId && synthRef.current) {
                  synthRef.current.cancel();
                  setSpeakingMessageId(null);
                }
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                autoSpeechEnabled
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={autoSpeechEnabled ? 'Voice readout is ON (tap to mute)' : 'Voice readout is OFF (tap to unmute)'}
            >
              {autoSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Multilingual / Quick Language Bar */}
        <div className="bg-slate-950/80 px-4 py-2 flex items-center justify-between gap-2 border-b border-slate-800/80 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span>Language / زبان:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'auto', label: 'Auto (اردو / Roman / EN)' },
                { id: 'ur', label: 'اردو (Urdu)' },
                { id: 'roman_ur', label: 'Roman Urdu' },
                { id: 'en', label: 'English' },
              ] as const
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguageMode(lang.id)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  languageMode === lang.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN BODY: VOICE MODE (ChatGPT / WhatsApp Style) */}
        {viewMode === 'voice' ? (
          <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-y-auto">
            {/* Top Prompt / Instruction Banner */}
            <div className="w-full text-center space-y-1">
              <p className="text-xs uppercase tracking-wider font-bold text-teal-400">
                AI Stock Voice Agent
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {isListening
                  ? 'Listening calmly... Speak your stock update'
                  : isTranscribing
                  ? 'Understanding what you said...'
                  : isLoading
                  ? 'Applying changes to inventory...'
                  : speakingMessageId
                  ? 'Agent speaking response...'
                  : 'Tap the button below and speak'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {languageMode === 'ur'
                  ? 'آسانی سے بولیں: "Widget A میں 10 شامل کرو" یا "5 ڈبے فروخت ہوئے"'
                  : 'Speak naturally: "Add 10 to Widget A", "Sold 5 laptops", or "What items are low in stock?"'}
              </p>
            </div>

            {/* Error Banner */}
            {speechError && (
              <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start justify-between gap-2 shadow-lg animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{speechError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSpeechError(null)}
                  className="p-1 text-rose-400 hover:text-white rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Central Animated Voice Orb / Waveform Sphere */}
            <div className="relative my-auto flex flex-col items-center justify-center py-6 sm:py-10">
              {/* Outer Pulsing Glow Rings */}
              <div
                className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full transition-all duration-300 pointer-events-none ${
                  isListening
                    ? 'bg-rose-500/20 blur-xl scale-125'
                    : isTranscribing || isLoading
                    ? 'bg-amber-500/20 blur-xl scale-110'
                    : speakingMessageId
                    ? 'bg-teal-500/20 blur-xl scale-115'
                    : 'bg-emerald-500/10 blur-lg scale-100'
                }`}
                style={{
                  transform: isListening
                    ? `scale(${1.15 + audioLevel * 0.45})`
                    : undefined,
                }}
              />

              {/* Middle Concentric Ring */}
              <div
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  isListening
                    ? 'border-rose-500/40 bg-gradient-to-tr from-rose-900/40 to-pink-900/30'
                    : isTranscribing || isLoading
                    ? 'border-amber-500/40 bg-gradient-to-tr from-amber-900/30 to-yellow-900/20 animate-spin'
                    : speakingMessageId
                    ? 'border-teal-500/40 bg-gradient-to-tr from-teal-900/40 to-emerald-900/30'
                    : 'border-emerald-500/30 bg-gradient-to-tr from-emerald-950/60 to-slate-900/80 shadow-inner'
                }`}
                style={{
                  transform: isListening
                    ? `scale(${1 + audioLevel * 0.25})`
                    : undefined,
                }}
              >
                {/* Core Sphere */}
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 shadow-rose-950/50'
                      : isTranscribing || isLoading
                      ? 'bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-950/50'
                      : speakingMessageId
                      ? 'bg-gradient-to-br from-teal-500 via-emerald-600 to-teal-700 shadow-teal-950/50'
                      : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-950/50 hover:scale-105 active:scale-95'
                  }`}
                  onClick={
                    isListening
                      ? markDoneAndSubmit
                      : isTranscribing || isLoading
                      ? undefined
                      : startRecording
                  }
                  title={isListening ? 'Tap to mark Done' : 'Tap to start recording'}
                >
                  {isListening ? (
                    <div className="flex flex-col items-center text-white">
                      <span className="font-mono text-base font-extrabold tracking-wider">
                        {formatTimer(recordingSeconds)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 mt-0.5">
                        Done ✓
                      </span>
                    </div>
                  ) : isTranscribing || isLoading ? (
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  ) : speakingMessageId ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-9 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="w-1.5 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                    </div>
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </div>
              </div>

              {/* WhatsApp-style Live Audio Waves while recording */}
              {isListening && (
                <div className="flex items-center gap-1.5 mt-5 h-8 px-4 py-1.5 bg-slate-800/90 rounded-full border border-rose-500/30 shadow-md">
                  <span
                    className="w-1.5 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(6, audioLevel * 24)}px` }}
                  />
                  <span
                    className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(10, audioLevel * 30)}px` }}
                  />
                  <span
                    className="w-1.5 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(14, audioLevel * 22)}px` }}
                  />
                  <span
                    className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(8, audioLevel * 28)}px` }}
                  />
                  <span
                    className="w-1.5 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(12, audioLevel * 20)}px` }}
                  />
                  <span className="text-[11px] font-mono text-rose-300 ml-2 font-bold">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>
              )}

              {/* Spoken Text Preview or Action Outcome Card */}
              {latestTranscript && !isListening && (
                <div className="w-full max-w-md mt-4 p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md animate-in fade-in space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">You said:</span>
                    <span className="font-mono text-[10px] text-emerald-400">Transcribed</span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 break-words">
                    "{latestTranscript}"
                  </p>

                  {/* If action was executed, show confirmation badge and undo */}
                  {latestVoiceAction && (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold min-w-0">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{latestVoiceAction.summary}</span>
                      </div>
                      {latestVoiceAction.undo && !latestVoiceAction.isUndone && (
                        <button
                          type="button"
                          onClick={() => {
                            latestVoiceAction.undo?.();
                            setLatestVoiceAction({ ...latestVoiceAction, isUndone: true });
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-2"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Primary Controls: Just ONE Button Interface */}
            <div className="w-full flex flex-col items-center justify-center pt-2 pb-2">
              {isListening ? (
                /* While Recording: Clear "Done" Button + Cancel */
                <div className="flex items-center gap-4">
                  {/* Cancel Button */}
                  <button
                    id="btn-voice-cancel"
                    type="button"
                    onClick={cancelRecording}
                    className="min-h-[48px] px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
                  >
                    Cancel
                  </button>

                  {/* ONE Big Primary Done Button */}
                  <button
                    id="btn-voice-done"
                    type="button"
                    onClick={markDoneAndSubmit}
                    className="min-h-[56px] px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-slate-950 font-extrabold text-base flex items-center gap-2.5 shadow-xl shadow-emerald-950/40 transition-transform cursor-pointer border border-emerald-400"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Done</span>
                  </button>
                </div>
              ) : isTranscribing || isLoading ? (
                /* Processing State */
                <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                  <span>{isTranscribing ? 'Transcribing audio...' : 'Stock Agent is updating...'}</span>
                </div>
              ) : speakingMessageId ? (
                /* Speaking State: Tap to Stop Speaking or Speak Again */
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      synthRef.current?.cancel();
                      setSpeakingMessageId(null);
                    }}
                    className="min-h-[48px] px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 cursor-pointer border border-slate-700"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>Stop Speaking</span>
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="min-h-[52px] px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-transform"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Speak Again</span>
                  </button>
                </div>
              ) : (
                /* Idle State: ONE Big Tap to Speak Button */
                <div className="flex flex-col items-center gap-2">
                  <button
                    id="btn-voice-start"
                    type="button"
                    onClick={startRecording}
                    className="min-h-[60px] px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-base flex items-center gap-3 shadow-xl shadow-emerald-950/40 active:scale-95 transition-transform cursor-pointer border border-emerald-300"
                  >
                    <Mic className="w-5 h-5 text-slate-950" />
                    <span>Tap to Speak</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Tap to speak • Keep talking • Tap Done when finished
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SECONDARY BODY: CHAT & AUDIT LOG MODE */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasUrdu = isUrduText(msg.text);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Role Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isUser
                          ? 'bg-slate-700 text-slate-200'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {isUser ? (msg.isVoiceInput ? '🎤 Spoken Voice' : 'You') : 'Stock Agent'}
                        </span>
                        <div className="flex items-center gap-1">
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => speakText(msg.text, msg.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                              title={speakingMessageId === msg.id ? 'Stop audio' : 'Listen via voice'}
                            >
                              {speakingMessageId === msg.id ? (
                                <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <span className="text-[10px] opacity-60">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`text-sm leading-relaxed whitespace-pre-line ${
                          hasUrdu ? 'font-serif text-right text-base leading-loose' : ''
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Executed Agent Actions in Chat */}
                      {msg.executedActions && msg.executedActions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700 space-y-1.5">
                          {msg.executedActions.map((act) => (
                            <div
                              key={act.id}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                                act.isUndone
                                  ? 'bg-slate-900/60 text-slate-400 line-through'
                                  : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/80'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="font-semibold truncate">{act.summary}</span>
                              </div>
                              {act.undo && !act.isUndone && (
                                <button
                                  type="button"
                                  onClick={() => handleUndoAction(act, msg.id)}
                                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                >
                                  <Undo2 className="w-3 h-3" />
                                  <span>Undo</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                    <span className="animate-pulse">Stock Agent is processing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Text Input Bar */}
            <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {/* Voice button in chat bar */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('voice');
                    startRecording();
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                  title="Switch to Voice Mode & Speak"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    languageMode === 'ur'
                      ? 'میسج لکھیں یا مائیک دبائیں...'
                      : 'Type a stock command or question...'
                  }
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={clearChat}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear chat history"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
