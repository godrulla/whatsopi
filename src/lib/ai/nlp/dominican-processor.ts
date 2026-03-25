/**
 * Dominican Spanish Processor for WhatsOpí
 * Specialized text processing for Dominican Spanish dialect and cultural context
 */

import { AIContext, CulturalMarker } from '../types';

export class DominicanSpanishProcessor {
  private expressionMappings: Map<string, string>;
  private pronunciationNormalizations: Map<string, string>;
  private culturalTerms: Map<string, DominicanTerm>;
  private informalToFormalMappings: Map<string, string>;

  constructor() {
    this.initializeExpressionMappings();
    this.initializePronunciationNormalizations();
    this.initializeCulturalTerms();
    this.initializeInformalToFormalMappings();
  }

  async preprocess(text: string, context: AIContext): Promise<string> {
    let processed = text.trim();

    // Step 1: Normalize common pronunciation variations
    processed = this.normalizePronunciation(processed);

    // Step 2: Handle Dominican expressions and slang
    processed = this.normalizeExpressions(processed);

    // Step 3: Expand abbreviations and contractions
    processed = this.expandContractions(processed);

    // Step 4: Standardize informal constructions
    processed = this.standardizeInformalConstructions(processed);

    // Step 5: Clean up spacing and punctuation
    processed = this.cleanupText(processed);

    return processed;
  }

  private normalizePronunciation(text: string): string {
    let normalized = text;

    // Apply pronunciation normalizations
    for (const [variant, standard] of this.pronunciationNormalizations.entries()) {
      const pattern = new RegExp(`\\b${variant}\\b`, 'gi');
      normalized = normalized.replace(pattern, standard);
    }

    // Handle 's' aspiration patterns
    normalized = normalized.replace(/\b(\w+)h(\w*)\b/g, (match, prefix, suffix) => {
      // Convert aspirated 's' back to 's' (e.g., "ehto" -> "esto")
      if (prefix.length > 1 && suffix.length >= 0) {
        return `${prefix}s${suffix}`;
      }
      return match;
    });

    // Handle 'r' weakening at end of syllables
    normalized = normalized.replace(/\b(\w+)l(\w*)\b/g, (match, prefix, suffix) => {
      // Convert weakened 'r' to 'r' (e.g., "palque" -> "parque")
      const commonWords = ['parque', 'porque', 'parte', 'puerto'];
      const reconstructed = `${prefix}r${suffix}`;
      if (commonWords.includes(reconstructed.toLowerCase())) {
        return reconstructed;
      }
      return match;
    });

    return normalized;
  }

  private normalizeExpressions(text: string): string {
    let normalized = text;

    for (const [expression, meaning] of this.expressionMappings.entries()) {
      const pattern = new RegExp(`\\b${expression}\\b`, 'gi');
      normalized = normalized.replace(pattern, meaning);
    }

    return normalized;
  }

  private expandContractions(text: string): string {
    const contractions: Record<string, string> = {
      "pa'": "para",
      "ta'": "está",
      "na'": "nada",
      "to'": "todo",
      "ca'": "cada",
      "ma'": "más",
      "de'": "de",
      "que'": "qué",
      "como'": "cómo",
      "onde'": "dónde",
      "ande'": "dónde",
      "cuando'": "cuándo"
    };

    let expanded = text;
    for (const [contraction, expansion] of Object.entries(contractions)) {
      const pattern = new RegExp(`\\b${contraction}`, 'gi');
      expanded = expanded.replace(pattern, expansion);
    }

    return expanded;
  }

