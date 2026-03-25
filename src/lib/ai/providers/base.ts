/**
 * Base AI Provider Interface
 * Unified interface for all AI model providers in WhatsOpí
 */

import { 
  AIRequest, 
  AIResponse, 
  AIContext, 
  ModelProvider,
  Language,
  AICapability,
  TokenUsage,
  AIError
} from '../types';

export abstract class BaseAIProvider {
  protected config: Record<string, any>;
  protected provider: ModelProvider;
  protected capabilities: AICapability[];

  constructor(config: Record<string, any>) {
    this.config = config;
    this.provider = this.getProviderType();
    this.capabilities = this.getSupportedCapabilities();
  }

  // Abstract methods that must be implemented by each provider
  abstract getProviderType(): ModelProvider;
  abstract getSupportedCapabilities(): AICapability[];
  abstract isHealthy(): Promise<boolean>;
  
  // Core processing methods
  abstract processText(
    input: string, 
    context: AIContext, 
    options?: Record<string, any>
  ): Promise<AIResponse>;

  abstract processVoice(
    audioBuffer: Buffer, 
    context: AIContext, 
    options?: Record<string, any>
  ): Promise<AIResponse>;

  abstract generateText(
    prompt: string, 
    context: AIContext, 
    options?: Record<string, any>
  ): Promise<AIResponse>;

  abstract analyzeText(
    text: string,
    context: AIContext,
    analysisType: 'sentiment' | 'entities' | 'intent' | 'all',
    options?: Record<string, any>
  ): Promise<AIResponse>;

  // Common provider methods
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      this.validateRequest(request);
      
      // Check if provider supports the requested capability
      if (!this.capabilities.includes(request.capability)) {
        throw new Error(`Provider ${this.provider} does not support capability: ${request.capability}`);
      }

      // Route to appropriate processing method
      let response: AIResponse;
      
      switch (request.capability) {
        case 'nlp':
          response = await this.handleNLPRequest(request);
          break;
        case 'voice':
          response = await this.handleVoiceRequest(request);
          break;
        case 'chat':
          response = await this.handleChatRequest(request);
          break;
        case 'recommendation':
          response = await this.handleRecommendationRequest(request);
          break;
        case 'credit':
          response = await this.handleCreditRequest(request);
          break;
        case 'fraud':
          response = await this.handleFraudRequest(request);
          break;
        case 'moderation':
          response = await this.handleModerationRequest(request);
          break;
        case 'analytics':
          response = await this.handleAnalyticsRequest(request);
          break;
        default:
          throw new Error(`Unsupported capability: ${request.capability}`);
      }

      // Add processing metadata
      response.processingTime = Date.now() - startTime;
      response.provider = this.provider;
      
