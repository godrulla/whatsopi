import { vi, beforeEach, afterEach } from 'vitest'
import { mockSpeechRecognition, mockSpeechSynthesis, createMockAudioBuffer, createMockMediaStream } from '@/test/mocks/voice'

// Enhanced Voice API mocks for testing
beforeEach(() => {
  // Mock Speech Recognition with more realistic behavior
  global.SpeechRecognition = vi.fn().mockImplementation(() => ({
    ...mockSpeechRecognition,
    
    // Enhanced start method that simulates real recognition
    start: vi.fn().mockImplementation(function() {
      this.isListening = true
      
      // Simulate microphone permission request
      setTimeout(() => {
        if (this.onstart) {
          this.onstart({ type: 'start' })
        }
      }, 50)
      
      // Simulate recognition after a delay
      setTimeout(() => {
        if (this.onresult && this.isListening) {
          const mockResult = {
            results: [{
              0: { 
                transcript: 'test recognition result',
                confidence: 0.9
              },
              isFinal: true,
              length: 1
            }],
            resultIndex: 0
          }
          this.onresult(mockResult)
        }
      }, 200)
    }),
    
    // Enhanced stop method
    stop: vi.fn().mockImplementation(function() {
      this.isListening = false
      if (this.onend) {
        this.onend({ type: 'end' })
      }
    }),
    
    // Enhanced error simulation
    simulateError: vi.fn().mockImplementation(function(errorType) {
      if (this.onerror) {
        this.onerror({
          type: 'error',
          error: errorType,
          message: this.getErrorMessage(errorType)
        })
      }
    }),
    
    getErrorMessage: vi.fn().mockImplementation((errorType) => {
      const errorMessages = {
        'not-allowed': 'Micrófono bloqueado. Habilita el acceso al micrófono.',
        'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
        'audio-capture': 'Error al capturar audio. Verifica tu micrófono.',
        'network': 'Error de conexión. Verifica tu internet.',
        'service-not-allowed': 'Servicio de reconocimiento no disponible.',
        'bad-grammar': 'Error en el procesamiento de voz.'
      }
      return errorMessages[errorType] || 'Error desconocido en reconocimiento de voz'
    }),
    
    isListening: false
  }))
  
  global.webkitSpeechRecognition = global.SpeechRecognition
  
  // Mock Speech Synthesis with enhanced features
  global.speechSynthesis = {
    ...mockSpeechSynthesis,
    
    // Enhanced speak method with event simulation
    speak: vi.fn().mockImplementation((utterance) => {
      // Simulate speech events
      setTimeout(() => {
        if (utterance.onstart) {
          utterance.onstart({ type: 'start', utterance })
        }
      }, 10)
      
      // Simulate word boundary events for long utterances
      if (utterance.text.length > 20) {
        setTimeout(() => {
          if (utterance.onboundary) {
            utterance.onboundary({ 
              type: 'boundary', 
              name: 'word',
              charIndex: 5,
              utterance 
            })
          }
        }, 100)
      }
      
      // Simulate end event
      setTimeout(() => {
        if (utterance.onend) {
          utterance.onend({ type: 'end', utterance })
        }
      }, Math.max(utterance.text.length * 50, 500)) // Realistic speech duration
    }),
    
    // Enhanced voice list with Caribbean voices
    getVoices: vi.fn().mockReturnValue([
      {
        name: 'Spanish (Dominican Republic) - Maria',
        lang: 'es-DO',
        voiceURI: 'es-DO-maria',
        localService: false,
        default: true,
        gender: 'female'
      },
      {
        name: 'Spanish (Dominican Republic) - Carlos',
        lang: 'es-DO',
        voiceURI: 'es-DO-carlos',
        localService: false,
        default: false,
        gender: 'male'
      },
      {
        name: 'Haitian Creole - Marie',
        lang: 'ht',
        voiceURI: 'ht-marie',
        localService: false,
        default: false,
        gender: 'female'
      },
      {
        name: 'Spanish (Spain) - Standard',
        lang: 'es-ES',
        voiceURI: 'es-ES-standard',
        localService: false,
        default: false,
        gender: 'female'
      }
    ])
  }
  
  // Mock MediaDevices for microphone access
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockImplementation((constraints) => {
      if (constraints.audio) {
        return Promise.resolve(createMockMediaStream())
      }
      return Promise.reject(new Error('Audio not requested'))
    }),
    
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'default-group'
      },
      {
        deviceId: 'microphone-1',
        kind: 'audioinput', 
        label: 'Built-in Microphone',
        groupId: 'builtin-group'
      }
    ])
  }
  
  // Mock AudioContext for advanced audio processing
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    createScriptProcessor: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn()
    }),
    sampleRate: 44100,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
  
  global.webkitAudioContext = global.AudioContext
})

