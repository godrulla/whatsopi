import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './tests/setup/security-setup.ts'],
    include: ['tests/security/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.github',
      'tests/e2e',
      'tests/performance'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/security',
      include: [
        'src/lib/security/**/*',
        'src/api/src/middleware/security.ts',
        'src/api/src/routes/auth.ts',
        'src/services/AuthService.ts'
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
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2 // Limit for security tests
      }
    },
    // Security-specific test environment
    env: {
      NODE_ENV: 'security-test',
      VITE_API_URL: 'http://localhost:3001/api',
      VITE_ENVIRONMENT: 'security-test',
      VITE_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
      VITE_JWT_SECRET: 'test-jwt-secret-for-security-testing',
      // Dominican Law 172-13 compliance testing
      VITE_COMPLIANCE_MODE: 'law-172-13',
      VITE_DATA_RETENTION_DAYS: '2555', // 7 years in days
      VITE_AUDIT_LOG_LEVEL: 'comprehensive'
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
      '@/api': path.resolve(__dirname, './src/api'),
    }
  }
})