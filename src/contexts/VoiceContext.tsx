import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { VoiceCommand, VoiceResponse } from '../types';
import { useLanguage } from '../lib/i18n';
import toast from 'react-hot-toast';

interface VoiceContextValue {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  isMicrophoneAllowed: boolean;
  currentTranscript: string;
  confidence: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  processVoiceCommand: (command: string) => Promise<VoiceResponse | null>;
  speakResponse: (text: string, language?: 'es-DO' | 'ht' | 'en') => Promise<void>;
  toggleVoiceMode: () => void;
  isVoiceModeEnabled: boolean;
  lastCommand: VoiceCommand | null;
  lastResponse: VoiceResponse | null;
  errorMessage: string | null;
  clearError: () => void;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMicrophoneAllowed, setIsMicrophoneAllowed] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [lastResponse, setLastResponse] = useState<VoiceResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { currentLanguage, t } = useLanguage();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for speech recognition support
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = currentLanguage === 'es-DO' ? 'es-DO' : currentLanguage === 'ht' ? 'fr-HT' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentTranscript('');
      setErrorMessage(null);
    };

    recognition.onresult = (event) => {
      let transcript = '';
      let finalTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        maxConfidence = Math.max(maxConfidence, result[0].confidence || 0);

        if (result.isFinal) {
          finalTranscript = result[0].transcript;
        }
      }

      setCurrentTranscript(transcript);
      setConfidence(maxConfidence);

      // Process final transcript
      if (finalTranscript && finalTranscript.trim()) {
        processVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);

      let errorMsg = t('voice.tryAgain');
      switch (event.error) {
        case 'not-allowed':
          errorMsg = t('voice.microphoneBlocked');
          setIsMicrophoneAllowed(false);
          break;
        case 'no-speech':
          errorMsg = 'No se detectó voz. Intenta de nuevo.';
          break;
        case 'network':
          errorMsg = 'Error de conexión. Verifica tu internet.';
          break;
        case 'audio-capture':
          errorMsg = 'Error con el micrófono.';
          break;
        default:
          errorMsg = t('voice.tryAgain');
      }

      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isProcessing) {
        // If we're still processing, keep the processing state
        return;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [currentLanguage, isSupported, t]);

  // Check microphone permissions
  useEffect(() => {
    const checkMicPermissions = async () => {
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setIsMicrophoneAllowed(permission.state === 'granted');
          
          permission.onchange = () => {
            setIsMicrophoneAllowed(permission.state === 'granted');
          };
        } else if (navigator.mediaDevices) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setIsMicrophoneAllowed(true);
        }
      } catch (error) {
        setIsMicrophoneAllowed(false);
      }
    };

    if (isSupported) {
      checkMicPermissions();
    }
  }, [isSupported]);

  const startListening = async () => {
    if (!isSupported) {
      setErrorMessage(t('voice.notSupported'));
      toast.error(t('voice.notSupported'));
      return;
    }

    if (!isMicrophoneAllowed) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsMicrophoneAllowed(true);
      } catch (error) {
        setErrorMessage(t('voice.microphoneBlocked'));
        toast.error(t('voice.microphoneBlocked'));
        return;
      }
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        toast.success('Habla ahora...', { icon: '🎤' });
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error('Error al iniciar reconocimiento de voz');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsProcessing(false);
  };

  const processVoiceCommand = async (commandText: string): Promise<VoiceResponse | null> => {
    if (!commandText.trim()) return null;

    try {
      setIsProcessing(true);
      setIsListening(false);

      // Create voice command object
      const command: VoiceCommand = {
        command: commandText,
        confidence: confidence,
        language: currentLanguage,
        intent: '', // Will be determined by AI
        entities: [], // Will be extracted by AI
        timestamp: new Date(),
      };

      setLastCommand(command);

      // Call AI service to process the command
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('whatsopi-token');

      const response = await fetch(`${apiUrl}/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error('Failed to process voice command');
      }

      const voiceResponse: VoiceResponse = await response.json();
      setLastResponse(voiceResponse);

      // Speak the response if voice mode is enabled
      if (isVoiceModeEnabled && voiceResponse.text) {
        await speakResponse(voiceResponse.text, voiceResponse.language);
      }

      toast.success('Comando procesado exitosamente', { icon: '✅' });
      return voiceResponse;

    } catch (error) {
      console.error('Failed to process voice command:', error);
      const errorMsg = 'Error al procesar comando de voz';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string, language: 'es-DO' | 'ht' | 'en' = currentLanguage): Promise<void> => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language
      utterance.lang = language === 'es-DO' ? 'es-ES' : language === 'ht' ? 'fr-FR' : 'en-US';
      
      // Set voice properties for Dominican context
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.1; // Slightly higher pitch, friendly tone
      utterance.volume = 0.8;

      // Try to find a suitable voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => {
        if (language === 'es-DO') {
          return voice.lang.startsWith('es') && (voice.name.includes('Female') || voice.name.includes('Maria'));
        } else if (language === 'ht') {
          return voice.lang.startsWith('fr');
        } else {
          return voice.lang.startsWith('en');
        }
      });

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        reject(error);
      };

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleVoiceMode = () => {
    setIsVoiceModeEnabled(!isVoiceModeEnabled);
    toast.success(
      isVoiceModeEnabled ? 'Modo voz desactivado' : 'Modo voz activado',
      { icon: isVoiceModeEnabled ? '🔇' : '🔊' }
    );
  };

  const value: VoiceContextValue = {
    isListening,
    isProcessing,
    isSupported,
    isMicrophoneAllowed,
    currentTranscript,
    confidence,
    startListening,
    stopListening,
    processVoiceCommand,
    speakResponse,
    toggleVoiceMode,
    isVoiceModeEnabled,
    lastCommand,
    lastResponse,
    errorMessage,
    clearError,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextValue => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

// Type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}