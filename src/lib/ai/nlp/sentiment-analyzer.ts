/**
 * Sentiment Analyzer for WhatsOpí
 * Multi-language sentiment analysis with Caribbean cultural context
 */

import { Language, SentimentResult, AIContext, EmotionScore } from '../types';

export class SentimentAnalyzer {
  private dominicanSentimentLexicon: Map<string, SentimentWord>;
  private haitianSentimentLexicon: Map<string, SentimentWord>;
  private spanishSentimentLexicon: Map<string, SentimentWord>;
  private englishSentimentLexicon: Map<string, SentimentWord>;
  private culturalModifiers: Map<string, number>;

  constructor() {
    this.initializeSentimentLexicons();
    this.initializeCulturalModifiers();
  }

  async analyzeSentiment(text: string, language: Language, context: AIContext): Promise<SentimentResult> {
    const cleanText = text.toLowerCase().trim();
    
    if (cleanText.length === 0) {
      return {
        score: 0,
        label: 'neutral',
        confidence: 0.1
      };
    }

    // Get language-specific lexicon
    const lexicon = this.getLexiconForLanguage(language);
    
    // Tokenize text
    const words = this.tokenizeText(cleanText);
    
    // Calculate base sentiment scores
    const sentimentScores = this.calculateSentimentScores(words, lexicon, language);
    
    // Apply cultural context adjustments
    const culturallyAdjustedScore = this.applyCulturalContext(
      sentimentScores.score, 
      text, 
      language, 
      context
    );
    
    // Calculate emotion scores
    const emotions = this.calculateEmotionScores(words, lexicon, language);
    
    // Determine final label and confidence
    const label = this.getSentimentLabel(culturallyAdjustedScore);
    const confidence = this.calculateConfidence(sentimentScores, words.length, language);

    return {
      score: culturallyAdjustedScore,
      label,
      confidence,
      emotions
    };
  }

