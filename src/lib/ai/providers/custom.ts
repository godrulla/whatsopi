/**
 * Custom Model Provider for WhatsOpí
 * Integration for custom-trained models and local AI processing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAIProvider } from './base';
import { 
  AIResponse, 
  AIContext, 
  ModelProvider,
  AICapability,
  TokenUsage,
  TextAnalysis,
  VoiceProcessingResult
} from '../types';

const execAsync = promisify(exec);

export class CustomModelProvider extends BaseAIProvider {
  private modelConfig: CustomModelConfig;
  private modelPath: string;
  private pythonPath: string;

  constructor(config: CustomProviderConfig) {
    super(config);
    
    this.modelPath = config.modelPath;
    this.pythonPath = config.pythonPath || 'python3';
    this.modelConfig = this.loadModelConfig(config.configPath);
  }

  getProviderType(): ModelProvider {
    return 'custom';
  }

  getSupportedCapabilities(): AICapability[] {
    return this.modelConfig.capabilities || ['nlp', 'voice'];
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if model files exist
      const modelExists = await this.checkModelExists();
      if (!modelExists) return false;

      // Test model with simple input
      const testScript = path.join(this.modelPath, 'scripts', 'health_check.py');
      const { stdout } = await execAsync(`${this.pythonPath} ${testScript}`);
      
      return stdout.trim() === 'healthy';
    } catch (error) {
      console.error('Custom model health check failed:', error);
      return false;
    }
  }

  async processText(
    input: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const scriptPath = this.getScriptPath('text_analysis');
      const inputData = this.prepareTextInput(input, context, options);
      
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} ${scriptPath} '${JSON.stringify(inputData)}'`,
        { timeout: 30000 }
      );

      if (stderr) {
        console.warn('Custom model stderr:', stderr);
      }

      const result = JSON.parse(stdout);
      const analysisResult = this.transformTextResult(result, context);
      
      const tokens: TokenUsage = {
        prompt: this.estimateTokens(input),
        completion: 50, // Estimated
        total: this.estimateTokens(input) + 50,
        cost: 0 // Local processing has no API cost
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'nlp', input },
        analysisResult,
        0,
        tokens,
        result.confidence || 0.8
      );
    } catch (error) {
      throw new Error(`Custom text processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processVoice(
    audioBuffer: Buffer,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      // Save audio to temporary file
      const tempAudioPath = await this.saveAudioTemp(audioBuffer);
      
      try {
        const scriptPath = this.getScriptPath('voice_recognition');
        const inputData = this.prepareVoiceInput(tempAudioPath, context, options);
        
        const { stdout, stderr } = await execAsync(
          `${this.pythonPath} ${scriptPath} '${JSON.stringify(inputData)}'`,
          { timeout: 60000 }
        );

        if (stderr) {
          console.warn('Custom voice model stderr:', stderr);
        }

        const result = JSON.parse(stdout);
        const voiceResult = this.transformVoiceResult(result, context);
        
        const tokens: TokenUsage = {
          prompt: this.estimateAudioTokens(audioBuffer.length),
          completion: this.estimateTokens(result.transcript || ''),
          total: this.estimateAudioTokens(audioBuffer.length) + this.estimateTokens(result.transcript || ''),
          cost: 0
        };

        return this.createSuccessResponse(
          { id: '', sessionId: context.sessionId, capability: 'voice', input: audioBuffer },
          voiceResult,
          0,
          tokens,
          result.confidence || 0.75
        );
      } finally {
        // Clean up temporary file
        await this.cleanupTempFile(tempAudioPath);
      }
    } catch (error) {
      throw new Error(`Custom voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateText(
    prompt: string,
    context: AIContext,
    options?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const scriptPath = this.getScriptPath('text_generation');
      const inputData = this.prepareGenerationInput(prompt, context, options);
      
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} ${scriptPath} '${JSON.stringify(inputData)}'`,
        { timeout: 45000 }
      );

      if (stderr) {
        console.warn('Custom generation model stderr:', stderr);
      }

      const result = JSON.parse(stdout);
      const chatResponse = this.transformGenerationResult(result, context);
      
      const tokens: TokenUsage = {
        prompt: this.estimateTokens(prompt),
        completion: this.estimateTokens(result.text || ''),
        total: this.estimateTokens(prompt + (result.text || '')),
        cost: 0
      };

      return this.createSuccessResponse(
        { id: '', sessionId: context.sessionId, capability: 'chat', input: prompt },
        chatResponse,
        0,
        tokens,
        result.confidence || 0.78
      );
    } catch (error) {
      throw new Error(`Custom text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeText(
    text: string,
    context: AIContext,
    analysisType: 'sentiment' | 'entities' | 'intent' | 'all',
    options?: Record<string, any>
  ): Promise<AIResponse> {
    return await this.processText(text, context, { ...options, analysisType });
  }

  private loadModelConfig(configPath: string): CustomModelConfig {
    try {
      // In a real implementation, this would load from the config file
      return {
        name: 'dominican-nlp-v1',
        version: '1.0.0',
        capabilities: ['nlp', 'voice'],
        languages: ['es-DO', 'ht'],
        specializations: [
          'dominican_spanish',
          'haitian_creole',
          'caribbean_culture',
          'informal_economy'
        ],
        models: {
          text_analysis: 'models/dominican_nlp.bin',
          voice_recognition: 'models/dominican_asr.bin',
          text_generation: 'models/dominican_generation.bin'
        },
        scripts: {
          text_analysis: 'scripts/analyze_text.py',
          voice_recognition: 'scripts/recognize_speech.py',
          text_generation: 'scripts/generate_text.py',
          health_check: 'scripts/health_check.py'
        }
      };
    } catch (error) {
      console.warn('Could not load model config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): CustomModelConfig {
    return {
      name: 'default-custom-model',
      version: '1.0.0',
      capabilities: ['nlp'],
      languages: ['es-DO'],
      specializations: ['dominican_spanish'],
      models: {
        text_analysis: 'models/default.bin'
      },
      scripts: {
        text_analysis: 'scripts/analyze_text.py',
        health_check: 'scripts/health_check.py'
      }
    };
  }

  private async checkModelExists(): Promise<boolean> {
    try {
      for (const modelFile of Object.values(this.modelConfig.models)) {
        const fullPath = path.join(this.modelPath, modelFile);
        await fs.access(fullPath);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private getScriptPath(scriptType: keyof CustomModelConfig['scripts']): string {
    const scriptFile = this.modelConfig.scripts[scriptType];
    if (!scriptFile) {
      throw new Error(`Script not found for type: ${scriptType}`);
    }
    return path.join(this.modelPath, scriptFile);
  }

  private prepareTextInput(input: string, context: AIContext, options?: Record<string, any>): any {
    return {
      text: input,
      language: context.language,
      analysis_type: options?.analysisType || 'all',
      context: {
        location: context.location,
        user_profile: context.userProfile,
        business_context: context.businessContext,
        cultural_context: context.culturalContext
      },
      options: {
        include_dominican_features: context.language === 'es-DO',
        include_haitian_features: context.language === 'ht',
        informal_economy_context: true,
        colmado_context: context.businessContext?.colmadoId !== undefined
      }
    };
  }

  private prepareVoiceInput(audioPath: string, context: AIContext, options?: Record<string, any>): any {
    return {
      audio_path: audioPath,
      language: context.language,
      format: options?.audioFormat || 'wav',
      context: {
        location: context.location,
        user_profile: context.userProfile,
        expected_accent: this.mapLanguageToAccent(context.language)
      },
      options: {
        dominican_accent_adaptation: context.language === 'es-DO',
        haitian_accent_adaptation: context.language === 'ht',
        noise_reduction: true,
        speaker_verification: false
      }
    };
  }

  private prepareGenerationInput(prompt: string, context: AIContext, options?: Record<string, any>): any {
    return {
      prompt: this.enhancePromptForCustomModel(prompt, context),
      language: context.language,
      max_length: options?.maxTokens || 512,
      temperature: options?.temperature || 0.7,
      context: {
        conversation_history: context.conversationHistory?.slice(-5) || [],
        cultural_context: context.culturalContext,
        business_context: context.businessContext
      },
      options: {
        dominican_style: context.language === 'es-DO',
        informal_economy_focus: true,
        local_expressions: true,
        cultural_sensitivity: true
      }
    };
  }

  private enhancePromptForCustomModel(prompt: string, context: AIContext): string {
    if (context.language === 'es-DO') {
      return `[CONTEXTO: República Dominicana, español dominicano, economía informal]
[ESTILO: Conversacional dominicano, amigable, usando expresiones locales apropiadas]
[INSTRUCCIÓN: Responde como un dominicano que entiende la cultura local y los colmados]

Usuario: ${prompt}`;
    }

    if (context.language === 'ht') {
      return `[KONTÈKS: Ayiti/Repiblik Dominikèn, Kreyòl Ayisyen]
[ESTIL: Respèktye, konsidere kominote yo]
[ENSTRIKSYON: Reponn nan kreyòl oswa nan panyòl selon sa ki pi bon]

Itilizatè: ${prompt}`;
    }

    return prompt;
  }

  private transformTextResult(result: any, context: AIContext): TextAnalysis {
    return {
      language: {
        language: result.detected_language || context.language,
        confidence: result.language_confidence || 0.8,
        dialect: result.dialect_info?.type
      },
      sentiment: {
        score: result.sentiment?.score || 0,
        label: result.sentiment?.label || 'neutral',
        confidence: result.sentiment?.confidence || 0.7,
        emotions: result.emotions || []
      },
      entities: (result.entities || []).map((entity: any) => ({
        text: entity.text,
        type: entity.type,
        startIndex: entity.start || 0,
        endIndex: entity.end || 0,
        confidence: entity.confidence || 0.8,
        metadata: entity.metadata || {}
      })),
      intent: {
        intent: result.intent?.name || 'unknown',
        confidence: result.intent?.confidence || 0.5,
        parameters: result.intent?.parameters || {}
      },
      keywords: result.keywords || [],
      readability: {
        score: result.readability?.score || 0.7,
        level: result.readability?.level || 'moderate',
        grade: result.readability?.grade || 8
      },
      culturalMarkers: (result.cultural_markers || []).map((marker: any) => ({
        type: marker.type,
        text: marker.text,
        meaning: marker.meaning,
        confidence: marker.confidence || 0.8
      }))
    };
  }

  private transformVoiceResult(result: any, context: AIContext): VoiceProcessingResult {
    return {
      transcript: result.transcript || '',
      language: {
        language: result.detected_language || context.language,
        confidence: result.language_confidence || 0.75
      },
      confidence: result.overall_confidence || 0.75,
      speakerInfo: result.speaker_info ? {
        gender: result.speaker_info.gender,
        ageRange: result.speaker_info.age_range,
        accent: {
          type: result.speaker_info.accent?.type || 'dominican',
          region: result.speaker_info.accent?.region,
          confidence: result.speaker_info.accent?.confidence || 0.7,
          characteristics: result.speaker_info.accent?.characteristics || []
        }
      } : undefined,
      audioQuality: {
        sampleRate: result.audio_info?.sample_rate || 16000,
        bitRate: result.audio_info?.bit_rate || 128,
        duration: result.audio_info?.duration || 0,
        noiseLevel: result.audio_info?.noise_level || 0.1,
        clarity: result.audio_info?.clarity || 0.8,
        quality: result.audio_info?.quality || 'good'
      },
      voiceFeatures: {
        pitch: result.voice_features?.pitch || 150,
        speed: result.voice_features?.speed || 1.0,
        volume: result.voice_features?.volume || 0.8,
        emphasis: result.voice_features?.emphasis || [],
        pauses: result.voice_features?.pauses || [],
        intonation: result.voice_features?.intonation || []
      },
      dominican: {
        localExpressions: (result.dominican_features?.expressions || []).map((expr: any) => ({
          expression: expr.text,
          standardEquivalent: expr.standard,
          usage: expr.usage || 'common',
          confidence: expr.confidence || 0.8
        })),
        pronunciationVariants: result.dominican_features?.pronunciation || [],
        dialectMarkers: result.dominican_features?.dialect_markers || [],
        informalityLevel: result.dominican_features?.informality_level || 0.5
      }
    };
  }

  private transformGenerationResult(result: any, context: AIContext): any {
    return {
      message: result.text || '',
      language: context.language,
      intent: result.predicted_intent || 'chat_response',
      actions: result.suggested_actions || [],
      suggestions: result.suggestions || this.getDefaultSuggestions(context),
      culturalContext: {
        formality: result.formality_level || 'informal',
        relationshipLevel: 'acquaintance',
        culturalNorms: result.cultural_norms || ['respectful', 'helpful'],
        localContext: result.local_context || []
      },
      dominican: {
        useLocalExpressions: result.local_expressions_used || false,
        informalityLevel: result.informality_score || 0.6,
        communityContext: true,
        colmadoReferences: result.colmado_references || false
      }
    };
  }

  private mapLanguageToAccent(language: string): string {
    const accentMap: Record<string, string> = {
      'es-DO': 'dominican',
      'es': 'caribbean_spanish',
      'ht': 'haitian',
      'en': 'caribbean_english'
    };
    
    return accentMap[language] || 'general';
  }

  private async saveAudioTemp(audioBuffer: Buffer): Promise<string> {
    const tempDir = '/tmp/whatsopi_audio';
    const tempFile = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substring(2)}.wav`);
    
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Write audio buffer to file
    await fs.writeFile(tempFile, audioBuffer);
    
    return tempFile;
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup temp file:', filePath, error);
    }
  }

  private getDefaultSuggestions(context: AIContext): string[] {
    if (context.language === 'es-DO') {
      return [
        '¿En qué más te puedo ayudar?',
        '¿Necesitas algo del colmado?',
        '¿Te ayudo con otra cosa?'
      ];
    }
    
    return [
      '¿Necesitas más ayuda?',
      '¿Hay algo más que pueda hacer por ti?',
      '¿Te puedo ayudar con otra consulta?'
    ];
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateAudioTokens(audioSize: number): number {
    return Math.ceil(audioSize / 1000);
  }
}

export interface CustomProviderConfig {
  modelPath: string;
  configPath: string;
  pythonPath?: string;
  timeout?: number;
}

interface CustomModelConfig {
  name: string;
  version: string;
  capabilities: AICapability[];
  languages: string[];
  specializations: string[];
  models: Record<string, string>;
  scripts: Record<string, string>;
}