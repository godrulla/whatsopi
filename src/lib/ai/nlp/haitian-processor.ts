/**
 * Haitian Creole Processor for WhatsOpí
 * Specialized text processing for Haitian Creole and Spanish-Creole code-switching
 */

import { AIContext, CulturalMarker } from '../types';

export class HaitianCreoleProcessor {
  private creoleVocabulary: Map<string, CreoleWord>;
  private spanishToCreoleMappings: Map<string, string>;
  private creoleToSpanishMappings: Map<string, string>;
  private grammarPatterns: RegExp[];
  private codeSwitchingMarkers: string[];

  constructor() {
    this.initializeCreoleVocabulary();
    this.initializeLanguageMappings();
    this.initializeGrammarPatterns();
    this.initializeCodeSwitchingMarkers();
  }

  async preprocess(text: string, context: AIContext): Promise<string> {
    let processed = text.trim();

    // Step 1: Normalize Haitian Creole orthography variations
    processed = this.normalizeOrthography(processed);

    // Step 2: Handle code-switching segments
    processed = await this.handleCodeSwitching(processed, context);

    // Step 3: Standardize grammar patterns
    processed = this.standardizeGrammar(processed);

    // Step 4: Expand common abbreviations
    processed = this.expandAbbreviations(processed);

    // Step 5: Clean up text
    processed = this.cleanupText(processed);

    return processed;
  }

  private normalizeOrthography(text: string): string {
    let normalized = text;

    // Common orthographic variations in Haitian Creole
    const orthographicMappings: Record<string, string> = {
      // Standardize 'k' vs 'qu' usage
      'kè': 'kè',
      'ki': 'ki',
      'konsa': 'konsa',
      'kounye a': 'kounye a',
      
      // Standardize nasal vowels
      'an': 'an',
      'en': 'an',
      'on': 'on',
      'un': 'an',
      
      // Common verb variations
      'ap': 'ap',  // progressive marker
      'pap': 'pa ap', // negative progressive
      'pa': 'pa',   // negation
      
      // Pronouns
      'mwen': 'mwen', // I/me
      'ou': 'ou',     // you
      'li': 'li',     // he/she/it
      'nou': 'nou',   // we/us
      'yo': 'yo'      // they/them
    };

    for (const [variant, standard] of Object.entries(orthographicMappings)) {
      const pattern = new RegExp(`\\b${variant}\\b`, 'gi');
      normalized = normalized.replace(pattern, standard);
    }

    return normalized;
  }

  private async handleCodeSwitching(text: string, context: AIContext): Promise<string> {
    // Detect code-switching patterns and normalize them
    let processed = text;

    // Common Spanish-Creole code-switching patterns
    const codeSwitchPatterns: Array<[RegExp, string]> = [
      // "yo estoy" -> "mwen ap" or keep Spanish depending on context
      [/\byo\s+(estoy|soy)\b/gi, 'mwen se'],
      
      // "tu eres" -> "ou se"
      [/\btu\s+eres\b/gi, 'ou se'],
      
      // "él está" -> "li ap"
      [/\bél\s+está\b/gi, 'li ap'],
      
      // Common Spanish connectors in Creole context
      [/\by\s+/gi, 'ak '], // "y" -> "ak" (and)
      [/\bpero\s+/gi, 'men '], // "pero" -> "men" (but)
      [/\bsi\s+/gi, 'si '], // keep "si" as it's similar
      
      // Numbers - keep Spanish numbers as they're commonly used
      // Time expressions
      [/\bahora\s+/gi, 'kounye a '], // "ahora" -> "kounye a"
      [/\bantes\s+/gi, 'anvan '],    // "antes" -> "anvan"
      [/\bdespués\s+/gi, 'apre ']    // "después" -> "apre"
    ];

    for (const [pattern, replacement] of codeSwitchPatterns) {
      processed = processed.replace(pattern, replacement);
    }

    return processed;
  }

