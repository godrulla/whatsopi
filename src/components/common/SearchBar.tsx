import React, { useState } from 'react';
import { Search, Mic, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../../contexts/VoiceContext';
import { useLanguage } from '../../lib/i18n';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  className,
  onSearch,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const { t } = useLanguage();
  const { startListening, isListening, isSupported } = useVoice();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (onSearch) {
      onSearch(query.trim());
    } else {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  const handleVoiceSearch = async () => {
    try {
      await startListening();
    } catch (error) {
      console.error('Voice search failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div
        className={cn(
          'relative flex items-center',
          'bg-white dark:bg-gray-800',
          'border border-gray-300 dark:border-gray-600',
          'rounded-lg shadow-sm',
          'transition-all duration-200',
          isFocused && 'ring-2 ring-blue-500 border-transparent'
        )}
      >
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || t('products.search')}
          autoFocus={autoFocus}
          className={cn(
            'w-full pl-10 pr-20 py-3',
            'bg-transparent',
            'text-gray-900 dark:text-white',
            'placeholder-gray-500 dark:placeholder-gray-400',
            'focus:outline-none',
            'rounded-lg'
          )}
        />

        {/* Action Buttons */}
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Voice Search Button */}
          {isSupported && (
            <button
              type="button"
              onClick={handleVoiceSearch}
              disabled={isListening}
              className={cn(
                'p-2 rounded-full transition-colors',
                isListening
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                  : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              )}
              aria-label={isListening ? 'Escuchando...' : 'Buscar por voz'}
              title={isListening ? 'Escuchando...' : 'Buscar por voz'}
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Listening Indicator */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span className="text-sm text-red-700 dark:text-red-300">
              {t('voice.listening')}
            </span>
          </div>
        </div>
      )}

      {/* Search Suggestions (when focused and has query) */}
      {isFocused && query && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-2">
            <button
              type="submit"
              className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                Buscar "<span className="font-medium">{query}</span>"
              </span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};