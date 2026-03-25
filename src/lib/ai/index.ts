/**
 * WhatsOpí AI/ML Integration Library
 * Comprehensive AI system for Dominican Republic's informal economy
 * 
 * Features:
 * - Multi-model AI integration (Claude, ALIA, Custom models)
 * - Dominican Spanish and Haitian Creole NLP
 * - Voice recognition with Caribbean accent optimization
 * - Credit scoring for informal workers
 * - Product and colmado recommendations
 * - Business intelligence and analytics
 * - Fraud detection and security
 * - Content moderation and safety
 */

export * from './providers';
export * from './nlp';
export * from './voice';
export * from './chat';
export * from './recommendations';
export * from './credit';
export * from './fraud';
export * from './moderation';
export * from './analytics';
export * from './training';
export * from './utils';
export * from './types';

// Core AI configuration
export interface AIConfig {
  providers: {
    claude: {
      apiKey: string;
      model: 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus';
      maxTokens: number;
      temperature: number;
    };
    alia: {
      endpoint: string;
      apiKey: string;
      model: 'dominican-spanish-v1' | 'haitian-creole-v1';
    };
    openai: {
      apiKey: string;
      model: 'gpt-4-turbo' | 'gpt-3.5-turbo';
      maxTokens: number;
    };
    custom: {
      modelPath: string;
      configPath: string;
    };
  };
  features: {
    voiceRecognition: boolean;
    textToSpeech: boolean;
    chatSupport: boolean;
    recommendations: boolean;
    creditScoring: boolean;
    fraudDetection: boolean;
    contentModeration: boolean;
    businessAnalytics: boolean;
  };
  languages: {
    primary: 'es-DO';
    supported: ('es-DO' | 'ht' | 'en')[];
    fallback: 'es';
  };
  security: {
    promptInjectionProtection: boolean;
    biasDetection: boolean;
    privacyMode: boolean;
    auditLogging: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheTTL: number;
    rateLimiting: boolean;
    maxConcurrentRequests: number;
  };
  dominican: {
    culturalContext: boolean;
    localExpressions: boolean;
    informalEconomyOptimization: boolean;
    colmadoIntegration: boolean;
  };
}

// Default configuration optimized for Dominican Republic
export const defaultAIConfig: AIConfig = {
  providers: {
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-sonnet',
      maxTokens: 4096,
      temperature: 0.7
    },
    alia: {
      endpoint: process.env.ALIA_ENDPOINT || 'https://api.alia.ai/v1',
      apiKey: process.env.ALIA_API_KEY || '',
      model: 'dominican-spanish-v1'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
      maxTokens: 4096
    },
    custom: {
      modelPath: '/models/dominican-nlp',
      configPath: '/config/model-config.json'
    }
  },
  features: {
    voiceRecognition: true,
    textToSpeech: true,
    chatSupport: true,
    recommendations: true,
    creditScoring: true,
    fraudDetection: true,
    contentModeration: true,
    businessAnalytics: true
  },
  languages: {
    primary: 'es-DO',
    supported: ['es-DO', 'ht', 'en'],
    fallback: 'es'
  },
  security: {
    promptInjectionProtection: true,
    biasDetection: true,
    privacyMode: true,
    auditLogging: true
  },
  performance: {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    rateLimiting: true,
    maxConcurrentRequests: 100
  },
  dominican: {
    culturalContext: true,
    localExpressions: true,
    informalEconomyOptimization: true,
    colmadoIntegration: true
  }
};

// Global AI instance
let aiConfig: AIConfig = defaultAIConfig;

export const configureAI = (config: Partial<AIConfig>): void => {
  aiConfig = { ...aiConfig, ...config };
};

export const getAIConfig = (): AIConfig => aiConfig;