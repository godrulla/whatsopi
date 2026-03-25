/**
 * AI Model Providers for WhatsOpí
 * Multi-model integration supporting Claude, ALIA, OpenAI, and custom models
 */

export * from './base';
export * from './claude';
export * from './alia';
export * from './openai';
export * from './custom';
export * from './manager';

// Provider registry
import { ClaudeProvider } from './claude';
import { ALIAProvider } from './alia';
import { OpenAIProvider } from './openai';
import { CustomModelProvider } from './custom';
import { BaseAIProvider } from './base';
import { ModelProvider } from '../types';

export const PROVIDERS = {
  claude: ClaudeProvider,
  alia: ALIAProvider,
  openai: OpenAIProvider,
  custom: CustomModelProvider
} as const;

export type ProviderInstance = BaseAIProvider;

export const createProvider = (
  type: ModelProvider,
  config: Record<string, any>
): BaseAIProvider => {
  const ProviderClass = PROVIDERS[type];
  if (!ProviderClass) {
    throw new Error(`Unknown provider type: ${type}`);
  }
  return new ProviderClass(config);
};