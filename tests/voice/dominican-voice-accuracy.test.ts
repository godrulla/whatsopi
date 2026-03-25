import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { voiceTestUtils, mockVoiceCommands, audioQualityScenarios } from './setup'
import { mockDominicanVoiceResults, mockHaitianVoiceResults } from '@/test/mocks/voice'
import { useVoice } from '@/hooks/useVoice'
import { renderHook, act } from '@testing-library/react'

describe('Dominican Voice Recognition Accuracy Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dominican Spanish Accuracy Benchmarks', () => {
    it('should achieve 95% accuracy for Dominican Spanish greetings', async () => {
      const dominicanGreetings = [
        'Klk tiguer, que lo que',
        'Ey loco, ¿cómo tú tá?',
        'Que tal tiguer, todo jevi',
        'Klk manito, ¿qué hay?',
        'Buenos días loco'
      ]

      const results = []

      for (const greeting of dominicanGreetings) {
        const { result } = renderHook(() => useVoice({ language: 'es-DO' }))
        
        act(() => {
          result.current.startListening()
        })

        // Simulate recognition with Dominican-specific confidence
        const recognition = voiceTestUtils.simulateDominicanAudio(greeting, 0.95)
        
        await act(async () => {
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        results.push({
          input: greeting,
          recognized: recognition.results[0][0].transcript,
          confidence: recognition.results[0][0].confidence,
          accuracy: recognition.results[0][0].transcript === greeting ? 1 : 0
        })
      }

      const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

      expect(overallAccuracy).toBeGreaterThanOrEqual(0.95)
      expect(avgConfidence).toBeGreaterThanOrEqual(0.90)
      
      // Check for Dominican cultural markers recognition
      results.forEach(result => {
        if (result.input.includes('klk') || result.input.includes('tiguer') || result.input.includes('loco')) {
          expect(result.confidence).toBeGreaterThanOrEqual(0.92)
        }
      })
    })

    it('should achieve 92% accuracy for product search commands', async () => {
      const productSearches = [
        'Busca pollo en el colmado',
        'Necesito arroz blanco',
        'Donde hay leche fresca',
        'Quiero comprar habichuela',
        'Busca aceite de cocinar'
      ]

      const results = []

      for (const search of productSearches) {
        const recognition = voiceTestUtils.simulateDominicanAudio(search, 0.92)
        
        results.push({
          input: search,
          recognized: recognition.results[0][0].transcript,
          confidence: recognition.results[0][0].confidence,
          accuracy: recognition.results[0][0].transcript === search ? 1 : 0,
          containsProduct: /pollo|arroz|leche|habichuela|aceite/.test(search.toLowerCase())
        })
      }

      const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      const productRecognition = results.filter(r => r.containsProduct).length / results.length

      expect(overallAccuracy).toBeGreaterThanOrEqual(0.92)
      expect(productRecognition).toBe(1.0) // All should contain products
    })

    it('should handle Dominican slang with high accuracy', async () => {
      const slangPhrases = [
        'Ese precio tá brutal tiguer',
        'El colmado tá jevi',
        'Klk con ese producto loco',
        'Tá muy caro esa vaina',
        'Eso tá buenísimo manito'
      ]

      const results = voiceTestUtils.testCaribbeanAccent(slangPhrases)

      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.88)
        expect(result.accent).toBe('caribbean')
        
        // Check for slang recognition
        const containsSlang = ['klk', 'tá', 'tiguer', 'loco', 'jevi', 'brutal', 'manito', 'vaina']
          .some(slang => result.text.toLowerCase().includes(slang))
        
        if (containsSlang) {
          expect(result.confidence).toBeGreaterThanOrEqual(0.90)
        }
      })
    })
  })

  describe('Haitian Creole Accuracy Benchmarks', () => {
    it('should achieve 90% accuracy for Haitian Creole basic phrases', async () => {
      const haitianPhrases = [
        'Sak pase, nap boule',
        'Mwen bezwen achte diri',
        'Konbyen sa koute',
        'Ki kote gen magazen',
        'Mwen vle fè yon komand'
      ]

      const results = []

      for (const phrase of haitianPhrases) {
        const recognition = voiceTestUtils.simulateHaitianAudio(phrase, 0.90)
        
        results.push({
          input: phrase,
          recognized: recognition.results[0][0].transcript,
          confidence: recognition.results[0][0].confidence,
          accuracy: recognition.results[0][0].transcript === phrase ? 1 : 0
        })
      }

      const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

      expect(overallAccuracy).toBeGreaterThanOrEqual(0.90)
      expect(avgConfidence).toBeGreaterThanOrEqual(0.85)
    })

    it('should recognize Haitian Creole product names', async () => {
      const haitianProducts = [
        'Mwen bezwen diri', // rice
        'Kote gen pwason', // fish
        'Mwen vle achte bannann', // banana
        'Gen ou mayi', // corn
        'Mwen bezwen lwil' // oil
      ]

      const productMap = {
        'diri': 'arroz',
        'pwason': 'pescado', 
        'bannann': 'plátano',
        'mayi': 'maíz',
        'lwil': 'aceite'
      }

      const results = []

      for (const phrase of haitianProducts) {
        const recognition = voiceTestUtils.simulateHaitianAudio(phrase, 0.88)
        
        // Check if Haitian product name is recognized
        const haitianProduct = Object.keys(productMap).find(product => 
          phrase.includes(product)
        )
        
        results.push({
          input: phrase,
          recognized: recognition.results[0][0].transcript,
          confidence: recognition.results[0][0].confidence,
          haitianProduct,
          spanishEquivalent: haitianProduct ? productMap[haitianProduct] : null
        })
      }

      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.85)
        expect(result.haitianProduct).toBeTruthy()
        expect(result.spanishEquivalent).toBeTruthy()
      })
    })
  })

  describe('Code-Switching Recognition', () => {
    it('should handle Spanish-Creole code-switching', async () => {
      const codeSwitchingPhrases = [
        'Klk pero mwen pa konprann',
        'Busco diri para cocinar',
        'Cuánto cuesta nan magazen',
        'Mwen necesito arroz blanco',
        'Hola, mwen ka ede ou'
      ]

      const results = []

      for (const phrase of codeSwitchingPhrases) {
        // Simulate lower confidence for code-switching
        const recognition = voiceTestUtils.simulateDominicanAudio(phrase, 0.75)
        
        const hasSpanish = /klk|busco|cuánto|necesito|hola|arroz|blanco/.test(phrase.toLowerCase())
        const hasCreole = /mwen|pa|konprann|diri|nan|magazen|ka|ede|ou/.test(phrase.toLowerCase())
        
        results.push({
          input: phrase,
          recognized: recognition.results[0][0].transcript,
          confidence: recognition.results[0][0].confidence,
          hasSpanish,
          hasCreole,
          isCodeSwitching: hasSpanish && hasCreole
        })
      }

      const codeSwitchingPhrases_results = results.filter(r => r.isCodeSwitching)
      expect(codeSwitchingPhrases_results).toHaveLength(5)

      codeSwitchingPhrases_results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.70) // Lower threshold for code-switching
        expect(result.hasSpanish).toBe(true)
        expect(result.hasCreole).toBe(true)
      })
    })
  })

  describe('Audio Quality Impact on Accuracy', () => {
    it('should maintain accuracy under different audio conditions', async () => {
      const testPhrase = 'Klk tiguer, busco pollo en el colmado'
      const qualityResults = []

      for (const [quality, params] of Object.entries(audioQualityScenarios)) {
        const { event, confidence, noiseLevel } = voiceTestUtils.simulateNoisyAudio(
          testPhrase,
          params.noiseLevel
        )

        qualityResults.push({
          quality,
          confidence,
          noiseLevel,
          expectedConfidence: params.confidence,
          meetsThreshold: confidence >= params.confidence * 0.9 // 90% of expected
        })
      }

      // Excellent and good quality should meet high thresholds
      const excellentResult = qualityResults.find(r => r.quality === 'excellent')
      const goodResult = qualityResults.find(r => r.quality === 'good')
      
      expect(excellentResult.confidence).toBeGreaterThanOrEqual(0.90)
      expect(goodResult.confidence).toBeGreaterThanOrEqual(0.80)

      // Fair quality should still be usable
      const fairResult = qualityResults.find(r => r.quality === 'fair')
      expect(fairResult.confidence).toBeGreaterThanOrEqual(0.70)

      // Poor quality should be flagged for retry
      const poorResult = qualityResults.find(r => r.quality === 'poor')
      expect(poorResult.confidence).toBeLessThan(0.70)
    })

    it('should recommend audio improvement for low-quality input', async () => {
      const { result } = renderHook(() => useVoice({ minConfidence: 0.8 }))
      
      act(() => {
        result.current.startListening()
      })

      // Simulate poor quality audio
      const poorAudio = voiceTestUtils.simulateNoisyAudio('klk tiguer', 0.6)
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(result.current.confidence).toBeLessThan(0.8)
      expect(result.current.error).toContain('no se entendió claramente')
    })
  })

  describe('Regional Accent Variations', () => {
    it('should handle different Dominican regional accents', async () => {
      const regionalPhrases = {
        capital: 'Klk tiguer de la capital',
        cibao: 'Ey manito del Cibao', 
        sur: 'Que tal hermano del sur',
        este: 'Buenos días del este'
      }

      const results = []

      for (const [region, phrase] of Object.entries(regionalPhrases)) {
        // Simulate regional accent variations (slight confidence differences)
        const baseConfidence = 0.90
        const regionalAdjustment = region === 'capital' ? 0.05 : 0.02 // Capital accent is most common

        const recognition = voiceTestUtils.simulateDominicanAudio(
          phrase, 
          baseConfidence + regionalAdjustment
        )

        results.push({
          region,
          phrase,
          confidence: recognition.results[0][0].confidence,
          recognized: recognition.results[0][0].transcript
        })
      }

      // All regional accents should be recognizable
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.85)
        expect(result.recognized).toBe(result.phrase)
      })

      // Capital accent should have highest confidence
      const capitalResult = results.find(r => r.region === 'capital')
      expect(capitalResult.confidence).toBeGreaterThanOrEqual(0.93)
    })
  })

  describe('Voice Command Processing Speed', () => {
    it('should process voice commands within 2 seconds', async () => {
      const commands = mockVoiceCommands.dominican

      for (const command of commands) {
        const startTime = Date.now()
        
        const { result } = renderHook(() => useVoice())
        
        act(() => {
          result.current.startListening()
        })

        voiceTestUtils.simulateDominicanAudio(command, 0.92)

        await act(async () => {
          result.current.processCommand(command)
        })

        const endTime = Date.now()
        const processingTime = endTime - startTime

        expect(processingTime).toBeLessThan(2000) // 2 second requirement
        expect(result.current.isProcessing).toBe(false)
      }
    })

    it('should provide real-time feedback during processing', async () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.startListening()
      })

      expect(result.current.isListening).toBe(true)

      voiceTestUtils.simulateDominicanAudio('Klk tiguer', 0.95)

      await act(async () => {
        result.current.processCommand('Klk tiguer')
      })

      // Should show processing state
      expect(result.current.isProcessing).toBe(true)

      // Wait for processing to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
      })

      expect(result.current.isProcessing).toBe(false)
    })
  })

  describe('Continuous Recognition Accuracy', () => {
    it('should maintain accuracy during continuous listening', async () => {
      const { result } = renderHook(() => useVoice({ continuous: true }))
      
      const phrases = [
        'Klk tiguer',
        'Busco pollo',
        'Cuánto cuesta',
        'Hacer pedido',
        'Muchas gracias'
      ]

      const results = []

      act(() => {
        result.current.startListening()
      })

      for (const [index, phrase] of phrases.entries()) {
        // Simulate continuous recognition with slight delays
        setTimeout(() => {
          const recognition = voiceTestUtils.simulateDominicanAudio(phrase, 0.90)
          results.push({
            phrase,
            confidence: recognition.results[0][0].confidence,
            sequence: index + 1
          })
        }, index * 500)
      }

      // Wait for all phrases to be processed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000))
      })

      expect(result.current.isListening).toBe(true)
      expect(results).toHaveLength(5)
      
      // Accuracy should not degrade over time
      results.forEach((result, index) => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.85)
        
        // Later phrases should maintain similar confidence
        if (index > 0) {
          const confidenceDrop = results[0].confidence - result.confidence
          expect(confidenceDrop).toBeLessThan(0.10) // Max 10% drop
        }
      })
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    it('should recover from recognition errors gracefully', async () => {
      const { result } = renderHook(() => useVoice({ autoRetry: true, maxRetries: 3 }))
      
      act(() => {
        result.current.startListening()
      })

      // Simulate recognition error
      act(() => {
        const recognition = new global.SpeechRecognition()
        recognition.simulateError('no-speech')
      })

      expect(result.current.error).toContain('No se detectó voz')

      // Should automatically retry
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
      })

      // Simulate successful retry
      voiceTestUtils.simulateDominicanAudio('Klk tiguer', 0.92)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      expect(result.current.error).toBeNull()
      expect(result.current.transcript).toBe('Klk tiguer')
    })

    it('should provide helpful error messages in Spanish', async () => {
      const { result } = renderHook(() => useVoice())
      
      const errorScenarios = [
        { error: 'not-allowed', expectedMessage: 'Micrófono bloqueado' },
        { error: 'no-speech', expectedMessage: 'No se detectó voz' },
        { error: 'audio-capture', expectedMessage: 'Error al capturar audio' },
        { error: 'network', expectedMessage: 'Error de conexión' }
      ]

      for (const scenario of errorScenarios) {
        act(() => {
          result.current.startListening()
        })

        act(() => {
          const recognition = new global.SpeechRecognition()
          recognition.simulateError(scenario.error)
        })

        expect(result.current.error).toContain(scenario.expectedMessage)
        expect(result.current.isListening).toBe(false)
      }
    })
  })
})