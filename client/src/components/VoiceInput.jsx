import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function VoiceInput({ onTranscript, placeholder = 'Tap mic to speak…', disabled = false }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;
    // Multi-language: pick based on i18n or browser
    const lang = localStorage.getItem('i18nextLng') || 'en';
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';

    recognition.onstart = () => { setListening(true); setTranscript(''); };

    recognition.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) {
        onTranscript(final.trim());
        toast.success('🎙 Voice captured!');
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') toast.error('Microphone permission denied. Please allow mic access.');
      else if (e.error !== 'aborted') toast.error('Voice input failed. Please try again.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  }, [isSupported, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  if (!isSupported) {
    return (
      <div className="text-xs text-stone-400 italic px-1">
        🎙 Voice input not available (use Chrome/Edge)
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
          listening
            ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-lg shadow-red-500/30'
            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-civic-400 hover:text-civic-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={listening ? 'Stop listening' : 'Start voice input'}
      >
        <span className="text-lg">{listening ? '🔴' : '🎙'}</span>
        <span className="hidden sm:inline">{listening ? 'Listening…' : 'Voice'}</span>
      </button>

      {transcript && (
        <span className="text-xs text-stone-500 dark:text-stone-400 italic truncate max-w-[200px]">
          "{transcript}"
        </span>
      )}
    </div>
  );
}
