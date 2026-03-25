/**
 * SMS Service
 * SMS gateway integration for Dominican Republic market with Twilio and local providers
 */

import axios, { AxiosInstance } from 'axios';
import twilio from 'twilio';
import { whatsappLogger } from '../api/src/config/logger.js';
import { cacheManager } from '../api/src/config/database.js';

interface SMSConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  dominican: {
    apiKey: string;
    baseUrl: string;
    provider: 'CLARO' | 'ORANGE' | 'VIVA';
  };
  fallback: {
    enabled: boolean;
    providers: string[];
  };
}

interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  provider?: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  provider: string;
  cost?: number;
  error?: string;
}

export class SMSService {
  private twilioClient: any;
  private dominicanClient: AxiosInstance;
  private config: SMSConfig;

  constructor() {
    this.config = {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      },
      dominican: {
        apiKey: process.env.DOMINICAN_SMS_API_KEY!,
        baseUrl: process.env.DOMINICAN_SMS_BASE_URL || 'https://api.sms.do',
        provider: (process.env.DOMINICAN_SMS_PROVIDER as any) || 'CLARO'
      },
      fallback: {
        enabled: process.env.SMS_FALLBACK_ENABLED === 'true',
        providers: ['twilio', 'dominican']
      }
    };

    // Initialize Twilio client
    this.twilioClient = twilio(this.config.twilio.accountSid, this.config.twilio.authToken);

