/**
 * ALIA AI Provider for WhatsOpí
 * Specialized provider for Dominican Spanish and Haitian Creole language models
 */

import axios, { AxiosInstance } from 'axios';
import { BaseAIProvider } from './base';
import { 
  AIResponse, 
  AIContext, 
  ModelProvider,
  AICapability,
  TokenUsage,
  Language,
  TextAnalysis,
  VoiceProcessingResult,
  DominicanVoiceFeatures
} from '../types';

export class ALIAProvider extends BaseAIProvider {
  private client: AxiosInstance;
  private models: ALIAModelConfig;

  constructor(config: ALIAProviderConfig) {
    super(config);
    
    this.client = axios.create({
      baseURL: config.endpoint,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client': 'whatsopi-v1.0'
      },
      timeout: config.timeout || 30000
    });

    this.models = {
      'dominican-spanish-v1': {
        name: 'dominican-spanish-v1',
        language: 'es-DO',
        capabilities: ['nlp', 'voice', 'chat'],
        specializations: ['dominican_dialect', 'informal_economy', 'caribbean_culture']
      },
      'haitian-creole-v1': {
        name: 'haitian-creole-v1',
        language: 'ht',
        capabilities: ['nlp', 'voice', 'chat'],
        specializations: ['haitian_creole', 'code_switching', 'caribbean_culture']
      }
    };
  }

  getProviderType(): ModelProvider {
    return 'alia';
  }

  getSupportedCapabilities(): AICapability[] {
    return ['nlp', 'voice', 'chat'];
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      console.error('ALIA health check failed:', error);
      return false;
    }
  }

  async processText(
    input: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const modelName = this.selectModel(context.language);
      const model = this.models[modelName];

      const requestPayload = {
        model: modelName,
        input: {
          text: input,
          language: context.language,
          context: this.buildContextForALIA(context)
        },
        task: 'text_analysis',
        parameters: {
          include_sentiment: true,
          include_entities: true,
          include_intent: true,
          include_cultural_markers: true,
          dominican_specialization: context.language === 'es-DO',
          haitian_specialization: context.language === 'ht'
        }
      };

      const response = await this.client.post('/v1/analyze', requestPayload);
      const result = response.data;

      const analysisResult = this.transformALIAResponse(result, context);
      const tokens: TokenUsage = {
        prompt: result.usage?.input_tokens || this.estimateTokens(input),
        completion: result.usage?.output_tokens || 100,
        total: result.usage?.total_tokens || this.estimateTokens(input) + 100,
        cost: this.calculateCost(result.usage?.total_tokens || 200)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'nlp', input },
        analysisResult,
        0,
        tokens,
        result.confidence || 0.85
      );
    } catch (error) {
      throw new Error(`ALIA text processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processVoice(
    audioBuffer: Buffer,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const modelName = this.selectModel(context.language);
      
      // Convert audio buffer to base64 for API transmission
      const audioData = audioBuffer.toString('base64');
      
      const requestPayload = {
        model: modelName,
        input: {
          audio: audioData,
          format: options?.audioFormat || 'wav',
          language: context.language,
          context: this.buildContextForALIA(context)
        },
        task: 'speech_to_text',
        parameters: {
          accent_adaptation: true,
          dominican_pronunciation: context.language === 'es-DO',
          haitian_pronunciation: context.language === 'ht',
          include_confidence: true,
          include_speaker_info: true,
          noise_reduction: true
        }
      };

      const response = await this.client.post('/v1/speech', requestPayload);
      const result = response.data;

      const voiceResult = this.transformVoiceResponse(result, context);
      const tokens: TokenUsage = {
        prompt: this.estimateAudioTokens(audioBuffer.length),
        completion: this.estimateTokens(result.transcript || ''),
        total: this.estimateAudioTokens(audioBuffer.length) + this.estimateTokens(result.transcript || ''),
        cost: this.calculateVoiceCost(audioBuffer.length, result.transcript?.length || 0)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'voice', input: audioBuffer },
        voiceResult,
        0,
        tokens,
        result.confidence || 0.80
      );
    } catch (error) {
      throw new Error(`ALIA voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateText(
    prompt: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const modelName = this.selectModel(context.language);
      
      const requestPayload = {
        model: modelName,
        input: {
          prompt: this.enhancePromptWithCulturalContext(prompt, context),
          language: context.language,
          context: this.buildContextForALIA(context)
        },
        task: 'text_generation',
        parameters: {
          max_tokens: options?.maxTokens || 512,
          temperature: options?.temperature || 0.7,
          cultural_adaptation: true,
          formality_level: this.determineFormalityLevel(context),
          local_expressions: context.language === 'es-DO',
          code_switching: context.language === 'ht'
        }
      };

      const response = await this.client.post('/v1/generate', requestPayload);
      const result = response.data;

      const chatResponse = this.formatChatResponseFromALIA(result, context);
      const tokens: TokenUsage = {
        prompt: result.usage?.input_tokens || this.estimateTokens(prompt),
        completion: result.usage?.output_tokens || this.estimateTokens(result.text || ''),
        total: result.usage?.total_tokens || this.estimateTokens(prompt + result.text || ''),
        cost: this.calculateCost(result.usage?.total_tokens || 400)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'chat', input: prompt },
        chatResponse,
        0,
        tokens,
        result.confidence || 0.82
      );
    } catch (error) {
      throw new Error(`ALIA text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeText(
    text: string,
    context: AIContext,
    analysisType: 'sentiment' | 'entities' | 'intent' | 'all',
    options?: Record<string, any>
  ): Promise<AIResponse> {
    return await this.processText(text, context, { ...options, analysisType });
  }

  private selectModel(language: Language): keyof ALIAModelConfig {
    switch (language) {
      case 'es-DO':
      case 'es':
        return 'dominican-spanish-v1';
      case 'ht':
        return 'haitian-creole-v1';
      default:
        return 'dominican-spanish-v1'; // Default fallback
    }
  }

  private buildContextForALIA(context: AIContext): Record<string, any> {
    return {
      location: context.location ? {
        country: context.location.country || 'DO',
        city: context.location.city,
        region: this.determineRegion(context.location)
      } : null,
      user_profile: context.userProfile ? {
        age_range: this.categorizeAge(context.userProfile.demographics.age),
        education: context.userProfile.demographics.education,
        occupation: context.userProfile.demographics.occupation
      } : null,
      business_context: context.businessContext ? {
        type: context.businessContext.businessType,
        colmado_context: context.businessContext.colmadoId !== undefined
      } : null,
      cultural_context: {
        region: context.culturalContext?.region || 'capital',
        urbanicity: context.culturalContext?.urbanicity || 'urban',
        economic_level: context.culturalContext?.economicLevel || 'informal',
        language_preference: context.language
      },
      conversation_context: {
        session_length: context.conversationHistory?.length || 0,
        topics: this.extractTopics(context.conversationHistory || []),
        formality: this.determineFormalityLevel(context)
      }
    };
  }

  private transformALIAResponse(result: any, context: AIContext): TextAnalysis {
    return {
      language: {
        language: result.detected_language || context.language,
        confidence: result.language_confidence || 0.9,
        dialect: result.dialect_info?.type,
        alternativeLanguages: result.alternative_languages || []
      },
      sentiment: {
        score: result.sentiment?.score || 0,
        label: result.sentiment?.label || 'neutral',
        confidence: result.sentiment?.confidence || 0.5,
        emotions: result.emotions || []
      },
      entities: (result.entities || []).map((entity: any) => ({
        text: entity.text,
        type: entity.type,
        startIndex: entity.start,
        endIndex: entity.end,
        confidence: entity.confidence,
        metadata: {
          cultural_context: entity.cultural_context,
          local_variant: entity.local_variant
        }
      })),
      intent: {
        intent: result.intent?.name || 'unknown',
        confidence: result.intent?.confidence || 0.1,
        parameters: result.intent?.parameters || {},
        alternativeIntents: result.alternative_intents || []
      },
      keywords: result.keywords || [],
      readability: {
        score: result.readability?.score || 0.7,
        level: result.readability?.level || 'moderate',
        grade: result.readability?.grade || 8
      },
      culturalMarkers: (result.cultural_markers || []).map((marker: any) => ({
        type: marker.type,
        text: marker.text,
        meaning: marker.meaning,
        confidence: marker.confidence
      }))
    };
  }

  private transformVoiceResponse(result: any, context: AIContext): VoiceProcessingResult {
    return {
      transcript: result.transcript || '',
      language: {
        language: result.detected_language || context.language,
        confidence: result.language_confidence || 0.8
      },
      confidence: result.overall_confidence || 0.8,
      speakerInfo: result.speaker_info ? {
        gender: result.speaker_info.gender,
        ageRange: result.speaker_info.age_range,
        accent: {
          type: result.speaker_info.accent?.type || 'dominican',
          confidence: result.speaker_info.accent?.confidence || 0.8,
          characteristics: result.speaker_info.accent?.characteristics || []
        }
      } : undefined,
      audioQuality: {
        sampleRate: result.audio_info?.sample_rate || 16000,
        bitRate: result.audio_info?.bit_rate || 128,
        duration: result.audio_info?.duration || 0,
        noiseLevel: result.audio_info?.noise_level || 0.1,
        clarity: result.audio_info?.clarity || 0.8,
        quality: result.audio_info?.quality || 'good'
      },
      voiceFeatures: {
        pitch: result.voice_features?.pitch || 150,
        speed: result.voice_features?.speed || 1.0,
        volume: result.voice_features?.volume || 0.8,
        emphasis: result.voice_features?.emphasis || [],
        pauses: result.voice_features?.pauses || [],
        intonation: result.voice_features?.intonation || []
      },
      dominican: this.extractDominicanFeatures(result)
    };
  }

  private extractDominicanFeatures(result: any): DominicanVoiceFeatures {
    const dominicanData = result.dominican_features || {};
    
    return {
      localExpressions: (dominicanData.expressions || []).map((expr: any) => ({
        expression: expr.text,
        standardEquivalent: expr.standard,
        usage: expr.usage || 'common',
        confidence: expr.confidence || 0.8
      })),
      pronunciationVariants: (dominicanData.pronunciation || []).map((variant: any) => ({
        word: variant.word,
        standardPronunciation: variant.standard,
        localPronunciation: variant.local,
        variant: variant.type || 'aspiration'
      })),
      dialectMarkers: (dominicanData.dialect_markers || []).map((marker: any) => ({
        feature: marker.feature,
        type: marker.type || 'phonetic',
        description: marker.description,
        confidence: marker.confidence || 0.8
      })),
      informalityLevel: dominicanData.informality_level || 0.5
    };
  }

  private enhancePromptWithCulturalContext(prompt: string, context: AIContext): string {
    if (context.language === 'es-DO') {
      return `[CONTEXTO: República Dominicana, español dominicano, economía informal, colmados]
[ESTILO: Conversacional, amigable, usando expresiones locales apropiadas]
[INSTRUCCIÓN: Responde de manera natural como un dominicano que conoce la cultura local]

Usuario: ${prompt}`;
    }
    
    if (context.language === 'ht') {
      return `[CONTEXTO: Haití/República Dominicana, creole haitiano, comunidad haitiana]
[ESTILO: Respetuoso, considerando cambio de código español-creole]
[INSTRUCCIÓN: Responde considerando la realidad bicultural]

Usuario: ${prompt}`;
    }

    return prompt;
  }

  private formatChatResponseFromALIA(result: any, context: AIContext): any {
    return {
      message: result.text || '',
      language: context.language,
      intent: result.predicted_intent || 'chat_response',
      actions: result.suggested_actions || [],
      suggestions: result.suggestions || [],
      culturalContext: {
        formality: result.formality_level || 'informal',
        relationshipLevel: 'acquaintance',
        culturalNorms: result.cultural_norms || [],
        localContext: result.local_context || []
      },
      dominican: {
        useLocalExpressions: result.local_expressions_used || false,
        informalityLevel: result.informality_score || 0.5,
        communityContext: true,
        colmadoReferences: result.colmado_references || false
      }
    };
  }

  private determineRegion(location: any): string {
    if (!location?.city) return 'unknown';
    
    const regions = {
      'Santo Domingo': 'capital',
      'Santiago': 'northern',
      'San Pedro de Macorís': 'eastern',
      'La Romana': 'eastern',
      'Puerto Plata': 'northern',
      'Barahona': 'southern'
    };
    
    return regions[location.city as keyof typeof regions] || 'unknown';
  }

  private categorizeAge(age?: number): string {
    if (!age) return 'unknown';
    if (age < 18) return 'minor';
    if (age < 30) return 'young_adult';
    if (age < 50) return 'adult';
    return 'senior';
  }

  private extractTopics(history: any[]): string[] {
    // Simple topic extraction from conversation history
    const topics = new Set<string>();
    
    for (const message of history) {
      const content = message.content?.toLowerCase() || '';
      
      if (content.includes('colmado') || content.includes('negocio')) {
        topics.add('business');
      }
      if (content.includes('dinero') || content.includes('peso') || content.includes('pago')) {
        topics.add('money');
      }
      if (content.includes('producto') || content.includes('comprar')) {
        topics.add('shopping');
      }
    }
    
    return Array.from(topics);
  }

  private determineFormalityLevel(context: AIContext): 'formal' | 'informal' | 'neutral' {
    // Determine formality based on context
    if (context.userProfile?.preferences?.communicationStyle) {
      return context.userProfile.preferences.communicationStyle;
    }
    
    // Default to informal for Dominican context
    if (context.language === 'es-DO') {
      return 'informal';
    }
    
    return 'neutral';
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (4 characters ≈ 1 token for Spanish)
    return Math.ceil(text.length / 4);
  }

  private estimateAudioTokens(audioSize: number): number {
    // Rough estimation for audio processing tokens
    return Math.ceil(audioSize / 1000); // 1 token per KB
  }

  private calculateCost(tokens: number): number {
    // ALIA pricing (hypothetical - adjust based on actual pricing)
    const costPer1K = 0.002; // $0.002 per 1K tokens
    return (tokens / 1000) * costPer1K;
  }

  private calculateVoiceCost(audioSize: number, transcriptLength: number): number {
    // Voice processing cost (hypothetical)
    const audioCostPerMB = 0.01; // $0.01 per MB
    const transcriptCost = this.calculateCost(this.estimateTokens(transcriptLength.toString()));
    
    const audioMB = audioSize / (1024 * 1024);
    return (audioMB * audioCostPerMB) + transcriptCost;
  }
}

export interface ALIAProviderConfig {
  endpoint: string;
  apiKey: string;
  model?: 'dominican-spanish-v1' | 'haitian-creole-v1';
  timeout?: number;
  retries?: number;
}

interface ALIAModelConfig {
  [key: string]: {
    name: string;
    language: Language;
    capabilities: AICapability[];
    specializations: string[];
  };
}