  private standardizeInformalConstructions(text: string): string {
    let standardized = text;

    // Dominican informal constructions
    const informalPatterns: Array<[RegExp, string]> = [
      // "tú tá" -> "tú estás"
      [/\btú\s+tá\b/gi, 'tú estás'],
      [/\btu\s+ta\b/gi, 'tú estás'],
      
      // "yo tá" -> "yo estoy"
      [/\byo\s+tá\b/gi, 'yo estoy'],
      [/\byo\s+ta\b/gi, 'yo estoy'],
      
      // "él/ella tá" -> "él/ella está"
      [/\b(él|ella)\s+tá\b/gi, '$1 está'],
      [/\b(el|ella)\s+ta\b/gi, '$1 está'],
      
      // "nosotros tá" -> "nosotros estamos"
      [/\bnosotros\s+tá\b/gi, 'nosotros estamos'],
      [/\bnosotro\s+ta\b/gi, 'nosotros estamos'],
      
      // "ustedes tá" -> "ustedes están"
      [/\bustedes\s+tá\b/gi, 'ustedes están'],
      [/\bustede\s+ta\b/gi, 'ustedes están'],
      
      // "pa que" -> "para que"
      [/\bpa\s+que\b/gi, 'para que'],
      
      // "po que" -> "por que"
      [/\bpo\s+que\b/gi, 'por que'],
      
      // Double negatives
      [/\bno\s+(.+)\s+na\b/gi, 'no $1 nada']
    ];

    for (const [pattern, replacement] of informalPatterns) {
      standardized = standardized.replace(pattern, replacement);
    }

    return standardized;
  }

