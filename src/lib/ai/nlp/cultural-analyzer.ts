/**
 * Cultural Analyzer for WhatsOpí
 * Analyzes cultural markers and context in Dominican and Haitian text
 */

import { Language, CulturalMarker, AIContext } from '../types';

export class CulturalAnalyzer {
  private dominicanMarkers: Map<string, CulturalMarkerInfo>;
  private haitianMarkers: Map<string, CulturalMarkerInfo>;
  private caribbeanMarkers: Map<string, CulturalMarkerInfo>;

  constructor() {
    this.initializeCulturalMarkers();
  }

  async analyzeCulturalMarkers(
    text: string, 
    language: Language, 
    context: AIContext
  ): Promise<CulturalMarker[]> {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Get appropriate marker set based on language
    const markerSets = this.getMarkerSetsForLanguage(language);

    // Analyze each marker set
    for (const [markerSet, description] of markerSets) {
      for (const [expression, info] of markerSet.entries()) {
        if (this.textContainsExpression(lowercaseText, expression)) {
          markers.push({
            type: info.type,
            text: expression,
            meaning: info.meaning,
            confidence: this.calculateMarkerConfidence(info, language, context)
          });
        }
      }
    }

    // Add context-specific cultural analysis
    const contextualMarkers = this.analyzeContextualCulture(text, language, context);
    markers.push(...contextualMarkers);

    // Remove duplicates and sort by confidence
    return this.deduplicateAndSort(markers);
  }

  private getMarkerSetsForLanguage(language: Language): Array<[Map<string, CulturalMarkerInfo>, string]> {
    const sets: Array<[Map<string, CulturalMarkerInfo>, string]> = [
      [this.caribbeanMarkers, 'Caribbean Common']
    ];

    switch (language) {
      case 'es-DO':
        sets.unshift([this.dominicanMarkers, 'Dominican Spanish']);
        break;
      case 'ht':
        sets.unshift([this.haitianMarkers, 'Haitian Creole']);
        break;
      case 'es':
        // For standard Spanish, use Caribbean markers only
        break;
    }

    return sets;
  }

