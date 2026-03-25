/**
 * Language Detector for WhatsOpí
 * Specialized detection for Dominican Spanish, Haitian Creole, and code-switching
 */

import { Language, LanguageDetectionResult, AIContext } from '../types';

export class LanguageDetector {
  private dominicanPatterns: RegExp[];
  private haitianPatterns: RegExp[];
  private spanishPatterns: RegExp[];
  private englishPatterns: RegExp[];

  constructor() {
    this.initializePatterns();
  }

  async detectLanguage(text: string, context: AIContext): Promise<LanguageDetectionResult> {
    const cleanText = text.toLowerCase().trim();
    
    if (cleanText.length === 0) {
      return {
        language: context.language || 'es-DO',
        confidence: 0.1
      };
    }

    // Calculate confidence scores for each language
    const scores = {
      'es-DO': this.calculateDominicanScore(cleanText, context),
      'ht': this.calculateHaitianScore(cleanText, context),
      'es': this.calculateSpanishScore(cleanText, context),
      'en': this.calculateEnglishScore(cleanText, context)
    };

    // Find the language with highest score
    const sortedLanguages = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const [primaryLanguage, primaryScore] = sortedLanguages[0];
    const alternativeLanguages = sortedLanguages.slice(1)
      .filter(([, score]) => score > 0.1)
      .map(([lang, score]) => ({
        language: lang as Language,
        confidence: score
      }));

    // Determine dialect for Spanish
    let dialect: string | undefined;
    if (primaryLanguage === 'es-DO') {
      dialect = 'Dominican Spanish';
    } else if (primaryLanguage === 'es') {
      dialect = 'Standard Spanish';
    } else if (primaryLanguage === 'ht') {
      dialect = 'Haitian Creole';
    }

    return {
      language: primaryLanguage as Language,
      confidence: primaryScore,
      dialect,
      alternativeLanguages
    };
  }