  private cleanupText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix punctuation spacing
      .replace(/,\s*,/g, ',') // Remove duplicate commas
      .trim();
  }

  // Extract Dominican-specific cultural markers
  extractCulturalMarkers(text: string): CulturalMarker[] {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Check for Dominican expressions
    for (const [expression, meaning] of this.expressionMappings.entries()) {
      if (lowercaseText.includes(expression.toLowerCase())) {
        markers.push({
          type: 'dominican_expression',
          text: expression,
          meaning,
          confidence: 0.9
        });
      }
    }

    // Check for cultural terms
    for (const [term, termInfo] of this.culturalTerms.entries()) {
      if (lowercaseText.includes(term.toLowerCase())) {
        markers.push({
          type: 'dominican_expression',
          text: term,
          meaning: termInfo.meaning,
          confidence: termInfo.confidence
        });
      }
    }

    // Check for informal Spanish patterns
    const informalPatterns = [
      { pattern: /\btá\b/gi, meaning: 'Contracted form of "está"', type: 'informal_spanish' },
      { pattern: /\bpa\b(?!\w)/gi, meaning: 'Contracted form of "para"', type: 'informal_spanish' },
      { pattern: /\bpo\b(?!\w)/gi, meaning: 'Contracted form of "por"', type: 'informal_spanish' },
      { pattern: /\bna\b(?!\w)/gi, meaning: 'Contracted form of "nada"', type: 'informal_spanish' }
    ];

    for (const { pattern, meaning, type } of informalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          markers.push({
            type: type as any,
            text: match,
            meaning,
            confidence: 0.8
          });
        });
      }
    }

    return markers;
  }

  // Convert informal Dominican Spanish to standard Spanish
  toStandardSpanish(text: string): string {
    let standard = text;

    // Apply all transformations
    for (const [informal, formal] of this.informalToFormalMappings.entries()) {
      const pattern = new RegExp(`\\b${informal}\\b`, 'gi');
      standard = standard.replace(pattern, formal);
    }

    return standard;
  }

  // Convert standard Spanish to Dominican informal style
  toDominicanStyle(text: string, informalityLevel: number = 0.7): string {
    if (informalityLevel < 0.3) return text;

    let dominican = text;

    // Apply contractions based on informality level
    if (informalityLevel > 0.5) {
      dominican = dominican.replace(/\bestá\b/gi, 'tá');
      dominican = dominican.replace(/\bpara\b/gi, 'pa');
      dominican = dominican.replace(/\bpor\b/gi, 'po');
    }

    if (informalityLevel > 0.7) {
      dominican = dominican.replace(/\bnada\b/gi, 'na');
      dominican = dominican.replace(/\btodo\b/gi, "to'");
      dominican = dominican.replace(/\bmás\b/gi, "ma'");
    }

    // Add Dominican expressions
    if (informalityLevel > 0.8) {
      dominican = dominican.replace(/\bhola\b/gi, 'klk');
      dominican = dominican.replace(/\bamigo\b/gi, 'tiguer');
      dominican = dominican.replace(/\bqué tal\b/gi, 'que lo que');
    }

    return dominican;
  }

  // Analyze text formality level
  analyzeFormality(text: string): FormalityAnalysis {
    const lowercaseText = text.toLowerCase();
    let informalMarkers = 0;
    let formalMarkers = 0;
    let totalWords = text.split(/\s+/).length;

    // Count informal markers
    const informalIndicators = ['klk', 'tiguer', 'tá', 'pa ', 'po ', "na'", "to'", "ma'"];
    informalIndicators.forEach(indicator => {
      if (lowercaseText.includes(indicator)) informalMarkers++;
    });

    // Count formal markers
    const formalIndicators = ['usted', 'ustedes', 'señor', 'señora', 'por favor', 'gracias', 'disculpe'];
    formalIndicators.forEach(indicator => {
      if (lowercaseText.includes(indicator)) formalMarkers++;
    });

    const informalityScore = informalMarkers / Math.max(totalWords * 0.1, 1);
    const formalityScore = formalMarkers / Math.max(totalWords * 0.1, 1);

    let level: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
    
    if (formalityScore > 0.3) level = 'very_formal';
    else if (formalityScore > 0.1) level = 'formal';
    else if (informalityScore > 0.3) level = 'very_informal';
    else if (informalityScore > 0.1) level = 'informal';
    else level = 'neutral';

    return {
      level,
      informalMarkers,
      formalMarkers,
      informalityScore,
      formalityScore,
      dominican: informalMarkers > 0,
      recommendations: this.getFormalityRecommendations(level, informalMarkers, formalMarkers)
    };
  }

  private getFormalityRecommendations(
    level: string, 
    informalMarkers: number, 
    formalMarkers: number
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'very_informal' && informalMarkers > 3) {
      recommendations.push('Consider using more standard Spanish forms for formal contexts');
      recommendations.push('Replace contractions like "tá" with "está"');
    }

    if (level === 'very_formal' && formalMarkers > 2) {
      recommendations.push('Text uses very formal register, consider informal alternatives for casual conversation');
    }

    if (informalMarkers === 0 && formalMarkers === 0) {
      recommendations.push('Text is neutral - could be adapted for Dominican audience with local expressions');
    }

    return recommendations;
  }

  private initializeExpressionMappings(): void {
    this.expressionMappings = new Map([
      // Greetings and expressions
      ['klk', 'qué tal'],
      ['que lo que', 'qué tal'],
      ['como tu ta', 'cómo estás'],
      ['tiguer', 'amigo'],
      ['pana', 'amigo'],
      ['vacano', 'genial'],
      ['brutal', 'excelente'],
      ['jevi', 'cool'],
      
      // Common phrases
      ['chin', 'poco'],
      ['manigua', 'remoto'],
      ['chercha', 'problema'],
      ['mama guevo', 'mentiroso'],
      ['pariguayo', 'tonto'],
      ['tecato', 'drogadicto'],
      
      // Intensifiers
      ['full', 'muy'],
      ['super', 'muy'],
      ['mega', 'muy'],
      
      // Money and commerce
      ['cuarto', 'dinero'],
      ['tato', 'dinero'],
      ['funda', 'bolsa'],
      
      // Transportation
      ['guagua', 'autobús'],
      ['yipeta', 'SUV'],
      ['motochorro', 'motociclista temerario']
    ]);
  }

  private initializePronunciationNormalizations(): void {
    this.pronunciationNormalizations = new Map([
      // 's' aspiration
      ['ehto', 'esto'],
      ['ehta', 'esta'],
      ['ehtá', 'está'],
      ['mih', 'mis'],
      ['loh', 'los'],
      ['lah', 'las'],
      
      // 'r' weakening
      ['puelto', 'puerto'],
      ['puelco', 'puerco'],
      ['palque', 'parque'],
      ['polque', 'porque'],
      ['palte', 'parte'],
      
      // 'd' deletion
      ['to', 'todo'],
      ['na', 'nada'],
      ['pué', 'puede'],
      ['vía', 'vida'],
      
      // Final 'n' weakening
      ['tambié', 'también'],
      ['jove', 'joven'],
      ['orde', 'orden']
    ]);
  }

  private initializeCulturalTerms(): void {
    this.culturalTerms = new Map([
      // Places and institutions
      ['colmado', { meaning: 'corner store', confidence: 0.95, category: 'business' }],
      ['conuco', { meaning: 'small farm', confidence: 0.9, category: 'agriculture' }],
      ['malecón', { meaning: 'boardwalk', confidence: 0.85, category: 'location' }],
      
      // Food and drinks
      ['mangú', { meaning: 'mashed plantains dish', confidence: 0.95, category: 'food' }],
      ['sancocho', { meaning: 'traditional stew', confidence: 0.95, category: 'food' }],
      ['locrio', { meaning: 'rice dish', confidence: 0.9, category: 'food' }],
      ['mamajuana', { meaning: 'herbal alcoholic drink', confidence: 0.9, category: 'drink' }],
      ['morir soñando', { meaning: 'orange and milk drink', confidence: 0.85, category: 'drink' }],
      
      // Music and culture
      ['merengue', { meaning: 'Dominican music genre', confidence: 0.95, category: 'music' }],
      ['bachata', { meaning: 'Dominican music genre', confidence: 0.95, category: 'music' }],
      ['dembow', { meaning: 'Dominican urban music', confidence: 0.9, category: 'music' }],
      ['carnaval', { meaning: 'carnival celebration', confidence: 0.85, category: 'culture' }],
      
      // Geography
      ['cibao', { meaning: 'northern region', confidence: 0.9, category: 'geography' }],
      ['quisqueya', { meaning: 'Dominican Republic', confidence: 0.95, category: 'geography' }],
      
      // People and relationships
      ['dominicano', { meaning: 'Dominican person', confidence: 0.95, category: 'identity' }],
      ['dominicana', { meaning: 'Dominican woman', confidence: 0.95, category: 'identity' }],
      ['campesino', { meaning: 'rural person', confidence: 0.8, category: 'social' }]
    ]);
  }

  private initializeInformalToFormalMappings(): void {
    this.informalToFormalMappings = new Map([
      ['klk', 'hola'],
      ['que lo que', 'qué tal'],
      ['tiguer', 'amigo'],
      ['tá', 'está'],
      ['pa', 'para'],
      ['po', 'por'],
      ['na', 'nada'],
      ['to', 'todo'],
      ['chin', 'poco'],
      ['brutal', 'excelente'],
      ['vacano', 'bueno'],
      ['jevi', 'bueno'],
      ['manigua', 'lejos'],
      ['cuarto', 'dinero'],
      ['funda', 'bolsa'],
      ['guagua', 'autobús']
    ]);
  }

  // Public utility methods
  isDominicanExpression(text: string): boolean {
    const lowercaseText = text.toLowerCase();
    for (const expression of this.expressionMappings.keys()) {
      if (lowercaseText.includes(expression)) {
        return true;
      }
    }
    return false;
  }

  getCulturalContext(text: string): DominicanCulturalContext {
    const context: DominicanCulturalContext = {
      hasLocalExpressions: false,
      businessContext: false,
      foodContext: false,
      musicContext: false,
      geographyContext: false,
      culturalTerms: []
    };

    const lowercaseText = text.toLowerCase();

    // Check for local expressions
    for (const expression of this.expressionMappings.keys()) {
      if (lowercaseText.includes(expression)) {
        context.hasLocalExpressions = true;
        break;
      }
    }

    // Check for cultural terms by category
    for (const [term, info] of this.culturalTerms.entries()) {
      if (lowercaseText.includes(term)) {
        context.culturalTerms.push(term);
        
        switch (info.category) {
          case 'business':
            context.businessContext = true;
            break;
          case 'food':
          case 'drink':
            context.foodContext = true;
            break;
          case 'music':
          case 'culture':
            context.musicContext = true;
            break;
          case 'geography':
          case 'location':
            context.geographyContext = true;
            break;
        }
      }
    }

    return context;
  }
}

// Supporting interfaces
interface DominicanTerm {
  meaning: string;
  confidence: number;
  category: string;
}

interface FormalityAnalysis {
  level: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  informalMarkers: number;
  formalMarkers: number;
  informalityScore: number;
  formalityScore: number;
  dominican: boolean;
  recommendations: string[];
}

interface DominicanCulturalContext {
  hasLocalExpressions: boolean;
  businessContext: boolean;
  foodContext: boolean;
  musicContext: boolean;
  geographyContext: boolean;
  culturalTerms: string[];
}