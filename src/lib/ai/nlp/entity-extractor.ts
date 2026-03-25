/**
 * Entity Extractor for WhatsOpí
 * Multi-language named entity recognition with Dominican and Haitian context
 */

import { Language, Entity, EntityType, AIContext } from '../types';

export class EntityExtractor {
  private dominicanPatterns: Map<EntityType, RegExp[]>;
  private haitianPatterns: Map<EntityType, RegExp[]>;
  private spanishPatterns: Map<EntityType, RegExp[]>;
  private englishPatterns: Map<EntityType, RegExp[]>;
  private dominicanGazetteer: Map<EntityType, Set<string>>;
  private haitianGazetteer: Map<EntityType, Set<string>>;

  constructor() {
    this.initializePatterns();
    this.initializeGazetteers();
  }

  async extractEntities(text: string, language: Language, context: AIContext): Promise<Entity[]> {
    const entities: Entity[] = [];
    const patterns = this.getPatternsForLanguage(language);
    const gazetteer = this.getGazetteerForLanguage(language);

    // Extract pattern-based entities
    for (const [entityType, regexPatterns] of patterns.entries()) {
      for (const pattern of regexPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              text: match[0].trim(),
              type: entityType,
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              confidence: this.calculatePatternConfidence(entityType, match[0], language),
              metadata: {
                extractionMethod: 'pattern',
                language,
                pattern: pattern.source
              }
            });
          }
        }
      }
    }

    // Extract gazetteer-based entities
    for (const [entityType, terms] of gazetteer.entries()) {
      for (const term of terms) {
        const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              text: match[0].trim(),
              type: entityType,
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              confidence: this.calculateGazetteerConfidence(entityType, term, language),
              metadata: {
                extractionMethod: 'gazetteer',
                language,
                term
              }
            });
          }
        }
      }
    }

    // Remove duplicates and overlaps
    const cleanedEntities = this.removeDuplicatesAndOverlaps(entities);

    // Apply contextual validation
    return this.validateEntitiesInContext(cleanedEntities, context);
  }

  private getPatternsForLanguage(language: Language): Map<EntityType, RegExp[]> {
    switch (language) {
      case 'es-DO':
        return this.dominicanPatterns;
      case 'ht':
        return this.haitianPatterns;
      case 'es':
        return this.spanishPatterns;
      case 'en':
        return this.englishPatterns;
      default:
        return this.spanishPatterns;
    }
  }

  private getGazetteerForLanguage(language: Language): Map<EntityType, Set<string>> {
    switch (language) {
      case 'es-DO':
      case 'es':
        return this.dominicanGazetteer;
      case 'ht':
        return this.haitianGazetteer;
      default:
        return this.dominicanGazetteer;
    }
  }

  private initializePatterns(): void {
    // Dominican Spanish patterns
    this.dominicanPatterns = new Map([
      ['money', [
        /\b(?:RD\$|DOP|peso[s]?)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/gi,
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:peso[s]?|cuarto[s]?|tato[s]?)\b/gi,
        /\b(\d+)\s*(?:peso[s]?|cuarto[s]?)\b/gi
      ]],
      ['phone', [
        /\b(?:\+1[-.\s]?)?8(?:09|29|49)\s*[-.\s]?\d{3}\s*[-.\s]?\d{4}\b/gi,
        /\b8\d{2}[-.\s]?\d{3}[-.\s]?\d{4}\b/gi
      ]],
      ['date', [
        /\b(?:0?[1-9]|[12]\d|3[01])[-\/](?:0?[1-9]|1[0-2])[-\/](?:19|20)?\d{2}\b/gi,
        /\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:0?[1-9]|[12]\d|3[01])(?:,?\s+(?:19|20)?\d{2})?\b/gi
      ]],
      ['time', [
        /\b(?:0?[1-9]|1[0-2]):[0-5]\d\s*(?:am|pm|AM|PM)\b/gi,
        /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/gi
      ]],
      ['email', [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi
      ]],
      ['dominican_location', [
        /\b(?:Santo\s+Domingo|Santiago|San\s+Pedro\s+de\s+Macorís|La\s+Romana|Puerto\s+Plata|Barahona|Higüey|Moca|San\s+Cristóbal|Bani)\b/gi,
        /\b(?:Distrito\s+Nacional|DN|Capital)\b/gi,
        /\b(?:Cibao|Este|Sur|Norte)\b/gi
      ]],
      ['colmado', [
        /\bcolmado\s+(?:[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]*(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]*)*)\b/gi,
        /\b(?:Colmado|COLMADO)\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]*\b/gi
      ]],
      ['local_product', [
        /\b(?:Presidente|Brahma|Corona|Coca[- ]Cola|Pepsi|Malta\s+Morena|Chinola|Jugos\s+Sunny)\b/gi,
        /\b(?:arroz|habichuela[s]?|pollo|cerdo|res|pescado|plátano[s]?|yuca|ñame)\b/gi
      ]]
    ]);

    // Haitian Creole patterns
    this.haitianPatterns = new Map([
      ['money', [
        /\b(?:gourde[s]?|HTG)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/gi,
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*gourde[s]?\b/gi
      ]],
      ['phone', [
        /\b(?:\+509[-.\s]?)?\d{2}\s*[-.\s]?\d{2}\s*[-.\s]?\d{4}\b/gi
      ]],
      ['haitian_location', [
        /\b(?:Pòtoprens|Kapayisyen|Gonayiv|Okay|Sen[- ]Mak|Jakmel|Miragwàn|Fòlibe)\b/gi,
        /\b(?:Nò|Sid|Lwès|Es|Sant)\b/gi
      ]],
      ['person', [
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
      ]]
    ]);

    // Standard Spanish patterns
    this.spanishPatterns = new Map([
      ['money', [
        /\b(?:\$|EUR|€)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/gi,
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:euro[s]?|dólar[es]?)\b/gi
      ]],
      ['phone', [
        /\b(?:\+34[-.\s]?)?\d{3}\s*[-.\s]?\d{3}\s*[-.\s]?\d{3}\b/gi
      ]],
      ['date', [
        /\b(?:0?[1-9]|[12]\d|3[01])[-\/](?:0?[1-9]|1[0-2])[-\/](?:19|20)?\d{2}\b/gi
      ]]
    ]);

    // English patterns
    this.englishPatterns = new Map([
      ['money', [
        /\b(?:\$|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/gi,
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollar[s]?|USD)\b/gi
      ]],
      ['phone', [
        /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi
      ]]
    ]);
  }

  private initializeGazetteers(): void {
    // Dominican gazetteer
    this.dominicanGazetteer = new Map([
      ['dominican_location', new Set([
        'Santo Domingo', 'Santiago', 'San Pedro de Macorís', 'La Romana',
        'Puerto Plata', 'Barahona', 'Higüey', 'Moca', 'San Cristóbal', 'Bani',
        'Azua', 'Bonao', 'La Vega', 'Nagua', 'Samaná', 'Monte Cristi',
        'Distrito Nacional', 'DN', 'Capital', 'Malecón', 'Zona Colonial',
        'Punta Cana', 'Bávaro', 'Cap Cana', 'Juan Dolio', 'Sosúa', 'Cabarete'
      ])],
      ['local_product', new Set([
        'Presidente', 'Brahma', 'Corona Extra', 'Coca Cola', 'Pepsi',
        'Malta Morena', 'Chinola', 'Jugos Sunny', 'Rica', 'Nestlé',
        'Goya', 'Conchita', 'La Famosa', 'Iberia', 'Diana',
        'arroz', 'habichuelas', 'pollo', 'cerdo', 'res', 'pescado',
        'plátano', 'plátanos', 'yuca', 'ñame', 'yautía', 'aguacate',
        'mangos', 'chinola', 'lechoza', 'guayaba'
      ])],
      ['informal_business', new Set([
        'colmado', 'colmados', 'ventorrillo', 'puesto', 'kiosco',
        'banca de lotería', 'motochorro', 'voladoras', 'guagua',
        'conuco', 'finca', 'negocio', 'comercio'
      ])],
      ['organization', new Set([
        'DGII', 'TSS', 'IDSS', 'Banco Central', 'Banreservas',
        'Banco Popular', 'Banco BHD León', 'Scotiabank',
        'Edenorte', 'Edesur', 'Edeeste', 'CAASD', 'Claro', 'Altice', 'Viva'
      ])]
    ]);

    // Haitian gazetteer
    this.haitianGazetteer = new Map([
      ['haitian_location', new Set([
        'Pòtoprens', 'Port-au-Prince', 'Kapayisyen', 'Cap-Haïtien',
        'Gonayiv', 'Gonaïves', 'Okay', 'Aux Cayes', 'Sen Mak', 'Saint-Marc',
        'Jakmel', 'Jacmel', 'Miragwàn', 'Miragoâne', 'Fòlibe', 'Fort-Liberté',
        'Nò', 'Nord', 'Sid', 'Sud', 'Lwès', 'Ouest', 'Es', 'Est'
      ])],
      ['person', new Set([
        // Common Haitian names
        'Jean', 'Marie', 'Pierre', 'Joseph', 'Jacques', 'François',
        'Claude', 'Michel', 'Louis', 'Antoine', 'Rose', 'Yves'
      ])]
    ]);
  }

  private calculatePatternConfidence(entityType: EntityType, text: string, language: Language): number {
    let baseConfidence = 0.8;

    // Adjust confidence based on entity type
    switch (entityType) {
      case 'money':
        baseConfidence = 0.9;
        break;
      case 'phone':
        baseConfidence = 0.85;
        break;
      case 'email':
        baseConfidence = 0.95;
        break;
      case 'date':
      case 'time':
        baseConfidence = 0.8;
        break;
      case 'dominican_location':
      case 'haitian_location':
        baseConfidence = 0.9;
        break;
      case 'local_product':
        baseConfidence = 0.75;
        break;
      default:
        baseConfidence = 0.7;
    }

    // Language-specific adjustments
    if (language === 'es-DO' && ['dominican_location', 'local_product', 'colmado'].includes(entityType)) {
      baseConfidence += 0.1;
    }

    if (language === 'ht' && entityType === 'haitian_location') {
      baseConfidence += 0.1;
    }

    return Math.min(baseConfidence, 1.0);
  }

  private calculateGazetteerConfidence(entityType: EntityType, term: string, language: Language): number {
    let baseConfidence = 0.85;

    // Longer terms generally have higher confidence
    if (term.length > 10) baseConfidence += 0.05;
    if (term.length > 20) baseConfidence += 0.05;

    // Language-specific adjustments
    if (language === 'es-DO' && entityType === 'dominican_location') {
      baseConfidence += 0.1;
    }

    if (language === 'ht' && entityType === 'haitian_location') {
      baseConfidence += 0.1;
    }

    return Math.min(baseConfidence, 1.0);
  }

  private removeDuplicatesAndOverlaps(entities: Entity[]): Entity[] {
    // Sort entities by start position
    const sorted = entities.sort((a, b) => a.startIndex - b.startIndex);
    const cleaned: Entity[] = [];

    for (const entity of sorted) {
      // Check for overlaps with already processed entities
      const hasOverlap = cleaned.some(existing => 
        this.entitiesOverlap(existing, entity)
      );

      if (!hasOverlap) {
        // Check for exact duplicates
        const isDuplicate = cleaned.some(existing => 
          existing.text.toLowerCase() === entity.text.toLowerCase() &&
          existing.type === entity.type &&
          existing.startIndex === entity.startIndex
        );

        if (!isDuplicate) {
          cleaned.push(entity);
        } else {
          // If it's a duplicate, keep the one with higher confidence
          const duplicateIndex = cleaned.findIndex(existing => 
            existing.text.toLowerCase() === entity.text.toLowerCase() &&
            existing.type === entity.type &&
            existing.startIndex === entity.startIndex
          );

          if (duplicateIndex !== -1 && entity.confidence > cleaned[duplicateIndex].confidence) {
            cleaned[duplicateIndex] = entity;
          }
        }
      }
    }

    return cleaned;
  }

  private entitiesOverlap(entity1: Entity, entity2: Entity): boolean {
    return !(entity1.endIndex <= entity2.startIndex || entity2.endIndex <= entity1.startIndex);
  }

  private validateEntitiesInContext(entities: Entity[], context: AIContext): Entity[] {
    return entities.map(entity => {
      let adjustedConfidence = entity.confidence;

      // Contextual validation adjustments
      if (context.location?.country === 'DO' && entity.type === 'dominican_location') {
        adjustedConfidence = Math.min(adjustedConfidence + 0.1, 1.0);
      }

      if (context.businessContext?.colmadoId && entity.type === 'local_product') {
        adjustedConfidence = Math.min(adjustedConfidence + 0.05, 1.0);
      }

      if (context.language === 'es-DO' && entity.type === 'colmado') {
        adjustedConfidence = Math.min(adjustedConfidence + 0.1, 1.0);
      }

      return {
        ...entity,
        confidence: adjustedConfidence
      };
    });
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Public utility methods
  getSupportedEntityTypes(): EntityType[] {
    return [
      'person', 'location', 'organization', 'product', 'money', 'date', 'time',
      'phone', 'email', 'address', 'colmado', 'dominican_location', 'haitian_location',
      'local_product', 'currency', 'informal_business'
    ];
  }

  addCustomEntity(text: string, entityType: EntityType, language: Language): void {
    const gazetteer = this.getGazetteerForLanguage(language);
    if (!gazetteer.has(entityType)) {
      gazetteer.set(entityType, new Set());
    }
    gazetteer.get(entityType)!.add(text);
  }

  extractEntitiesByType(text: string, entityType: EntityType, language: Language): Promise<Entity[]> {
    return this.extractEntities(text, language, {
      sessionId: 'temp',
      language,
      timestamp: new Date()
    }).then(entities => entities.filter(entity => entity.type === entityType));
  }

  // Dominican-specific entity extraction
  extractDominicanEntities(text: string): Promise<Entity[]> {
    return this.extractEntities(text, 'es-DO', {
      sessionId: 'temp',
      language: 'es-DO',
      location: { latitude: 18.4861, longitude: -69.9312, country: 'DO' },
      timestamp: new Date()
    });
  }

  // Haitian-specific entity extraction
  extractHaitianEntities(text: string): Promise<Entity[]> {
    return this.extractEntities(text, 'ht', {
      sessionId: 'temp',
      language: 'ht',
      timestamp: new Date()
    });
  }
}