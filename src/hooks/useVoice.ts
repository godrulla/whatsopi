import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguageStore } from '@/stores/languageStore';

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: string;
}

interface VoiceCommand {
  command: string;
  confidence: number;
  intent: string;
  entities: VoiceEntity[];
}

interface VoiceEntity {
  type: 'product' | 'quantity' | 'colmado' | 'location' | 'time' | 'price';
  value: string;
  confidence: number;
}

interface UseVoiceOptions {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (result: VoiceRecognitionResult) => void;
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
}

interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  language: string;
}

/**
 * Custom hook for voice recognition optimized for Dominican Spanish and Haitian Creole
 * Handles voice commands for colmado commerce and informal economy interactions
 */
export function useVoice(options: UseVoiceOptions = {}) {
  const { currentLanguage } = useLanguageStore();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    confidence: 0,
    error: null,
    language: currentLanguage
  });

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const SpeechSynthesis = window.speechSynthesis;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        
        // Configure recognition for Dominican context
        recognition.continuous = options.continuous ?? true;
        recognition.interimResults = options.interimResults ?? true;
        recognition.maxAlternatives = options.maxAlternatives ?? 3;
        
        // Set language based on current app language
        recognition.lang = getVoiceLanguage(currentLanguage);
        
        // Handle recognition results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;
          
          const voiceResult: VoiceRecognitionResult = {
            transcript,
            confidence,
            isFinal,
            language: currentLanguage
          };
          
          setState(prev => ({
            ...prev,
            transcript,
            confidence,
            error: null
          }));
          
          options.onResult?.(voiceResult);
          
          // Process command if final result
          if (isFinal && transcript.trim()) {
            processVoiceCommand(transcript, currentLanguage, confidence)
              .then(command => {
                if (command) {
                  options.onCommand?.(command);
                }
              })
              .catch(error => {
                console.error('Error processing voice command:', error);
              });
          }
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const errorMessage = getErrorMessage(event.error, currentLanguage);
          setState(prev => ({
            ...prev,
            error: errorMessage,
            isListening: false
          }));
          options.onError?.(errorMessage);
        };
        
        recognition.onstart = () => {
          setState(prev => ({ ...prev, isListening: true, error: null }));
        };
        
        recognition.onend = () => {
          setState(prev => ({ ...prev, isListening: false }));
        };
        
        recognitionRef.current = recognition;
        synthRef.current = SpeechSynthesis;
        
        setState(prev => ({ 
          ...prev, 
          isSupported: true,
          language: currentLanguage 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isSupported: false,
          error: currentLanguage === 'es-DO' 
            ? 'Tu navegador no soporta reconocimiento de voz'
            : 'Navigatè ou an pa sipòte rekonèsans vwa'
        }));
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currentLanguage, options.continuous, options.interimResults, options.maxAlternatives]);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !state.isListening) {
      try {
        recognitionRef.current.lang = getVoiceLanguage(currentLanguage);
        recognitionRef.current.start();
      } catch (error) {
        const errorMessage = currentLanguage === 'es-DO' 
          ? 'Error iniciando reconocimiento de voz'
          : 'Erè kòmanse rekonèsans vwa';
        setState(prev => ({ ...prev, error: errorMessage }));
        options.onError?.(errorMessage);
      }
    }
  }, [state.isListening, currentLanguage]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Speak text using text-to-speech
  const speak = useCallback((text: string, language?: string) => {
    if (synthRef.current) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLanguage(language || currentLanguage);
      
      // Try to find a voice for the specified language
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(utterance.lang.split('-')[0])
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Configure speech parameters for better clarity
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      synthRef.current.speak(utterance);
    }
  }, [currentLanguage]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking
  };
}

/**
 * Process voice command and extract intent and entities
 * Optimized for Dominican Spanish colmado commerce patterns
 */
async function processVoiceCommand(
  transcript: string, 
  language: string, 
  confidence: number
): Promise<VoiceCommand | null> {
  const normalizedText = transcript.toLowerCase().trim();
  
  // Dominican Spanish command patterns
  if (language === 'es-DO') {
    return processDominicanSpanishCommand(normalizedText, confidence);
  }
  
  // Haitian Creole command patterns
  if (language === 'ht') {
    return processHaitianCreoleCommand(normalizedText, confidence);
  }
  
  return null;
}

