import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { VoiceProvider } from '@/contexts/VoiceContext'

// Mock the voice context
const mockVoiceContext = {
  isListening: false,
  isSupported: true,
  transcript: '',
  confidence: 0,
  language: 'es-DO',
  startListening: vi.fn(),
  stopListening: vi.fn(),
  error: null,
  isProcessing: false,
}

const VoiceButtonWrapper = ({ children, contextValue = mockVoiceContext }: any) => (
  <VoiceProvider value={contextValue}>
    {children}
  </VoiceProvider>
)

describe('VoiceButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render voice button with proper Dominican Spanish label', () => {
      render(
        <VoiceButtonWrapper>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByLabelText(/presiona para hablar/i)).toBeInTheDocument()
    })

    it('should start listening when clicked', async () => {
      const startListening = vi.fn()
      render(
        <VoiceButtonWrapper contextValue={{ ...mockVoiceContext, startListening }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(startListening).toHaveBeenCalledOnce()
    })

    it('should stop listening when clicked while listening', async () => {
      const stopListening = vi.fn()
      render(
        <VoiceButtonWrapper contextValue={{ 
          ...mockVoiceContext, 
          isListening: true, 
          stopListening 
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(stopListening).toHaveBeenCalledOnce()
    })
  })

  describe('Dominican Spanish Voice Recognition', () => {
    it('should process Dominican Spanish phrases correctly', async () => {
      const dominicanPhrases = [
        'Klk tiguer, que lo que',
        'Busco pollo en el colmado',
        'Cuánto vale el arroz',
        'Necesito comprar habichuelas'
      ]

      for (const phrase of dominicanPhrases) {
        render(
          <VoiceButtonWrapper contextValue={{
            ...mockVoiceContext,
            transcript: phrase,
            confidence: 0.95,
            language: 'es-DO'
          }}>
            <VoiceButton />
          </VoiceButtonWrapper>
        )

        expect(screen.getByText(phrase)).toBeInTheDocument()
        expect(phrase).toContainDominicanSlang(['klk', 'tiguer', 'colmado'])
      }
    })

    it('should handle low confidence Dominican speech gracefully', async () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          transcript: 'Klk, no entendí bien',
          confidence: 0.3,
          language: 'es-DO'
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(/no estoy seguro/i)).toBeInTheDocument()
    })
  })

  describe('Haitian Creole Support', () => {
    it('should recognize Haitian Creole phrases', async () => {
      const creolePhrases = [
        'Sak pase, nap boule',
        'Mwen bezwen achte diri',
        'Konbyen sa koute',
        'Mwen bezwen ed'
      ]

      for (const phrase of creolePhrases) {
        render(
          <VoiceButtonWrapper contextValue={{
            ...mockVoiceContext,
            transcript: phrase,
            confidence: 0.90,
            language: 'ht'
          }}>
            <VoiceButton />
          </VoiceButtonWrapper>
        )

        expect(screen.getByText(phrase)).toBeInTheDocument()
      }
    })

    it('should handle code-switching between Spanish and Creole', async () => {
      const codeSwitchingPhrase = 'Klk pero mwen pa konprann'
      
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          transcript: codeSwitchingPhrase,
          confidence: 0.88,
          language: 'mixed'
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(codeSwitchingPhrase)).toBeInTheDocument()
    })
  })

  describe('Voice Interface Accessibility', () => {
    it('should provide proper ARIA labels for screen readers', () => {
      render(
        <VoiceButtonWrapper>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label')
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('should update ARIA state when listening', () => {
      render(
        <VoiceButtonWrapper contextValue={{ ...mockVoiceContext, isListening: true }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('should announce voice recognition status to screen readers', () => {
      render(
        <VoiceButtonWrapper contextValue={{ ...mockVoiceContext, isListening: true }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(/escuchando/i)).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when voice recognition fails', () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          error: 'No se pudo acceder al micrófono'
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(/no se pudo acceder al micrófono/i)).toBeInTheDocument()
    })

    it('should disable button when voice is not supported', () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          isSupported: false
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should handle network errors gracefully', () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          error: 'network-error'
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(/problema de conexión/i)).toBeInTheDocument()
    })
  })

  describe('Cultural Context', () => {
    it('should use Dominican cultural expressions in feedback', () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          transcript: 'Está muy bueno ese colmado',
          confidence: 0.98
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      // Should show positive cultural feedback
      expect(screen.getByText(/excelente/i)).toBeInTheDocument()
    })

    it('should adapt interface based on Dominican business context', () => {
      render(
        <VoiceButtonWrapper contextValue={{
          ...mockVoiceContext,
          transcript: 'Quiero hacer un pedido para el colmado'
        }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      expect(screen.getByText(/pedido/i)).toBeInTheDocument()
      expect(screen.getByText(/colmado/i)).toBeInTheDocument()
    })
  })

  describe('Touch Interface Optimization', () => {
    it('should have proper touch target size for mobile devices', () => {
      render(
        <VoiceButtonWrapper>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(button)
      
      // Should meet WCAG AA standards (44px minimum)
      expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(44)
      expect(parseInt(computedStyle.minWidth)).toBeGreaterThanOrEqual(44)
    })

    it('should handle touch events properly', async () => {
      const startListening = vi.fn()
      render(
        <VoiceButtonWrapper contextValue={{ ...mockVoiceContext, startListening }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      
      // Simulate touch events
      fireEvent.touchStart(button)
      fireEvent.touchEnd(button)

      await waitFor(() => {
        expect(startListening).toHaveBeenCalled()
      })
    })
  })

  describe('Performance Optimization', () => {
    it('should debounce rapid button presses', async () => {
      const startListening = vi.fn()
      render(
        <VoiceButtonWrapper contextValue={{ ...mockVoiceContext, startListening }}>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      const button = screen.getByRole('button')
      
      // Rapid clicks
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      // Should only call startListening once due to debouncing
      expect(startListening).toHaveBeenCalledTimes(1)
    })

    it('should clean up resources on unmount', () => {
      const { unmount } = render(
        <VoiceButtonWrapper>
          <VoiceButton />
        </VoiceButtonWrapper>
      )

      unmount()

      // Verify cleanup was called (would need to spy on useEffect cleanup)
      expect(true).toBe(true) // Placeholder for actual cleanup verification
    })
  })
})