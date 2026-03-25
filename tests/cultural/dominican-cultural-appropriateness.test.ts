import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DominicanCulturalAnalyzer } from '@/lib/ai/nlp/cultural-analyzer'
import { DominicanNLPProcessor } from '@/lib/ai/nlp/dominican-processor'
import { HaitianCreoleProcessor } from '@/lib/ai/nlp/haitian-processor'
import { LanguageDetector } from '@/lib/ai/nlp/language-detector'

describe('Dominican Cultural Appropriateness', () => {
  let culturalAnalyzer: DominicanCulturalAnalyzer
  let nlpProcessor: DominicanNLPProcessor
  let haitianProcessor: HaitianCreoleProcessor
  let languageDetector: LanguageDetector

  beforeEach(() => {
    culturalAnalyzer = new DominicanCulturalAnalyzer()
    nlpProcessor = new DominicanNLPProcessor()
    haitianProcessor = new HaitianCreoleProcessor()
    languageDetector = new LanguageDetector()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dominican Spanish Language Processing', () => {
    it('should recognize and validate Dominican Spanish expressions', async () => {
      const dominicanExpressions = [
        {
          text: 'Klk tiguer, que lo que',
          expected: {
            isValid: true,
            culturalMarkers: ['klk', 'tiguer', 'que_lo_que'],
            appropriateness: 'high',
            context: 'informal_greeting'
          }
        },
        {
          text: 'Ese colmado está brutal',
          expected: {
            isValid: true,
            culturalMarkers: ['colmado', 'brutal'],
            appropriateness: 'high',
            context: 'business_praise'
          }
        },
        {
          text: 'El pollo está caro como el diablo',
          expected: {
            isValid: true,
            culturalMarkers: ['caro_como_el_diablo'],
            appropriateness: 'medium',
            context: 'price_complaint'
          }
        },
        {
          text: 'Tato está vendiendo a buen precio',
          expected: {
            isValid: true,
            culturalMarkers: ['tato', 'buen_precio'],
            appropriateness: 'high',
            context: 'price_appreciation'
          }
        }
      ]

      for (const expr of dominicanExpressions) {
        const result = await culturalAnalyzer.analyzeCulturalAppropriateness(expr.text)
        
        expect(result.isValid).toBe(expr.expected.isValid)
        expect(result.appropriateness).toBe(expr.expected.appropriateness)
        expect(result.context).toBe(expr.expected.context)
        
        expr.expected.culturalMarkers.forEach(marker => {
          expect(result.culturalMarkers).toContain(marker)
        })
      }
    })

    it('should identify inappropriate or offensive content', async () => {
      const inappropriateContent = [
        {
          text: 'Estos haitianos siempre causan problemas',
          expected: {
            isValid: false,
            issues: ['ethnic_discrimination', 'xenophobia'],
            severity: 'high',
            recommendation: 'block_content'
          }
        },
        {
          text: 'Las mujeres no entienden de negocios',
          expected: {
            isValid: false,
            issues: ['gender_discrimination'],
            severity: 'high',
            recommendation: 'block_content'
          }
        },
        {
          text: 'Los de Santiago son tacaños',
          expected: {
            isValid: false,
            issues: ['regional_stereotype'],
            severity: 'medium',
            recommendation: 'flag_for_review'
          }
        }
      ]

      for (const content of inappropriateContent) {
        const result = await culturalAnalyzer.analyzeCulturalAppropriateness(content.text)
        
        expect(result.isValid).toBe(content.expected.isValid)
        expect(result.severity).toBe(content.expected.severity)
        expect(result.recommendation).toBe(content.expected.recommendation)
        
        content.expected.issues.forEach(issue => {
          expect(result.issues).toContain(issue)
        })
      }
    })

    it('should recognize Dominican business terminology', async () => {
      const businessTerms = [
        'colmado', 'supermercado', 'farmacia', 'ferretería', 'panadería',
        'carnicería', 'verdulería', 'licorería', 'pulpería', 'ventorrillo'
      ]

      for (const term of businessTerms) {
        const text = `Busco productos en el ${term}`
        const result = await nlpProcessor.processText(text)
        
        expect(result.entities).toContainEqual(
          expect.objectContaining({
            type: 'business_type',
            value: term,
            culturalContext: 'dominican'
          })
        )
      }
    })

    it('should handle Dominican food and product names', async () => {
      const dominicanProducts = [
        { name: 'quipe', category: 'food', origin: 'lebanese_dominican' },
        { name: 'mangú', category: 'food', origin: 'traditional' },
        { name: 'moro de guandules', category: 'food', origin: 'traditional' },
        { name: 'yuca hervida', category: 'food', origin: 'traditional' },
        { name: 'chicharrón', category: 'food', origin: 'traditional' },
        { name: 'malta morena', category: 'beverage', origin: 'local_brand' },
        { name: 'ron barceló', category: 'beverage', origin: 'local_brand' }
      ]

      for (const product of dominicanProducts) {
        const text = `Necesito comprar ${product.name}`
        const result = await nlpProcessor.processText(text)
        
        expect(result.entities).toContainEqual(
          expect.objectContaining({
            type: 'product',
            value: product.name,
            category: product.category,
            culturalOrigin: product.origin
          })
        )
      }
    })
  })

  describe('Haitian Creole Cultural Integration', () => {
    it('should respect Haitian cultural expressions', async () => {
      const haitianExpressions = [
        {
          text: 'Sak pase, nap boule',
          expected: {
            isValid: true,
            culturalMarkers: ['sak_pase', 'nap_boule'],
            appropriateness: 'high',
            context: 'informal_greeting',
            translation: 'Qué tal, todo bien'
          }
        },
        {
          text: 'Mwen bezwen achte diri ak pwa',
          expected: {
            isValid: true,
            culturalMarkers: ['diri', 'pwa'],
            appropriateness: 'high',
            context: 'food_request',
            translation: 'Necesito comprar arroz con habichuelas'
          }
        },
        {
          text: 'Pran bon swen ou, wi',
          expected: {
            isValid: true,
            culturalMarkers: ['pran_bon_swen'],
            appropriateness: 'high',
            context: 'caring_farewell',
            translation: 'Cuídate bien, ¿verdad?'
          }
        }
      ]

      for (const expr of haitianExpressions) {
        const result = await haitianProcessor.processCreoleText(expr.text)
        
        expect(result.isValid).toBe(expr.expected.isValid)
        expect(result.appropriateness).toBe(expr.expected.appropriateness)
        expect(result.context).toBe(expr.expected.context)
        expect(result.translation).toBe(expr.expected.translation)
        
        expr.expected.culturalMarkers.forEach(marker => {
          expect(result.culturalMarkers).toContain(marker)
        })
      }
    })

    it('should handle code-switching between Spanish and Creole', async () => {
      const codeSwitchingExamples = [
        {
          text: 'Klk pero mwen pa konprann',
          expected: {
            languages: ['es-DO', 'ht'],
            switchingPoints: [{ position: 3, from: 'es-DO', to: 'ht' }],
            culturalContext: 'haitian_dominican_bilingual',
            appropriateness: 'high'
          }
        },
        {
          text: 'Busco diri ak pwa para cocinar',
          expected: {
            languages: ['es-DO', 'ht'],
            switchingPoints: [{ position: 6, from: 'es-DO', to: 'ht' }],
            culturalContext: 'product_bilingual_reference',
            appropriateness: 'high'
          }
        }
      ]

      for (const example of codeSwitchingExamples) {
        const result = await languageDetector.detectCodeSwitching(example.text)
        
        expect(result.languages).toEqual(example.expected.languages)
        expect(result.culturalContext).toBe(example.expected.culturalContext)
        expect(result.appropriateness).toBe(example.expected.appropriateness)
      }
    })
  })

  describe('Business Context Cultural Appropriateness', () => {
    it('should validate appropriate business greetings', async () => {
      const businessGreetings = [
        {
          text: 'Buenos días, ¿en qué le puedo servir?',
          context: 'formal_customer_service',
          expected: { appropriateness: 'high', tone: 'professional' }
        },
        {
          text: 'Klk loco, ¿qué necesitas?',
          context: 'informal_neighborhood',
          expected: { appropriateness: 'high', tone: 'friendly' }
        },
        {
          text: 'Buen día mi pana, ¿cómo tú está?',
          context: 'casual_business',
          expected: { appropriateness: 'high', tone: 'warm' }
        }
      ]

      for (const greeting of businessGreetings) {
        const result = await culturalAnalyzer.analyzeBusinessContext(
          greeting.text, 
          greeting.context
        )
        
        expect(result.appropriateness).toBe(greeting.expected.appropriateness)
        expect(result.tone).toBe(greeting.expected.tone)
        expect(result.businessSuitability).toBe(true)
      }
    })

    it('should adapt formality based on Dominican social context', async () => {
      const contextScenarios = [
        {
          scenario: 'talking_to_elderly_customer',
          text: 'Buenos días doña María, ¿cómo está usted?',
          expected: { formalityLevel: 'high', respectMarkers: ['doña', 'usted'] }
        },
        {
          scenario: 'talking_to_peer',
          text: 'Klk tiguer, ¿tú tienes pollo?',
          expected: { formalityLevel: 'low', respectMarkers: ['tiguer'] }
        },
        {
          scenario: 'talking_to_child',
          text: 'Hola mi amor, ¿qué tú quiere?',
          expected: { formalityLevel: 'medium', respectMarkers: ['mi_amor'] }
        }
      ]

      for (const scenario of contextScenarios) {
        const result = await culturalAnalyzer.analyzeFormalityLevel(
          scenario.text,
          scenario.scenario
        )
        
        expect(result.formalityLevel).toBe(scenario.expected.formalityLevel)
        scenario.expected.respectMarkers.forEach(marker => {
          expect(result.respectMarkers).toContain(marker)
        })
      }
    })

    it('should recognize Dominican payment and pricing culture', async () => {
      const pricingExpressions = [
        {
          text: 'Está muy caro, ¿no me lo puede dejar más barato?',
          expected: { 
            intent: 'price_negotiation',
            culturalNorm: 'acceptable',
            response: 'negotiate_friendly'
          }
        },
        {
          text: 'Le pago la mitad ahora y la mitad mañana',
          expected: { 
            intent: 'payment_arrangement',
            culturalNorm: 'common',
            response: 'consider_customer_relationship'
          }
        },
        {
          text: 'Me fía hasta el viernes que cobro',
          expected: { 
            intent: 'credit_request',
            culturalNorm: 'traditional',
            response: 'evaluate_trust_level'
          }
        }
      ]

      for (const expr of pricingExpressions) {
        const result = await culturalAnalyzer.analyzePricingCulture(expr.text)
        
        expect(result.intent).toBe(expr.expected.intent)
        expect(result.culturalNorm).toBe(expr.expected.culturalNorm)
        expect(result.recommendedResponse).toBe(expr.expected.response)
      }
    })
  })

  describe('Regional Variation Awareness', () => {
    it('should recognize Dominican regional dialects', async () => {
      const regionalExpressions = [
        {
          text: 'Voy pa\' Cibao a buscar yuca',
          region: 'santiago_cibao',
          markers: ['pa\'', 'cibao', 'yuca']
        },
        {
          text: 'En el sur tienen buena pesca',
          region: 'sur',
          markers: ['sur', 'pesca']
        },
        {
          text: 'Los capitalenos hablan diferente',
          region: 'santo_domingo_reference',
          markers: ['capitalenos']
        }
      ]

      for (const expr of regionalExpressions) {
        const result = await nlpProcessor.detectRegionalVariation(expr.text)
        
        expect(result.detectedRegion).toBe(expr.region)
        expr.markers.forEach(marker => {
          expect(result.regionalMarkers).toContain(marker)
        })
      }
    })

    it('should adapt responses based on regional context', async () => {
      const regionalAdaptations = [
        {
          region: 'santiago',
          input: 'Busco yuca buena',
          expected: { 
            response: 'En Santiago tenemos yuca fresca del Cibao',
            culturalAdaptations: ['cibao_reference', 'regional_pride']
          }
        },
        {
          region: 'santo_domingo',
          input: 'Necesito productos para el negocio',
          expected: { 
            response: 'En la capital manejamos gran variedad',
            culturalAdaptations: ['capital_reference', 'business_focus']
          }
        }
      ]

      for (const adaptation of regionalAdaptations) {
        const result = await culturalAnalyzer.adaptToRegion(
          adaptation.input,
          adaptation.region
        )
        
        expect(result.adaptedResponse).toContain(adaptation.expected.response)
        adaptation.expected.culturalAdaptations.forEach(adapt => {
          expect(result.adaptations).toContain(adapt)
        })
      }
    })
  })

  describe('Religious and Social Sensitivity', () => {
    it('should respect Dominican religious expressions', async () => {
      const religiousExpressions = [
        {
          text: 'Si Dios quiere mañana tengo dinero',
          expected: { 
            isRespectful: true,
            religiousMarker: 'si_dios_quiere',
            culturalSignificance: 'high'
          }
        },
        {
          text: 'Que Dios te bendiga por ayudarme',
          expected: { 
            isRespectful: true,
            religiousMarker: 'dios_te_bendiga',
            culturalSignificance: 'high'
          }
        },
        {
          text: 'Gracias a Dios llegó el pedido',
          expected: { 
            isRespectful: true,
            religiousMarker: 'gracias_a_dios',
            culturalSignificance: 'medium'
          }
        }
      ]

      for (const expr of religiousExpressions) {
        const result = await culturalAnalyzer.analyzeReligiousSensitivity(expr.text)
        
        expect(result.isRespectful).toBe(expr.expected.isRespectful)
        expect(result.religiousMarker).toBe(expr.expected.religiousMarker)
        expect(result.culturalSignificance).toBe(expr.expected.culturalSignificance)
      }
    })

    it('should handle holiday and celebration references', async () => {
      const holidayReferences = [
        {
          text: 'Para Navidad vendo mucho pollo',
          holiday: 'navidad',
          significance: 'high',
          businessImpact: 'increased_sales'
        },
        {
          text: 'En Semana Santa no hay carne',
          holiday: 'semana_santa',
          significance: 'high',
          businessImpact: 'product_restrictions'
        },
        {
          text: 'El Día de los Padres aumentan las ventas',
          holiday: 'dia_padres',
          significance: 'medium',
          businessImpact: 'seasonal_increase'
        }
      ]

      for (const ref of holidayReferences) {
        const result = await culturalAnalyzer.analyzeHolidayContext(ref.text)
        
        expect(result.detectedHoliday).toBe(ref.holiday)
        expect(result.culturalSignificance).toBe(ref.significance)
        expect(result.businessImpact).toBe(ref.businessImpact)
      }
    })
  })

  describe('Age and Gender Appropriate Communication', () => {
    it('should use age-appropriate language', async () => {
      const ageAppropriateExamples = [
        {
          targetAge: 'elderly',
          text: '¿Cómo está usted doña Carmen?',
          expected: { appropriateness: 'high', respectLevel: 'high' }
        },
        {
          targetAge: 'adult',
          text: 'Buenos días, ¿en qué le ayudo?',
          expected: { appropriateness: 'high', respectLevel: 'medium' }
        },
        {
          targetAge: 'young_adult',
          text: 'Klk pana, ¿qué necesitas?',
          expected: { appropriateness: 'high', respectLevel: 'low' }
        }
      ]

      for (const example of ageAppropriateExamples) {
        const result = await culturalAnalyzer.analyzeAgeAppropriateness(
          example.text,
          example.targetAge
        )
        
        expect(result.appropriateness).toBe(example.expected.appropriateness)
        expect(result.respectLevel).toBe(example.expected.respectLevel)
      }
    })

    it('should avoid gender stereotypes in business context', async () => {
      const genderNeutralExamples = [
        {
          text: 'El dueño del negocio puede ser hombre o mujer',
          expected: { genderInclusive: true, stereotypes: [] }
        },
        {
          text: 'Los clientes vienen de todas partes',
          expected: { genderInclusive: true, stereotypes: [] }
        }
      ]

      const problematicExamples = [
        {
          text: 'Las mujeres siempre regatean más',
          expected: { 
            genderInclusive: false, 
            stereotypes: ['gender_pricing_stereotype'],
            severity: 'medium'
          }
        }
      ]

      for (const example of genderNeutralExamples) {
        const result = await culturalAnalyzer.analyzeGenderInclusion(example.text)
        
        expect(result.genderInclusive).toBe(example.expected.genderInclusive)
        expect(result.stereotypes).toEqual(example.expected.stereotypes)
      }

      for (const example of problematicExamples) {
        const result = await culturalAnalyzer.analyzeGenderInclusion(example.text)
        
        expect(result.genderInclusive).toBe(example.expected.genderInclusive)
        expect(result.stereotypes).toEqual(example.expected.stereotypes)
        expect(result.severity).toBe(example.expected.severity)
      }
    })
  })

  describe('Cultural Sensitivity Scoring', () => {
    it('should provide overall cultural appropriateness scores', async () => {
      const testTexts = [
        {
          text: 'Buenos días, ¿cómo está usted? ¿En qué le puedo servir?',
          expectedScore: 95, // Highly appropriate
          factors: ['formal_greeting', 'respectful_tone', 'service_oriented']
        },
        {
          text: 'Klk tiguer, aquí andamos en la lucha',
          expectedScore: 85, // Culturally appropriate but informal
          factors: ['dominican_slang', 'solidarity_expression', 'authentic']
        },
        {
          text: 'Estos extranjeros no entienden nuestras costumbres',
          expectedScore: 30, // Problematic xenophobic undertones
          factors: ['us_vs_them', 'potential_discrimination', 'exclusionary']
        }
      ]

      for (const test of testTexts) {
        const result = await culturalAnalyzer.calculateCulturalScore(test.text)
        
        expect(result.score).toBeCloseTo(test.expectedScore, 10)
        test.factors.forEach(factor => {
          expect(result.factors).toContain(factor)
        })
      }
    })

    it('should provide improvement suggestions for low scores', async () => {
      const problematicText = 'Esos tipos nunca pagan a tiempo'
      
      const result = await culturalAnalyzer.calculateCulturalScore(problematicText)
      
      expect(result.score).toBeLessThan(60)
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          issue: 'generalization',
          suggestion: 'Evitar generalizaciones sobre grupos de personas',
          improvedVersion: 'Algunos clientes necesitan recordatorios de pago'
        })
      )
    })
  })
})