    // Initialize Dominican SMS client
    this.dominicanClient = axios.create({
      baseURL: this.config.dominican.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.dominican.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      body: `Su código de verificación WhatsOpí es: ${otp}. Este código expira en 10 minutos. No comparta este código con nadie.`
    };

    return await this.sendSMS(message, 'auto');
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    phoneNumber: string,
    type: 'sent' | 'received' | 'payment',
    amount: number,
    currency: string = 'DOP'
  ): Promise<SMSResult> {
    const formattedAmount = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency
    }).format(amount);

    const messages = {
      sent: `WhatsOpí: Ha enviado ${formattedAmount}. Gracias por usar nuestros servicios.`,
      received: `WhatsOpí: Ha recibido ${formattedAmount}. El dinero está disponible en su billetera.`,
      payment: `WhatsOpí: Pago de ${formattedAmount} procesado exitosamente.`
    };

    const message: SMSMessage = {
      to: phoneNumber,
      body: messages[type]
    };

    return await this.sendSMS(message, 'auto');
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(
    phoneNumber: string,
    orderNumber: string,
    total: number,
    deliveryTime: string
  ): Promise<SMSResult> {
    const formattedTotal = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(total);

    const message: SMSMessage = {
      to: phoneNumber,
      body: `WhatsOpí: Pedido #${orderNumber} confirmado por ${formattedTotal}. Entrega estimada: ${deliveryTime}. ¡Gracias por su compra!`
    };

    return await this.sendSMS(message, 'auto');
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(phoneNumber: string, alertType: string, details?: string): Promise<SMSResult> {
    const alerts = {
      login: 'WhatsOpí: Nuevo inicio de sesión detectado en su cuenta.',
      transaction: 'WhatsOpí: Transacción inusual detectada en su cuenta.',
      account: 'WhatsOpí: Cambios en la configuración de su cuenta.',
      security: 'WhatsOpí: Actividad sospechosa detectada en su cuenta.'
    };

    let body = alerts[alertType] || 'WhatsOpí: Alerta de seguridad.';
    if (details) {
      body += ` ${details}`;
    }
    body += ' Si no fue usted, contacte soporte inmediatamente.';

    const message: SMSMessage = {
      to: phoneNumber,
      body
    };

    return await this.sendSMS(message, 'twilio'); // Use most reliable provider for security alerts
  }

  /**
   * Send promotional message
   */
  async sendPromotion(
    phoneNumber: string,
    title: string,
    description: string,
    validUntil?: string
  ): Promise<SMSResult> {
    let body = `WhatsOpí: ${title} - ${description}`;
    if (validUntil) {
      body += ` Válido hasta: ${validUntil}.`;
    }
    body += ' Para cancelar promociones, responda STOP.';

    const message: SMSMessage = {
      to: phoneNumber,
      body
    };

    return await this.sendSMS(message, 'dominican'); // Use local provider for promotions
  }

  /**
   * Core SMS sending method with provider selection
   */
  async sendSMS(message: SMSMessage, preferredProvider: string = 'auto'): Promise<SMSResult> {
    const providers = this.getProviderOrder(preferredProvider, message.to);

    for (const provider of providers) {
      try {
        const result = await this.sendWithProvider(message, provider);
        
        if (result.success) {
          // Log successful SMS
          whatsappLogger.info('SMS sent successfully', {
            to: this.maskPhoneNumber(message.to),
            provider: result.provider,
            messageId: result.messageId,
            cost: result.cost,
            timestamp: new Date()
          });

          // Update provider success rate
          await this.updateProviderStats(provider, true);

          return result;
        }

      } catch (error) {
        whatsappLogger.error('SMS provider failed', {
          to: this.maskPhoneNumber(message.to),
          provider,
          error: error.message,
          timestamp: new Date()
        });

        await this.updateProviderStats(provider, false);

        // Continue to next provider if fallback is enabled
        if (!this.config.fallback.enabled || providers.indexOf(provider) === providers.length - 1) {
          return {
            success: false,
            provider,
            error: error.message
          };
        }
      }
    }

    return {
      success: false,
      provider: 'none',
      error: 'All SMS providers failed'
    };
  }

  /**
   * Send SMS via Twilio
   */
  private async sendWithTwilio(message: SMSMessage): Promise<SMSResult> {
    try {
      const result = await this.twilioClient.messages.create({
        body: message.body,
        from: message.from || this.config.twilio.phoneNumber,
        to: message.to
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        cost: parseFloat(result.price) || 0
      };

    } catch (error) {
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }

  /**
   * Send SMS via Dominican provider
   */
  private async sendWithDominican(message: SMSMessage): Promise<SMSResult> {
    try {
      const response = await this.dominicanClient.post('/send', {
        to: message.to,
        message: message.body,
        from: message.from || 'WhatsOpi',
        provider: this.config.dominican.provider
      });

      return {
        success: true,
        messageId: response.data.messageId,
        provider: 'dominican',
        cost: response.data.cost || 0
      };

    } catch (error) {
      throw new Error(`Dominican SMS failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send with specific provider
   */
  private async sendWithProvider(message: SMSMessage, provider: string): Promise<SMSResult> {
    switch (provider) {
      case 'twilio':
        return await this.sendWithTwilio(message);
      case 'dominican':
        return await this.sendWithDominican(message);
      default:
        throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }

  /**
   * Get provider order based on preferences and reliability
   */
  private getProviderOrder(preferredProvider: string, phoneNumber: string): string[] {
    // Dominican numbers get local provider first for better rates
    const isDominicanNumber = phoneNumber.startsWith('+1809') || 
                              phoneNumber.startsWith('+1829') || 
                              phoneNumber.startsWith('+1849');

    if (preferredProvider === 'auto') {
      if (isDominicanNumber) {
        return ['dominican', 'twilio'];
      } else {
        return ['twilio', 'dominican'];
      }
    }

    // Use preferred provider first, then fallback
    const providers = ['twilio', 'dominican'];
    const reordered = [preferredProvider];
    providers.forEach(p => {
      if (p !== preferredProvider) {
        reordered.push(p);
      }
    });

    return reordered;
  }

  /**
   * Update provider reliability statistics
   */
  private async updateProviderStats(provider: string, success: boolean): Promise<void> {
    try {
      const statsKey = `sms_stats:${provider}`;
      const stats = await cacheManager.get(statsKey);
      
      let currentStats = {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        lastUpdated: new Date()
      };

      if (stats) {
        currentStats = JSON.parse(stats);
      }

      currentStats.total += 1;
      if (success) {
        currentStats.successful += 1;
      } else {
        currentStats.failed += 1;
      }
      currentStats.successRate = (currentStats.successful / currentStats.total) * 100;
      currentStats.lastUpdated = new Date();

      await cacheManager.set(
        statsKey,
        JSON.stringify(currentStats),
        'l2',
        24 * 60 * 60 // 24 hours
      );

    } catch (error) {
      console.error('Failed to update provider stats:', error);
    }
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string, provider: string): Promise<{
    status: string;
    deliveredAt?: Date;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      switch (provider) {
        case 'twilio':
          const message = await this.twilioClient.messages(messageId).fetch();
          return {
            status: message.status,
            deliveredAt: message.dateUpdated,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage
          };

        case 'dominican':
          const response = await this.dominicanClient.get(`/status/${messageId}`);
          return {
            status: response.data.status,
            deliveredAt: response.data.deliveredAt ? new Date(response.data.deliveredAt) : undefined,
            errorCode: response.data.errorCode,
            errorMessage: response.data.errorMessage
          };

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

    } catch (error) {
      whatsappLogger.error('Failed to get SMS delivery status', {
        messageId,
        provider,
        error: error.message
      });

      return {
        status: 'unknown',
        errorMessage: error.message
      };
    }
  }

  /**
   * Validate Dominican phone number for SMS
   */
  isValidDominicanNumber(phoneNumber: string): boolean {
    // Dominican Republic phone number patterns
    const patterns = [
      /^\+1809\d{7}$/,  // +1809XXXXXXX
      /^\+1829\d{7}$/,  // +1829XXXXXXX
      /^\+1849\d{7}$/,  // +1849XXXXXXX
      /^809\d{7}$/,     // 809XXXXXXX
      /^829\d{7}$/,     // 829XXXXXXX
      /^849\d{7}$/      // 849XXXXXXX
    ];

    return patterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * Get SMS cost estimate
   */
  async getCostEstimate(phoneNumber: string, messageLength: number): Promise<{
    provider: string;
    cost: number;
    currency: string;
    segments: number;
  }> {
    const segments = Math.ceil(messageLength / 160); // SMS segment size
    const isDominicanNumber = this.isValidDominicanNumber(phoneNumber);

    // Cost rates (in USD)
    const rates = {
      twilio: {
        dominican: 0.0075,
        international: 0.0075
      },
      dominican: {
        local: 0.02, // DOP
        international: 0.05 // DOP
      }
    };

    if (isDominicanNumber) {
      return {
        provider: 'dominican',
        cost: rates.dominican.local * segments,
        currency: 'DOP',
        segments
      };
    } else {
      return {
        provider: 'twilio',
        cost: rates.twilio.international * segments,
        currency: 'USD',
        segments
      };
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<{
    [provider: string]: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
      lastUpdated: Date;
    };
  }> {
    const stats = {};
    const providers = ['twilio', 'dominican'];

    for (const provider of providers) {
      const statsKey = `sms_stats:${provider}`;
      const providerStats = await cacheManager.get(statsKey);
      
      if (providerStats) {
        stats[provider] = JSON.parse(providerStats);
      } else {
        stats[provider] = {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0,
          lastUpdated: new Date()
        };
      }
    }

    return stats;
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return phoneNumber.replace(/(\+?\d{2,3})\d+(\d{4})/, '$1****$2');
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    this.dominicanClient.interceptors.request.use(
      (config) => {
        whatsappLogger.info('Dominican SMS API request', {
          method: config.method,
          url: config.url,
          timestamp: new Date()
        });
        return config;
      },
      (error) => {
        whatsappLogger.error('Dominican SMS API request error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    this.dominicanClient.interceptors.response.use(
      (response) => {
        whatsappLogger.info('Dominican SMS API response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date()
        });
        return response;
      },
      (error) => {
        whatsappLogger.error('Dominican SMS API response error', {
          status: error.response?.status,
          url: error.config?.url,
          error: error.response?.data || error.message,
          timestamp: new Date()
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check for SMS providers
   */
  async healthCheck(): Promise<{
    [provider: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  }> {
    const results = {};
    const providers = ['twilio', 'dominican'];

    for (const provider of providers) {
      const startTime = Date.now();
      
      try {
        switch (provider) {
          case 'twilio':
            await this.twilioClient.api.accounts(this.config.twilio.accountSid).fetch();
            break;
          case 'dominican':
            await this.dominicanClient.get('/health');
            break;
        }

        results[provider] = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };

      } catch (error) {
        results[provider] = {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    }

    return results;
  }
}