  private standardizeGrammar(text: string): string {
    let standardized = text;

    // Haitian Creole grammar standardization patterns
    const grammarRules: Array<[RegExp, string]> = [
      // Tense markers
      [/\b(mwen|ou|li|nou|yo)\s+te\s+/gi, '$1 te '], // past tense
      [/\b(mwen|ou|li|nou|yo)\s+ap\s+/gi, '$1 ap '], // progressive
      [/\b(mwen|ou|li|nou|yo)\s+pral\s+/gi, '$1 pral '], // future
      
      // Negation patterns
      [/\b(mwen|ou|li|nou|yo)\s+pa\s+/gi, '$1 pa '], // negation
      [/\bpa\s+(ka|ap|te|pral)\s+/gi, 'pa $1 '], // negative with tense
      
      // Possession patterns
      [/\b(\w+)\s+mwen\b/gi, function(match, noun) {
        return `${noun} mwen`; // my + noun
      }],
      
      // Plural markers
      [/\b(\w+)\s+yo\b/gi, function(match, noun) {
        // Check if it's actually plural possessive
        if (noun.match(/^(liv|kay|machin|bagay)/)) {
          return `${noun} yo`; // the + noun + plural
        }
        return match;
      }]
    ];

    for (const [pattern, replacement] of grammarRules) {
      if (typeof replacement === 'string') {
        standardized = standardized.replace(pattern, replacement);
      } else {
        standardized = standardized.replace(pattern, replacement as any);
      }
    }

    return standardized;
  }

  private expandAbbreviations(text: string): string {
    const abbreviations: Record<string, string> = {
      // Common Creole abbreviations
      'pk': 'poukisa', // why
      'kijan': 'ki jan', // how
      'konsa': 'konsa', // like that
      'bagay': 'bagay', // thing
      'moun': 'moun', // person
      'kay': 'kay', // house
      'machin': 'machin', // car/machine
      
      // Time abbreviations
      'jodi a': 'jodi a', // today
      'demen': 'demen', // tomorrow
      'iye': 'iye', // yesterday
      
      // Question words
      'ki sa': 'ki sa', // what
      'ki moun': 'ki moun', // who
      'ki kote': 'ki kote', // where
      'kilè': 'kilè' // when
    };

    let expanded = text;
    for (const [abbrev, full] of Object.entries(abbreviations)) {
      const pattern = new RegExp(`\\b${abbrev}\\b`, 'gi');
      expanded = expanded.replace(pattern, full);
    }

    return expanded;
  }

