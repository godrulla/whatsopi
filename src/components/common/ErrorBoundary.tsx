import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Here you would integrate with services like Sentry
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleContactSupport = () => {
    const message = encodeURIComponent(
      `Hola! Tengo un problema técnico en WhatsOpí.\n\nError: ${this.state.error?.message || 'Error desconocido'}\n\nPor favor ayúdenme. Gracias!`
    );
    window.open(`https://wa.me/18091234567?text=${message}`, '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            {/* Dominican flag colors in error icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-100 to-red-100 dark:from-blue-900/30 dark:to-red-900/30 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              ¡Ay, algo salió mal!
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tuvimos un problemita técnico. No te preocupes, vamos a solucionarlo.
            </p>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Detalles del error (solo en desarrollo)
                </summary>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto max-h-32">
                  <p className="font-semibold text-red-600 dark:text-red-400 mb-2">
                    {this.state.error.message}
                  </p>
                  <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            <div className="space-y-3">
              {/* Retry Button */}
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Intentar de Nuevo</span>
              </button>

              {/* Go Home Button */}
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Ir al Inicio</span>
              </button>

              {/* Contact Support Button */}
              <button
                onClick={this.handleContactSupport}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Contactar Soporte por WhatsApp</span>
              </button>
            </div>

            {/* Dominican-themed message */}
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">¡Klk loco!</span> Sabemos que esto es molesto. 
                Nuestro equipo está trabajando 24/7 para darte la mejor experiencia en WhatsOpí.
              </p>
            </div>

            {/* Offline message if applicable */}
            {!navigator.onLine && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  📡 Parece que no tienes conexión a internet. Verifica tu conexión y intenta de nuevo.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for use with hooks
export const ErrorBoundaryWrapper: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Custom error handling logic
    console.error('App Error:', error, errorInfo);
    
    // You can add analytics or error reporting here
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  };

  return (
    <ErrorBoundary onError={handleError} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};