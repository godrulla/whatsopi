/**
 * AI Provider Manager for WhatsOpí
 * Intelligent routing and management of multiple AI providers
 */

import { BaseAIProvider, ProviderHealthStatus } from './base';
import { ClaudeProvider } from './claude';
import { ALIAProvider } from './alia';
import { OpenAIProvider } from './openai';
import { CustomModelProvider } from './custom';
import { 
  AIRequest, 
  AIResponse, 
  AIContext, 
  ModelProvider,
  AICapability,
  Language,
  AIError
} from '../types';

export class AIProviderManager {
  private providers: Map<ModelProvider, BaseAIProvider> = new Map();
  private providerHealth: Map<ModelProvider, ProviderHealthStatus> = new Map();
  private routingStrategy: RoutingStrategy;
  private fallbackChain: ModelProvider[];
  private requestCount: Map<ModelProvider, number> = new Map();
  private lastHealthCheck: Date = new Date();

  constructor(config: ProviderManagerConfig) {
    this.routingStrategy = config.routingStrategy || 'capability_based';
    this.fallbackChain = config.fallbackChain || ['claude', 'openai', 'alia', 'custom'];
    
    this.initializeProviders(config.providers);
  }

  private initializeProviders(providersConfig: ProvidersConfig): void {
    // Initialize Claude provider
    if (providersConfig.claude) {
      this.providers.set('claude', new ClaudeProvider(providersConfig.claude));
      this.requestCount.set('claude', 0);
    }

    // Initialize ALIA provider
    if (providersConfig.alia) {
      this.providers.set('alia', new ALIAProvider(providersConfig.alia));
      this.requestCount.set('alia', 0);
    }

    // Initialize OpenAI provider
    if (providersConfig.openai) {
      this.providers.set('openai', new OpenAIProvider(providersConfig.openai));
      this.requestCount.set('openai', 0);
    }

    // Initialize Custom provider
    if (providersConfig.custom) {
      this.providers.set('custom', new CustomModelProvider(providersConfig.custom));
      this.requestCount.set('custom', 0);
    }
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Ensure health checks are up to date
      await this.ensureHealthChecks();
      
      // Select optimal provider
      const provider = await this.selectProvider(request);
      
      if (!provider) {
        throw new Error('No healthy providers available for this request');
      }

      // Process request
      const response = await provider.processRequest(request);
      
      // Update request count
      const providerType = provider.getProvider();
      this.requestCount.set(providerType, (this.requestCount.get(providerType) || 0) + 1);
      
      // Add manager metadata
      response.metadata = {
        ...response.metadata,
        selectedProvider: providerType,
        routingStrategy: this.routingStrategy,
        attemptCount: 1,
        totalProcessingTime: Date.now() - startTime
      };

      return response;
      
    } catch (error) {
      // Try fallback providers
      return await this.tryFallbacks(request, error as Error, startTime);
    }
  }

  private async selectProvider(request: AIRequest): Promise<BaseAIProvider | null> {
    switch (this.routingStrategy) {
      case 'capability_based':
        return await this.selectByCapability(request);
      case 'language_based':
        return await this.selectByLanguage(request);
      case 'cost_optimized':
        return await this.selectByCost(request);
      case 'performance_based':
        return await this.selectByPerformance(request);
      case 'round_robin':
        return await this.selectRoundRobin(request);
      default:
        return await this.selectByCapability(request);
    }
  }

  private async selectByCapability(request: AIRequest): Promise<BaseAIProvider | null> {
    // Priority order based on capability and Dominican context
    const priorityOrder = this.getPriorityOrder(request);
    
    for (const providerType of priorityOrder) {
      const provider = this.providers.get(providerType);
      const health = this.providerHealth.get(providerType);
      
      if (provider && health?.healthy && provider.supportsCapability(request.capability)) {
        return provider;
      }
    }
    
    return null;
  }

  private async selectByLanguage(request: AIRequest): Promise<BaseAIProvider | null> {
    const language = request.context?.language || 'es-DO';
    
    // Language-specific provider preferences
    const languagePreferences: Record<Language, ModelProvider[]> = {
      'es-DO': ['alia', 'claude', 'openai', 'custom'],
      'ht': ['alia', 'custom', 'claude', 'openai'],
      'en': ['openai', 'claude', 'custom', 'alia'],
      'es': ['claude', 'alia', 'openai', 'custom']
    };
    
    const preferences = languagePreferences[language] || this.fallbackChain;
    
    for (const providerType of preferences) {
      const provider = this.providers.get(providerType);
      const health = this.providerHealth.get(providerType);
      
      if (provider && health?.healthy && provider.supportsCapability(request.capability)) {
        return provider;
      }
    }
    
    return null;
  }

  private async selectByCost(request: AIRequest): Promise<BaseAIProvider | null> {
    // Cost-based selection (custom < alia < openai < claude for most tasks)
    const costOrder: ModelProvider[] = ['custom', 'alia', 'openai', 'claude'];
    
    for (const providerType of costOrder) {
      const provider = this.providers.get(providerType);
      const health = this.providerHealth.get(providerType);
      
      if (provider && health?.healthy && provider.supportsCapability(request.capability)) {
        return provider;
      }
    }
    
    return null;
  }

  private async selectByPerformance(request: AIRequest): Promise<BaseAIProvider | null> {
    // Select based on recent performance metrics
    const healthyProviders = Array.from(this.providers.entries())
      .filter(([type, provider]) => {
        const health = this.providerHealth.get(type);
        return health?.healthy && provider.supportsCapability(request.capability);
      })
      .sort(([, a], [, b]) => {
        const healthA = this.providerHealth.get(a.getProvider())!;
        const healthB = this.providerHealth.get(b.getProvider())!;
        return healthA.responseTime - healthB.responseTime;
      });
    
    return healthyProviders.length > 0 ? healthyProviders[0][1] : null;
  }

  private async selectRoundRobin(request: AIRequest): Promise<BaseAIProvider | null> {
    // Simple round-robin based on request counts
    const eligibleProviders = Array.from(this.providers.entries())
      .filter(([type, provider]) => {
        const health = this.providerHealth.get(type);
        return health?.healthy && provider.supportsCapability(request.capability);
      })
      .sort(([typeA], [typeB]) => {
        const countA = this.requestCount.get(typeA) || 0;
        const countB = this.requestCount.get(typeB) || 0;
        return countA - countB;
      });
    
    return eligibleProviders.length > 0 ? eligibleProviders[0][1] : null;
  }

  private getPriorityOrder(request: AIRequest): ModelProvider[] {
    const language = request.context?.language || 'es-DO';
    const capability = request.capability;
    
    // Dominican Spanish context - prefer ALIA for NLP and voice
    if (language === 'es-DO') {
      switch (capability) {
        case 'nlp':
        case 'voice':
          return ['alia', 'custom', 'claude', 'openai'];
        case 'chat':
          return ['claude', 'alia', 'openai', 'custom'];
        case 'analytics':
          return ['claude', 'openai', 'custom', 'alia'];
        default:
          return ['alia', 'claude', 'openai', 'custom'];
      }
    }
    
    // Haitian Creole context - prefer ALIA and custom models
    if (language === 'ht') {
      return ['alia', 'custom', 'claude', 'openai'];
    }
    
    // English context - prefer OpenAI
    if (language === 'en') {
      return ['openai', 'claude', 'alia', 'custom'];
    }
    
    // Default order
    return this.fallbackChain;
  }

  private async tryFallbacks(
    request: AIRequest, 
    originalError: Error, 
    startTime: number
  ): Promise<AIResponse> {
    const errors: string[] = [originalError.message];
    let attemptCount = 1;
    
    for (const providerType of this.fallbackChain) {
      try {
        const provider = this.providers.get(providerType);
        const health = this.providerHealth.get(providerType);
        
        if (!provider || !health?.healthy || !provider.supportsCapability(request.capability)) {
          continue;
        }
        
        attemptCount++;
        const response = await provider.processRequest(request);
        
        // Update request count
        this.requestCount.set(providerType, (this.requestCount.get(providerType) || 0) + 1);
        
        // Add fallback metadata
        response.metadata = {
          ...response.metadata,
          selectedProvider: providerType,
          routingStrategy: 'fallback',
          attemptCount,
          totalProcessingTime: Date.now() - startTime,
          fallbackReason: originalError.message,
          errors
        };

        return response;
        
      } catch (fallbackError) {
        errors.push(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }
    
    // All providers failed
    const finalError: AIError = {
      code: 'ALL_PROVIDERS_FAILED',
      message: 'All AI providers failed to process the request',
      details: {
        attemptCount,
        errors,
        capability: request.capability,
        language: request.context?.language
      }
    };

    return {
      id: `error_${Date.now()}`,
      requestId: request.id,
      success: false,
      error: finalError,
      processingTime: Date.now() - startTime,
      provider: 'none' as ModelProvider,
      model: 'none',
      metadata: {
        allProvidersFailed: true,
        attemptCount,
        errors
      }
    };
  }

  private async ensureHealthChecks(): Promise<void> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastHealthCheck.getTime();
    
    // Check health every 5 minutes
    if (timeSinceLastCheck < 5 * 60 * 1000) {
      return;
    }
    
    await this.runHealthChecks();
    this.lastHealthCheck = now;
  }

  async runHealthChecks(): Promise<Map<ModelProvider, ProviderHealthStatus>> {
    const healthPromises = Array.from(this.providers.entries()).map(
      async ([type, provider]): Promise<[ModelProvider, ProviderHealthStatus]> => {
        try {
          const health = await provider.healthCheck();
          return [type, health];
        } catch (error) {
          return [type, {
            provider: type,
            healthy: false,
            responseTime: 0,
            capabilities: provider.getCapabilities(),
            config: {},
            lastCheck: new Date(),
            errors: [error instanceof Error ? error.message : String(error)]
          }];
        }
      }
    );
    
    const results = await Promise.all(healthPromises);
    
    for (const [type, health] of results) {
      this.providerHealth.set(type, health);
    }
    
    return this.providerHealth;
  }

  // Provider management methods
  addProvider(type: ModelProvider, provider: BaseAIProvider): void {
    this.providers.set(type, provider);
    this.requestCount.set(type, 0);
  }

  removeProvider(type: ModelProvider): void {
    this.providers.delete(type);
    this.providerHealth.delete(type);
    this.requestCount.delete(type);
  }

  getProvider(type: ModelProvider): BaseAIProvider | undefined {
    return this.providers.get(type);
  }

  getAvailableProviders(): ModelProvider[] {
    return Array.from(this.providers.keys());
  }

  getHealthyProviders(): ModelProvider[] {
    return Array.from(this.providerHealth.entries())
      .filter(([, health]) => health.healthy)
      .map(([type]) => type);
  }

  // Statistics and monitoring
  getProviderStats(): ProviderStats {
    const stats: ProviderStats = {
      totalRequests: 0,
      providerBreakdown: {},
      healthStatus: {},
      averageResponseTimes: {}
    };
    
    for (const [type, count] of this.requestCount.entries()) {
      stats.totalRequests += count;
      stats.providerBreakdown[type] = count;
      
      const health = this.providerHealth.get(type);
      stats.healthStatus[type] = health?.healthy || false;
      stats.averageResponseTimes[type] = health?.responseTime || 0;
    }
    
    return stats;
  }

  // Configuration methods
  updateRoutingStrategy(strategy: RoutingStrategy): void {
    this.routingStrategy = strategy;
  }

  updateFallbackChain(chain: ModelProvider[]): void {
    this.fallbackChain = chain;
  }

  // Utility methods for Dominican context
  isOptimalForDominicanContext(provider: ModelProvider, language: Language): boolean {
    if (language === 'es-DO') {
      return provider === 'alia' || provider === 'custom';
    }
    if (language === 'ht') {
      return provider === 'alia' || provider === 'custom';
    }
    return true;
  }

  getRecommendedProvider(capability: AICapability, language: Language): ModelProvider | null {
    const priorityOrder = this.getPriorityOrder({
      id: 'test',
      sessionId: 'test',
      capability,
      input: 'test',
      context: { sessionId: 'test', language, timestamp: new Date() }
    });
    
    for (const providerType of priorityOrder) {
      const provider = this.providers.get(providerType);
      const health = this.providerHealth.get(providerType);
      
      if (provider && health?.healthy && provider.supportsCapability(capability)) {
        return providerType;
      }
    }
    
    return null;
  }
}

// Types and interfaces
export type RoutingStrategy = 
  | 'capability_based' 
  | 'language_based' 
  | 'cost_optimized' 
  | 'performance_based' 
  | 'round_robin';

export interface ProviderManagerConfig {
  providers: ProvidersConfig;
  routingStrategy?: RoutingStrategy;
  fallbackChain?: ModelProvider[];
  healthCheckInterval?: number;
}

export interface ProvidersConfig {
  claude?: any;
  alia?: any;
  openai?: any;
  custom?: any;
}

export interface ProviderStats {
  totalRequests: number;
  providerBreakdown: Record<ModelProvider, number>;
  healthStatus: Record<ModelProvider, boolean>;
  averageResponseTimes: Record<ModelProvider, number>;
}