  private cleanupText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix punctuation spacing
      .trim();
  }

  // Extract Haitian Creole cultural markers
  extractCulturalMarkers(text: string): CulturalMarker[] {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Check for Creole vocabulary
    for (const [word, info] of this.creoleVocabulary.entries()) {
      if (lowercaseText.includes(word.toLowerCase())) {
        markers.push({
          type: 'haitian_expression',
          text: word,
          meaning: info.spanish || info.english,
          confidence: info.confidence
        });
      }
    }

    // Check for code-switching markers
    for (const marker of this.codeSwitchingMarkers) {
      if (lowercaseText.includes(marker.toLowerCase())) {
        markers.push({
          type: 'haitian_expression',
          text: marker,
          meaning: 'Code-switching indicator',
          confidence: 0.8
        });
      }
    }

    return markers;
  }

  // Convert between Creole and Spanish
  translateToSpanish(creoleText: string): string {
    let spanish = creoleText;

    for (const [creole, spanishWord] of this.creoleToSpanishMappings.entries()) {
      const pattern = new RegExp(`\\b${creole}\\b`, 'gi');
      spanish = spanish.replace(pattern, spanishWord);
    }

    return spanish;
  }

  translateToCreole(spanishText: string): string {
    let creole = spanishText;

    for (const [spanishWord, creoleWord] of this.spanishToCreoleMappings.entries()) {
      const pattern = new RegExp(`\\b${spanishWord}\\b`, 'gi');
      creole = creole.replace(pattern, creoleWord);
    }

    return creole;
  }

  // Analyze code-switching patterns
  analyzeCodeSwitching(text: string): CodeSwitchingAnalysis {
    const words = text.toLowerCase().split(/\s+/);
    let creoleWords = 0;
    let spanishWords = 0;
    let switchingPoints: CodeSwitchPoint[] = [];
    
    let currentLanguage: 'creole' | 'spanish' | 'unknown' = 'unknown';
    
    words.forEach((word, index) => {
      let wordLanguage: 'creole' | 'spanish' | 'unknown' = 'unknown';
      
      if (this.creoleVocabulary.has(word)) {
        creoleWords++;
        wordLanguage = 'creole';
      } else if (this.spanishToCreoleMappings.has(word)) {
        spanishWords++;
        wordLanguage = 'spanish';
      }
      
      // Detect switching points
      if (currentLanguage !== 'unknown' && wordLanguage !== 'unknown' && 
          currentLanguage !== wordLanguage) {
        switchingPoints.push({
          position: index,
          fromLanguage: currentLanguage,
          toLanguage: wordLanguage,
          word: word,
          context: words.slice(Math.max(0, index - 2), index + 3).join(' ')
        });
      }
      
      if (wordLanguage !== 'unknown') {
        currentLanguage = wordLanguage;
      }
    });

    const totalIdentifiedWords = creoleWords + spanishWords;
    const codeSwitchingRatio = totalIdentifiedWords > 0 ? 
      Math.min(creoleWords, spanishWords) / totalIdentifiedWords : 0;

    return {
      isCodeSwitching: switchingPoints.length > 0,
      creoleWords,
      spanishWords,
      switchingPoints,
      codeSwitchingRatio,
      dominantLanguage: creoleWords > spanishWords ? 'creole' : 'spanish',
      confidence: totalIdentifiedWords / words.length
    };
  }

  // Check if text is primarily Haitian Creole
  isCreole(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/);
    let creoleScore = 0;

    // Check for definitive Creole markers
    const creoleMarkers = ['mwen', 'ou', 'li', 'nou', 'yo', 'ap', 'te', 'pral', 'pa', 'ak'];
    
    words.forEach(word => {
      if (creoleMarkers.includes(word)) {
        creoleScore += 2;
      } else if (this.creoleVocabulary.has(word)) {
        creoleScore += 1;
      }
    });

    return creoleScore > words.length * 0.2; // At least 20% Creole content
  }

  // Get cultural context for Haitian community
  getHaitianCulturalContext(text: string): HaitianCulturalContext {
    const context: HaitianCulturalContext = {
      hasCreoleExpressions: false,
      religiousContext: false,
      musicContext: false,
      foodContext: false,
      familyContext: false,
      communityContext: false,
      culturalTerms: []
    };

    const lowercaseText = text.toLowerCase();

    // Check for Creole expressions
    for (const word of this.creoleVocabulary.keys()) {
      if (lowercaseText.includes(word.toLowerCase())) {
        context.hasCreoleExpressions = true;
        context.culturalTerms.push(word);
      }
    }

    // Check for cultural context markers
    const culturalMarkers = {
      religious: ['bondye', 'legliz', 'priye', 'benediksyon', 'vodou', 'lwa'],
      music: ['konpa', 'mizik', 'danse', 'kanaval', 'rara', 'twoubadou'],
      food: ['diri', 'pwa', 'bannann', 'kasav', 'griot', 'boukannen'],
      family: ['fanmi', 'manman', 'papa', 'pitit', 'frè', 'sè'],
      community: ['lakou', 'vwazen', 'kominote', 'kay', 'moun']
    };

    for (const [category, terms] of Object.entries(culturalMarkers)) {
      const found = terms.some(term => lowercaseText.includes(term));
      if (found) {
        switch (category) {
          case 'religious':
            context.religiousContext = true;
            break;
          case 'music':
            context.musicContext = true;
            break;
          case 'food':
            context.foodContext = true;
            break;
          case 'family':
            context.familyContext = true;
            break;
          case 'community':
            context.communityContext = true;
            break;
        }
      }
    }

    return context;
  }

  private initializeCreoleVocabulary(): void {
    this.creoleVocabulary = new Map([
      // Pronouns and basic words
      ['mwen', { english: 'I/me', spanish: 'yo/mi', confidence: 0.95, category: 'pronoun' }],
      ['ou', { english: 'you', spanish: 'tú/usted', confidence: 0.95, category: 'pronoun' }],
      ['li', { english: 'he/she/it', spanish: 'él/ella', confidence: 0.95, category: 'pronoun' }],
      ['nou', { english: 'we/us', spanish: 'nosotros', confidence: 0.95, category: 'pronoun' }],
      ['yo', { english: 'they/them', spanish: 'ellos/ellas', confidence: 0.95, category: 'pronoun' }],
      
      // Verbs and tense markers
      ['ap', { english: 'is/are (progressive)', spanish: 'está/están', confidence: 0.95, category: 'tense' }],
      ['te', { english: 'was/were (past)', spanish: 'estaba/era', confidence: 0.95, category: 'tense' }],
      ['pral', { english: 'will/going to', spanish: 'va a/irá', confidence: 0.95, category: 'tense' }],
      ['ka', { english: 'can/able to', spanish: 'puede', confidence: 0.90, category: 'modal' }],
      
      // Common verbs
      ['ale', { english: 'go', spanish: 'ir', confidence: 0.90, category: 'verb' }],
      ['vini', { english: 'come', spanish: 'venir', confidence: 0.90, category: 'verb' }],
      ['wè', { english: 'see', spanish: 'ver', confidence: 0.90, category: 'verb' }],
      ['pale', { english: 'speak', spanish: 'hablar', confidence: 0.90, category: 'verb' }],
      ['manje', { english: 'eat', spanish: 'comer', confidence: 0.90, category: 'verb' }],
      
      // Negation and conjunctions
      ['pa', { english: 'not', spanish: 'no', confidence: 0.95, category: 'negation' }],
      ['ak', { english: 'with/and', spanish: 'con/y', confidence: 0.95, category: 'conjunction' }],
      ['men', { english: 'but', spanish: 'pero', confidence: 0.90, category: 'conjunction' }],
      
      // Question words
      ['ki sa', { english: 'what', spanish: 'qué', confidence: 0.95, category: 'question' }],
      ['ki moun', { english: 'who', spanish: 'quién', confidence: 0.95, category: 'question' }],
      ['ki kote', { english: 'where', spanish: 'dónde', confidence: 0.95, category: 'question' }],
      ['kilè', { english: 'when', spanish: 'cuándo', confidence: 0.90, category: 'question' }],
      ['poukisa', { english: 'why', spanish: 'por qué', confidence: 0.90, category: 'question' }],
      
      // Common nouns
      ['kay', { english: 'house', spanish: 'casa', confidence: 0.90, category: 'noun' }],
      ['moun', { english: 'person', spanish: 'persona', confidence: 0.90, category: 'noun' }],
      ['bagay', { english: 'thing', spanish: 'cosa', confidence: 0.90, category: 'noun' }],
      ['machin', { english: 'car', spanish: 'carro', confidence: 0.90, category: 'noun' }],
      ['dlo', { english: 'water', spanish: 'agua', confidence: 0.90, category: 'noun' }],
      
      // Time expressions
      ['jodi a', { english: 'today', spanish: 'hoy', confidence: 0.90, category: 'time' }],
      ['demen', { english: 'tomorrow', spanish: 'mañana', confidence: 0.90, category: 'time' }],
      ['iye', { english: 'yesterday', spanish: 'ayer', confidence: 0.90, category: 'time' }],
      ['kounye a', { english: 'now', spanish: 'ahora', confidence: 0.90, category: 'time' }],
      
      // Cultural terms
      ['konpa', { english: 'Haitian music genre', spanish: 'género musical haitiano', confidence: 0.95, category: 'culture' }],
      ['rara', { english: 'Haitian festival music', spanish: 'música festival haitiano', confidence: 0.95, category: 'culture' }],
      ['vodou', { english: 'Vodou religion', spanish: 'religión vodú', confidence: 0.95, category: 'religion' }],
      ['lakou', { english: 'family compound', spanish: 'conjunto familiar', confidence: 0.90, category: 'culture' }],
      
      // Food
      ['diri', { english: 'rice', spanish: 'arroz', confidence: 0.90, category: 'food' }],
      ['pwa', { english: 'beans', spanish: 'frijoles', confidence: 0.90, category: 'food' }],
      ['bannann', { english: 'banana', spanish: 'plátano', confidence: 0.90, category: 'food' }],
      ['kasav', { english: 'cassava bread', spanish: 'pan de yuca', confidence: 0.95, category: 'food' }],
      
      // Family
      ['manman', { english: 'mother', spanish: 'madre', confidence: 0.90, category: 'family' }],
      ['papa', { english: 'father', spanish: 'padre', confidence: 0.90, category: 'family' }],
      ['pitit', { english: 'child', spanish: 'hijo/niño', confidence: 0.90, category: 'family' }],
      ['frè', { english: 'brother', spanish: 'hermano', confidence: 0.90, category: 'family' }],
      ['sè', { english: 'sister', spanish: 'hermana', confidence: 0.90, category: 'family' }]
    ]);
  }

  private initializeLanguageMappings(): void {
    // Spanish to Creole mappings
    this.spanishToCreoleMappings = new Map([
      ['yo', 'mwen'],
      ['tú', 'ou'],
      ['él', 'li'],
      ['ella', 'li'],
      ['nosotros', 'nou'],
      ['ellos', 'yo'],
      ['ellas', 'yo'],
      ['soy', 'se'],
      ['eres', 'se'],
      ['es', 'se'],
      ['somos', 'se'],
      ['son', 'se'],
      ['estoy', 'ap'],
      ['estás', 'ap'],
      ['está', 'ap'],
      ['estamos', 'ap'],
      ['están', 'ap'],
      ['y', 'ak'],
      ['con', 'ak'],
      ['pero', 'men'],
      ['no', 'pa'],
      ['qué', 'ki sa'],
      ['quién', 'ki moun'],
      ['dónde', 'ki kote'],
      ['cuándo', 'kilè'],
      ['por qué', 'poukisa'],
      ['casa', 'kay'],
      ['persona', 'moun'],
      ['cosa', 'bagay'],
      ['agua', 'dlo'],
      ['hoy', 'jodi a'],
      ['mañana', 'demen'],
      ['ayer', 'iye'],
      ['ahora', 'kounye a']
    ]);

    // Creole to Spanish mappings (reverse)
    this.creoleToSpanishMappings = new Map();
    for (const [spanish, creole] of this.spanishToCreoleMappings.entries()) {
      this.creoleToSpanishMappings.set(creole, spanish);
    }
  }

  private initializeGrammarPatterns(): void {
    this.grammarPatterns = [
      // Tense marker patterns
      /\b(mwen|ou|li|nou|yo)\s+(te|ap|pral|ka)\s+\w+/gi,
      
      // Negation patterns
      /\bpa\s+(te|ap|pral|ka)\s+/gi,
      /\b(mwen|ou|li|nou|yo)\s+pa\s+/gi,
      
      // Question patterns
      /\b(ki\s+sa|ki\s+moun|ki\s+kote|kilè|poukisa)\s+/gi,
      
      // Possession patterns
      /\b\w+\s+(mwen|ou|li|nou|yo)\b/gi
    ];
  }

  private initializeCodeSwitchingMarkers(): void {
    this.codeSwitchingMarkers = [
      // Mixed language discourse markers
      'pero mwen', 'pero li', 'pero nou',
      'y mwen', 'y li', 'y nou',
      'si mwen', 'si ou', 'si li',
      'porque mwen', 'porque li',
      'cuando mwen', 'cuando nou',
      'donde mwen ka', 'donde nou ka',
      
      // Language switching phrases
      'yo digo que', 'li di que',
      'mwen panse que', 'nou kwè que',
      'es que mwen', 'es que nou',
      'pero ak', 'y ak',
      'si ak', 'cuando ak'
    ];
  }
}

// Supporting interfaces
interface CreoleWord {
  english: string;
  spanish: string;
  confidence: number;
  category: string;
}

interface CodeSwitchingAnalysis {
  isCodeSwitching: boolean;
  creoleWords: number;
  spanishWords: number;
  switchingPoints: CodeSwitchPoint[];
  codeSwitchingRatio: number;
  dominantLanguage: 'creole' | 'spanish';
  confidence: number;
}

interface CodeSwitchPoint {
  position: number;
  fromLanguage: 'creole' | 'spanish';
  toLanguage: 'creole' | 'spanish';
  word: string;
  context: string;
}

interface HaitianCulturalContext {
  hasCreoleExpressions: boolean;
  religiousContext: boolean;
  musicContext: boolean;
  foodContext: boolean;
  familyContext: boolean;
  communityContext: boolean;
  culturalTerms: string[];
}