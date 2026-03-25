/**
 * Intent Classifier for WhatsOpí
 * Multi-language intent recognition for Dominican commerce and communication
 */

import { Language, IntentResult, AIContext } from '../types';

export class IntentClassifier {
  private dominicanIntents: Map<string, IntentPattern[]>;
  private haitianIntents: Map<string, IntentPattern[]>;
  private spanishIntents: Map<string, IntentPattern[]>;
  private englishIntents: Map<string, IntentPattern[]>;

  constructor() {
    this.initializeIntentPatterns();
  }

  async classifyIntent(text: string, language: Language, context: AIContext): Promise<IntentResult> {
    const cleanText = text.toLowerCase().trim();
    const intents = this.getIntentsForLanguage(language);
    
    const intentScores: IntentScore[] = [];

    // Calculate scores for each intent
    for (const [intentName, patterns] of intents.entries()) {
      const score = this.calculateIntentScore(cleanText, patterns, language, context);
      if (score.confidence > 0.1) {
        intentScores.push({
          intent: intentName,
          confidence: score.confidence,
          parameters: score.parameters
        });
      }
    }

    // Sort by confidence
    intentScores.sort((a, b) => b.confidence - a.confidence);

    if (intentScores.length === 0) {
      return {
        intent: 'unknown',
        confidence: 0.1,
        parameters: {}
      };
    }

    const primaryIntent = intentScores[0];
    const alternativeIntents = intentScores.slice(1, 4).map(score => ({
      intent: score.intent,
      confidence: score.confidence
    }));

    return {
      intent: primaryIntent.intent,
      confidence: primaryIntent.confidence,
      parameters: primaryIntent.parameters,
      alternativeIntents
    };
  }

  private getIntentsForLanguage(language: Language): Map<string, IntentPattern[]> {
    switch (language) {
      case 'es-DO':
        return this.dominicanIntents;
      case 'ht':
        return this.haitianIntents;
      case 'es':
        return this.spanishIntents;
      case 'en':
        return this.englishIntents;
      default:
        return this.spanishIntents;
    }
  }

  private calculateIntentScore(
    text: string, 
    patterns: IntentPattern[], 
    language: Language, 
    context: AIContext
  ): IntentScore {
    let maxConfidence = 0;
    let bestParameters: Record<string, any> = {};

    for (const pattern of patterns) {
      const match = this.matchPattern(text, pattern);
      if (match.matches) {
        let confidence = pattern.baseConfidence;
        
        // Apply context boosts
        confidence = this.applyContextualBoosts(confidence, pattern, context);
        
        // Apply language-specific boosts
        if (language === 'es-DO' && pattern.dominicanBoost) {
          confidence *= pattern.dominicanBoost;
        }
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestParameters = { ...match.parameters, ...pattern.defaultParameters };
        }
      }
    }