function processDominicanSpanishCommand(text: string, confidence: number): VoiceCommand {
  const entities: VoiceEntity[] = [];
  let intent = 'unknown';
  
  // Product search patterns
  if (text.includes('buscar') || text.includes('busco') || text.includes('necesito') || text.includes('quiero')) {
    intent = 'search_product';
    
    // Common Dominican products
    const products = [
      'arroz', 'pollo', 'huevo', 'huevos', 'leche', 'pan', 'aceite', 'azucar', 'azúcar',
      'habichuela', 'yuca', 'plátano', 'platano', 'queso', 'mantequilla', 'café', 'cafe',
      'cerveza', 'refresco', 'agua', 'ron', 'cigarrillo', 'cigarrillos'
    ];
    
    for (const product of products) {
      if (text.includes(product)) {
        entities.push({
          type: 'product',
          value: product,
          confidence: 0.8
        });
      }
    }
  }
  
  // Price inquiry patterns
  else if (text.includes('precio') || text.includes('cuesta') || text.includes('cuanto') || text.includes('cuánto')) {
    intent = 'price_inquiry';
    
    // Extract product mentioned in price query
    const products = ['arroz', 'pollo', 'huevo', 'leche', 'pan'];
    for (const product of products) {
      if (text.includes(product)) {
        entities.push({
          type: 'product',
          value: product,
          confidence: 0.7
        });
      }
    }
  }
  
  // Location/colmado search patterns
  else if (text.includes('colmado') || text.includes('cerca') || text.includes('cercano') || text.includes('aquí') || text.includes('aqui')) {
    intent = 'find_colmado';
    
    // Location entities
    const neighborhoods = [
      'malecón', 'malecon', 'zona colonial', 'naco', 'piantini', 'gazcue', 
      'el millón', 'el millon', 'los alcarrizos', 'santo domingo este'
    ];
    
    for (const neighborhood of neighborhoods) {
      if (text.includes(neighborhood)) {
        entities.push({
          type: 'location',
          value: neighborhood,
          confidence: 0.8
        });
      }
    }
  }
  
  // Order/purchase patterns
  else if (text.includes('pedido') || text.includes('comprar') || text.includes('ordenar') || text.includes('pedir')) {
    intent = 'place_order';
  }
  
  // Greeting patterns
  else if (text.includes('hola') || text.includes('buenas') || text.includes('klk') || text.includes('que tal')) {
    intent = 'greeting';
  }
  
  // Help patterns
  else if (text.includes('ayuda') || text.includes('help') || text.includes('como') || text.includes('cómo')) {
    intent = 'help';
  }
  
  // Extract quantities
  const quantityMatch = text.match(/(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/);
  if (quantityMatch) {
    const quantityText = quantityMatch[1];
    const quantityValue = parseSpanishNumber(quantityText);
    
    entities.push({
      type: 'quantity',
      value: quantityValue.toString(),
      confidence: 0.9
    });
  }
  
  return {
    command: text,
    confidence,
    intent,
    entities
  };
}

function processHaitianCreoleCommand(text: string, confidence: number): VoiceCommand {
  const entities: VoiceEntity[] = [];
  let intent = 'unknown';
  
  // Basic Haitian Creole patterns
  // Note: This would need expansion with proper Creole linguistic expertise
  
  // Product search patterns
  if (text.includes('mwen vle') || text.includes('m vle') || text.includes('m bezwen')) {
    intent = 'search_product';
    
    // Common products in Creole
    const products = [
      'diri', 'poul', 'ze', 'lèt', 'pen', 'lwil', 'sik',
      'pwa', 'yanm', 'bannann', 'fwomaj', 'kafe', 'byè', 'dlo'
    ];
    
    for (const product of products) {
      if (text.includes(product)) {
        entities.push({
          type: 'product',
          value: product,
          confidence: 0.8
        });
      }
    }
  }
  
  // Price inquiry patterns
  else if (text.includes('konbyen') || text.includes('pri') || text.includes('koute')) {
    intent = 'price_inquiry';
  }
  
  // Greeting patterns
  else if (text.includes('bonjou') || text.includes('bonswa') || text.includes('sak pase')) {
    intent = 'greeting';
  }
  
  return {
    command: text,
    confidence,
    intent,
    entities
  };
}

function getVoiceLanguage(appLanguage: string): string {
  switch (appLanguage) {
    case 'es-DO':
      return 'es-DO'; // Dominican Spanish
    case 'ht':
      return 'ht'; // Haitian Creole (if supported)
    case 'en':
      return 'en-US';
    default:
      return 'es-ES'; // Fallback to standard Spanish
  }
}

function getErrorMessage(error: string, language: string): string {
  const messages = {
    'es-DO': {
      'network': 'Error de conexión. Verifica tu internet.',
      'not-allowed': 'Permiso de micrófono denegado. Habilita el micrófono en configuración.',
      'no-speech': 'No se detectó voz. Habla más cerca del micrófono.',
      'aborted': 'Reconocimiento cancelado.',
      'audio-capture': 'Error de micrófono. Verifica que esté conectado.',
      'service-not-allowed': 'Servicio de voz no disponible.'
    },
    'ht': {
      'network': 'Pwoblèm koneksyon. Verifye entènèt ou.',
      'not-allowed': 'Pèmi mikwofòn yo refize. Aktive mikwofòn nan paramèt yo.',
      'no-speech': 'Pa t detekte vwa. Pale pi pre mikwofòn an.',
      'aborted': 'Rekonèsans yo annile.',
      'audio-capture': 'Pwoblèm mikwofòn. Verifye li konekte.',
      'service-not-allowed': 'Sèvis vwa pa disponib.'
    }
  };
  
  const langMessages = messages[language as keyof typeof messages] || messages['es-DO'];
  return langMessages[error as keyof typeof langMessages] || 'Error desconocido';
}

function parseSpanishNumber(text: string): number {
  const numbers: { [key: string]: number } = {
    'un': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
  };
  
  return numbers[text] || parseInt(text) || 1;
}