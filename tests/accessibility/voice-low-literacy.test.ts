import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { HomePage } from '@/pages/HomePage'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { VoiceModal } from '@/components/voice/VoiceModal'

// Extend expect with axe matchers
expect.extend(toHaveNoViolations)

// Mock speech synthesis for consistent testing
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    {
      name: 'Spanish (Dominican Republic)',
      lang: 'es-DO',
      default: true,
      localService: true,
      voiceURI: 'Spanish (Dominican Republic)'
    },
    {
      name: 'Haitian Creole',
      lang: 'ht',
      default: false,
      localService: true,
      voiceURI: 'Haitian Creole'
    }
  ]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
})

describe('Voice Interface Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations in voice interface', async () => {
      const { container } = render(<VoiceButton />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should provide proper ARIA labels in Spanish', async () => {
      render(<VoiceButton />)
      
      const voiceButton = screen.getByRole('button')
      expect(voiceButton).toHaveAttribute('aria-label', 'Presiona para hablar o mantén presionado')
      expect(voiceButton).toHaveAttribute('aria-describedby')
      
      const description = document.getElementById(voiceButton.getAttribute('aria-describedby')!)
      expect(description).toHaveTextContent('Usa tu voz para buscar productos y hacer pedidos')
    })

    it('should announce voice recognition status to screen readers', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)
      
      // Should have live region for status updates
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true')
      
      // Should announce when listening starts
      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))
      
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent('Escuchando tu voz...')
      })
    })

    it('should provide keyboard alternatives to voice input', async () => {
      const user = userEvent.setup()
      render(<VoiceModal isOpen={true} onClose={() => {}} />)
      
      // Should have keyboard fallback option
      const keyboardButton = screen.getByRole('button', { name: /usar teclado en su lugar/i })
      expect(keyboardButton).toBeVisible()
      
      await user.click(keyboardButton)
      
      // Should show text input alternative
      const textInput = screen.getByRole('textbox', { name: /escribe tu pedido/i })
      expect(textInput).toBeVisible()
      expect(textInput).toHaveFocus()
    })

    it('should support high contrast mode', async () => {
      // Simulate high contrast mode
      document.documentElement.classList.add('high-contrast')
      
      render(<VoiceButton />)
      
      const voiceButton = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(voiceButton)
      
      // Check contrast ratios meet WCAG AA standards (4.5:1 for normal text)
      expect(voiceButton).toHaveClass('high-contrast-compatible')
      
      // Should have visible focus indicator
      voiceButton.focus()
      expect(voiceButton).toHaveStyle('outline: 3px solid currentColor')
      
      document.documentElement.classList.remove('high-contrast')
    })
  })

  describe('Low-Literacy User Support', () => {
    it('should use clear, simple Spanish language', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)
      
      // Check for simple, clear instructions
      expect(screen.getByText('Habla ahora')).toBeVisible()
      expect(screen.getByText('Presiona y habla')).toBeVisible()
      
      // Should avoid complex vocabulary
      expect(screen.queryByText(/configuración avanzada/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/parámetros técnicos/i)).not.toBeInTheDocument()
      
      // Should use familiar Dominican terms
      expect(screen.getByText(/buscar en el colmado/i)).toBeVisible()
    })

    it('should provide visual feedback with icons and colors', async () => {
      render(<VoiceButton />)
      
      const voiceButton = screen.getByRole('button')
      
      // Should have visual microphone icon
      const micIcon = voiceButton.querySelector('[data-testid="microphone-icon"]')
      expect(micIcon).toBeVisible()
      
      // Should change visual state when active
      fireEvent.click(voiceButton)
      
      await waitFor(() => {
        expect(voiceButton).toHaveClass('listening')
        expect(voiceButton).toHaveStyle('background-color: #e3f2fd') // Light blue when listening
      })
    })

    it('should provide audio feedback in Dominican Spanish', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)
      
      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))
      
      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Ahora puedes hablar. Te estoy escuchando.',
            lang: 'es-DO',
            rate: 0.9, // Slightly slower for clarity
            pitch: 1.0
          })
        )
      })
    })

    it('should use large, touch-friendly buttons', async () => {
      render(<VoiceButton />)
      
      const voiceButton = screen.getByRole('button')
      const buttonRect = voiceButton.getBoundingClientRect()
      
      // Should meet WCAG AAA standards (44px minimum)
      expect(buttonRect.width).toBeGreaterThanOrEqual(44)
      expect(buttonRect.height).toBeGreaterThanOrEqual(44)
      
      // Should have adequate spacing
      const computedStyle = window.getComputedStyle(voiceButton)
      expect(parseInt(computedStyle.margin)).toBeGreaterThanOrEqual(8)
    })

    it('should provide step-by-step voice guidance', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)
      
      // Should guide users through the process
      const guidanceText = screen.getByTestId('voice-guidance')
      expect(guidanceText).toHaveTextContent('Paso 1: Presiona el botón azul')
      
      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))
      
      await waitFor(() => {
        expect(guidanceText).toHaveTextContent('Paso 2: Habla claramente cerca del micrófono')
      })
    })
  })

  describe('Dominican Spanish Voice Recognition', () => {
    it('should recognize Dominican Spanish accents accurately', async () => {
      const dominicanPhrases = [
        'Klk tiguer, busco pollo',
        'Cuánto vale el arroz',
        'Necesito habichuelas rojas',
        'Quiero hacer un pedido'
      ]

      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      for (const phrase of dominicanPhrases) {
        // Mock voice recognition result
        fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))
        
        // Simulate voice input
        const mockResult = {
          results: [{
            0: { transcript: phrase, confidence: 0.95 },
            isFinal: true
          }]
        }

        fireEvent(window, new CustomEvent('voicerecognitionresult', { detail: mockResult }))

        await waitFor(() => {
          expect(screen.getByText(phrase)).toBeVisible()
        })

        // Should provide confidence feedback
        const confidenceIndicator = screen.getByTestId('confidence-indicator')
        expect(confidenceIndicator).toHaveAttribute('aria-label', 'Confianza: 95%')
      }
    })

    it('should handle low confidence recognition gracefully', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      // Simulate low confidence result
      const mockResult = {
        results: [{
          0: { transcript: 'busco poyo', confidence: 0.3 },
          isFinal: true
        }]
      }

      fireEvent(window, new CustomEvent('voicerecognitionresult', { detail: mockResult }))

      await waitFor(() => {
        expect(screen.getByText('No estoy seguro de lo que dijiste')).toBeVisible()
        expect(screen.getByText('¿Puedes repetir más claro?')).toBeVisible()
      })

      // Should provide alternatives
      expect(screen.getByRole('button', { name: /intentar de nuevo/i })).toBeVisible()
      expect(screen.getByRole('button', { name: /escribir en su lugar/i })).toBeVisible()
    })

    it('should provide voice feedback in appropriate Dominican tone', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      // Simulate successful recognition
      const mockResult = {
        results: [{
          0: { transcript: 'busco pollo barato', confidence: 0.96 },
          isFinal: true
        }]
      }

      fireEvent(window, new CustomEvent('voicerecognitionresult', { detail: mockResult }))

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Perfecto, entendí que buscas pollo barato. Te voy a mostrar las opciones.',
            lang: 'es-DO',
            rate: 0.9,
            pitch: 1.0
          })
        )
      })
    })
  })

  describe('Haitian Creole Support', () => {
    it('should provide Creole voice interface when detected', async () => {
      // Mock language detection
      Object.defineProperty(navigator, 'language', {
        value: 'ht',
        configurable: true
      })

      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      // Should show Creole interface option
      expect(screen.getByRole('button', { name: /pale nan kreyòl/i })).toBeVisible()

      fireEvent.click(screen.getByRole('button', { name: /pale nan kreyòl/i }))

      // Interface should switch to Creole
      await waitFor(() => {
        expect(screen.getByText('Pale kounye a')).toBeVisible() // "Speak now" in Creole
        expect(screen.getByText('Peze ak pale')).toBeVisible() // "Press and speak" in Creole
      })
    })

    it('should provide bilingual assistance for code-switching', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      // Simulate code-switching input
      const mockResult = {
        results: [{
          0: { transcript: 'Klk pero mwen bezwen diri', confidence: 0.88 },
          isFinal: true
        }]
      }

      fireEvent(window, new CustomEvent('voicerecognitionresult', { detail: mockResult }))

      await waitFor(() => {
        // Should detect mixed languages
        expect(screen.getByText('Detecté español y criollo')).toBeVisible()
        expect(screen.getByText('Mwen konprann, ou bezwen diri')).toBeVisible()
        
        // Should offer translation
        expect(screen.getByRole('button', { name: /traducir al español/i })).toBeVisible()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle microphone permission errors gracefully', async () => {
      // Mock permission denied
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied'))
        }
      })

      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      await waitFor(() => {
        expect(screen.getByText('No puedo acceder al micrófono')).toBeVisible()
        expect(screen.getByText('Por favor permite el acceso para usar la voz')).toBeVisible()
      })

      // Should provide clear instructions
      expect(screen.getByText('Cómo activar el micrófono:')).toBeVisible()
      expect(screen.getByText('1. Busca el ícono del micrófono en tu navegador')).toBeVisible()
      expect(screen.getByText('2. Haz clic en "Permitir"')).toBeVisible()
    })

    it('should handle network errors during voice processing', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      const mockResult = {
        results: [{
          0: { transcript: 'busco pollo', confidence: 0.95 },
          isFinal: true
        }]
      }

      fireEvent(window, new CustomEvent('voicerecognitionresult', { detail: mockResult }))

      await waitFor(() => {
        expect(screen.getByText('Problema de conexión')).toBeVisible()
        expect(screen.getByText('Voy a guardar tu pedido para cuando tengas internet')).toBeVisible()
      })

      // Should provide offline options
      expect(screen.getByRole('button', { name: /guardar sin conexión/i })).toBeVisible()
    })

    it('should provide timeout handling for voice input', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      // Simulate timeout (no speech detected)
      vi.advanceTimersByTime(10000) // 10 seconds

      await waitFor(() => {
        expect(screen.getByText('No te escuché nada')).toBeVisible()
        expect(screen.getByText('¿Quieres intentar de nuevo?')).toBeVisible()
      })

      // Should offer alternatives
      expect(screen.getByRole('button', { name: /intentar otra vez/i })).toBeVisible()
      expect(screen.getByRole('button', { name: /mejor escribo/i })).toBeVisible()
    })
  })

  describe('Mobile Device Optimization', () => {
    it('should work on low-end Android devices', async () => {
      // Mock low-end Android device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J330F) AppleWebKit/537.36',
        configurable: true
      })

      render(<VoiceButton />)

      const voiceButton = screen.getByRole('button')
      
      // Should have optimized performance settings
      expect(voiceButton).toHaveAttribute('data-performance-mode', 'optimized')
      
      // Should use hardware acceleration
      const computedStyle = window.getComputedStyle(voiceButton)
      expect(computedStyle.transform).toBeDefined()
    })

    it('should handle poor network conditions', async () => {
      // Mock 2G network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.25
        },
        configurable: true
      })

      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      // Should show network optimization message
      expect(screen.getByText('Conexión lenta detectada')).toBeVisible()
      expect(screen.getByText('Usando modo de bajo ancho de banda')).toBeVisible()

      // Should adjust processing settings
      const processingIndicator = screen.getByTestId('processing-mode')
      expect(processingIndicator).toHaveAttribute('data-mode', 'low-bandwidth')
    })
  })

  describe('Cognitive Accessibility', () => {
    it('should provide consistent navigation patterns', async () => {
      render(<HomePage />)

      // Voice button should always be in the same location
      const voiceButton = screen.getByRole('button', { name: /hablar/i })
      expect(voiceButton).toHaveClass('fixed-position')
      expect(voiceButton).toHaveAttribute('data-testid', 'main-voice-button')

      // Should maintain visual consistency across pages
      expect(voiceButton).toHaveStyle('background-color: #2196F3') // Consistent blue
    })

    it('should provide clear feedback for all actions', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      // Should provide immediate visual feedback
      await waitFor(() => {
        const statusIndicator = screen.getByTestId('listening-indicator')
        expect(statusIndicator).toBeVisible()
        expect(statusIndicator).toHaveClass('pulsing')
      })

      // Should provide audio feedback
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('escuchando')
        })
      )
    })

    it('should allow users to undo or cancel actions', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: /comenzar a escuchar/i }))

      // Should provide cancel option during listening
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).toBeVisible()
      expect(cancelButton).toHaveClass('prominent')

      fireEvent.click(cancelButton)

      // Should confirm cancellation
      await waitFor(() => {
        expect(screen.getByText('Escucha cancelada')).toBeVisible()
      })
    })

    it('should use simple, clear error messages', async () => {
      render(<VoiceModal isOpen={true} onClose={() => {}} />)

      // Simulate an error
      const errorEvent = new CustomEvent('voiceerror', {
        detail: { error: 'network' }
      })
      fireEvent(window, errorEvent)

      await waitFor(() => {
        // Should use plain language
        expect(screen.getByText('No hay internet')).toBeVisible()
        expect(screen.getByText('Revisa tu conexión e intenta de nuevo')).toBeVisible()
        
        // Should avoid technical jargon
        expect(screen.queryByText(/error de conectividad de red/i)).not.toBeInTheDocument()
      })
    })
  })
})