      return response;
      
    } catch (error) {
      return this.createErrorResponse(request, error as Error, Date.now() - startTime);
    }
  }

  // Request handlers (can be overridden by specific providers)
  protected async handleNLPRequest(request: AIRequest): Promise<AIResponse> {
    if (typeof request.input === 'string') {
      return await this.processText(request.input, request.context!, request.options);
    }
    throw new Error('NLP requests require text input');
  }

  protected async handleVoiceRequest(request: AIRequest): Promise<AIResponse> {
    if (Buffer.isBuffer(request.input)) {
      return await this.processVoice(request.input, request.context!, request.options);
    }
    throw new Error('Voice requests require audio buffer input');
  }

  protected async handleChatRequest(request: AIRequest): Promise<AIResponse> {
    if (typeof request.input === 'string') {
      return await this.generateText(request.input, request.context!, request.options);
    }
    throw new Error('Chat requests require text input');
  }

  protected async handleRecommendationRequest(request: AIRequest): Promise<AIResponse> {
    throw new Error(`${this.provider} provider does not support recommendations`);
  }

  protected async handleCreditRequest(request: AIRequest): Promise<AIResponse> {
    throw new Error(`${this.provider} provider does not support credit scoring`);
  }

  protected async handleFraudRequest(request: AIRequest): Promise<AIResponse> {
    throw new Error(`${this.provider} provider does not support fraud detection`);
  }

  protected async handleModerationRequest(request: AIRequest): Promise<AIResponse> {
    if (typeof request.input === 'string') {
      return await this.analyzeText(request.input, request.context!, 'all', request.options);
    }
    throw new Error('Moderation requests require text input');
  }

  protected async handleAnalyticsRequest(request: AIRequest): Promise<AIResponse> {
    throw new Error(`${this.provider} provider does not support analytics`);
  }

  // Utility methods
  protected validateRequest(request: AIRequest): void {
    if (!request.id) {
      throw new Error('Request ID is required');
    }
    
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }
    
    if (!request.capability) {
      throw new Error('Capability is required');
    }
    
    if (!request.input) {
      throw new Error('Input is required');
    }
  }

  protected createSuccessResponse(
    request: AIRequest,
    data: any,
    processingTime: number,
    tokens?: TokenUsage,
    confidence?: number
  ): AIResponse {
    return {
      id: this.generateResponseId(),
      requestId: request.id,
      success: true,
      data,
      confidence,
      processingTime,
      provider: this.provider,
      model: this.getModelName(),
      tokens,
      metadata: {
        language: request.context?.language,
        capability: request.capability,
        timestamp: new Date()
      }
    };
  }

  protected createErrorResponse(
    request: AIRequest,
    error: Error,
    processingTime: number
  ): AIResponse {
    const aiError: AIError = {
      code: 'PROVIDER_ERROR',
      message: error.message,
      details: {
        provider: this.provider,
        capability: request.capability,
        stack: error.stack
      }
    };

    return {
      id: this.generateResponseId(),
      requestId: request.id,
      success: false,
      error: aiError,
      processingTime,
      provider: this.provider,
      model: this.getModelName(),
      metadata: {
        errorTimestamp: new Date(),
        requestCapability: request.capability
      }
    };
  }

  protected generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  protected getModelName(): string {
    return this.config.model || 'unknown';
  }

  // Dominican cultural context helpers
  protected isDominicanContext(context: AIContext): boolean {
    return context.language === 'es-DO' || 
           context.culturalContext?.region !== undefined ||
           context.location?.country === 'DO';
  }

  protected isHaitianContext(context: AIContext): boolean {
    return context.language === 'ht' ||
           context.culturalContext?.region !== undefined;
  }

  protected adaptForDominicanCulture(text: string, context: AIContext): string {
    if (!this.isDominicanContext(context)) return text;
    
    // Apply Dominican cultural adaptations
    const adaptations: Record<string, string> = {
      'hola': 'klk',
      'cómo estás': 'cómo tú tá',
      'qué tal': 'que lo que',
      'amigo': 'tiguer',
      'dinero': 'cuarto',
      'poco': 'chin'
    };

    let adapted = text;
    for (const [formal, informal] of Object.entries(adaptations)) {
      adapted = adapted.replace(new RegExp(formal, 'gi'), informal);
    }

    return adapted;
  }

  protected formatDominicanCurrency(amount: number): string {
    return `RD$${amount.toLocaleString('es-DO')}`;
  }

  protected getInformalEconomyContext(context: AIContext): Record<string, any> {
    return {
      colmadoFriendly: true,
      cashPreferred: true,
      communityTrust: true,
      familyOriented: true,
      localBusiness: true
    };
  }

  // Provider-specific configuration
  public updateConfig(newConfig: Partial<Record<string, any>>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): Record<string, any> {
    return { ...this.config };
  }

  public getCapabilities(): AICapability[] {
    return [...this.capabilities];
  }

  public supportsCapability(capability: AICapability): boolean {
    return this.capabilities.includes(capability);
  }

  public getProvider(): ModelProvider {
    return this.provider;
  }

  // Health check and monitoring
  public async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      const healthy = await this.isHealthy();
      const responseTime = Date.now() - startTime;
      
      return {
        provider: this.provider,
        healthy,
        responseTime,
        capabilities: this.capabilities,
        config: {
          model: this.getModelName(),
          endpoint: this.config.endpoint || 'default'
        },
        lastCheck: new Date(),
        errors: []
      };
      
    } catch (error) {
      return {
        provider: this.provider,
        healthy: false,
        responseTime: Date.now() - startTime,
        capabilities: this.capabilities,
        config: {
          model: this.getModelName(),
          endpoint: this.config.endpoint || 'default'
        },
        lastCheck: new Date(),
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}

export interface ProviderHealthStatus {
  provider: ModelProvider;
  healthy: boolean;
  responseTime: number;
  capabilities: AICapability[];
  config: Record<string, any>;
  lastCheck: Date;
  errors: string[];
}