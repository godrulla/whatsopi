/**
 * OpenAI Provider for WhatsOpí
 * OpenAI GPT integration with Dominican cultural adaptation
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { 
  AIResponse, 
  AIContext, 
  ModelProvider,
  AICapability,
  TokenUsage,
  TextAnalysis,
  ChatResponse
} from '../types';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;
  private systemPrompts: Record<string, string>;

  constructor(config: OpenAIProviderConfig) {
    super(config);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    });

    this.systemPrompts = this.initializeSystemPrompts();
  }

  getProviderType(): ModelProvider {
    return 'openai';
  }

  getSupportedCapabilities(): AICapability[] {
    return ['nlp', 'chat', 'moderation', 'analytics'];
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return response.choices.length > 0 && response.choices[0].message.content !== null;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
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

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const analysisResult = this.parseNLPResponse(content);
      const tokens: TokenUsage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'nlp', input },
        analysisResult,
        0,
        tokens,
        0.88
      );
    } catch (error) {
      throw new Error(`OpenAI text processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processVoice(
    audioBuffer: Buffer,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      // Use OpenAI Whisper for speech-to-text
      const transcription = await this.client.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: this.mapLanguageForWhisper(context.language),
        response_format: 'verbose_json',
        temperature: 0.2
      });

      // Process the transcription with cultural context
      const enhancedTranscript = this.enhanceTranscriptWithDominicanContext(
        transcription.text,
        context
      );

      const voiceResult = {
        transcript: enhancedTranscript,
        language: {
          language: context.language,
          confidence: 0.85
        },
        confidence: 0.85,
        audioQuality: {
          duration: transcription.duration || 0,
          quality: 'good' as const,
          sampleRate: 16000,
          bitRate: 128,
          noiseLevel: 0.1,
          clarity: 0.8
        },
        voiceFeatures: {
          pitch: 150,
          speed: 1.0,
          volume: 0.8,
          emphasis: [],
          pauses: [],
          intonation: []
        },
        dominican: {
          localExpressions: this.extractDominicanExpressions(enhancedTranscript),
          pronunciationVariants: [],
          dialectMarkers: [],
          informalityLevel: this.calculateInformalityLevel(enhancedTranscript)
        }
      };

      const tokens: TokenUsage = {
        prompt: this.estimateAudioTokens(audioBuffer.length),
        completion: this.estimateTokens(transcription.text),
        total: this.estimateAudioTokens(audioBuffer.length) + this.estimateTokens(transcription.text),
        cost: this.calculateWhisperCost(transcription.duration || 0)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'voice', input: audioBuffer },
        voiceResult,
        0,
        tokens,
        0.85
      );
    } catch (error) {
      throw new Error(`OpenAI voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateText(
    prompt: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.getSystemPrompt('chat', context);
      const enhancedPrompt = this.enhancePromptForDominicanContext(prompt, context);

      const messages = this.buildConversationHistory(enhancedPrompt, context);
      messages.unshift({ role: 'system', content: systemPrompt });

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const chatResponse = this.formatChatResponse(content, context);
      const tokens: TokenUsage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'chat', input: prompt },
        chatResponse,
        0,
        tokens,
        0.85
      );
    } catch (error) {
      throw new Error(`OpenAI text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeText(
    text: string,
    context: AIContext,
    analysisType: 'sentiment' | 'entities' | 'intent' | 'all',
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.getSystemPrompt('moderation', context);
      const analysisPrompt = this.createAnalysisPrompt(text, analysisType, context);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const analysis = this.parseAnalysisResponse(content, analysisType);
      const tokens: TokenUsage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'moderation', input: text },
        analysis,
        0,
        tokens,
        0.87
      );
    } catch (error) {
      throw new Error(`OpenAI text analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private initializeSystemPrompts(): Record<string, string> {
    return {
      nlp: `Eres un especialista en análisis de lenguaje natural para el español dominicano y el contexto caribeño. Tu función es analizar texto y proporcionar información estructurada sobre:

- Análisis de sentimiento con contexto cultural
- Extracción de entidades con reconocimiento de términos locales
- Detección de intenciones con comprensión de la economía informal
- Identificación de marcadores culturales dominicanos
- Análisis de formalidad y registro lingüístico

Contexto especial:
- Reconoces expresiones dominicanas como "klk", "tiguer", "que lo que"
- Comprendes referencias a colmados, economía informal, y cultura local
- Identificas términos de productos y servicios típicos dominicanos
- Adaptas el análisis al contexto socioeconómico caribeño

Responde SIEMPRE en formato JSON válido.`,

      chat: `Eres WhatsOpí AI, un asistente conversacional especializado en la economía informal de República Dominicana.

Tu personalidad:
- Amigable y conversacional, usando un español dominicano apropiado
- Conocedor de la cultura local, productos típicos, y dinámicas de colmados
- Sensible a las necesidades de pequeños comerciantes y comunidades informales
- Profesional pero cercano, adaptándote al nivel de formalidad del usuario

Contexto de trabajo:
- Ayudas con comercio local, colmados, y pequeños negocios
- Comprendes el sistema económico informal dominicano
- Conoces productos, precios, y dinámicas comerciales locales
- Apoyas tanto a comerciantes como a consumidores

Estilo de comunicación:
- Usa expresiones dominicanas cuando sea apropiado pero mantén claridad
- Adapta el nivel de formalidad al contexto
- Proporciona respuestas prácticas y orientadas a la acción
- Incluye contexto cultural relevante en tus respuestas`,

      moderation: `Eres un especialista en análisis de contenido para el contexto dominicano y caribeño.

Tu función es analizar texto para:
- Detectar sentimientos y emociones con sensibilidad cultural
- Identificar entidades relevantes al contexto local
- Determinar intenciones del usuario considerando el contexto informal
- Evaluar la seguridad y apropiedad del contenido
- Reconocer marcadores culturales y dialectales

Consideraciones especiales:
- El español dominicano tiene expresiones y modismos únicos
- La economía informal tiene terminología específica
- El contexto cultural influye en la interpretación del sentimiento
- Las referencias locales requieren conocimiento cultural

Proporciona análisis estructurado en formato JSON.`
    };
  }

  private getSystemPrompt(type: string, context: AIContext): string {
    let basePrompt = this.systemPrompts[type] || this.systemPrompts.chat;
    
    // Add contextual adaptations
    if (context.location?.country === 'DO' || context.language === 'es-DO') {
      basePrompt += '\n\nContexto específico: República Dominicana - Adapta todas las respuestas al contexto dominicano con sensibilidad cultural.';
    }
    
    if (context.businessContext?.colmadoId) {
      basePrompt += '\n\nContexto comercial: Colmado/Negocio local - Enfócate en comercio informal y pequeños negocios.';
    }

    return basePrompt;
  }

  private createNLPPrompt(input: string, context: AIContext, options?: Record<string, any>): string {
    return `Analiza el siguiente texto en español dominicano:

TEXTO: "${input}"

CONTEXTO:
- Idioma: ${context.language}
- Ubicación: ${context.location?.city || 'República Dominicana'}
- Tipo de negocio: ${context.businessContext?.businessType || 'General'}

Proporciona un análisis completo en formato JSON con la siguiente estructura:
{
  "sentiment": {
    "score": number (-1 a 1),
    "label": "positive|negative|neutral",
    "confidence": number (0 a 1),
    "cultural_context": "descripción del contexto emocional dominicano"
  },
  "entities": [
    {
      "text": "texto de la entidad",
      "type": "person|location|product|money|date|organization|colmado|local_business",
      "confidence": number,
      "local_context": "contexto dominicano si aplica"
    }
  ],
  "intent": {
    "intent": "nombre de la intención",
    "confidence": number,
    "parameters": {},
    "dominican_context": "interpretación en contexto local"
  },
  "cultural_markers": [
    {
      "expression": "expresión encontrada",
      "type": "dominican_slang|caribbean_expression|informal_spanish",
      "meaning": "significado estándar",
      "usage": "common|regional|generational"
    }
  ],
  "formality_level": "very_formal|formal|neutral|informal|very_informal",
  "register": "business|casual|intimate|academic"
}`;
  }

  private createAnalysisPrompt(text: string, analysisType: string, context: AIContext): string {
    const analysisInstructions = {
      sentiment: 'Analiza el sentimiento y emociones del texto considerando el contexto cultural dominicano',
      entities: 'Extrae entidades nombradas incluyendo términos locales dominicanos',
      intent: 'Determina la intención del usuario considerando el contexto de economía informal',
      all: 'Realiza un análisis completo de sentimiento, entidades e intenciones'
    };

    const instruction = analysisInstructions[analysisType as keyof typeof analysisInstructions] || analysisInstructions.all;

    return `${instruction}:

TEXTO A ANALIZAR: "${text}"

CONTEXTO CULTURAL:
- Español dominicano con expresiones locales
- Economía informal y comercio local
- Sensibilidad cultural caribeña

Responde en formato JSON con análisis detallado.`;
  }

  private enhancePromptForDominicanContext(prompt: string, context: AIContext): string {
    if (!this.isDominicanContext(context)) return prompt;

    const contextualPrefix = `Contexto: República Dominicana, economía informal, cultura caribeña.
Estilo: Conversacional dominicano apropiado.
Instrucción: Responde como un asistente que conoce la cultura local dominicana.

Consulta: ${prompt}`;

    return contextualPrefix;
  }

  private buildConversationHistory(prompt: string, context: AIContext): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add recent conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-8); // Last 8 messages
      
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
          language: 'es-DO',
          confidence: 0.9
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
      return this.createFallbackAnalysis();
    }
  }

  private parseAnalysisResponse(response: string, analysisType: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this.createFallbackAnalysisResult(analysisType);
    }
  }

  private formatChatResponse(text: string, context: AIContext): ChatResponse {
    const adaptedText = this.isDominicanContext(context) ? 
      this.adaptForDominicanCulture(text, context) : text;

    return {
      message: adaptedText,
      language: context.language,
      intent: 'chat_response',
      suggestions: this.generateContextualSuggestions(context),
      culturalContext: {
        formality: this.isDominicanContext(context) ? 'informal' : 'neutral',
        relationshipLevel: 'acquaintance',
        culturalNorms: ['respectful', 'helpful', 'community_focused'],
        localContext: this.extractLocalContextFromResponse(text, context)
      },
      dominican: {
        useLocalExpressions: this.isDominicanContext(context),
        informalityLevel: this.isDominicanContext(context) ? 0.7 : 0.3,
        communityContext: true,
        colmadoReferences: this.hasColmadoReferences(text)
      }
    };
  }

  private mapLanguageForWhisper(language: string): string {
    const languageMap: Record<string, string> = {
      'es-DO': 'es',
      'es': 'es',
      'ht': 'fr', // Closest supported language for Haitian Creole
      'en': 'en'
    };
    
    return languageMap[language] || 'es';
  }

  private enhanceTranscriptWithDominicanContext(transcript: string, context: AIContext): string {
    if (!this.isDominicanContext(context)) return transcript;

    // Apply common Dominican pronunciation corrections
    const corrections: Record<string, string> = {
      'que tal': 'qué tal',
      'como esta': 'cómo está',
      'donde esta': 'dónde está',
      'cuanto cuesta': 'cuánto cuesta'
    };

    let enhanced = transcript;
    for (const [spoken, written] of Object.entries(corrections)) {
      enhanced = enhanced.replace(new RegExp(spoken, 'gi'), written);
    }

    return enhanced;
  }

  private extractDominicanExpressions(text: string): any[] {
    const expressions = [
      { expression: 'klk', standardEquivalent: 'qué tal', usage: 'common' },
      { expression: 'tiguer', standardEquivalent: 'amigo', usage: 'common' },
      { expression: 'que lo que', standardEquivalent: 'qué tal', usage: 'common' },
      { expression: 'chin', standardEquivalent: 'poco', usage: 'regional' }
    ];

    return expressions.filter(expr => 
      text.toLowerCase().includes(expr.expression)
    ).map(expr => ({ ...expr, confidence: 0.8 }));
  }

  private calculateInformalityLevel(text: string): number {
    const informalMarkers = ['klk', 'tiguer', 'que lo que', 'chin', 'brutal', 'jevi'];
    const foundMarkers = informalMarkers.filter(marker => 
      text.toLowerCase().includes(marker)
    );
    
    return Math.min(foundMarkers.length * 0.2, 1.0);
  }

  private generateContextualSuggestions(context: AIContext): string[] {
    const baseSuggestions = [
      '¿En qué más puedo ayudarte?',
      '¿Necesitas información sobre algún producto?',
      '¿Te puedo ayudar con otra consulta?'
    ];

    if (this.isDominicanContext(context)) {
      return [
        '¿Qué más necesitas?',
        '¿Buscas algo del colmado?',
        '¿Te ayudo con otra cosa?'
      ];
    }

    return baseSuggestions;
  }

  private extractLocalContextFromResponse(text: string, context: AIContext): string[] {
    const contextMarkers = [];
    
    if (text.includes('colmado')) contextMarkers.push('Comercio local');
    if (text.includes('peso') || text.includes('RD$')) contextMarkers.push('Moneda dominicana');
    if (context.location?.city) contextMarkers.push(`Ubicación: ${context.location.city}`);
    
    return contextMarkers;
  }

  private hasColmadoReferences(text: string): boolean {
    const colmadoTerms = ['colmado', 'negocio', 'tienda', 'comercio'];
    return colmadoTerms.some(term => text.toLowerCase().includes(term));
  }

  private createFallbackAnalysis(): TextAnalysis {
    return {
      language: { language: 'es-DO', confidence: 0.5 },
      sentiment: { score: 0, label: 'neutral', confidence: 0.3 },
      entities: [],
      intent: { intent: 'unknown', confidence: 0.1 },
      keywords: [],
      readability: { score: 0.5, level: 'moderate', grade: 8 },
      culturalMarkers: []
    };
  }

  private createFallbackAnalysisResult(analysisType: string): any {
    const fallbacks = {
      sentiment: { score: 0, label: 'neutral', confidence: 0.3 },
      entities: [],
      intent: { intent: 'unknown', confidence: 0.1 },
      all: this.createFallbackAnalysis()
    };

    return fallbacks[analysisType as keyof typeof fallbacks] || fallbacks.all;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateAudioTokens(audioSize: number): number {
    return Math.ceil(audioSize / 1000);
  }

  private calculateCost(promptTokens: number, completionTokens: number): number {
    // OpenAI GPT-4 pricing (update with current rates)
    const promptCostPer1K = this.config.model.includes('gpt-4') ? 0.03 : 0.001;
    const completionCostPer1K = this.config.model.includes('gpt-4') ? 0.06 : 0.002;

    const promptCost = (promptTokens / 1000) * promptCostPer1K;
    const completionCost = (completionTokens / 1000) * completionCostPer1K;

    return promptCost + completionCost;
  }

  private calculateWhisperCost(durationSeconds: number): number {
    // Whisper pricing: $0.006 per minute
    const minutes = durationSeconds / 60;
    return minutes * 0.006;
  }
}

export interface OpenAIProviderConfig {
  apiKey: string;
  model: 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}