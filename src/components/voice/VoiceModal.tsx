import React from 'react';
import { X, Mic, Volume2, VolumeX, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useVoice } from '../../contexts/VoiceContext';
import { useLanguage } from '../../lib/i18n';
import { cn } from '../../utils/cn';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose }) => {
  const {
    isListening,
    isProcessing,
    isSupported,
    isMicrophoneAllowed,
    currentTranscript,
    confidence,
    isVoiceModeEnabled,
    toggleVoiceMode,
    startListening,
    stopListening,
    lastCommand,
    lastResponse,
    errorMessage,
    clearError,
  } = useVoice();

  const { t, currentLanguage } = useLanguage();

  if (!isOpen) return null;

  const handleStartListening = async () => {
    clearError();
    try {
      await startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const voiceExamples = [
    'Buscar arroz en colmados cercanos',
    '¿Cuánto cuesta el pollo?',
    'Mostrar mi carrito de compras',
    'Encontrar colmado más cercano',
    'Hacer un pedido de leche',
    '¿Cómo está mi reputación?',
  ];

  const voiceTips = [
    'Habla claro y despacio',
    'Usa un lugar silencioso',
    'Acércate al micrófono',
    'Usa frases cortas y directas',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('voice.title')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Section */}
            <div className="text-center">
              {!isSupported ? (
                <div className="flex flex-col items-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                  <p className="text-red-600 dark:text-red-400">
                    {t('voice.notSupported')}
                  </p>
                </div>
              ) : !isMicrophoneAllowed ? (
                <div className="flex flex-col items-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-yellow-500" />
                  <p className="text-yellow-600 dark:text-yellow-400">
                    {t('voice.microphoneBlocked')}
                  </p>
                  <button
                    onClick={handleStartListening}
                    className="btn-primary text-sm"
                  >
                    Permitir Micrófono
                  </button>
                </div>
              ) : errorMessage ? (
                <div className="flex flex-col items-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    {errorMessage}
                  </p>
                  <button
                    onClick={() => {
                      clearError();
                      handleStartListening();
                    }}
                    className="btn-primary text-sm flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t('voice.tryAgain')}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {/* Voice Button */}
                  <button
                    onClick={isListening ? stopListening : handleStartListening}
                    disabled={isProcessing}
                    className={cn(
                      'h-20 w-20 rounded-full flex items-center justify-center transition-all duration-200',
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : isProcessing
                        ? 'bg-yellow-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                  >
                    <Mic className="h-8 w-8" />
                  </button>

                  {/* Status Text */}
                  <div className="text-center">
                    {isListening ? (
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        {t('voice.listening')}
                      </p>
                    ) : isProcessing ? (
                      <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                        {t('voice.processing')}
                      </p>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('voice.startListening')}
                      </p>
                    )}

                    {/* Current Transcript */}
                    {currentTranscript && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          "{currentTranscript}"
                        </p>
                        {confidence > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Confianza: {Math.round(confidence * 100)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Mode Toggle */}
            {isSupported && isMicrophoneAllowed && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {isVoiceModeEnabled ? (
                    <Volume2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Respuestas por voz
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Escucha las respuestas
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleVoiceMode}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    isVoiceModeEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      isVoiceModeEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            )}

            {/* Last Command & Response */}
            {(lastCommand || lastResponse) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Último comando
                </h4>
                
                {lastCommand && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Comando:</strong> "{lastCommand.command}"
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Confianza: {Math.round(lastCommand.confidence * 100)}%
                    </p>
                  </div>
                )}

                {lastResponse && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Respuesta:</strong> {lastResponse.text}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Examples */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('voice.examples.title')}
              </h4>
              <div className="space-y-2">
                {voiceExamples.map((example, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-700 dark:text-gray-300"
                  >
                    "{example}"
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('voice.tips.title')}
              </h4>
              <div className="space-y-2">
                {voiceTips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="btn-ghost"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};