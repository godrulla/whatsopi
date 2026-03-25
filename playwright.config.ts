import { defineConfig, devices } from '@playwright/test'

// Dominican-specific device configurations
const dominicanDevices = {
  'Dominican Low-End Android': {
    ...devices['Galaxy S5'],
    userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J330F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'Dominican Mid-Range Android': {
    ...devices['Pixel 5'],
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
  },
  'Dominican Desktop': {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36',
    viewport: { width: 1366, height: 768 }, // Common resolution in DR
    deviceScaleFactor: 1,
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Global test configuration
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Dominican-specific defaults
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    geolocation: { latitude: 18.4861, longitude: -69.9312 }, // Santo Domingo
    permissions: ['geolocation', 'microphone', 'camera', 'notifications'],
    
    // Network simulation for Dominican conditions
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--lang=es-DO'
      ]
    }
  },

  projects: [
    // Desktop browsers
    {
      name: 'Dominican Desktop Chrome',
      use: { 
        ...dominicanDevices['Dominican Desktop'],
        channel: 'chrome'
      },
    },
    {
      name: 'Dominican Desktop Firefox',
      use: { 
        ...dominicanDevices['Dominican Desktop'],
        browserName: 'firefox'
      },
    },

    // Mobile devices - Dominican market focus
    {
      name: 'Dominican Low-End Android',
      use: {
        ...dominicanDevices['Dominican Low-End Android'],
        // Simulate 2G network conditions
        contextOptions: {
          offline: false,
          // Custom network throttling will be set per test
        }
      },
    },
    {
      name: 'Dominican Mid-Range Android',
      use: {
        ...dominicanDevices['Dominican Mid-Range Android'],
        // Simulate 3G network conditions
      },
    },

    // Accessibility testing
    {
      name: 'High Contrast Mode',
      use: {
        ...dominicanDevices['Dominican Desktop'],
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'User-Preference': 'high-contrast'
        }
      },
    },
    {
      name: 'Screen Reader Simulation',
      use: {
        ...dominicanDevices['Dominican Desktop'],
        extraHTTPHeaders: {
          'User-Agent-Accessibility': 'NVDA/JAWS'
        }
      },
    },

    // Network condition testing
    {
      name: '2G Network Dominican',
      use: {
        ...dominicanDevices['Dominican Low-End Android'],
        launchOptions: {
          args: [
            '--force-device-scale-factor=2',
            '--simulate-slow-connection'
          ]
        }
      },
      testMatch: '**/performance/**/*.spec.ts'
    },

    // Voice testing specific
    {
      name: 'Voice Interface Testing',
      use: {
        ...dominicanDevices['Dominican Mid-Range Android'],
        permissions: ['microphone', 'geolocation'],
        extraHTTPHeaders: {
          'Accept-Language': 'es-DO,es;q=0.9,ht;q=0.8,en;q=0.7'
        }
      },
      testMatch: '**/voice/**/*.spec.ts'
    },

    // Cultural testing
    {
      name: 'Dominican Spanish Context',
      use: {
        ...dominicanDevices['Dominican Mid-Range Android'],
        locale: 'es-DO',
        extraHTTPHeaders: {
          'Accept-Language': 'es-DO,es;q=0.9'
        }
      },
      testMatch: '**/cultural/**/*.spec.ts'
    },
    {
      name: 'Haitian Creole Context',
      use: {
        ...dominicanDevices['Dominican Low-End Android'],
        locale: 'ht',
        extraHTTPHeaders: {
          'Accept-Language': 'ht,es-DO;q=0.8,fr;q=0.7'
        }
      },
      testMatch: '**/cultural/**/*.spec.ts'
    },
  ],

  // Test result reporting
  reporter: [
    ['html', { 
      outputFolder: 'test-results/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    // Custom Dominican compliance reporter
    ['./tests/reporters/dominican-compliance-reporter.ts']
  ],

  // Output directories
  outputDir: 'test-results/playwright-artifacts',

  // Global setup and teardown
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  // Web server configuration for testing
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3001/api',
      VITE_ENVIRONMENT: 'test',
      VITE_DEFAULT_LANGUAGE: 'es-DO',
      VITE_DEFAULT_CURRENCY: 'DOP',
      VITE_DEFAULT_COUNTRY: 'DO'
    }
  },
})