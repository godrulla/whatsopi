import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/lib/i18n';

interface LanguageState {
  currentLanguage: 'es-DO' | 'ht' | 'en';
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLanguage: (language: 'es-DO' | 'ht' | 'en') => Promise<void>;
  detectLanguage: () => Promise<void>;
  clearError: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'es-DO', // Default to Dominican Spanish
      isLoading: false,
      error: null,

      setLanguage: async (language: 'es-DO' | 'ht' | 'en') => {
        set({ isLoading: true, error: null });
        
        try {
          await i18n.changeLanguage(language);
          set({ currentLanguage: language, isLoading: false });
        } catch (error) {
          set({ 
            error: 'Error changing language', 
            isLoading: false 
          });
        }
      },

      detectLanguage: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Try to detect language from browser settings
          const browserLang = navigator.language || navigator.languages[0];
          
          let detectedLang: 'es-DO' | 'ht' | 'en' = 'es-DO'; // Default
          
          if (browserLang.startsWith('es')) {
            detectedLang = 'es-DO'; // Dominican Spanish for Spanish speakers
          } else if (browserLang.startsWith('ht')) {
            detectedLang = 'ht'; // Haitian Creole
          } else if (browserLang.startsWith('en')) {
            detectedLang = 'en'; // English
          }
          
          await get().setLanguage(detectedLang);
        } catch (error) {
          set({ 
            error: 'Error detecting language', 
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'whatsopi-language-storage',
      partialize: (state) => ({ currentLanguage: state.currentLanguage })
    }
  )
);