import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoice } from '@/hooks/useVoice'
import { mockSpeechRecognition, mockSpeechSynthesis, mockDominicanVoiceResults, mockHaitianVoiceResults } from '@/test/mocks/voice'

// Mock the Web Speech API
global.SpeechRecognition = mockSpeechRecognition as any
global.webkitSpeechRecognition = mockSpeechRecognition as any
global.speechSynthesis = mockSpeechSynthesis as any

describe('useVoice Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset speech recognition state
    mockSpeechRecognition.continuous = true
    mockSpeechRecognition.interimResults = true
    mockSpeechRecognition.lang = 'es-DO'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVoice())
      
      expect(result.current.isListening).toBe(false)
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.transcript).toBe('')
      expect(result.current.confidence).toBe(0)
      expect(result.current.language).toBe('es-DO')
      expect(result.current.error).toBeNull()
    })

    it('should detect browser support for speech recognition', () => {
      const { result } = renderHook(() => useVoice())
      
      expect(result.current.isSupported).toBe(true)
    })

    it('should handle unsupported browsers gracefully', () => {
      // Temporarily remove speech recognition support
      const originalSpeechRecognition = global.SpeechRecognition
      global.SpeechRecognition = undefined as any
      global.webkitSpeechRecognition = undefined as any

      const { result } = renderHook(() => useVoice())
      
      expect(result.current.isSupported).toBe(false)
      expect(result.current.error).toContain('no soporta reconocimiento de voz')

      // Restore
      global.SpeechRecognition = originalSpeechRecognition
      global.webkitSpeechRecognition = originalSpeechRecognition
    })
  })

  describe('Dominican Spanish Voice Recognition', () => {
    it('should recognize Dominican Spanish greetings', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.start).toHaveBeenCalled()
      expect(mockSpeechRecognition.lang).toBe('es-DO')

      // Simulate Dominican greeting recognition
      const dominicanGreeting = mockDominicanVoiceResults['klk tiguer que lo que']
      
      act(() => {
        // Simulate speech recognition result
        const event = mockSpeechRecognition.simulateResult(
          dominicanGreeting.transcript,
          dominicanGreeting.confidence
        )
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('klk tiguer que lo que')
      expect(result.current.confidence).toBe(0.92)
      expect(result.current.language).toBe('es-DO')
    })

    it('should handle Dominican product searches', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      const productSearch = mockDominicanVoiceResults['busca pollo en el colmado']
      
      act(() => {
        const event = mockSpeechRecognition.simulateResult(
          productSearch.transcript,
          productSearch.confidence
        )
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('busca pollo en el colmado')
      expect(result.current.confidence).toBe(0.89)
      
      // Should identify cultural markers
      const transcript = result.current.transcript
      expect(transcript).toContainDominicanSlang(['colmado'])
    })

    it('should process price inquiries in Dominican Spanish', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      const priceInquiry = mockDominicanVoiceResults['cuanto vale el arroz']
      
      act(() => {
        const event = mockSpeechRecognition.simulateResult(
          priceInquiry.transcript,
          priceInquiry.confidence
        )
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('cuánto vale el arroz')
      expect(result.current.confidence).toBe(0.85)
    })
  })

  describe('Haitian Creole Voice Recognition', () => {
    it('should switch to Haitian Creole when detected', async () => {
      const { result } = renderHook(() => useVoice())
      
      // Simulate language detection switching to Haitian Creole
      act(() => {
        result.current.setLanguage('ht')
      })

      expect(result.current.language).toBe('ht')

      act(() => {
        result.current.startListening()
      })

      expect(mockSpeechRecognition.lang).toBe('ht')
    })

    it('should recognize Haitian Creole greetings', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.setLanguage('ht')
        result.current.startListening()
      })

      const haitianGreeting = mockHaitianVoiceResults['sak pase nap boule']
      
      act(() => {
        const event = mockSpeechRecognition.simulateResult(
          haitianGreeting.transcript,
          haitianGreeting.confidence
        )
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('sak pase nap boule')
      expect(result.current.confidence).toBe(0.88)
      expect(result.current.language).toBe('ht')
    })

    it('should handle Haitian Creole product requests', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.setLanguage('ht')
        result.current.startListening()
      })

      const productRequest = mockHaitianVoiceResults['mwen bezwen achte diri']
      
      act(() => {
        const event = mockSpeechRecognition.simulateResult(
          productRequest.transcript,
          productRequest.confidence
        )
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('mwen bezwen achte diri')
      expect(result.current.confidence).toBe(0.86)
    })
  })

  describe('Speech Synthesis', () => {
    it('should synthesize speech in Dominican Spanish', async () => {
      const { result } = renderHook(() => useVoice())
      
      const message = '¡Klk loco! ¿En qué te puedo ayudar?'
      
      act(() => {
        result.current.synthesizeSpeech(message)
      })

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
      
      // Check that the utterance uses Dominican Spanish
      const spokenUtterance = mockSpeechSynthesis.speak.mock.calls[0][0]
      expect(spokenUtterance.text).toBe(message)
      expect(spokenUtterance.lang).toBe('es-DO')
    })

    it('should synthesize speech in Haitian Creole', async () => {
      const { result } = renderHook(() => useVoice())
      
      const message = 'Sak pase! Kisa ou bezwen?'
      
      act(() => {
        result.current.setLanguage('ht')
        result.current.synthesizeSpeech(message)
      })

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
      
      const spokenUtterance = mockSpeechSynthesis.speak.mock.calls[0][0]
      expect(spokenUtterance.text).toBe(message)
      expect(spokenUtterance.lang).toBe('ht')
    })

    it('should handle speech synthesis errors', async () => {
      const { result } = renderHook(() => useVoice())
      
      // Mock speech synthesis error
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror({ error: 'synthesis-failed' })
          }
        }, 10)
      })

      act(() => {
        result.current.synthesizeSpeech('Test message')
      })

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(result.current.error).toContain('síntesis de voz')
    })
  })

  describe('Voice Command Processing', () => {
    it('should process Dominican voice commands', async () => {
      const { result } = renderHook(() => useVoice())
      
      const commands = [
        'buscar arroz',
        'hacer pedido',
        'colmado cercano',
        'ayuda'
      ]

      for (const command of commands) {
        act(() => {
          result.current.processCommand(command)
        })

        expect(result.current.isProcessing).toBe(true)
        
        // Wait for processing to complete
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        })
      }
    })

    it('should handle unknown commands gracefully', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.processCommand('comando desconocido')
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(result.current.error).toContain('No entendí el comando')
    })
  })

  describe('Error Handling', () => {
    it('should handle microphone permission denied', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const errorEvent = mockSpeechRecognition.simulateError('not-allowed')
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'error')[1](errorEvent)
      })

      expect(result.current.error).toContain('Micrófono bloqueado')
      expect(result.current.isListening).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const errorEvent = mockSpeechRecognition.simulateError('network')
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'error')[1](errorEvent)
      })

      expect(result.current.error).toContain('Error de conexión')
      expect(result.current.isListening).toBe(false)
    })

    it('should handle no speech detected', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const errorEvent = mockSpeechRecognition.simulateError('no-speech')
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'error')[1](errorEvent)
      })

      expect(result.current.error).toContain('No se detectó voz')
    })
  })

  describe('Language Detection', () => {
    it('should automatically detect Dominican Spanish', async () => {
      const { result } = renderHook(() => useVoice({ autoDetectLanguage: true }))
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const event = mockSpeechRecognition.simulateResult('Klk tiguer', 0.9)
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.language).toBe('es-DO')
    })

    it('should automatically detect Haitian Creole', async () => {
      const { result } = renderHook(() => useVoice({ autoDetectLanguage: true }))
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const event = mockSpeechRecognition.simulateResult('Sak pase', 0.9)
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.language).toBe('ht')
    })
  })

  describe('Confidence Thresholds', () => {
    it('should reject low confidence results', async () => {
      const { result } = renderHook(() => useVoice({ minConfidence: 0.8 }))
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const event = mockSpeechRecognition.simulateResult('unclear speech', 0.6)
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('') // Should not accept low confidence
      expect(result.current.error).toContain('no se entendió claramente')
    })

    it('should accept high confidence results', async () => {
      const { result } = renderHook(() => useVoice({ minConfidence: 0.8 }))
      
      act(() => {
        result.current.startListening()
      })

      act(() => {
        const event = mockSpeechRecognition.simulateResult('clear speech', 0.95)
        mockSpeechRecognition.addEventListener.mock.calls
          .find(call => call[0] === 'result')[1](event)
      })

      expect(result.current.transcript).toBe('clear speech')
      expect(result.current.confidence).toBe(0.95)
    })
  })

  describe('Cleanup', () => {
    it('should stop listening on unmount', () => {
      const { result, unmount } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      expect(result.current.isListening).toBe(true)

      unmount()

      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
    })

    it('should cancel speech synthesis on unmount', () => {
      const { result, unmount } = renderHook(() => useVoice())
      
      act(() => {
        result.current.synthesizeSpeech('Test message')
      })

      unmount()

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })
  })
})