afterEach(() => {
  vi.clearAllMocks()
})

// Utility functions for voice testing
export const voiceTestUtils = {
  // Simulate Dominican Spanish audio input
  simulateDominicanAudio: (text: string, confidence = 0.9) => {
    const recognition = new global.SpeechRecognition()
    const event = {
      results: [{
        0: { transcript: text, confidence },
        isFinal: true,
        length: 1
      }],
      resultIndex: 0
    }
    
    if (recognition.onresult) {
      recognition.onresult(event)
    }
    
    return event
  },
  
  // Simulate Haitian Creole audio input
  simulateHaitianAudio: (text: string, confidence = 0.85) => {
    const recognition = new global.SpeechRecognition()
    recognition.lang = 'ht'
    
    const event = {
      results: [{
        0: { transcript: text, confidence },
        isFinal: true,
        length: 1
      }],
      resultIndex: 0
    }
    
    if (recognition.onresult) {
      recognition.onresult(event)
    }
    
    return event
  },
  
  // Simulate noisy audio conditions
  simulateNoisyAudio: (text: string, noiseLevel = 0.3) => {
    const recognition = new global.SpeechRecognition()
    const confidence = Math.max(0.3, 0.9 - noiseLevel)
    
    const event = {
      results: [{
        0: { transcript: text, confidence },
        isFinal: true,
        length: 1
      }],
      resultIndex: 0
    }
    
    if (recognition.onresult) {
      recognition.onresult(event)
    }
    
    return { event, confidence, noiseLevel }
  },
  
  // Test Caribbean accent recognition
  testCaribbeanAccent: (utterances: string[]) => {
    return utterances.map(text => {
      // Simulate accent-specific confidence adjustments
      let confidence = 0.9
      
      // Dominican Spanish markers increase confidence
      if (text.includes('klk') || text.includes('tiguer') || text.includes('colmado')) {
        confidence = Math.min(0.95, confidence + 0.05)
      }
      
      // Haitian Creole markers
      if (text.includes('sak pase') || text.includes('mwen') || text.includes('diri')) {
        confidence = Math.min(0.92, confidence + 0.02)
      }
      
      return { text, confidence, accent: 'caribbean' }
    })
  },
  
  // Generate mock audio buffer with specific characteristics
  generateMockAudio: (options = {}) => {
    const defaults = {
      duration: 1000, // ms
      sampleRate: 44100,
      channels: 1,
      frequency: 440 // Hz
    }
    
    const config = { ...defaults, ...options }
    return createMockAudioBuffer(config.duration)
  }
}

// Mock voice commands for testing
export const mockVoiceCommands = {
  dominican: [
    'Klk tiguer, busca pollo',
    'Cuánto vale el arroz',
    'Colmado más cercano',
    'Hacer un pedido',
    'Ver mi carrito',
    'Ayuda con el pago'
  ],
  
  haitian: [
    'Sak pase, mwen bezwen achte diri',
    'Konbyen diri a koute',
    'Ki kote gen magazen',
    'Mwen vle fè yon komand'
  ],
  
  mixed: [
    'Klk, pero mwen pa konprann',
    'Busco diri para cocinar',
    'Cuánto cuesta nan magazen'
  ]
}

// Audio quality simulation
export const audioQualityScenarios = {
  excellent: { confidence: 0.95, noiseLevel: 0.05 },
  good: { confidence: 0.88, noiseLevel: 0.15 },
  fair: { confidence: 0.75, noiseLevel: 0.30 },
  poor: { confidence: 0.60, noiseLevel: 0.50 },
  veryPoor: { confidence: 0.40, noiseLevel: 0.70 }
}