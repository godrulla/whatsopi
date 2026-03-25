/**
 * Claude AI Provider for WhatsOpí
 * Anthropic Claude integration optimized for Dominican Spanish and Caribbean context
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base';
import { 
  AIResponse, 
  AIContext, 
  ModelProvider,
  AICapability,
  TokenUsage,
  Language,
  TextAnalysis,
  SentimentResult,
  Entity,
  IntentResult,
  ChatResponse
} from '../types';

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic;
  private systemPrompts: Record<string, string>;

  constructor(config: ClaudeProviderConfig) {
    super(config);
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000
    });

    this.systemPrompts = this.initializeSystemPrompts();
  }

  getProviderType(): ModelProvider {
    return 'claude';
  }

  getSupportedCapabilities(): AICapability[] {
    return ['nlp', 'chat', 'moderation', 'analytics'];
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are a health check assistant. Respond with "OK".'
      });
      
      return response.content[0]?.type === 'text' && 
             response.content[0].text.trim() === 'OK';
    } catch (error) {
      console.error('Claude health check failed:', error);
      return false;
    }
  }

  async processText(
    input: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.getSystemPrompt('nlp', context);
      const userPrompt = this.createNLPPrompt(input, context, options);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens || 2048,
        temperature: options?.temperature || this.config.temperature || 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const analysisResult = this.parseNLPResponse(content.text);
      const tokens: TokenUsage = {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'nlp', input },
        analysisResult,
        0,
        tokens,
        0.9
      );
    } catch (error) {
      throw new Error(`Claude text processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processVoice(
    audioBuffer: Buffer,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    throw new Error('Claude provider does not support direct voice processing. Use speech-to-text first.');
  }

  async generateText(
    prompt: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.getSystemPrompt('chat', context);
      const enhancedPrompt = this.enhancePromptForDominicanContext(prompt, context);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens || 2048,
        temperature: options?.temperature || this.config.temperature || 0.7,
        system: systemPrompt,
        messages: this.buildConversationHistory(enhancedPrompt, context)
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const chatResponse = this.formatChatResponse(content.text, context);
      const tokens: TokenUsage = {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'chat', input: prompt },
        chatResponse,
        0,
        tokens,
        0.85
      );
    } catch (error) {
      throw new Error(`Claude text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeText(
    text: string,
    context: AIContext,
    analysisType: 'sentiment' | 'entities' | 'intent' | 'all',
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.getSystemPrompt('analysis', context);
      const analysisPrompt = this.createAnalysisPrompt(text, analysisType, context);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || 1024,
        temperature: 0.3, // Lower temperature for analysis
        system: systemPrompt,
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const analysis = this.parseAnalysisResponse(content.text, analysisType);
      const tokens: TokenUsage = {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'moderation', input: text },
        analysis,
        0,
        tokens,
        0.88
      );
    } catch (error) {
      throw new Error(`Claude text analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private initializeSystemPrompts(): Record<string, string> {
    return {
      nlp: `Eres un asistente de procesamiento de lenguaje natural especializado en español dominicano y la economía informal del Caribe. 

Tu función es analizar texto y extraer:
- Sentimiento y emociones
- Entidades (personas, lugares, productos, dinero, fechas)
- Intención del usuario
- Palabras clave relevantes
- Marcadores culturales dominicanos

Contexto Cultural:
- Reconoce expresiones dominicanas como "klk", "tiguer", "que lo que", "chin"
- Comprende referencias a colmados, productos locales, y economía informal
- Adapta respuestas al contexto socioeconómico dominicano
- Considera patrones culturales del Caribe

Responde siempre en formato JSON estructurado.`,

      chat: `Eres WhatsOpí AI, un asistente inteligente para el ecosistema de economía informal de República Dominicana.

Tu personalidad:
- Amigable y cercano, usando expresiones dominicanas apropiadas
- Conocedor de la cultura local y productos típicos
- Sensible a las necesidades de la economía informal
- Experto en colmados, pequeños negocios, y comercio local

Funciones principales:
- Ayudar con compras y pedidos
- Asistir con pagos y transferencias
- Proporcionar información sobre productos y colmados
- Apoyar a dueños de pequeños negocios

Siempre:
- Usa un tono conversacional y familiar pero respetuoso
- Incluye contexto cultural relevante
- Sugiere soluciones prácticas para la economía informal
- Responde en español dominicano cuando sea apropiado`,

      analysis: `Eres un experto en análisis de texto especializado en español dominicano y contexto caribeño.

Analiza el texto proporcionado considerando:
- Variaciones dialectales del español dominicano
- Expresiones culturales locales
- Contexto de economía informal
- Patrones de comunicación caribeños
- Sensibilidad cultural apropiada

Proporciona análisis detallado en formato JSON con explicaciones culturalmente contextualizadas.`
    };
  }

  private getSystemPrompt(type: string, context: AIContext): string {
    let basePrompt = this.systemPrompts[type] || this.systemPrompts.chat;
    
    // Add contextual information
    if (context.location?.country === 'DO') {
      basePrompt += '\n\nUbicación: República Dominicana - Adapta respuestas al contexto local.';
    }
    
    if (context.language === 'es-DO') {
      basePrompt += '\n\nIdioma: Español dominicano - Usa expresiones locales apropiadas.';
    }
    
    if (context.businessContext?.colmadoId) {
      basePrompt += '\n\nContexto de negocio: Colmado - Enfócate en comercio local y economía informal.';
    }

    return basePrompt;
  }

  private createNLPPrompt(input: string, context: AIContext, options?: Record<string, any>): string {
    const analysis = options?.analysisType || 'complete';
    
    return `Analiza el siguiente texto en español dominicano:

TEXTO: "${input}"

CONTEXTO:
- Idioma: ${context.language}
- Ubicación: ${context.location?.city || 'No especificada'}
- Negocio: ${context.businessContext?.businessType || 'General'}

ANÁLISIS REQUERIDO: ${analysis}

Responde en formato JSON con:
{
  "sentiment": {
    "score": number (-1 a 1),
    "label": "positive|negative|neutral",
    "confidence": number (0 a 1),
    "emotions": [{"emotion": string, "score": number}]
  },
  "entities": [
    {
      "text": string,
      "type": "person|location|product|money|date|organization",
      "confidence": number,
      "cultural_context": string
    }
  ],
  "intent": {
    "intent": string,
    "confidence": number,
    "parameters": {}
  },
  "keywords": [{"text": string, "relevance": number}],
  "cultural_markers": [
    {
      "type": "dominican_expression|caribbean_slang|informal_spanish",
      "text": string,
      "meaning": string,
      "confidence": number
    }
  ],
  "language_analysis": {
    "formality": "formal|informal|very_informal",
    "dialect": "dominican|standard_spanish|mixed",
    "confidence": number
  }
}`;
  }

  private createAnalysisPrompt(text: string, analysisType: string, context: AIContext): string {
    const prompts = {
      sentiment: 'Analiza el sentimiento y emociones del texto',
      entities: 'Extrae entidades nombradas del texto',
      intent: 'Determina la intención del usuario',
      all: 'Realiza un análisis completo del texto'
    };

    const description = prompts[analysisType as keyof typeof prompts] || prompts.all;

    return `${description}:

TEXTO: "${text}"

CONTEXTO CULTURAL:
- Español dominicano
- Economía informal
- Contexto de colmado/comercio local

Responde en formato JSON estructurado.`;
  }

  private enhancePromptForDominicanContext(prompt: string, context: AIContext): string {
    if (!this.isDominicanContext(context)) return prompt;

    // Add cultural context markers
    const enhancements = [
      'Contexto: República Dominicana, economía informal, colmados',
      'Estilo: Conversacional dominicano, amigable pero profesional',
      'Productos: Enfócate en productos locales y marcas dominicanas cuando sea relevante'
    ];

    return `${enhancements.join('\n')}\n\nConsulta del usuario: ${prompt}`;
  }

  private buildConversationHistory(prompt: string, context: AIContext): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-10); // Last 10 messages
      
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  private parseNLPResponse(response: string): TextAnalysis {
    try {
      const parsed = JSON.parse(response);
      
      return {
        language: {
          language: 'es-DO' as Language,
          confidence: parsed.language_analysis?.confidence || 0.9
        },
        sentiment: parsed.sentiment || {
          score: 0,
          label: 'neutral',
          confidence: 0.5
        },
        entities: parsed.entities || [],
        intent: parsed.intent || {
          intent: 'unknown',
          confidence: 0.1
        },
        keywords: parsed.keywords || [],
        readability: {
          score: 0.7,
          level: 'moderate',
          grade: 8
        },
        culturalMarkers: parsed.cultural_markers || []
      };
    } catch (error) {
      // Fallback parsing if JSON fails
      return this.createFallbackAnalysis(response);
    }
  }

  private parseAnalysisResponse(response: string, analysisType: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      // Return structured fallback based on analysis type
      return this.createFallbackAnalysisResult(response, analysisType);
    }
  }

  private formatChatResponse(text: string, context: AIContext): ChatResponse {
    const isInformal = this.isDominicanContext(context);
    
    return {
      message: isInformal ? this.adaptForDominicanCulture(text, context) : text,
      language: context.language,
      intent: 'chat_response',
      suggestions: this.generateSuggestions(text, context),
      culturalContext: {
        formality: isInformal ? 'informal' : 'neutral',
        relationshipLevel: 'acquaintance',
        culturalNorms: ['respectful', 'helpful', 'community_oriented'],
        localContext: this.extractLocalContext(text, context)
      },
      dominican: {
        useLocalExpressions: isInformal,
        informalityLevel: isInformal ? 0.7 : 0.3,
        communityContext: true,
        colmadoReferences: this.hasColmadoReferences(text)
      }
    };
  }

  private generateSuggestions(text: string, context: AIContext): string[] {
    const suggestions = [
      '¿Necesitas ayuda con algo más?',
      '¿Te puedo ayudar a encontrar algún producto?',
      '¿Quieres ver colmados cercanos?'
    ];

    if (this.isDominicanContext(context)) {
      return [
        '¿En qué más te puedo ayudar?',
        '¿Buscas algo específico en el colmado?',
        '¿Necesitas información sobre precios?'
      ];
    }

    return suggestions;
  }

  private extractLocalContext(text: string, context: AIContext): string[] {
    const localMarkers = [];
    
    if (text.includes('colmado') || text.includes('negocio')) {
      localMarkers.push('Contexto de comercio local');
    }
    
    if (text.includes('peso') || text.includes('RD$')) {
      localMarkers.push('Moneda dominicana');
    }
    
    if (context.location?.city) {
      localMarkers.push(`Ubicación: ${context.location.city}`);
    }

    return localMarkers;
  }

  private hasColmadoReferences(text: string): boolean {
    const colmadoTerms = ['colmado', 'negocio', 'tienda', 'comercio', 'venta'];
    return colmadoTerms.some(term => text.toLowerCase().includes(term));
  }

  private createFallbackAnalysis(text: string): TextAnalysis {
    return {
      language: {
        language: 'es-DO',
        confidence: 0.5
      },
      sentiment: {
        score: 0,
        label: 'neutral',
        confidence: 0.3
      },
      entities: [],
      intent: {
        intent: 'unknown',
        confidence: 0.1
      },
      keywords: [],
      readability: {
        score: 0.5,
        level: 'moderate',
        grade: 8
      },
      culturalMarkers: []
    };
  }

  private createFallbackAnalysisResult(text: string, analysisType: string): any {
    const fallbacks = {
      sentiment: { score: 0, label: 'neutral', confidence: 0.3 },
      entities: [],
      intent: { intent: 'unknown', confidence: 0.1 },
      all: this.createFallbackAnalysis(text)
    };

    return fallbacks[analysisType as keyof typeof fallbacks] || fallbacks.all;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude pricing (approximate, update with current rates)
    const inputCostPer1K = 0.003; // $0.003 per 1K input tokens
    const outputCostPer1K = 0.015; // $0.015 per 1K output tokens

    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;

    return inputCost + outputCost;
  }
}

export interface ClaudeProviderConfig {
  apiKey: string;
  model: 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus';
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
}