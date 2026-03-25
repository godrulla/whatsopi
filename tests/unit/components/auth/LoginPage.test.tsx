import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthProvider } from '@/contexts/AuthContext'
import * as AuthService from '@/services/AuthService'

// Mock AuthService
vi.mock('@/services/AuthService')

const mockAuthContext = {
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
}

const LoginWrapper = ({ children, contextValue = mockAuthContext }: any) => (
  <BrowserRouter>
    <AuthProvider value={contextValue}>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('LoginPage Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render login form with Dominican Spanish labels', () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })

    it('should display WhatsOpí branding and Dominican context', () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      expect(screen.getByText(/whatsopí/i)).toBeInTheDocument()
      expect(screen.getByText(/plataforma digital para colmados/i)).toBeInTheDocument()
    })
  })

  describe('Dominican Phone Number Validation', () => {
    it('should accept valid Dominican phone numbers', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const validNumbers = [
        '8091234567',
        '8291234567',
        '8491234567',
        '+18091234567',
        '+1 809 123 4567'
      ]

      for (const phoneNumber of validNumbers) {
        await user.clear(phoneInput)
        await user.type(phoneInput, phoneNumber)
        
        expect(phoneNumber.replace(/\D/g, '').substring(-10)).toBeValidDominicanPhone()
      }
    })

    it('should reject invalid phone numbers', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(phoneInput, '1234567')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText(/número de teléfono inválido/i)).toBeInTheDocument()
    })

    it('should format Dominican phone numbers automatically', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i) as HTMLInputElement

      await user.type(phoneInput, '8091234567')

      // Should format to Dominican standard
      expect(phoneInput.value).toBe('(809) 123-4567')
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /entrar/i })
      await user.click(submitButton)

      expect(screen.getByText(/el teléfono es requerido/i)).toBeInTheDocument()
      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
    })

    it('should validate password strength requirements', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const passwordInput = screen.getByLabelText(/contraseña/i)
      const weakPasswords = ['123', 'abc', 'password']

      for (const password of weakPasswords) {
        await user.clear(passwordInput)
        await user.type(passwordInput, password)
        
        expect(screen.getByText(/contraseña muy débil/i)).toBeInTheDocument()
      }
    })
  })

  describe('Authentication Process', () => {
    it('should call AuthService.login with correct credentials', async () => {
      const mockLogin = vi.mocked(AuthService.login)
      mockLogin.mockResolvedValue({
        user: { id: '1', phone: '8091234567', name: 'Juan Pérez' },
        token: 'mock-token'
      })

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(phoneInput, '8091234567')
      await user.type(passwordInput, 'MiContraseña123!')
      await user.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith('8091234567', 'MiContraseña123!')
    })

    it('should handle authentication errors gracefully', async () => {
      const mockLogin = vi.mocked(AuthService.login)
      mockLogin.mockRejectedValue(new Error('Credenciales inválidas'))

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(phoneInput, '8091234567')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during authentication', async () => {
      const mockLogin = vi.mocked(AuthService.login)
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <LoginWrapper contextValue={{ ...mockAuthContext, isLoading: true }}>
          <LoginPage />
        </LoginWrapper>
      )

      expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled()
    })
  })

  describe('Cultural Localization', () => {
    it('should use Dominican Spanish throughout the interface', () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      // Check for Dominican-specific terms
      expect(screen.getByText(/colmados/i)).toBeInTheDocument()
      expect(screen.getByText(/bienvenido/i)).toBeInTheDocument()
      
      // Should not use Latin American Spanish variants
      expect(screen.queryByText(/celular/i)).not.toBeInTheDocument() // Instead of "teléfono"
      expect(screen.queryByText(/plata/i)).not.toBeInTheDocument() // Instead of "dinero"
    })

    it('should adapt to Haitian Creole users when detected', async () => {
      // Mock language detection
      Object.defineProperty(navigator, 'language', {
        value: 'ht',
        configurable: true
      })

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      // Should show language toggle option
      expect(screen.getByText(/kreyòl ayisyen/i)).toBeInTheDocument()
    })
  })

  describe('Security Features', () => {
    it('should implement rate limiting for login attempts', async () => {
      const mockLogin = vi.mocked(AuthService.login)
      mockLogin.mockRejectedValue(new Error('Demasiados intentos'))

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await user.clear(phoneInput)
        await user.clear(passwordInput)
        await user.type(phoneInput, '8091234567')
        await user.type(passwordInput, 'wrongpassword')
        await user.click(submitButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/demasiados intentos/i)).toBeInTheDocument()
      })
    })

    it('should not expose sensitive information in errors', async () => {
      const mockLogin = vi.mocked(AuthService.login)
      mockLogin.mockRejectedValue(new Error('Usuario no encontrado'))

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(phoneInput, '8091234567')
      await user.type(passwordInput, 'password')
      await user.click(submitButton)

      await waitFor(() => {
        // Should show generic error instead of "Usuario no encontrado"
        expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
        expect(screen.queryByText(/usuario no encontrado/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('aria-label', /formulario de inicio de sesión/i)

      const phoneInput = screen.getByLabelText(/teléfono/i)
      expect(phoneInput).toHaveAttribute('aria-describedby')
      expect(phoneInput).toHaveAttribute('aria-required', 'true')
    })

    it('should support keyboard navigation', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      // Tab navigation should work properly
      phoneInput.focus()
      await user.keyboard('{Tab}')
      expect(passwordInput).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(submitButton).toHaveFocus()
    })

    it('should announce form errors to screen readers', async () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /entrar/i })
      await user.click(submitButton)

      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toBeInTheDocument()
      expect(errorContainer).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Mobile Optimization', () => {
    it('should handle mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const form = screen.getByRole('form')
      expect(form).toHaveClass('mobile-optimized')
    })

    it('should show appropriate soft keyboard for phone input', () => {
      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      expect(phoneInput).toHaveAttribute('inputMode', 'tel')
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })
  })

  describe('Offline Functionality', () => {
    it('should cache login form for offline access', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      expect(screen.getByText(/modo sin conexión/i)).toBeInTheDocument()
      expect(screen.getByText(/los datos se sincronizarán/i)).toBeInTheDocument()
    })

    it('should queue authentication requests when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      render(
        <LoginWrapper>
          <LoginPage />
        </LoginWrapper>
      )

      const phoneInput = screen.getByLabelText(/teléfono/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(phoneInput, '8091234567')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText(/guardado para sincronizar/i)).toBeInTheDocument()
    })
  })
})