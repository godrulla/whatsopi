import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { useVoice } from '../../contexts/VoiceContext';
import { useLanguage } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import { VoiceModal } from './VoiceModal';

export const VoiceButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  
  const {
    isListening,
    isProcessing,
    isSupported,
    isVoiceModeEnabled,
    toggleVoiceMode,
    startListening,
    errorMessage,
  } = useVoice();
  
  const { t } = useLanguage();

  if (!isSupported) {
    return null; // Don't show button if voice is not supported
  }

  const handleQuickVoice = async () => {
    if (isListening) return;
    
    try {
      await startListening();
    } catch (error) {
      console.error('Quick voice command failed:', error);
      setShowModal(true); // Show modal for more options
    }
  };

  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    if (errorMessage) return 'error';
    return 'idle';
  };

  const buttonState = getButtonState();

  const buttonStyles = {
    idle: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg',
    listening: 'bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse',
    processing: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg',
    error: 'bg-red-600 hover:bg-red-700 text-white shadow-lg',
  };

  const getButtonIcon = () => {
    switch (buttonState) {
      case 'listening':
        return <MicOff className="h-6 w-6" />;
      case 'processing':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        );
      case 'error':
        return <Mic className="h-6 w-6" />;
      default:
        return <Mic className="h-6 w-6" />;
    }
  };

  const getTooltipText = () => {
    switch (buttonState) {
      case 'listening':
        return t('voice.listening');
      case 'processing':
        return t('voice.processing');
      case 'error':
        return 'Error - Toca para opciones';
      default:
        return t('voice.startListening');
    }
  };

  return (
    <>
      {/* Main Voice Button */}
      <div className="relative">
        <button
          onClick={buttonState === 'error' ? () => setShowModal(true) : handleQuickVoice}
          disabled={isProcessing}
          className={cn(
            'relative h-14 w-14 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-4 focus:ring-blue-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
            buttonStyles[buttonState]
          )}
          title={getTooltipText()}
          aria-label={getTooltipText()}
        >
          {getButtonIcon()}
          
          {/* Voice Mode Indicator */}
          {isVoiceModeEnabled && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
              <Volume2 className="h-2 w-2 text-white" />
            </div>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute -bottom-2 -right-2 h-8 w-8 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
          title="Configuración de voz"
          aria-label="Configuración de voz"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Listening Wave Animation */}
        {isListening && (
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
            <div className="absolute inset-2 rounded-full bg-red-300 animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-4 rounded-full bg-red-200 animate-ping opacity-25" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>

      {/* Voice Modal */}
      <VoiceModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};