    return {
      intent: '',
      confidence: Math.min(maxConfidence, 1.0),
      parameters: bestParameters
    };
  }

  private matchPattern(text: string, pattern: IntentPattern): PatternMatch {
    // Keyword matching
    if (pattern.keywords && pattern.keywords.length > 0) {
      const keywordMatches = pattern.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      const keywordScore = keywordMatches.length / pattern.keywords.length;
      
      if (keywordScore >= (pattern.keywordThreshold || 0.3)) {
        return {
          matches: true,
          confidence: keywordScore,
          parameters: this.extractParametersFromKeywords(text, keywordMatches)
        };
      }
    }

    // Regex pattern matching
    if (pattern.regexPatterns) {
      for (const regex of pattern.regexPatterns) {
        const match = text.match(regex);
        if (match) {
          return {
            matches: true,
            confidence: 0.8,
            parameters: this.extractParametersFromRegex(match)
          };
        }
      }
    }

    return {
      matches: false,
      confidence: 0,
      parameters: {}
    };
  }

  private extractParametersFromKeywords(text: string, matchedKeywords: string[]): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract common parameters based on context
    const moneyPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:peso[s]?|cuarto[s]?|dólar[es]?|\$|RD\$)/gi;
    const moneyMatch = text.match(moneyPattern);
    if (moneyMatch) {
      parameters.amount = moneyMatch[0];
    }

    const timePattern = /(?:mañana|tarde|noche|hoy|ayer|ahora|pronto|después)/gi;
    const timeMatch = text.match(timePattern);
    if (timeMatch) {
      parameters.timeReference = timeMatch[0];
    }

    const locationPattern = /(?:aquí|ahí|allá|cerca|lejos|colmado|tienda|casa)/gi;
    const locationMatch = text.match(locationPattern);
    if (locationMatch) {
      parameters.location = locationMatch[0];
    }

    return parameters;
  }

  private extractParametersFromRegex(match: RegExpMatchArray): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract named groups if available
    if (match.groups) {
      Object.assign(parameters, match.groups);
    }

    return parameters;
  }

  private applyContextualBoosts(
    confidence: number, 
    pattern: IntentPattern, 
    context: AIContext
  ): number {
    let boosted = confidence;

    // Business context boosts
    if (context.businessContext?.colmadoId && pattern.businessRelevant) {
      boosted *= 1.2;
    }

    // Time-based boosts
    const hour = new Date().getHours();
    if (pattern.timeBoosts) {
      if (pattern.timeBoosts.morning && hour >= 6 && hour < 12) {
        boosted *= 1.1;
      }
      if (pattern.timeBoosts.afternoon && hour >= 12 && hour < 18) {
        boosted *= 1.1;
      }
      if (pattern.timeBoosts.evening && hour >= 18 && hour < 24) {
        boosted *= 1.1;
      }
    }

    // Location boosts
    if (context.location?.country === 'DO' && pattern.dominicanContext) {
      boosted *= 1.15;
    }

    return boosted;
  }

  private initializeIntentPatterns(): void {
    // Dominican Spanish intents
    this.dominicanIntents = new Map([
      ['greeting', [
        {
          keywords: ['klk', 'que lo que', 'hola', 'buenas', 'como tu ta', 'que tal'],
          baseConfidence: 0.9,
          dominicanBoost: 1.2,
          dominicanContext: true,
          defaultParameters: { formality: 'informal' }
        }
      ]],
      
      ['search_product', [
        {
          keywords: ['buscar', 'encontrar', 'busco', 'necesito', 'quiero', 'donde', 'hay'],
          regexPatterns: [
            /(?:busco|necesito|quiero|donde\s+(?:hay|está|encontrar))\s+(.+)/gi,
            /¿?(?:dónde|donde)\s+(?:puedo\s+)?(?:encontrar|conseguir|comprar)\s+(.+)/gi
          ],
          baseConfidence: 0.8,
          businessRelevant: true,
          dominicanContext: true,
          defaultParameters: { action: 'search' }
        }
      ]],
      
      ['price_inquiry', [
        {
          keywords: ['precio', 'cuanto', 'cuesta', 'vale', 'costo', 'sale'],
          regexPatterns: [
            /¿?(?:cuánto|cuanto)\s+(?:cuesta|vale|sale|es|está)\s+(.+)/gi,
            /(?:precio|costo)\s+(?:de|del)\s+(.+)/gi
          ],
          baseConfidence: 0.85,
          businessRelevant: true,
          dominicanContext: true,
          defaultParameters: { inquiry_type: 'price' }
        }
      ]],
      
      ['make_order', [
        {
          keywords: ['pedir', 'ordenar', 'comprar', 'llevar', 'dame', 'quiero'],
          regexPatterns: [
            /(?:quiero|necesito|dame|ponme)\s+(.+)/gi,
            /(?:voy\s+a\s+)?(?:pedir|ordenar|comprar|llevar)\s+(.+)/gi
          ],
          baseConfidence: 0.9,
          businessRelevant: true,
          dominicanContext: true,
          timeBoosts: { morning: true, afternoon: true },
          defaultParameters: { action: 'order' }
        }
      ]],
      
      ['payment_intent', [
        {
          keywords: ['pagar', 'pago', 'cancelar', 'abonar', 'saldar', 'dinero'],
          regexPatterns: [
            /(?:voy\s+a\s+|quiero\s+)?pagar\s*(.+)?/gi,
            /(?:enviar|mandar|transferir)\s+(?:dinero|pago|plata)/gi
          ],
          baseConfidence: 0.9,
          businessRelevant: true,
          defaultParameters: { action: 'payment' }
        }
      ]],
      
      ['balance_inquiry', [
        {
          keywords: ['balance', 'saldo', 'cuanto tengo', 'mi dinero', 'disponible'],
          regexPatterns: [
            /¿?(?:cuánto|cuanto)\s+(?:tengo|me queda|hay)/gi,
            /(?:mi\s+)?(?:balance|saldo)(?:\s+disponible)?/gi
          ],
          baseConfidence: 0.95,
          businessRelevant: true,
          defaultParameters: { inquiry_type: 'balance' }
        }
      ]],
      
      ['help_request', [
        {
          keywords: ['ayuda', 'socorro', 'auxilio', 'no entiendo', 'que hago', 'como'],
          regexPatterns: [
            /(?:no\s+)?(?:entiendo|sé|comprendo)/gi,
            /(?:cómo|como)\s+(?:hago|puedo|funciona)/gi
          ],
          baseConfidence: 0.8,
          defaultParameters: { urgency: 'medium' }
        }
      ]],
      
      ['complaint', [
        {
          keywords: ['problema', 'malo', 'terrible', 'no funciona', 'error', 'fallo'],
          regexPatterns: [
            /(?:tengo\s+un\s+)?problema\s+(?:con|en)\s+(.+)/gi,
            /(?:esto|eso)\s+(?:no\s+)?(?:funciona|sirve|anda)/gi
          ],
          baseConfidence: 0.8,
          defaultParameters: { sentiment: 'negative', urgency: 'high' }
        }
      ]],
      
      ['thanks', [
        {
          keywords: ['gracias', 'graciah', 'thank you', 'agradezco', 'muchas gracias'],
          baseConfidence: 0.9,
          defaultParameters: { sentiment: 'positive' }
        }
      ]],
      
      ['goodbye', [
        {
          keywords: ['adios', 'adiós', 'bye', 'nos vemos', 'hasta luego', 'chao', 'bye bye'],
          baseConfidence: 0.9,
          defaultParameters: { session_end: true }
        }
      ]],
      
      ['location_request', [
        {
          keywords: ['donde', 'dónde', 'ubicado', 'dirección', 'como llegar'],
          regexPatterns: [
            /¿?(?:dónde|donde)\s+(?:está|queda|se encuentra)\s+(.+)/gi,
            /(?:dirección|ubicación)\s+(?:de|del)\s+(.+)/gi
          ],
          baseConfidence: 0.8,
          businessRelevant: true,
          defaultParameters: { inquiry_type: 'location' }
        }
      ]]
    ]);

    // Haitian Creole intents
    this.haitianIntents = new Map([
      ['greeting', [
        {
          keywords: ['bonjou', 'bonswa', 'sak pase', 'nap boule', 'ki jan ou ye'],
          baseConfidence: 0.9,
          defaultParameters: { formality: 'informal', language: 'creole' }
        }
      ]],
      
      ['search_product', [
        {
          keywords: ['mwen ap chèche', 'mwen bezwen', 'ki kote', 'gen'],
          regexPatterns: [
            /(?:mwen\s+ap\s+chèche|mwen\s+bezwen)\s+(.+)/gi,
            /ki\s+kote\s+(.+)\s+ye/gi
          ],
          baseConfidence: 0.8,
          businessRelevant: true,
          defaultParameters: { action: 'search', language: 'creole' }
        }
      ]],
      
      ['price_inquiry', [
        {
          keywords: ['konbyen', 'pri', 'koute', 'vale'],
          regexPatterns: [
            /konbyen\s+(.+)\s+koute/gi,
            /ki\s+pri\s+(.+)/gi
          ],
          baseConfidence: 0.85,
          businessRelevant: true,
          defaultParameters: { inquiry_type: 'price', language: 'creole' }
        }
      ]],
      
      ['thanks', [
        {
          keywords: ['mèsi', 'mèsi anpil', 'mwen remèsye ou'],
          baseConfidence: 0.9,
          defaultParameters: { sentiment: 'positive', language: 'creole' }
        }
      ]],
      
      ['help_request', [
        {
          keywords: ['ede', 'mwen pa konprann', 'ki jan', 'montre mwen'],
          regexPatterns: [
            /mwen\s+pa\s+konprann/gi,
            /ki\s+jan\s+(.+)/gi
          ],
          baseConfidence: 0.8,
          defaultParameters: { urgency: 'medium', language: 'creole' }
        }
      ]]
    ]);

    // Standard Spanish intents (subset)
    this.spanishIntents = new Map([
      ['greeting', [
        {
          keywords: ['hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches'],
          baseConfidence: 0.9,
          defaultParameters: { formality: 'neutral' }
        }
      ]],
      
      ['search_product', [
        {
          keywords: ['buscar', 'encontrar', 'necesito', 'quiero'],
          regexPatterns: [
            /(?:busco|necesito|quiero)\s+(.+)/gi
          ],
          baseConfidence: 0.8,
          businessRelevant: true,
          defaultParameters: { action: 'search' }
        }
      ]],
      
      ['price_inquiry', [
        {
          keywords: ['precio', 'cuánto', 'cuesta', 'vale'],
          regexPatterns: [
            /¿?cuánto\s+cuesta\s+(.+)/gi
          ],
          baseConfidence: 0.85,
          businessRelevant: true,
          defaultParameters: { inquiry_type: 'price' }
        }
      ]]
    ]);

    // English intents (basic)
    this.englishIntents = new Map([
      ['greeting', [
        {
          keywords: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening'],
          baseConfidence: 0.9,
          defaultParameters: { formality: 'neutral' }
        }
      ]],
      
      ['search_product', [
        {
          keywords: ['looking for', 'search for', 'find', 'need', 'want'],
          regexPatterns: [
            /(?:looking for|searching for|need|want)\s+(.+)/gi
          ],
          baseConfidence: 0.8,
          businessRelevant: true,
          defaultParameters: { action: 'search' }
        }
      ]],
      
      ['help_request', [
        {
          keywords: ['help', 'assist', 'support', 'dont understand', "don't understand"],
          baseConfidence: 0.8,
          defaultParameters: { urgency: 'medium' }
        }
      ]]
    ]);
  }

  // Public utility methods
  getSupportedIntents(): string[] {
    return [
      'greeting', 'search_product', 'price_inquiry', 'make_order', 'payment_intent',
      'balance_inquiry', 'help_request', 'complaint', 'thanks', 'goodbye',
      'location_request', 'unknown'
    ];
  }

  addCustomIntent(
    intentName: string, 
    patterns: IntentPattern[], 
    language: Language
  ): void {
    const intents = this.getIntentsForLanguage(language);
    intents.set(intentName, patterns);
  }

  classifyMultipleTexts(
    texts: string[], 
    language: Language, 
    context: AIContext
  ): Promise<IntentResult[]> {
    return Promise.all(
      texts.map(text => this.classifyIntent(text, language, context))
    );
  }

  // Dominican-specific intent classification
  classifyDominicanIntent(text: string, context: AIContext): Promise<IntentResult> {
    return this.classifyIntent(text, 'es-DO', {
      ...context,
      language: 'es-DO',
      location: context.location || { latitude: 18.4861, longitude: -69.9312, country: 'DO' }
    });
  }

  // Haitian-specific intent classification
  classifyHaitianIntent(text: string, context: AIContext): Promise<IntentResult> {
    return this.classifyIntent(text, 'ht', {
      ...context,
      language: 'ht'
    });
  }
}

// Supporting interfaces
interface IntentPattern {
  keywords?: string[];
  regexPatterns?: RegExp[];
  baseConfidence: number;
  keywordThreshold?: number;
  dominicanBoost?: number;
  dominicanContext?: boolean;
  businessRelevant?: boolean;
  timeBoosts?: {
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
  };
  defaultParameters: Record<string, any>;
}

interface IntentScore {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
}

interface PatternMatch {
  matches: boolean;
  confidence: number;
  parameters: Record<string, any>;
}