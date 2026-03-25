/**
 * WhatsApp Business API Service
 * Integration with WhatsApp Business API for Dominican Republic market
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { whatsappLogger } from '../api/src/config/logger.js';
import { cacheManager } from '../api/src/config/database.js';

interface WhatsAppConfig {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  webhookSecret: string;
  apiVersion: string;
  baseUrl: string;
}

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive' | 'image' | 'audio' | 'video' | 'document';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: any;
      }>;
    }>;
  };
  interactive?: {
    type: 'button' | 'list';
    header?: any;
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: any;
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  audio?: {
    link?: string;
    id?: string;
  };
  video?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  document?: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          image?: any;
          audio?: any;
          video?: any;
          document?: any;
          interactive?: any;
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
            error_data: {
              details: string;
            };
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppService {
  private client: AxiosInstance;
  private config: WhatsAppConfig;

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
      webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET!,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
      baseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com'
    };

    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'whatsopi_otp', // Template must be pre-approved by Meta
        language: {
          code: 'es' // Spanish
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: otp
              }
            ]
          }
        ]
      }
    };

    try {
      const response = await this.sendMessage(message);
      
      whatsappLogger.info('OTP sent successfully', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        messageId: response.messages[0].id,
        timestamp: new Date()
      });

    } catch (error) {
      whatsappLogger.error('Failed to send OTP', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Send welcome message for new users
   */
  async sendWelcomeMessage(phoneNumber: string, userName: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'whatsopi_welcome',
        language: {
          code: 'es'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: userName
              }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    phoneNumber: string, 
    type: 'sent' | 'received' | 'payment',
    amount: number,
    currency: string = 'DOP'
  ): Promise<void> {
    const templateName = `whatsopi_transaction_${type}`;
    const formattedAmount = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency
    }).format(amount);

    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'es'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: formattedAmount
              }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(
    phoneNumber: string,
    orderNumber: string,
    total: number,
    deliveryTime: string
  ): Promise<void> {
    const formattedTotal = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(total);

    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'whatsopi_order_confirmation',
        language: {
          code: 'es'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: orderNumber
              },
              {
                type: 'text',
                text: formattedTotal
              },
              {
                type: 'text',
                text: deliveryTime
              }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send interactive product catalog
   */
  async sendProductCatalog(phoneNumber: string, products: any[]): Promise<void> {
    const sections = products.map(product => ({
      title: product.category,
      rows: [{
        id: `product_${product.id}`,
        title: product.name,
        description: `${product.price} DOP - ${product.description?.substring(0, 60)}...`
      }]
    }));

    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: '🛒 Catálogo de Productos'
        },
        body: {
          text: 'Selecciona un producto para ver más detalles:'
        },
        footer: {
          text: 'WhatsOpí - Tu colmado digital'
        },
        action: {
          button: 'Ver Productos',
          sections: sections.slice(0, 10) // WhatsApp limits to 10 sections
        }
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send text message
   */
  async sendTextMessage(phoneNumber: string, text: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: text,
        preview_url: true
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send image with caption
   */
  async sendImage(phoneNumber: string, imageUrl: string, caption?: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send document
   */
  async sendDocument(
    phoneNumber: string, 
    documentUrl: string, 
    filename: string,
    caption?: string
  ): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send voice message
   */
  async sendVoiceMessage(phoneNumber: string, audioUrl: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: phoneNumber,
      type: 'audio',
      audio: {
        link: audioUrl
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Send location
   */
  async sendLocation(
    phoneNumber: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<void> {
    const message = {
      to: phoneNumber,
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Core message sending method
   */
  private async sendMessage(message: WhatsAppMessage): Promise<any> {
    try {
      const response = await this.client.post(
        `/${this.config.phoneNumberId}/messages`,
        message
      );

      whatsappLogger.info('Message sent', {
        to: this.maskPhoneNumber(message.to),
        type: message.type,
        messageId: response.data.messages[0].id,
        timestamp: new Date()
      });

      return response.data;

    } catch (error) {
      whatsappLogger.error('Failed to send message', {
        to: this.maskPhoneNumber(message.to),
        type: message.type,
        error: error.response?.data || error.message,
        timestamp: new Date()
      });

      throw new Error(`WhatsApp message failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`),
      Buffer.from(signature)
    );
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;

            // Process incoming messages
            if (messages) {
              for (const message of messages) {
                await this.processIncomingMessage(message);
              }
            }

            // Process message status updates
            if (statuses) {
              for (const status of statuses) {
                await this.processMessageStatus(status);
              }
            }
          }
        }
      }
    } catch (error) {
      whatsappLogger.error('Webhook processing error', {
        error: error.message,
        payload,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  private async processIncomingMessage(message: any): Promise<void> {
    whatsappLogger.info('Incoming message', {
      from: this.maskPhoneNumber(message.from),
      messageId: message.id,
      type: message.type,
      timestamp: new Date(parseInt(message.timestamp) * 1000)
    });

    // Cache the message for processing by AI service
    const messageData = {
      id: message.id,
      from: message.from,
      type: message.type,
      timestamp: message.timestamp,
      content: this.extractMessageContent(message)
    };

    await cacheManager.set(
      `whatsapp_message:${message.id}`,
      JSON.stringify(messageData),
      'l1',
      3600 // 1 hour
    );

    // Trigger message processing (would integrate with AI service)
    // This would be handled by a message queue in production
    console.log('Message queued for AI processing:', messageData);
  }

  /**
   * Process message status update
   */
  private async processMessageStatus(status: any): Promise<void> {
    whatsappLogger.info('Message status update', {
      messageId: status.id,
      status: status.status,
      recipientId: this.maskPhoneNumber(status.recipient_id),
      timestamp: new Date(parseInt(status.timestamp) * 1000)
    });

    // Update message status in database
    // This would be implemented with the message repository
  }

  /**
   * Extract content from different message types
   */
  private extractMessageContent(message: any): any {
    switch (message.type) {
      case 'text':
        return { text: message.text.body };
      case 'image':
        return { 
          imageId: message.image.id,
          caption: message.image.caption 
        };
      case 'audio':
        return { 
          audioId: message.audio.id,
          mimeType: message.audio.mime_type 
        };
      case 'video':
        return { 
          videoId: message.video.id,
          caption: message.video.caption 
        };
      case 'document':
        return { 
          documentId: message.document.id,
          filename: message.document.filename,
          caption: message.document.caption 
        };
      case 'interactive':
        return { 
          interactiveType: message.interactive.type,
          response: message.interactive 
        };
      default:
        return { type: message.type };
    }
  }

  /**
   * Get media URL from WhatsApp
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await this.client.get(`/${mediaId}`);
      return response.data.url;
    } catch (error) {
      whatsappLogger.error('Failed to get media URL', {
        mediaId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await this.client.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      whatsappLogger.error('Failed to download media', {
        mediaUrl,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return phoneNumber.replace(/(\d{3})\d+(\d{4})/, '$1****$2');
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        whatsappLogger.info('WhatsApp API request', {
          method: config.method,
          url: config.url,
          timestamp: new Date()
        });
        return config;
      },
      (error) => {
        whatsappLogger.error('WhatsApp API request error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        whatsappLogger.info('WhatsApp API response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date()
        });
        return response;
      },
      (error) => {
        whatsappLogger.error('WhatsApp API response error', {
          status: error.response?.status,
          url: error.config?.url,
          error: error.response?.data || error.message,
          timestamp: new Date()
        });
        return Promise.reject(error);
      }
    );
  }
}