  private calculateDominicanScore(text: string, context: AIContext): number {
    let score = 0;

    // Base score if context suggests Dominican
    if (context.language === 'es-DO' || context.location?.country === 'DO') {
      score += 0.3;
    }

    // Dominican expressions and slang
    const dominicanExpressions = [
      'klk', 'que lo que', 'tiguer', 'chin', 'brutal', 'jevi', 'manigua',
      'como tu ta', 'que tal', 'vacano', 'chercha', 'pana', 'mama guevo'
    ];

    for (const expr of dominicanExpressions) {
      if (text.includes(expr)) {
        score += 0.15;
      }
    }

    // Dominican pronunciation patterns in text
    if (text.includes('ta ') || text.includes(' ta')) score += 0.1; // "está" -> "ta"
    if (text.includes('pa ') || text.includes(' pa')) score += 0.1; // "para" -> "pa"
    if (text.includes('na ') || text.includes(' na')) score += 0.05; // "nada" -> "na"

    // Dominican vocabulary
    const dominicanWords = [
      'colmado', 'conuco', 'guagua', 'yipeta', 'pariguayo', 'tecato',
      'peso', 'pesos', 'cuarto', 'tato', 'funda', 'motochorro'
    ];

    for (const word of dominicanWords) {
      if (text.includes(word)) {
        score += 0.08;
      }
    }

    // Pattern matching
    for (const pattern of this.dominicanPatterns) {
      if (pattern.test(text)) {
        score += 0.1;
      }
    }

    // Cultural context boost
    if (this.hasDominicanCulturalContext(text)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateHaitianScore(text: string, context: AIContext): number {
    let score = 0;

    // Base score if context suggests Haitian
    if (context.language === 'ht') {
      score += 0.3;
    }

    // Haitian Creole specific words
    const haitianWords = [
      'mwen', 'ou', 'li', 'nou', 'yo', 'ak', 'nan', 'pou', 'ki', 'sa',
      'gen', 'pa', 'se', 'te', 'ap', 'pral', 'kap', 'gourde', 'ayiti',
      'kreyol', 'lakou', 'konpa', 'rara', 'vodou'
    ];

    for (const word of haitianWords) {
      if (text.includes(word)) {
        score += 0.12;
      }
    }

    // Haitian grammar patterns
    if (text.includes('mwen se') || text.includes('se mwen')) score += 0.15;
    if (text.includes('nou ka') || text.includes('yo ka')) score += 0.12;
    if (text.includes('li te') || text.includes('yo te')) score += 0.12;

    // Pattern matching
    for (const pattern of this.haitianPatterns) {
      if (pattern.test(text)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private calculateSpanishScore(text: string, context: AIContext): number {
    let score = 0;

    // Base score for Spanish context
    if (context.language === 'es' || context.location?.country === 'ES') {
      score += 0.3;
    }

    // Standard Spanish indicators
    const spanishWords = [
      'está', 'para', 'nada', 'todo', 'muy', 'más', 'también', 'después',
      'entonces', 'ahora', 'aquí', 'allí', 'donde', 'cuando', 'porque'
    ];

    for (const word of spanishWords) {
      if (text.includes(word)) {
        score += 0.08;
      }
    }

    // Spanish grammar patterns
    if (/\b(el|la|los|las)\s+\w+/.test(text)) score += 0.1;
    if (/\b\w+ción\b/.test(text)) score += 0.1;
    if (/\b\w+mente\b/.test(text)) score += 0.08;

    // Pattern matching
    for (const pattern of this.spanishPatterns) {
      if (pattern.test(text)) {
        score += 0.08;
      }
    }

    // Reduce score if Dominican markers are present
    if (this.calculateDominicanScore(text, context) > 0.3) {
      score *= 0.7;
    }

    return Math.min(score, 1.0);
  }

  private calculateEnglishScore(text: string, context: AIContext): number {
    let score = 0;

    // Base score for English context
    if (context.language === 'en') {
      score += 0.3;
    }

    // English indicators
    const englishWords = [
      'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this',
      'but', 'his', 'from', 'they', 'she', 'her', 'been', 'than', 'its'
    ];

    for (const word of englishWords) {
      if (text.includes(` ${word} `) || text.startsWith(`${word} `) || text.endsWith(` ${word}`)) {
        score += 0.1;
      }
    }

    // English grammar patterns
    if (/\b(a|an)\s+\w+/.test(text)) score += 0.1;
    if (/\b\w+ing\b/.test(text)) score += 0.1;
    if (/\b\w+ed\b/.test(text)) score += 0.08;

    // Pattern matching
    for (const pattern of this.englishPatterns) {
      if (pattern.test(text)) {
        score += 0.08;
      }
    }

    return Math.min(score, 1.0);
  }

  private hasDominicanCulturalContext(text: string): boolean {
    const culturalTerms = [
      'merengue', 'bachata', 'mamajuana', 'sancocho', 'mangú', 'locrio',
      'santo domingo', 'santiago', 'punta cana', 'dominicano', 'dominicana',
      'quisqueya', 'rd', 'republica dominicana'
    ];

    return culturalTerms.some(term => text.includes(term));
  }

  private initializePatterns(): void {
    // Dominican Spanish patterns
    this.dominicanPatterns = [
      /\bklk\b/i,
      /\bque\s+lo\s+que\b/i,
      /\btiguer\b/i,
      /\bcomo\s+tu\s+ta\b/i,
      /\bta\s+bueno\b/i,
      /\bpa\s+\w+/i,
      /\bta\s+(bien|mal|así)/i
    ];

    // Haitian Creole patterns
    this.haitianPatterns = [
      /\bmwen\s+(se|pa|ka|ap)\b/i,
      /\bnou\s+(ka|pa|ap|te)\b/i,
      /\bli\s+(se|pa|ka|ap|te)\b/i,
      /\byo\s+(ka|pa|ap|te)\b/i,
      /\bse\s+\w+\s+mwen\b/i,
      /\bgen\s+\w+\s+nan\b/i
    ];

    // Standard Spanish patterns
    this.spanishPatterns = [
      /\bestá\s+\w+/i,
      /\bpara\s+\w+/i,
      /\bmuy\s+\w+/i,
      /\bmás\s+\w+/i,
      /\b\w+ción\b/i,
      /\b\w+mente\b/i
    ];

    // English patterns
    this.englishPatterns = [
      /\bthe\s+\w+/i,
      /\band\s+\w+/i,
      /\b\w+ing\b/i,
      /\b\w+ed\b/i,
      /\bhave\s+been\b/i,
      /\bwould\s+\w+/i
    ];
  }

  // Utility methods
  detectMixedLanguages(text: string, context: AIContext): Promise<MixedLanguageResult> {
    // Split text into sentences and detect language of each
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return Promise.all(
      sentences.map(async (sentence, index) => {
        const detection = await this.detectLanguage(sentence.trim(), context);
        return {
          text: sentence.trim(),
          language: detection.language,
          confidence: detection.confidence,
          index
        };
      })
    ).then(results => ({
      sentences: results,
      isMultilingual: new Set(results.map(r => r.language)).size > 1,
      primaryLanguage: this.findPrimaryLanguage(results),
      languageDistribution: this.calculateLanguageDistribution(results)
    }));
  }

  private findPrimaryLanguage(results: SentenceDetection[]): Language {
    const counts: Record<string, number> = {};
    
    results.forEach(result => {
      counts[result.language] = (counts[result.language] || 0) + result.text.length;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0][0] as Language;
  }

  private calculateLanguageDistribution(results: SentenceDetection[]): Record<Language, number> {
    const totalLength = results.reduce((sum, r) => sum + r.text.length, 0);
    const distribution: Record<string, number> = {};

    results.forEach(result => {
      distribution[result.language] = (distribution[result.language] || 0) + result.text.length;
    });

    // Convert to percentages
    Object.keys(distribution).forEach(lang => {
      distribution[lang] = distribution[lang] / totalLength;
    });

    return distribution as Record<Language, number>;
  }

  // Configuration methods
  updateDominicanPatterns(patterns: RegExp[]): void {
    this.dominicanPatterns = patterns;
  }

  updateHaitianPatterns(patterns: RegExp[]): void {
    this.haitianPatterns = patterns;
  }

  // Training data support
  trainFromSamples(samples: LanguageSample[]): void {
    // In a production system, this would update the detection models
    console.log(`Training language detector with ${samples.length} samples`);
    
    // For now, just log the language distribution
    const distribution: Record<string, number> = {};
    samples.forEach(sample => {
      distribution[sample.language] = (distribution[sample.language] || 0) + 1;
    });
    
    console.log('Language distribution in training data:', distribution);
  }
}

// Additional interfaces
export interface MixedLanguageResult {
  sentences: SentenceDetection[];
  isMultilingual: boolean;
  primaryLanguage: Language;
  languageDistribution: Record<Language, number>;
}

export interface SentenceDetection {
  text: string;
  language: Language;
  confidence: number;
  index: number;
}

export interface LanguageSample {
  text: string;
  language: Language;
  confidence: number;
  source: 'manual' | 'automatic' | 'user_feedback';
  metadata?: Record<string, any>;
}