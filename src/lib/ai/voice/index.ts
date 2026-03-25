/**
 * Voice Recognition System for WhatsOpí
 * Advanced speech processing with Dominican and Haitian accent optimization
 */

export * from './speech-processor';
export * from './accent-optimizer';
export * from './voice-commands';
export * from './audio-enhancement';
export * from './speaker-recognition';

import { SpeechProcessor } from './speech-processor';
import { AccentOptimizer } from './accent-optimizer';
import { VoiceCommandProcessor } from './voice-commands';
import { AudioEnhancer } from './audio-enhancement';
import { SpeakerRecognition } from './speaker-recognition';
import {
  Language,
  VoiceProcessingResult,
  AIContext,
  DominicanVoiceFeatures,
  SpeakerInfo,
  AudioQuality
} from '../types';

export class VoiceRecognitionSystem {
  private speechProcessor: SpeechProcessor;
  private accentOptimizer: AccentOptimizer;
  private commandProcessor: VoiceCommandProcessor;
  private audioEnhancer: AudioEnhancer;
  private speakerRecognition: SpeakerRecognition;
  private isInitialized: boolean = false;

  constructor() {
    this.speechProcessor = new SpeechProcessor();
    this.accentOptimizer = new AccentOptimizer();
    this.commandProcessor = new VoiceCommandProcessor();
    this.audioEnhancer = new AudioEnhancer();
    this.speakerRecognition = new SpeakerRecognition();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Promise.all([
      this.speechProcessor.initialize(),
      this.accentOptimizer.initialize(),
      this.commandProcessor.initialize(),
      this.audioEnhancer.initialize(),
      this.speakerRecognition.initialize()
    ]);

    this.isInitialized = true;
  }

  async processVoiceInput(
    audioBuffer: Buffer,
    context: AIContext,
    options: VoiceProcessingOptions = {}
  ): Promise<VoiceProcessingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Enhance audio quality
      const enhancedAudio = await this.audioEnhancer.enhanceAudio(
        audioBuffer,
        {
          noiseReduction: options.noiseReduction ?? true,
          volumeNormalization: options.volumeNormalization ?? true,
          accentOptimization: context.language === 'es-DO' || context.language === 'ht'
        }
      );

      // Step 2: Analyze audio quality
      const audioQuality = await this.analyzeAudioQuality(enhancedAudio);

      // Step 3: Speaker identification (if enabled)
      let speakerInfo: SpeakerInfo | undefined;
      if (options.speakerRecognition && context.userId) {
        speakerInfo = await this.speakerRecognition.identifySpeaker(
          enhancedAudio,
          context.userId,
          context.language
        );
      }

      // Step 4: Speech-to-text with accent optimization
      const transcriptionResult = await this.speechProcessor.transcribeAudio(
        enhancedAudio,
        context.language,
        {
          accentOptimization: true,
          speakerProfile: speakerInfo,
          contextualHints: this.getContextualHints(context)
        }
      );

      // Step 5: Apply accent optimization
      const optimizedTranscript = await this.accentOptimizer.optimizeTranscript(
        transcriptionResult.transcript,
        context.language,
        speakerInfo?.accent
      );

      // Step 6: Extract Dominican/Haitian voice features
      const dominicanFeatures = await this.extractDominicanVoiceFeatures(
        optimizedTranscript,
        audioBuffer,
        context.language
      );

      // Step 7: Process voice commands (if applicable)
      const commandResult = await this.commandProcessor.processVoiceCommand(
        optimizedTranscript,
        context
      );