  private textContainsExpression(text: string, expression: string): boolean {
    // Handle both exact matches and pattern-based matches
    if (expression.includes('*') || expression.includes('?')) {
      const pattern = expression
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`\\b${pattern}\\b`, 'i').test(text);
    } else {
      return text.includes(expression.toLowerCase());
    }
  }

  private calculateMarkerConfidence(
    info: CulturalMarkerInfo, 
    language: Language, 
    context: AIContext
  ): number {
    let confidence = info.baseConfidence;

    // Language-specific boosts
    if (language === 'es-DO' && info.dominicanSpecific) {
      confidence = Math.min(confidence * 1.3, 1.0);
    }

    if (language === 'ht' && info.haitianSpecific) {
      confidence = Math.min(confidence * 1.3, 1.0);
    }

    // Context boosts
    if (context.location?.country === 'DO' && info.dominicanSpecific) {
      confidence = Math.min(confidence * 1.2, 1.0);
    }

    if (context.businessContext?.colmadoId && info.businessRelevant) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    // Regional context
    if (context.culturalContext?.region && info.regionalVariations) {
      const regionBoost = info.regionalVariations[context.culturalContext.region];
      if (regionBoost) {
        confidence = Math.min(confidence * regionBoost, 1.0);
      }
    }

    return confidence;
  }

  private analyzeContextualCulture(
    text: string, 
    language: Language, 
    context: AIContext
  ): CulturalMarker[] {
    const markers: CulturalMarker[] = [];

    // Analyze formality level
    const formalityMarker = this.analyzeFormalityLevel(text, language);
    if (formalityMarker) {
      markers.push(formalityMarker);
    }

    // Analyze social distance indicators
    const socialMarkers = this.analyzeSocialDistance(text, language);
    markers.push(...socialMarkers);

    // Analyze time and seasonal references
    const timeMarkers = this.analyzeTimeReferences(text, language);
    markers.push(...timeMarkers);

    // Analyze economic context
    const economicMarkers = this.analyzeEconomicContext(text, language, context);
    markers.push(...economicMarkers);

    return markers;
  }

  private analyzeFormalityLevel(text: string, language: Language): CulturalMarker | null {
    const lowercaseText = text.toLowerCase();
    
    const formalIndicators = ['usted', 'ustedes', 'señor', 'señora', 'don', 'doña', 'disculpe'];
    const informalIndicators = ['tú', 'tu', 'vos', 'che', 'pana', 'tiguer', 'klk'];

    const formalCount = formalIndicators.filter(indicator => lowercaseText.includes(indicator)).length;
    const informalCount = informalIndicators.filter(indicator => lowercaseText.includes(indicator)).length;

    if (formalCount > informalCount && formalCount > 0) {
      return {
        type: 'formal_spanish',
        text: 'formal register',
        meaning: 'Text uses formal Spanish register',
        confidence: 0.8
      };
    } else if (informalCount > formalCount && informalCount > 0) {
      return {
        type: 'informal_spanish',
        text: 'informal register',
        meaning: 'Text uses informal Spanish register',
        confidence: 0.8
      };
    }

    return null;
  }

  private analyzeSocialDistance(text: string, language: Language): CulturalMarker[] {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Close relationship indicators
    const closeIndicators = ['mi pana', 'mi tiguer', 'hermano', 'brother', 'mi loco'];
    const distantIndicators = ['estimado', 'apreciado', 'distinguido'];

    for (const indicator of closeIndicators) {
      if (lowercaseText.includes(indicator)) {
        markers.push({
          type: 'dominican_expression',
          text: indicator,
          meaning: 'Indicates close social relationship',
          confidence: 0.85
        });
      }
    }

    for (const indicator of distantIndicators) {
      if (lowercaseText.includes(indicator)) {
        markers.push({
          type: 'formal_spanish',
          text: indicator,
          meaning: 'Indicates formal/distant social relationship',
          confidence: 0.9
        });
      }
    }

    return markers;
  }

  private analyzeTimeReferences(text: string, language: Language): CulturalMarker[] {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Dominican time expressions
    const dominicanTimeExpressions = {
      'ahorita': 'Dominican way of saying "right now" (often means later)',
      'al ratito': 'In a little while (Dominican usage)',
      'ahora mismo': 'Right now (Dominican emphasis)',
      'por ahí': 'Around that time (vague Dominican time reference)'
    };

    for (const [expression, meaning] of Object.entries(dominicanTimeExpressions)) {
      if (lowercaseText.includes(expression)) {
        markers.push({
          type: 'dominican_expression',
          text: expression,
          meaning,
          confidence: 0.8
        });
      }
    }

    // Seasonal/cultural time references
    const culturalTimeReferences = {
      'tiempo de zafra': 'Sugar cane harvest season',
      'tiempo de lluvia': 'Rainy season',
      'navidad': 'Christmas season (culturally significant)',
      'semana santa': 'Holy Week (important cultural period)',
      'carnaval': 'Carnival season'
    };

    for (const [reference, meaning] of Object.entries(culturalTimeReferences)) {
      if (lowercaseText.includes(reference)) {
        markers.push({
          type: 'caribbean_slang',
          text: reference,
          meaning,
          confidence: 0.9
        });
      }
    }

    return markers;
  }

  private analyzeEconomicContext(
    text: string, 
    language: Language, 
    context: AIContext
  ): CulturalMarker[] {
    const markers: CulturalMarker[] = [];
    const lowercaseText = text.toLowerCase();

    // Informal economy indicators
    const informalEconomyTerms = {
      'colmado': 'Corner store, central to Dominican commerce',
      'banca': 'Informal lottery system',
      'ventorrillo': 'Small informal store',
      'chiripá': 'Informal work/odd jobs',
      'buscar peso': 'Looking for money/work',
      'hacer un tigueraje': 'Informal business deal',
      'tato': 'Money (Dominican slang)'
    };

    for (const [term, meaning] of Object.entries(informalEconomyTerms)) {
      if (lowercaseText.includes(term)) {
        markers.push({
          type: 'dominican_expression',
          text: term,
          meaning,
          confidence: 0.9
        });
      }
    }

    // Payment and transaction terms
    const paymentTerms = {
      'fiado': 'Buy on credit/trust',
      'dar fiado': 'Give credit/sell on trust',
      'pagar al final': 'Pay at the end (informal credit)',
      'cuenta corriente': 'Running account (informal credit system)'
    };

    for (const [term, meaning] of Object.entries(paymentTerms)) {
      if (lowercaseText.includes(term)) {
        markers.push({
          type: 'dominican_expression',
          text: term,
          meaning,
          confidence: 0.85
        });
      }
    }

    return markers;
  }

  private deduplicateAndSort(markers: CulturalMarker[]): CulturalMarker[] {
    // Remove duplicates based on text and type
    const seen = new Set<string>();
    const deduplicated: CulturalMarker[] = [];

    for (const marker of markers) {
      const key = `${marker.type}-${marker.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(marker);
      }
    }

    // Sort by confidence (descending)
    return deduplicated.sort((a, b) => b.confidence - a.confidence);
  }

  private initializeCulturalMarkers(): void {
    // Dominican cultural markers
    this.dominicanMarkers = new Map([
      // Greetings and expressions
      ['klk', {
        type: 'dominican_expression',
        meaning: 'What\'s up? (Dominican greeting)',
        baseConfidence: 0.95,
        dominicanSpecific: true,
        regionalVariations: { 'capital': 1.2, 'northern': 1.1, 'southern': 1.0 }
      }],
      ['que lo que', {
        type: 'dominican_expression',
        meaning: 'What\'s up? (Dominican greeting)',
        baseConfidence: 0.95,
        dominicanSpecific: true
      }],
      ['como tu ta', {
        type: 'dominican_expression',
        meaning: 'How are you? (Dominican informal)',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['tiguer', {
        type: 'dominican_expression',
        meaning: 'Friend, buddy (Dominican slang)',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],

      // Cultural expressions
      ['brutal', {
        type: 'dominican_expression',
        meaning: 'Awesome, great (Dominican slang)',
        baseConfidence: 0.85,
        dominicanSpecific: true
      }],
      ['jevi', {
        type: 'dominican_expression',
        meaning: 'Cool, nice (Dominican slang)',
        baseConfidence: 0.8,
        dominicanSpecific: true
      }],
      ['vacano', {
        type: 'dominican_expression',
        meaning: 'Cool, nice (Dominican slang)',
        baseConfidence: 0.8,
        dominicanSpecific: true
      }],
      ['chin', {
        type: 'dominican_expression',
        meaning: 'A little bit (Dominican slang)',
        baseConfidence: 0.85,
        dominicanSpecific: true
      }],

      // Business and commerce
      ['colmado', {
        type: 'dominican_expression',
        meaning: 'Corner store, central to Dominican commerce',
        baseConfidence: 0.95,
        dominicanSpecific: true,
        businessRelevant: true
      }],
      ['ventorrillo', {
        type: 'dominican_expression',
        meaning: 'Small informal store',
        baseConfidence: 0.9,
        dominicanSpecific: true,
        businessRelevant: true
      }],
      ['cuarto', {
        type: 'dominican_expression',
        meaning: 'Money (Dominican slang)',
        baseConfidence: 0.8,
        dominicanSpecific: true,
        businessRelevant: true
      }],
      ['tato', {
        type: 'dominican_expression',
        meaning: 'Money (Dominican slang)',
        baseConfidence: 0.85,
        dominicanSpecific: true,
        businessRelevant: true
      }],

      // Food and culture
      ['mangú', {
        type: 'dominican_expression',
        meaning: 'Traditional Dominican breakfast dish',
        baseConfidence: 0.95,
        dominicanSpecific: true
      }],
      ['sancocho', {
        type: 'dominican_expression',
        meaning: 'Traditional Dominican stew',
        baseConfidence: 0.95,
        dominicanSpecific: true
      }],
      ['locrio', {
        type: 'dominican_expression',
        meaning: 'Dominican rice dish',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['mamajuana', {
        type: 'dominican_expression',
        meaning: 'Traditional Dominican herbal drink',
        baseConfidence: 0.95,
        dominicanSpecific: true
      }],

      // Geography and places
      ['quisqueya', {
        type: 'dominican_expression',
        meaning: 'Poetic name for Dominican Republic',
        baseConfidence: 0.95,
        dominicanSpecific: true
      }],
      ['cibao', {
        type: 'dominican_expression',
        meaning: 'Northern region of Dominican Republic',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['guagua', {
        type: 'dominican_expression',
        meaning: 'Public bus (Dominican term)',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['yipeta', {
        type: 'dominican_expression',
        meaning: 'SUV (Dominican slang)',
        baseConfidence: 0.85,
        dominicanSpecific: true
      }]
    ]);

    // Haitian cultural markers
    this.haitianMarkers = new Map([
      // Greetings
      ['sak pase', {
        type: 'haitian_expression',
        meaning: 'What\'s up? (Haitian Creole greeting)',
        baseConfidence: 0.95,
        haitianSpecific: true
      }],
      ['nap boule', {
        type: 'haitian_expression',
        meaning: 'We\'re hanging in there (common response)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],
      ['ki jan ou ye', {
        type: 'haitian_expression',
        meaning: 'How are you? (Haitian Creole)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],

      // Cultural terms
      ['lakou', {
        type: 'haitian_expression',
        meaning: 'Family compound (Haitian cultural concept)',
        baseConfidence: 0.95,
        haitianSpecific: true
      }],
      ['konpa', {
        type: 'haitian_expression',
        meaning: 'Haitian music genre',
        baseConfidence: 0.95,
        haitianSpecific: true
      }],
      ['rara', {
        type: 'haitian_expression',
        meaning: 'Haitian festival music and celebration',
        baseConfidence: 0.95,
        haitianSpecific: true
      }],
      ['kanaval', {
        type: 'haitian_expression',
        meaning: 'Carnival (Haitian Creole)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],

      // Food and culture
      ['griot', {
        type: 'haitian_expression',
        meaning: 'Fried pork dish (Haitian cuisine)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],
      ['boukannen', {
        type: 'haitian_expression',
        meaning: 'Grilled meat (Haitian cuisine)',
        baseConfidence: 0.85,
        haitianSpecific: true
      }],
      ['kasav', {
        type: 'haitian_expression',
        meaning: 'Cassava bread (Haitian food)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],

      // Social and family
      ['fanmi', {
        type: 'haitian_expression',
        meaning: 'Family (very important in Haitian culture)',
        baseConfidence: 0.9,
        haitianSpecific: true
      }],
      ['kominote', {
        type: 'haitian_expression',
        meaning: 'Community (Haitian Creole)',
        baseConfidence: 0.85,
        haitianSpecific: true
      }]
    ]);

    // Caribbean common markers
    this.caribbeanMarkers = new Map([
      // Music and dance
      ['merengue', {
        type: 'caribbean_slang',
        meaning: 'Dominican music genre',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['bachata', {
        type: 'caribbean_slang',
        meaning: 'Dominican music genre',
        baseConfidence: 0.9,
        dominicanSpecific: true
      }],
      ['salsa', {
        type: 'caribbean_slang',
        meaning: 'Caribbean music genre',
        baseConfidence: 0.8
      }],

      // Common expressions
      ['ay dios mio', {
        type: 'caribbean_slang',
        meaning: 'Oh my God (Caribbean Spanish)',
        baseConfidence: 0.8
      }],
      ['que vaina', {
        type: 'caribbean_slang',
        meaning: 'What a thing/situation (Caribbean expression)',
        baseConfidence: 0.8
      }],

      // Food
      ['plátano', {
        type: 'caribbean_slang',
        meaning: 'Plantain (important Caribbean food)',
        baseConfidence: 0.7
      }],
      ['yuca', {
        type: 'caribbean_slang',
        meaning: 'Cassava (Caribbean staple food)',
        baseConfidence: 0.7
      }],

      // Social
      ['compadre', {
        type: 'caribbean_slang',
        meaning: 'Close friend/godfather (Caribbean term)',
        baseConfidence: 0.8
      }],
      ['vecino', {
        type: 'caribbean_slang',
        meaning: 'Neighbor (important in Caribbean community culture)',
        baseConfidence: 0.6
      }]
    ]);
  }

  // Public utility methods
  getCulturalInsights(text: string, language: Language): CulturalInsights {
    const markers = this.analyzeCulturalMarkers(text, language, {
      sessionId: 'temp',
      language,
      timestamp: new Date()
    });

    return markers.then(m => ({
      primaryCulture: this.determinePrimaryCulture(m, language),
      informalityLevel: this.calculateInformalityLevel(m),
      businessContext: this.hasBusinessContext(m),
      religiousContext: this.hasReligiousContext(text),
      familyContext: this.hasFamilyContext(m),
      regionalIndicators: this.getRegionalIndicators(m),
      recommendations: this.getCulturalRecommendations(m, language)
    }));
  }

  private determinePrimaryCulture(markers: CulturalMarker[], language: Language): string {
    const dominicanCount = markers.filter(m => m.type === 'dominican_expression').length;
    const haitianCount = markers.filter(m => m.type === 'haitian_expression').length;
    const caribbeanCount = markers.filter(m => m.type === 'caribbean_slang').length;

    if (dominicanCount > haitianCount && dominicanCount > 0) {
      return 'Dominican';
    } else if (haitianCount > 0) {
      return 'Haitian';
    } else if (caribbeanCount > 0) {
      return 'Caribbean';
    } else {
      return language === 'es-DO' ? 'Dominican' : 'Standard';
    }
  }

  private calculateInformalityLevel(markers: CulturalMarker[]): number {
    const informalMarkers = markers.filter(m => 
      m.type === 'dominican_expression' || 
      m.type === 'haitian_expression' ||
      m.type === 'informal_spanish'
    );

    return Math.min(informalMarkers.length * 0.2, 1.0);
  }

  private hasBusinessContext(markers: CulturalMarker[]): boolean {
    return markers.some(m => 
      m.text.includes('colmado') || 
      m.text.includes('negocio') ||
      m.text.includes('cuarto') ||
      m.text.includes('tato')
    );
  }

  private hasReligiousContext(text: string): boolean {
    const religiousTerms = ['dios', 'bendición', 'iglesia', 'rezar', 'orar', 'bondye', 'legliz'];
    return religiousTerms.some(term => text.toLowerCase().includes(term));
  }

  private hasFamilyContext(markers: CulturalMarker[]): boolean {
    return markers.some(m => 
      m.text.includes('familia') || 
      m.text.includes('fanmi') ||
      m.meaning?.includes('family')
    );
  }

  private getRegionalIndicators(markers: CulturalMarker[]): string[] {
    const regions: string[] = [];
    
    for (const marker of markers) {
      if (marker.text.includes('cibao')) regions.push('Northern Dominican Republic');
      if (marker.text.includes('capital') || marker.text.includes('santo domingo')) regions.push('Dominican Capital');
      if (marker.text.includes('este')) regions.push('Eastern Dominican Republic');
      if (marker.text.includes('sur')) regions.push('Southern Dominican Republic');
      if (marker.text.includes('pòtoprens')) regions.push('Port-au-Prince');
      if (marker.text.includes('kapayisyen')) regions.push('Northern Haiti');
    }
    
    return [...new Set(regions)];
  }

  private getCulturalRecommendations(markers: CulturalMarker[], language: Language): string[] {
    const recommendations: string[] = [];
    
    const informalityLevel = this.calculateInformalityLevel(markers);
    
    if (informalityLevel > 0.7) {
      recommendations.push('Text uses very informal language - appropriate for casual conversation');
    }
    
    if (this.hasBusinessContext(markers)) {
      recommendations.push('Text has commercial context - consider business-appropriate responses');
    }
    
    if (language === 'es-DO' && markers.length === 0) {
      recommendations.push('Consider adding Dominican cultural expressions for local appeal');
    }
    
    return recommendations;
  }
}

// Supporting interfaces
interface CulturalMarkerInfo {
  type: 'dominican_expression' | 'haitian_expression' | 'caribbean_slang' | 'formal_spanish' | 'informal_spanish';
  meaning: string;
  baseConfidence: number;
  dominicanSpecific?: boolean;
  haitianSpecific?: boolean;
  businessRelevant?: boolean;
  regionalVariations?: Record<string, number>;
}

interface CulturalInsights {
  primaryCulture: string;
  informalityLevel: number;
  businessContext: boolean;
  religiousContext: boolean;
  familyContext: boolean;
  regionalIndicators: string[];
  recommendations: string[];
}