  private getLexiconForLanguage(language: Language): Map<string, SentimentWord> {
    switch (language) {
      case 'es-DO':
        return this.dominicanSentimentLexicon;
      case 'ht':
        return this.haitianSentimentLexicon;
      case 'es':
        return this.spanishSentimentLexicon;
      case 'en':
        return this.englishSentimentLexicon;
      default:
        return this.spanishSentimentLexicon;
    }
  }

  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\sáéíóúüñ]/g, ' ') // Keep accented characters
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private calculateSentimentScores(
    words: string[], 
    lexicon: Map<string, SentimentWord>, 
    language: Language
  ): SentimentScores {
    let totalScore = 0;
    let positiveWords = 0;
    let negativeWords = 0;
    let neutralWords = 0;
    let totalWeight = 0;

    // Handle negation context
    let negationActive = false;
    const negationWords = this.getNegationWords(language);
    const intensifierWords = this.getIntensifierWords(language);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check for negation
      if (negationWords.includes(word)) {
        negationActive = true;
        continue;
      }

      // Check for intensifiers
      let intensifier = 1.0;
      if (i > 0 && intensifierWords.has(words[i - 1])) {
        intensifier = intensifierWords.get(words[i - 1]) || 1.0;
      }

      // Get word sentiment
      const sentimentWord = lexicon.get(word);
      if (sentimentWord) {
        let wordScore = sentimentWord.score * intensifier;
        
        // Apply negation
        if (negationActive) {
          wordScore *= -0.8; // Negation reduces but doesn't completely flip
          negationActive = false; // Reset negation for next word
        }

        totalScore += wordScore * sentimentWord.weight;
        totalWeight += sentimentWord.weight;

        if (wordScore > 0.1) positiveWords++;
        else if (wordScore < -0.1) negativeWords++;
        else neutralWords++;
      }

      // Reset negation after 3 words
      if (negationActive && i > 0 && (i % 3 === 0)) {
        negationActive = false;
      }
    }

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    return {
      score: Math.max(-1, Math.min(1, averageScore)),
      positiveWords,
      negativeWords,
      neutralWords,
      totalSentimentWords: positiveWords + negativeWords + neutralWords
    };
  }

  private applyCulturalContext(
    baseScore: number, 
    originalText: string, 
    language: Language, 
    context: AIContext
  ): number {
    let adjustedScore = baseScore;

    // Dominican cultural adjustments
    if (language === 'es-DO') {
      adjustedScore = this.applyDominicanCulturalContext(baseScore, originalText, context);
    }

    // Haitian cultural adjustments
    if (language === 'ht') {
      adjustedScore = this.applyHaitianCulturalContext(baseScore, originalText, context);
    }

    // Business context adjustments
    if (context.businessContext?.colmadoId) {
      adjustedScore = this.applyBusinessContext(adjustedScore, originalText);
    }

    return Math.max(-1, Math.min(1, adjustedScore));
  }

  private applyDominicanCulturalContext(
    baseScore: number, 
    text: string, 
    context: AIContext
  ): number {
    let adjusted = baseScore;
    const lowerText = text.toLowerCase();

    // Dominican expressions often have different sentiment than literal meaning
    const dominicanContexts = {
      // Positive cultural modifiers
      'klk': 0.1,          // Friendly greeting
      'tiguer': 0.05,      // Term of endearment
      'brutal': 0.3,       // Very positive in Dominican context
      'vacano': 0.2,       // Cool/nice
      'jevi': 0.15,        // Cool
      'que lo que': 0.05,  // Casual friendly greeting
      
      // Negative modifiers
      'manigua': -0.1,     // Remote/far (often negative context)
      'chercha': -0.2,     // Problem/trouble
      'pariguayo': -0.3,   // Fool/stupid (quite negative)
      'tecato': -0.4,      // Drug addict (very negative)
      
      // Neutral but culturally significant
      'colmado': 0.05,     // Positive association with community
      'peso': 0.0,         // Neutral but contextually important
      'guagua': 0.0        // Neutral transport term
    };

    for (const [expression, modifier] of Object.entries(dominicanContexts)) {
      if (lowerText.includes(expression)) {
        adjusted += modifier;
      }
    }

    // Family and community context boost
    if (lowerText.includes('familia') || lowerText.includes('comunidad')) {
      adjusted += 0.1;
    }

    // Economic context - informal economy is generally viewed positively
    if (lowerText.includes('negocio') || lowerText.includes('trabajo')) {
      adjusted += 0.05;
    }

    return adjusted;
  }

  private applyHaitianCulturalContext(
    baseScore: number, 
    text: string, 
    context: AIContext
  ): number {
    let adjusted = baseScore;
    const lowerText = text.toLowerCase();

    // Haitian Creole cultural sentiment modifiers
    const haitianContexts = {
      // Positive cultural terms
      'fanmi': 0.15,      // Family (very important)
      'lakou': 0.1,       // Family compound (positive community)
      'konpa': 0.2,       // Haitian music (joyful)
      'kanaval': 0.25,    // Carnival (very positive)
      'bondye': 0.1,      // God (generally positive)
      
      // Community and solidarity terms
      'kominote': 0.1,    // Community
      'solidarite': 0.15, // Solidarity
      'enyon': 0.1,       // Union/together
      
      // Resilience and strength terms (positive in Haitian context)
      'kè kontan': 0.2,   // Happy heart
      'kouraj': 0.15,     // Courage
      'fòs': 0.1,         // Strength
      
      // Challenging terms (contextually understood)
      'pwoblèm': -0.1,    // Problem (but often accepted as part of life)
      'difikilte': -0.1,  // Difficulty (similar cultural acceptance)
      'mizè': -0.3        // Misery (quite negative)
    };

    for (const [expression, modifier] of Object.entries(haitianContexts)) {
      if (lowerText.includes(expression)) {
        adjusted += modifier;
      }
    }

    // Religious context is generally positive in Haitian culture
    if (lowerText.includes('priye') || lowerText.includes('legliz') || lowerText.includes('benediksyon')) {
      adjusted += 0.1;
    }

    return adjusted;
  }

  private applyBusinessContext(baseScore: number, text: string): number {
    let adjusted = baseScore;
    const lowerText = text.toLowerCase();

    // Business sentiment modifiers
    const businessTerms = {
      'cliente': 0.1,
      'customer': 0.1,
      'venta': 0.05,
      'sales': 0.05,
      'ganancia': 0.2,
      'profit': 0.2,
      'perdida': -0.2,
      'loss': -0.2,
      'credito': 0.05,
      'credit': 0.05,
      'deuda': -0.1,
      'debt': -0.1
    };

    for (const [term, modifier] of Object.entries(businessTerms)) {
      if (lowerText.includes(term)) {
        adjusted += modifier;
      }
    }

    return adjusted;
  }

  private calculateEmotionScores(
    words: string[], 
    lexicon: Map<string, SentimentWord>, 
    language: Language
  ): EmotionScore[] {
    const emotionTotals: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      trust: 0,
      anticipation: 0,
      disgust: 0
    };

    const emotionCounts: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      trust: 0,
      anticipation: 0,
      disgust: 0
    };

    for (const word of words) {
      const sentimentWord = lexicon.get(word);
      if (sentimentWord && sentimentWord.emotions) {
        for (const [emotion, score] of Object.entries(sentimentWord.emotions)) {
          emotionTotals[emotion] += score;
          emotionCounts[emotion]++;
        }
      }
    }

    const emotions: EmotionScore[] = [];
    for (const [emotion, total] of Object.entries(emotionTotals)) {
      if (emotionCounts[emotion] > 0) {
        emotions.push({
          emotion: emotion as EmotionScore['emotion'],
          score: total / emotionCounts[emotion]
        });
      }
    }

    return emotions.sort((a, b) => b.score - a.score);
  }

  private getSentimentLabel(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private calculateConfidence(
    scores: SentimentScores, 
    totalWords: number, 
    language: Language
  ): number {
    // Base confidence on sentiment word coverage
    const coverage = scores.totalSentimentWords / Math.max(totalWords, 1);
    
    // Language-specific confidence adjustments
    let languageMultiplier = 1.0;
    switch (language) {
      case 'es-DO':
        languageMultiplier = 0.9; // Slightly lower due to dialect variations
        break;
      case 'ht':
        languageMultiplier = 0.8; // Lower due to limited lexicon
        break;
      case 'es':
        languageMultiplier = 0.95;
        break;
      case 'en':
        languageMultiplier = 1.0;
        break;
    }

    // Confidence based on score magnitude
    const scoreConfidence = Math.abs(scores.score);
    
    const confidence = Math.min(
      coverage * languageMultiplier * (0.5 + scoreConfidence),
      1.0
    );

    return Math.max(0.1, confidence);
  }

  private getNegationWords(language: Language): string[] {
    const negationWords: Record<Language, string[]> = {
      'es-DO': ['no', 'nunca', 'jamás', 'tampoco', 'ni', 'nada', 'nadie', 'ningún', 'ninguno'],
      'ht': ['pa', 'pa gen', 'jamè', 'anyen', 'okenn', 'pesonn'],
      'es': ['no', 'nunca', 'jamás', 'tampoco', 'ni', 'nada', 'nadie', 'ningún', 'ninguno'],
      'en': ['not', 'never', 'no', 'neither', 'nothing', 'nobody', 'none']
    };

    return negationWords[language] || negationWords['es'];
  }

  private getIntensifierWords(language: Language): Map<string, number> {
    const intensifiers: Record<Language, Record<string, number>> = {
      'es-DO': {
        'muy': 1.5,
        'súper': 1.8,
        'full': 1.7,    // Dominican intensifier
        'mega': 1.6,
        'demasiado': 1.4,
        'bastante': 1.3,
        'poco': 0.7,
        'algo': 0.8
      },
      'ht': {
        'anpil': 1.5,   // very/much
        'vre': 1.4,     // truly
        'tout': 1.3,    // all/very
        'ase': 1.2,     // enough/quite
        'ti': 0.7,      // little
        'kèk': 0.8      // some
      },
      'es': {
        'muy': 1.5,
        'súper': 1.8,
        'bastante': 1.3,
        'demasiado': 1.4,
        'poco': 0.7,
        'algo': 0.8
      },
      'en': {
        'very': 1.5,
        'extremely': 1.8,
        'quite': 1.3,
        'rather': 1.2,
        'somewhat': 0.8,
        'slightly': 0.7
      }
    };

    const languageIntensifiers = intensifiers[language] || intensifiers['es'];
    return new Map(Object.entries(languageIntensifiers));
  }

  private initializeSentimentLexicons(): void {
    // Initialize Dominican Spanish lexicon
    this.dominicanSentimentLexicon = new Map([
      // Positive Dominican expressions
      ['brutal', { score: 0.8, weight: 1.2, emotions: { joy: 0.9, trust: 0.6 } }],
      ['vacano', { score: 0.6, weight: 1.0, emotions: { joy: 0.7, trust: 0.5 } }],
      ['jevi', { score: 0.5, weight: 1.0, emotions: { joy: 0.6, trust: 0.4 } }],
      ['klk', { score: 0.2, weight: 0.8, emotions: { joy: 0.4, trust: 0.7 } }],
      ['tiguer', { score: 0.3, weight: 0.9, emotions: { trust: 0.8, joy: 0.4 } }],
      
      // Negative Dominican expressions
      ['pariguayo', { score: -0.7, weight: 1.1, emotions: { anger: 0.6, disgust: 0.7 } }],
      ['tecato', { score: -0.8, weight: 1.2, emotions: { disgust: 0.9, fear: 0.5 } }],
      ['chercha', { score: -0.4, weight: 1.0, emotions: { anger: 0.5, sadness: 0.4 } }],
      ['manigua', { score: -0.3, weight: 0.8, emotions: { sadness: 0.4, fear: 0.3 } }],
      
      // Common positive words
      ['bueno', { score: 0.5, weight: 1.0, emotions: { joy: 0.6, trust: 0.5 } }],
      ['excelente', { score: 0.8, weight: 1.1, emotions: { joy: 0.8, trust: 0.7 } }],
      ['genial', { score: 0.7, weight: 1.0, emotions: { joy: 0.8, surprise: 0.4 } }],
      ['perfecto', { score: 0.8, weight: 1.1, emotions: { joy: 0.9, trust: 0.8 } }],
      ['feliz', { score: 0.9, weight: 1.2, emotions: { joy: 0.9, trust: 0.6 } }],
      
      // Common negative words
      ['malo', { score: -0.5, weight: 1.0, emotions: { anger: 0.5, disgust: 0.6 } }],
      ['terrible', { score: -0.8, weight: 1.1, emotions: { fear: 0.7, anger: 0.6 } }],
      ['horrible', { score: -0.8, weight: 1.1, emotions: { disgust: 0.8, fear: 0.6 } }],
      ['triste', { score: -0.7, weight: 1.1, emotions: { sadness: 0.9, fear: 0.3 } }],
      ['enojado', { score: -0.6, weight: 1.0, emotions: { anger: 0.9, disgust: 0.4 } }]
    ]);

    // Initialize Haitian Creole lexicon
    this.haitianSentimentLexicon = new Map([
      // Positive Creole words
      ['bon', { score: 0.6, weight: 1.0, emotions: { joy: 0.6, trust: 0.7 } }],
      ['bèl', { score: 0.5, weight: 1.0, emotions: { joy: 0.5, surprise: 0.4 } }],
      ['kè kontan', { score: 0.9, weight: 1.3, emotions: { joy: 0.9, trust: 0.7 } }],
      ['renmen', { score: 0.8, weight: 1.2, emotions: { joy: 0.8, trust: 0.9 } }],
      ['kontan', { score: 0.7, weight: 1.1, emotions: { joy: 0.8, trust: 0.6 } }],
      
      // Negative Creole words
      ['move', { score: -0.6, weight: 1.0, emotions: { anger: 0.6, disgust: 0.5 } }],
      ['tristès', { score: -0.7, weight: 1.1, emotions: { sadness: 0.9, fear: 0.4 } }],
      ['fache', { score: -0.6, weight: 1.0, emotions: { anger: 0.8, disgust: 0.4 } }],
      ['pwoblèm', { score: -0.4, weight: 0.9, emotions: { sadness: 0.5, fear: 0.6 } }],
      ['difikilte', { score: -0.4, weight: 0.9, emotions: { sadness: 0.6, fear: 0.5 } }],
      
      // Cultural terms
      ['fanmi', { score: 0.6, weight: 1.1, emotions: { joy: 0.6, trust: 0.9 } }],
      ['kominote', { score: 0.5, weight: 1.0, emotions: { trust: 0.8, joy: 0.5 } }],
      ['konpa', { score: 0.7, weight: 1.0, emotions: { joy: 0.9, surprise: 0.5 } }],
      ['kanaval', { score: 0.8, weight: 1.1, emotions: { joy: 0.9, surprise: 0.7 } }],
      ['lakou', { score: 0.4, weight: 1.0, emotions: { trust: 0.7, joy: 0.5 } }]
    ]);

    // Initialize standard Spanish lexicon (subset)
    this.spanishSentimentLexicon = new Map([
      ['excelente', { score: 0.8, weight: 1.1, emotions: { joy: 0.8, trust: 0.7 } }],
      ['bueno', { score: 0.5, weight: 1.0, emotions: { joy: 0.6, trust: 0.6 } }],
      ['genial', { score: 0.7, weight: 1.0, emotions: { joy: 0.8, surprise: 0.4 } }],
      ['perfecto', { score: 0.8, weight: 1.1, emotions: { joy: 0.9, trust: 0.8 } }],
      ['feliz', { score: 0.9, weight: 1.2, emotions: { joy: 0.9, trust: 0.6 } }],
      ['amor', { score: 0.9, weight: 1.2, emotions: { joy: 0.8, trust: 0.9 } }],
      ['alegre', { score: 0.7, weight: 1.1, emotions: { joy: 0.9, trust: 0.5 } }],
      ['esperanza', { score: 0.6, weight: 1.0, emotions: { joy: 0.6, anticipation: 0.8 } }],
      ['malo', { score: -0.5, weight: 1.0, emotions: { anger: 0.5, disgust: 0.6 } }],
      ['terrible', { score: -0.8, weight: 1.1, emotions: { fear: 0.7, anger: 0.6 } }],
      ['horrible', { score: -0.8, weight: 1.1, emotions: { disgust: 0.8, fear: 0.6 } }],
      ['triste', { score: -0.7, weight: 1.1, emotions: { sadness: 0.9, fear: 0.3 } }],
      ['enojado', { score: -0.6, weight: 1.0, emotions: { anger: 0.9, disgust: 0.4 } }],
      ['miedo', { score: -0.6, weight: 1.0, emotions: { fear: 0.9, sadness: 0.4 } }],
      ['odio', { score: -0.9, weight: 1.2, emotions: { anger: 0.9, disgust: 0.8 } }]
    ]);

    // Initialize English lexicon (basic subset)
    this.englishSentimentLexicon = new Map([
      ['excellent', { score: 0.8, weight: 1.1, emotions: { joy: 0.8, trust: 0.7 } }],
      ['good', { score: 0.5, weight: 1.0, emotions: { joy: 0.6, trust: 0.6 } }],
      ['great', { score: 0.7, weight: 1.0, emotions: { joy: 0.8, surprise: 0.4 } }],
      ['perfect', { score: 0.8, weight: 1.1, emotions: { joy: 0.9, trust: 0.8 } }],
      ['happy', { score: 0.9, weight: 1.2, emotions: { joy: 0.9, trust: 0.6 } }],
      ['love', { score: 0.9, weight: 1.2, emotions: { joy: 0.8, trust: 0.9 } }],
      ['bad', { score: -0.5, weight: 1.0, emotions: { anger: 0.5, disgust: 0.6 } }],
      ['terrible', { score: -0.8, weight: 1.1, emotions: { fear: 0.7, anger: 0.6 } }],
      ['horrible', { score: -0.8, weight: 1.1, emotions: { disgust: 0.8, fear: 0.6 } }],
      ['sad', { score: -0.7, weight: 1.1, emotions: { sadness: 0.9, fear: 0.3 } }],
      ['angry', { score: -0.6, weight: 1.0, emotions: { anger: 0.9, disgust: 0.4 } }],
      ['hate', { score: -0.9, weight: 1.2, emotions: { anger: 0.9, disgust: 0.8 } }]
    ]);
  }

  private initializeCulturalModifiers(): void {
    this.culturalModifiers = new Map([
      // Dominican cultural terms
      ['familia', 0.1],
      ['comunidad', 0.1],
      ['negocio', 0.05],
      ['trabajo', 0.05],
      ['colmado', 0.05],
      
      // Haitian cultural terms
      ['fanmi', 0.15],
      ['kominote', 0.1],
      ['lakou', 0.1],
      ['solidarite', 0.15],
      
      // Business terms
      ['cliente', 0.1],
      ['venta', 0.05],
      ['ganancia', 0.2],
      ['perdida', -0.2],
      ['credito', 0.05],
      ['deuda', -0.1]
    ]);
  }

  // Public utility methods
  getSupportedLanguages(): Language[] {
    return ['es-DO', 'ht', 'es', 'en'];
  }

  addCustomSentimentWord(word: string, score: number, language: Language, emotions?: Record<string, number>): void {
    const lexicon = this.getLexiconForLanguage(language);
    lexicon.set(word, {
      score,
      weight: 1.0,
      emotions: emotions || {}
    });
  }

  analyzeEmotionalTone(text: string, language: Language): EmotionalTone {
    const words = this.tokenizeText(text);
    const lexicon = this.getLexiconForLanguage(language);
    const emotions = this.calculateEmotionScores(words, lexicon, language);
    
    const dominantEmotion = emotions.length > 0 ? emotions[0] : null;
    const emotionalIntensity = dominantEmotion ? dominantEmotion.score : 0;
    
    return {
      dominantEmotion: dominantEmotion?.emotion || 'neutral',
      intensity: emotionalIntensity,
      emotionDistribution: emotions,
      tone: this.getToneFromEmotions(emotions)
    };
  }

  private getToneFromEmotions(emotions: EmotionScore[]): string {
    if (emotions.length === 0) return 'neutral';
    
    const dominant = emotions[0];
    
    if (dominant.score > 0.7) {
      switch (dominant.emotion) {
        case 'joy': return 'enthusiastic';
        case 'trust': return 'confident';
        case 'surprise': return 'excited';
        case 'anticipation': return 'hopeful';
        default: return 'positive';
      }
    } else if (dominant.score > 0.3) {
      return 'mildly positive';
    } else if (dominant.score < -0.7) {
      switch (dominant.emotion) {
        case 'anger': return 'hostile';
        case 'fear': return 'anxious';
        case 'sadness': return 'melancholic';
        case 'disgust': return 'repulsed';
        default: return 'negative';
      }
    } else if (dominant.score < -0.3) {
      return 'mildly negative';
    }
    
    return 'neutral';
  }
}

// Supporting interfaces
interface SentimentWord {
  score: number;
  weight: number;
  emotions: Record<string, number>;
}

interface SentimentScores {
  score: number;
  positiveWords: number;
  negativeWords: number;
  neutralWords: number;
  totalSentimentWords: number;
}

interface EmotionalTone {
  dominantEmotion: string;
  intensity: number;
  emotionDistribution: EmotionScore[];
  tone: string;
}