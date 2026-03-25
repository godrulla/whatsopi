/**
 * Multi-Language NLP System for WhatsOpí
 * Specialized processing for Dominican Spanish and Haitian Creole
 */

export * from './language-detector';
export * from './dominican-processor';
export * from './haitian-processor';
export * from './sentiment-analyzer';
export * from './entity-extractor';
export * from './intent-classifier';
export * from './cultural-analyzer';

import { LanguageDetector } from './language-detector';
import { DominicanSpanishProcessor } from './dominican-processor';
import { HaitianCreoleProcessor } from './haitian-processor';
import { SentimentAnalyzer } from './sentiment-analyzer';
import { EntityExtractor } from './entity-extractor';
import { IntentClassifier } from './intent-classifier';
import { CulturalAnalyzer } from './cultural-analyzer';
import { 
  Language, 
  TextAnalysis, 
  AIContext,
  LanguageDetectionResult,
  SentimentResult,
  Entity,
  IntentResult,
  CulturalMarker
} from '../types';

export class MultiLanguageNLP {
  private languageDetector: LanguageDetector;
  private dominicanProcessor: DominicanSpanishProcessor;
  private haitianProcessor: HaitianCreoleProcessor;
  private sentimentAnalyzer: SentimentAnalyzer;
  private entityExtractor: EntityExtractor;
  private intentClassifier: IntentClassifier;
  private culturalAnalyzer: CulturalAnalyzer;

  constructor() {
    this.languageDetector = new LanguageDetector();
    this.dominicanProcessor = new DominicanSpanishProcessor();
    this.haitianProcessor = new HaitianCreoleProcessor();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.entityExtractor = new EntityExtractor();
    this.intentClassifier = new IntentClassifier();
    this.culturalAnalyzer = new CulturalAnalyzer();
  }

  async analyzeText(text: string, context: AIContext): Promise<TextAnalysis> {
    // Step 1: Detect language
    const languageResult = await this.languageDetector.detectLanguage(text, context);
    
    // Step 2: Apply language-specific preprocessing
    const processedText = await this.preprocessText(text, languageResult.language, context);
    
    // Step 3: Run parallel analysis
    const [
      sentimentResult,
      entities,
      intentResult,
      culturalMarkers
    ] = await Promise.all([
      this.sentimentAnalyzer.analyzeSentiment(processedText, languageResult.language, context),
      this.entityExtractor.extractEntities(processedText, languageResult.language, context),
      this.intentClassifier.classifyIntent(processedText, languageResult.language, context),
      this.culturalAnalyzer.analyzeCulturalMarkers(processedText, languageResult.language, context)
    ]);

    // Step 4: Extract keywords using language-specific methods
    const keywords = await this.extractKeywords(processedText, languageResult.language);

    // Step 5: Calculate readability
    const readability = this.calculateReadability(processedText, languageResult.language);

    return {
      language: languageResult,
      sentiment: sentimentResult,
      entities,
      intent: intentResult,
      keywords,
      readability,
      culturalMarkers
    };
  }

  private async preprocessText(text: string, language: Language, context: AIContext): Promise<string> {
    switch (language) {
      case 'es-DO':
        return await this.dominicanProcessor.preprocess(text, context);
      case 'ht':
        return await this.haitianProcessor.preprocess(text, context);
      case 'es':
        // Standard Spanish preprocessing
        return this.standardSpanishPreprocess(text);
      case 'en':
        // English preprocessing
        return this.englishPreprocess(text);
      default:
        return text.trim();
    }
  }

  private async extractKeywords(text: string, language: Language): Promise<any[]> {
    // Language-specific keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = this.getStopWords(language);
    
    const filteredWords = words.filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      /^[a-záéíóúüñ]+$/i.test(word)
    );

    // Calculate word frequency
    const wordCount: Record<string, number> = {};
    filteredWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Sort by frequency and relevance
    return Object.entries(wordCount)
      .map(([text, frequency]) => ({
        text,
        relevance: frequency / filteredWords.length,
        frequency,
        category: this.categorizeKeyword(text, language)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private calculateReadability(text: string, language: Language): any {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countSyllables(text, language);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Adapted Flesch Reading Ease for Spanish
    let score: number;
    if (language === 'es-DO' || language === 'es') {
      score = 206.835 - (1.02 * avgWordsPerSentence) - (0.821 * avgSyllablesPerWord);
    } else {
      // Default English formula
      score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    }

    const level = this.getReadabilityLevel(score);
    const grade = this.getReadabilityGrade(score);

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      grade
    };
  }

  private standardSpanishPreprocess(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents for processing
  }

  private englishPreprocess(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private getStopWords(language: Language): string[] {
    const stopWords: Record<Language, string[]> = {
      'es-DO': [
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
        'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'pero', 'sus',
        'fue', 'ser', 'ha', 'sido', 'era', 'estar', 'hasta', 'muy', 'más', 'este', 'esta',
        'klk', 'que', 'como', 'tan', 'sin', 'sobre', 'todo', 'toda', 'todos', 'todas'
      ],
      'ht': [
        'ak', 'an', 'ki', 'la', 'li', 'nan', 'pou', 'sa', 'yo', 'mwen', 'ou', 'nou',
        'yon', 'gen', 'pa', 'se', 'te', 'ka', 'ap', 'ta', 'pral', 'kap', 'soti'
      ],
      'es': [
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo',
        'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las'
      ],
      'en': [
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
        'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
        'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
      ]
    };

    return stopWords[language] || stopWords['es'];
  }

  private categorizeKeyword(word: string, language: Language): string {
    // Simple keyword categorization based on word patterns
    if (language === 'es-DO') {
      if (['peso', 'pesos', 'dinero', 'cuarto', 'costo', 'precio'].includes(word)) {
        return 'money';
      }
      if (['colmado', 'negocio', 'tienda', 'comercio'].includes(word)) {
        return 'business';
      }
      if (['producto', 'cosa', 'articulo', 'mercancia'].includes(word)) {
        return 'product';
      }
    }

    return 'general';
  }

  private countSyllables(text: string, language: Language): number {
    const words = text.split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      totalSyllables += this.countWordSyllables(word, language);
    }

    return totalSyllables;
  }

  private countWordSyllables(word: string, language: Language): number {
    if (word.length <= 3) return 1;

    const vowels = language === 'en' ? 'aeiou' : 'aeiouáéíóúü';
    let syllableCount = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const char = word[i].toLowerCase();
      const isVowel = vowels.includes(char);

      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }

      previousWasVowel = isVowel;
    }

    // Adjust for language-specific rules
    if (language === 'es' || language === 'es-DO') {
      // Spanish words ending in silent 'e' don't reduce syllable count
      return Math.max(1, syllableCount);
    }

    // English rule: words ending in silent 'e'
    if (language === 'en' && word.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }

    return Math.max(1, syllableCount);
  }