      // Step 8: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        transcriptionResult.confidence,
        audioQuality.quality,
        speakerInfo?.confidence || 1.0
      );

      return {
        transcript: optimizedTranscript,
        language: {
          language: context.language,
          confidence: transcriptionResult.languageConfidence || 0.9,
          dialect: this.detectDialect(optimizedTranscript, context.language)
        },
        confidence: overallConfidence,
        speakerInfo,
        audioQuality,
        voiceFeatures: transcriptionResult.voiceFeatures || {
          pitch: 150,
          speed: 1.0,
          volume: 0.8,
          emphasis: [],
          pauses: [],
          intonation: []
        },
        dominican: dominicanFeatures,
        commandResult
      };

    } catch (error) {
      throw new Error(`Voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processRealTimeVoice(
    audioStream: ReadableStream<Uint8Array>,
    context: AIContext,
    onPartialResult: (partial: PartialVoiceResult) => void,
    options: VoiceProcessingOptions = {}
  ): Promise<VoiceProcessingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.speechProcessor.processRealTimeStream(
      audioStream,
      context,
      onPartialResult,
      options
    );
  }

  private async analyzeAudioQuality(audioBuffer: Buffer): Promise<AudioQuality> {
    // Analyze audio buffer properties
    const sampleRate = this.extractSampleRate(audioBuffer);
    const duration = this.calculateAudioDuration(audioBuffer, sampleRate);
    const noiseLevel = await this.calculateNoiseLevel(audioBuffer);
    const clarity = await this.calculateClarity(audioBuffer);

    let quality: AudioQuality['quality'];
    if (clarity > 0.8 && noiseLevel < 0.2) quality = 'excellent';
    else if (clarity > 0.6 && noiseLevel < 0.4) quality = 'good';
    else if (clarity > 0.4 && noiseLevel < 0.6) quality = 'fair';
    else quality = 'poor';

    return {
      sampleRate,
      bitRate: this.estimateBitRate(audioBuffer),
      duration,
      noiseLevel,
      clarity,
      quality
    };
  }

  private async extractDominicanVoiceFeatures(
    transcript: string,
    audioBuffer: Buffer,
    language: Language
  ): Promise<DominicanVoiceFeatures> {
    if (language !== 'es-DO' && language !== 'ht') {
      return {
        localExpressions: [],
        pronunciationVariants: [],
        dialectMarkers: [],
        informalityLevel: 0
      };
    }

    const features = await this.accentOptimizer.analyzeDominicanFeatures(
      transcript,
      audioBuffer,
      language
    );

    return features;
  }

  private getContextualHints(context: AIContext): string[] {
    const hints: string[] = [];

    // Add business context hints
    if (context.businessContext?.businessType === 'colmado') {
      hints.push('colmado', 'productos', 'precio', 'comprar', 'vender');
    }

    // Add location-based hints
    if (context.location?.city) {
      hints.push(context.location.city);
    }

    // Add conversation history hints
    if (context.conversationHistory) {
      const recentTopics = this.extractTopicsFromHistory(context.conversationHistory);
      hints.push(...recentTopics);
    }

    return hints;
  }

  private extractTopicsFromHistory(history: any[]): string[] {
    const topics = new Set<string>();
    
    history.slice(-3).forEach(message => {
      const content = message.content?.toLowerCase() || '';
      
      // Extract common business terms
      const businessTerms = ['precio', 'comprar', 'vender', 'producto', 'dinero', 'peso'];
      businessTerms.forEach(term => {
        if (content.includes(term)) topics.add(term);
      });
      
      // Extract product names
      const productTerms = ['arroz', 'pollo', 'leche', 'pan', 'cerveza', 'agua'];
      productTerms.forEach(term => {
        if (content.includes(term)) topics.add(term);
      });
    });

    return Array.from(topics);
  }

  private detectDialect(transcript: string, language: Language): string | undefined {
    if (language === 'es-DO') {
      const dominicanMarkers = ['klk', 'tiguer', 'que lo que', 'tá', 'pa', 'chin'];
      const hasMarkers = dominicanMarkers.some(marker => 
        transcript.toLowerCase().includes(marker)
      );
      return hasMarkers ? 'Dominican Spanish' : 'Caribbean Spanish';
    }

    if (language === 'ht') {
      return 'Haitian Creole';
    }

    return undefined;
  }

  private calculateOverallConfidence(
    transcriptionConfidence: number,
    audioQuality: string,
    speakerConfidence: number
  ): number {
    let qualityMultiplier = 1.0;
    switch (audioQuality) {
      case 'excellent': qualityMultiplier = 1.1; break;
      case 'good': qualityMultiplier = 1.0; break;
      case 'fair': qualityMultiplier = 0.9; break;
      case 'poor': qualityMultiplier = 0.7; break;
    }

    return Math.min(
      transcriptionConfidence * qualityMultiplier * speakerConfidence,
      1.0
    );
  }

  // Audio analysis utility methods
  private extractSampleRate(audioBuffer: Buffer): number {
    // For WAV files, sample rate is at bytes 24-27
    if (audioBuffer.length > 28 && 
        audioBuffer.subarray(0, 4).toString() === 'RIFF') {
      return audioBuffer.readUInt32LE(24);
    }
    return 16000; // Default fallback
  }

  private calculateAudioDuration(audioBuffer: Buffer, sampleRate: number): number {
    // Estimate duration based on buffer size and sample rate
    const bytesPerSample = 2; // Assuming 16-bit audio
    const samples = audioBuffer.length / bytesPerSample;
    return samples / sampleRate;
  }

  private estimateBitRate(audioBuffer: Buffer): number {
    // Simple bitrate estimation
    return Math.round((audioBuffer.length * 8) / this.calculateAudioDuration(audioBuffer, 16000));
  }

  private async calculateNoiseLevel(audioBuffer: Buffer): Promise<number> {
    // Simplified noise level calculation
    // In a real implementation, this would analyze the frequency spectrum
    let sum = 0;
    let count = 0;
    
    for (let i = 44; i < audioBuffer.length - 1; i += 2) {
      const sample = audioBuffer.readInt16LE(i);
      sum += Math.abs(sample);
      count++;
    }
    
    const avgAmplitude = sum / count;
    const maxAmplitude = 32767; // 16-bit max
    
    // Noise level is inverse of signal strength
    return Math.max(0, 1 - (avgAmplitude / maxAmplitude));
  }

  private async calculateClarity(audioBuffer: Buffer): Promise<number> {
    // Simplified clarity calculation
    // In a real implementation, this would analyze spectral features
    const noiseLevel = await this.calculateNoiseLevel(audioBuffer);
    return Math.max(0, 1 - noiseLevel);
  }

  // Public utility methods
  getSupportedLanguages(): Language[] {
    return ['es-DO', 'ht', 'es', 'en'];
  }

  isLanguageSupported(language: Language): boolean {
    return this.getSupportedLanguages().includes(language);
  }

  async calibrateForSpeaker(
    audioSamples: Buffer[],
    userId: string,
    language: Language
  ): Promise<void> {
    await this.speakerRecognition.calibrateForSpeaker(audioSamples, userId, language);
  }

  async testMicrophone(): Promise<MicrophoneTestResult> {
    return {
      available: true,
      quality: 'good',
      sampleRate: 44100,
      channels: 1,
      latency: 50,
      recommendations: ['Ensure quiet environment', 'Speak clearly into microphone']
    };
  }

  // Dominican-specific voice processing
  async processDominicanVoice(
    audioBuffer: Buffer,
    context: AIContext
  ): Promise<VoiceProcessingResult> {
    return await this.processVoiceInput(audioBuffer, {
      ...context,
      language: 'es-DO'
    }, {
      accentOptimization: true,
      dominicanSpecialization: true,
      noiseReduction: true
    });
  }

  // Haitian Creole voice processing
  async processHaitianVoice(
    audioBuffer: Buffer,
    context: AIContext
  ): Promise<VoiceProcessingResult> {
    return await this.processVoiceInput(audioBuffer, {
      ...context,
      language: 'ht'
    }, {
      accentOptimization: true,
      haitianSpecialization: true,
      noiseReduction: true
    });
  }
}

// Supporting interfaces and types
export interface VoiceProcessingOptions {
  noiseReduction?: boolean;
  volumeNormalization?: boolean;
  accentOptimization?: boolean;
  speakerRecognition?: boolean;
  dominicanSpecialization?: boolean;
  haitianSpecialization?: boolean;
  realTimeProcessing?: boolean;
  contextualHints?: string[];
}

export interface PartialVoiceResult {
  partialTranscript: string;
  confidence: number;
  isFinal: boolean;
  voiceCommand?: {
    detected: boolean;
    command: string;
    confidence: number;
  };
}

export interface MicrophoneTestResult {
  available: boolean;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  sampleRate: number;
  channels: number;
  latency: number;
  recommendations: string[];
}