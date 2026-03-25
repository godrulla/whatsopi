import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './tests/setup/cultural-setup.ts'],
    include: ['tests/cultural/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.github',
      'tests/e2e',
      'tests/performance',
      'tests/security'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/cultural',
      include: [
        'src/lib/ai/nlp/**/*',
        'src/lib/i18n/**/*',
        'src/stores/languageStore.ts',
        'src/contexts/LanguageContext.tsx'
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/mocks/**',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 20000, // Cultural analysis can be slower
    hookTimeout: 15000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4
      }
    },
    // Cultural testing environment
    env: {
      NODE_ENV: 'cultural-test',
      VITE_DEFAULT_LANGUAGE: 'es-DO',
      VITE_DEFAULT_COUNTRY: 'DO',
      VITE_CULTURAL_CONTEXT: 'dominican',
      VITE_SECONDARY_LANGUAGE: 'ht',
      VITE_CULTURAL_SENSITIVITY_LEVEL: 'high',
      // Dominican business context
      VITE_BUSINESS_TYPES: 'colmado,supermercado,farmacia,ferreteria,panaderia',
      VITE_REGIONAL_DIALECTS: 'santiago,santo_domingo,sur,cibao',
      // AI model configurations for cultural testing
      VITE_AI_CULTURAL_FILTER: 'enabled',
      VITE_AI_DOMINICAN_CONTEXT: 'enabled',
      VITE_AI_HAITIAN_SUPPORT: 'enabled'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/test': path.resolve(__dirname, './src/test'),
    }
  }
})