  private getReadabilityLevel(score: number): string {
    if (score >= 90) return 'very_easy';
    if (score >= 80) return 'easy';
    if (score >= 70) return 'moderate';
    if (score >= 60) return 'difficult';
    return 'very_difficult';
  }

  private getReadabilityGrade(score: number): number {
    if (score >= 90) return 5;
    if (score >= 80) return 6;
    if (score >= 70) return 7;
    if (score >= 60) return 8;
    if (score >= 50) return 9;
    if (score >= 30) return 10;
    return 12;
  }

  // Language support methods
  getSupportedLanguages(): Language[] {
    return ['es-DO', 'ht', 'es', 'en'];
  }

  isLanguageSupported(language: Language): boolean {
    return this.getSupportedLanguages().includes(language);
  }

  // Dominican-specific analysis
  async analyzeDominicanText(text: string, context: AIContext): Promise<TextAnalysis> {
    const processedText = await this.dominicanProcessor.preprocess(text, context);
    const enhancedContext = { ...context, language: 'es-DO' as Language };
    
    return await this.analyzeText(processedText, enhancedContext);
  }

  // Haitian Creole-specific analysis
  async analyzeHaitianText(text: string, context: AIContext): Promise<TextAnalysis> {
    const processedText = await this.haitianProcessor.preprocess(text, context);
    const enhancedContext = { ...context, language: 'ht' as Language };
    
    return await this.analyzeText(processedText, enhancedContext);
  }

  // Code-switching detection (Spanish-Creole mixed text)
  async detectCodeSwitching(text: string, context: AIContext): Promise<CodeSwitchingResult> {
    const segments = await this.segmentByLanguage(text);
    
    return {
      isCodeSwitching: segments.length > 1,
      segments,
      primaryLanguage: this.determinePrimaryLanguage(segments),
      switchingPoints: this.findSwitchingPoints(segments),
      confidence: this.calculateCodeSwitchingConfidence(segments)
    };
  }

  private async segmentByLanguage(text: string): Promise<LanguageSegment[]> {
    // Simple segmentation by sentences for now
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segments: LanguageSegment[] = [];

    for (const sentence of sentences) {
      const detection = await this.languageDetector.detectLanguage(sentence.trim(), {
        sessionId: 'temp',
        language: 'es-DO',
        timestamp: new Date()
      });

      segments.push({
        text: sentence.trim(),
        language: detection.language,
        confidence: detection.confidence,
        startIndex: text.indexOf(sentence.trim()),
        endIndex: text.indexOf(sentence.trim()) + sentence.trim().length
      });
    }

    return segments;
  }

  private determinePrimaryLanguage(segments: LanguageSegment[]): Language {
    const languageCounts: Record<string, number> = {};
    
    for (const segment of segments) {
      languageCounts[segment.language] = (languageCounts[segment.language] || 0) + segment.text.length;
    }

    return Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as Language;
  }

  private findSwitchingPoints(segments: LanguageSegment[]): SwitchingPoint[] {
    const points: SwitchingPoint[] = [];

    for (let i = 1; i < segments.length; i++) {
      if (segments[i].language !== segments[i - 1].language) {
        points.push({
          position: segments[i].startIndex,
          fromLanguage: segments[i - 1].language,
          toLanguage: segments[i].language,
          context: segments[i - 1].text + ' | ' + segments[i].text
        });
      }
    }

    return points;
  }

  private calculateCodeSwitchingConfidence(segments: LanguageSegment[]): number {
    if (segments.length <= 1) return 0;

    const avgConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
    const languageVariety = new Set(segments.map(seg => seg.language)).size;

    return Math.min(avgConfidence * (languageVariety / segments.length), 1.0);
  }
}

// Additional interfaces
export interface CodeSwitchingResult {
  isCodeSwitching: boolean;
  segments: LanguageSegment[];
  primaryLanguage: Language;
  switchingPoints: SwitchingPoint[];
  confidence: number;
}

export interface LanguageSegment {
  text: string;
  language: Language;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface SwitchingPoint {
  position: number;
  fromLanguage: Language;
  toLanguage: Language;
  context: string;
}