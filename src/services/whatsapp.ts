import type { 
  WhatsAppMessage, 
  WhatsAppInteractiveContent, 
  Product, 
  Order, 
  Colmado 
} from '@/types';

// WhatsApp Business API integration for Dominican colmado commerce
export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookVerifyToken = import.meta.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send an interactive button message (perfect for colmado menus)
   */
  async sendButtonMessage(
    to: string, 
    headerText: string,
    bodyText: string, 
    buttons: Array<{id: string, title: string}>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            action: {
              buttons: buttons.map(btn => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title
                }
              }))
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp button message:', error);
      return false;
    }
  }

  /**
   * Send a product catalog list (essential for colmado commerce)
   */
  async sendProductList(
    to: string, 
    headerText: string,
    bodyText: string,
    products: Product[]
  ): Promise<boolean> {
    try {
      const sections = [{
        title: "Productos Disponibles",
        rows: products.slice(0, 10).map(product => ({
          id: product.id,
          title: product.name,
          description: `$${product.price} ${product.currency} ${product.inStock ? '✅' : '❌'}`
        }))
      }];

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            footer: {
              text: "Selecciona un producto para más detalles"
            },
            action: {
              button: "Ver Productos",
              sections: sections
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp product list:', error);
      return false;
    }
  }

  /**
   * Send order confirmation with payment options
   */
  async sendOrderConfirmation(
    to: string, 
    order: Order, 
    colmado: Colmado
  ): Promise<boolean> {
    const orderSummary = order.items
      .map(item => `• ${item.productName} x${item.quantity} - $${item.totalPrice} ${order.currency}`)
      .join('\n');

    const message = `
🛒 *Confirmación de Pedido*

*${colmado.name}*
📍 ${colmado.address.neighborhood}, ${colmado.address.city}

*Resumen del Pedido:*
${orderSummary}

*Total: $${order.totalAmount} ${order.currency}*

Número de Pedido: ${order.id.slice(-8)}
Estado: ${this.getOrderStatusText(order.status)}

${order.deliveryMethod === 'delivery' ? 
  `🚚 Entrega a: ${order.deliveryAddress}` : 
  '🏪 Recoger en tienda'
}

¿Cómo deseas pagar?
    `.trim();

    const buttons = [
      { id: `pay_cash_${order.id}`, title: 'Efectivo 💵' },
      { id: `pay_card_${order.id}`, title: 'Tarjeta 💳' },
      { id: `pay_digital_${order.id}`, title: 'Digital 📱' }
    ];

    return await this.sendButtonMessage(to, "Pedido Confirmado ✅", message, buttons);
  }

  /**
   * Send location sharing request (for delivery)
   */
  async requestLocation(to: string, colmadoName: string): Promise<boolean> {
    const message = `📍 *${colmadoName}*

Para completar tu pedido con entrega, por favor comparte tu ubicación exacta.

Esto nos ayudará a:
• Calcular el tiempo de entrega
• Encontrar tu dirección fácilmente
• Confirmar la tarifa de entrega

Presiona el botón 📎 y selecciona "Ubicación"`;

    return await this.sendTextMessage(to, message);
  }

  /**
   * Send voice message instructions (for accessibility)
   */
  async sendVoiceInstructions(to: string, language: 'es-DO' | 'ht' = 'es-DO'): Promise<boolean> {
    const messages = {
      'es-DO': `🎤 *¿Sabías que puedes usar tu voz?*

Prueba decir:
• "Quiero pollo"
• "¿Cuánto cuesta el arroz?"
• "Buscar colmado cerca"
• "Mi pedido"

Mantén presionado el botón 🎤 y habla claramente.
¡Es más fácil que escribir!`,
      'ht': `🎤 *Ou ka sèvi ak vwa ou!*

Eseye di:
• "Mwen vle poul"
• "Konbyen diri a koute?"
• "Chèche colmado tou pre"
• "Kòmand mwen an"

Kenbe bouton 🎤 la epi pale klèman.
Li pi fasil pase ekri!`
    };

    return await this.sendTextMessage(to, messages[language]);
  }

  /**
   * Handle incoming webhook messages
   */
  async handleWebhook(webhookData: any): Promise<void> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (value?.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message, value.metadata);
        }
      }

      if (value?.statuses) {
        for (const status of value.statuses) {
          await this.processMessageStatus(status);
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
    }
  }

  /**
   * Verify webhook (required by WhatsApp)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Process incoming message based on type and content
   */
  private async processIncomingMessage(message: any, metadata: any): Promise<void> {
    const messageType = message.type;
    const from = message.from;
    
    try {
      switch (messageType) {
        case 'text':
          await this.handleTextMessage(from, message.text.body);
          break;
        case 'interactive':
          await this.handleInteractiveMessage(from, message.interactive);
          break;
        case 'location':
          await this.handleLocationMessage(from, message.location);
          break;
        case 'audio':
          await this.handleAudioMessage(from, message.audio);
          break;
        case 'image':
          await this.handleImageMessage(from, message.image);
          break;
        default:
          await this.sendTextMessage(from, "Lo siento, no puedo procesar este tipo de mensaje. Intenta enviar texto o usar los botones.");
      }
    } catch (error) {
      console.error(`Error processing ${messageType} message:`, error);
      await this.sendTextMessage(from, "Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.");
    }
  }

  private async handleTextMessage(from: string, text: string): Promise<void> {
    // This would integrate with your AI/NLP service
    // For now, simple keyword matching for common Dominican Spanish phrases
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hola') || lowerText.includes('buenas') || lowerText.includes('klk')) {
      await this.sendGreeting(from);
    } else if (lowerText.includes('menu') || lowerText.includes('productos') || lowerText.includes('que tienen')) {
      await this.sendNearbyColmados(from);
    } else if (lowerText.includes('precio') || lowerText.includes('cuanto cuesta') || lowerText.includes('cuanto vale')) {
      await this.handlePriceInquiry(from, text);
    } else if (lowerText.includes('pedido') || lowerText.includes('quiero') || lowerText.includes('comprar')) {
      await this.startOrderProcess(from);
    } else {
      // Fallback - offer main menu
      await this.sendMainMenu(from);
    }
  }

  private async handleInteractiveMessage(from: string, interactive: any): Promise<void> {
    const buttonReply = interactive.button_reply;
    const listReply = interactive.list_reply;
    
    if (buttonReply) {
      const buttonId = buttonReply.id;
      
      if (buttonId.startsWith('pay_')) {
        await this.handlePaymentSelection(from, buttonId);
      } else if (buttonId.startsWith('colmado_')) {
        await this.showColmadoMenu(from, buttonId.replace('colmado_', ''));
      } else if (buttonId.startsWith('product_')) {
        await this.showProductDetails(from, buttonId.replace('product_', ''));
      }
    }
    
    if (listReply) {
      const itemId = listReply.id;
      await this.handleListSelection(from, itemId);
    }
  }

  private async handleLocationMessage(from: string, location: any): Promise<void> {
    const { latitude, longitude } = location;
    
    // Store user location and find nearby colmados
    await this.sendTextMessage(
      from, 
      `📍 Ubicación recibida! Buscando colmados cerca de ti...`
    );
    
    // This would integrate with your geolocation service
    await this.sendNearbyColmados(from, latitude, longitude);
  }

  private async handleAudioMessage(from: string, audio: any): Promise<void> {
    // This would integrate with your voice recognition service
    await this.sendTextMessage(
      from,
      "🎤 Mensaje de voz recibido. Procesando... (Esta función estará disponible pronto)"
    );
  }

  private async handleImageMessage(from: string, image: any): Promise<void> {
    // This could be used for product image recognition
    await this.sendTextMessage(
      from,
      "📸 Imagen recibida. ¿En qué puedo ayudarte con esta imagen?"
    );
  }

  private async processMessageStatus(status: any): Promise<void> {
    // Handle message delivery status updates
    console.log('Message status update:', status);
  }

  // Helper methods for common responses
  
  private async sendGreeting(to: string): Promise<void> {
    const greetings = [
      "¡Hola! 👋 Bienvenido a WhatsOpí",
      "¡Klk loco! 🇩🇴 ¿En qué te puedo ayudar?",
      "¡Buenas! ¿Qué tal todo? 😊"
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const buttons = [
      { id: 'find_colmados', title: 'Buscar Colmados 🏪' },
      { id: 'my_orders', title: 'Mis Pedidos 📦' },
      { id: 'help', title: 'Ayuda ❓' }
    ];

    await this.sendButtonMessage(
      to, 
      "WhatsOpí - Tu Colmado Digital 🇩🇴",
      `${randomGreeting}\n\nSoy tu asistente para conectarte con colmados en tu zona. ¿Qué necesitas hoy?`,
      buttons
    );
  }

  private async sendMainMenu(to: string): Promise<void> {
    const message = `🏪 *WhatsOpí - Menú Principal*

¿Qué puedo hacer por ti?

🔍 Buscar productos
🏪 Ver colmados cercanos  
📦 Ver mis pedidos
💳 Métodos de pago
🎤 Usar comandos de voz
❓ Ayuda

Escribe lo que necesitas o usa los botones.`;

    const buttons = [
      { id: 'find_colmados', title: 'Colmados Cercanos' },
      { id: 'search_products', title: 'Buscar Productos' },
      { id: 'my_orders', title: 'Mis Pedidos' }
    ];

    await this.sendButtonMessage(to, "Menú Principal", message, buttons);
  }

  private async sendNearbyColmados(to: string, lat?: number, lng?: number): Promise<void> {
    // This would integrate with your database to find nearby colmados
    await this.sendTextMessage(
      to,
      "🏪 Buscando colmados cerca de ti... (Conectando con base de datos)"
    );
  }

  private async startOrderProcess(to: string): Promise<void> {
    const message = `🛒 *Nuevo Pedido*

¡Perfecto! Vamos a hacer tu pedido.

Primero, necesito saber:
1. ¿Qué productos necesitas?
2. ¿De qué colmado? (o te ayudo a encontrar uno)

Puedes escribir o usar tu voz 🎤`;

    await this.sendTextMessage(to, message);
  }

  private async handlePriceInquiry(from: string, text: string): Promise<void> {
    // Simple product recognition for common Dominican products
    const productKeywords = {
      'arroz': 'Arroz blanco',
      'pollo': 'Pollo fresco',
      'huevo': 'Huevos',
      'leche': 'Leche',
      'pan': 'Pan tostado',
      'aceite': 'Aceite de cocina',
      'azucar': 'Azúcar'
    };

    const foundProduct = Object.keys(productKeywords).find(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (foundProduct) {
      await this.sendTextMessage(
        from,
        `💰 Buscando precios de ${productKeywords[foundProduct as keyof typeof productKeywords]} en colmados cercanos...`
      );
    } else {
      await this.sendTextMessage(
        from,
        "🔍 ¿Qué producto específico te interesa? Puedo ayudarte a encontrar precios en colmados cercanos."
      );
    }
  }

  private async handlePaymentSelection(from: string, buttonId: string): Promise<void> {
    const paymentType = buttonId.split('_')[1]; // cash, card, digital
    const orderId = buttonId.split('_')[2];

    const paymentMessages = {
      cash: "💵 Pago en efectivo seleccionado. El colmado te contactará para coordinar la entrega.",
      card: "💳 Procesando pago con tarjeta... Serás redirigido al portal de pagos seguro.",
      digital: "📱 Pago digital seleccionado. ¿Prefieres PayPal o tPago?"
    };

    await this.sendTextMessage(from, paymentMessages[paymentType as keyof typeof paymentMessages]);
  }

  private async showColmadoMenu(from: string, colmadoId: string): Promise<void> {
    // This would fetch products from the specific colmado
    await this.sendTextMessage(from, `🏪 Cargando menú del colmado... (ID: ${colmadoId})`);
  }

  private async showProductDetails(from: string, productId: string): Promise<void> {
    // This would fetch specific product details
    await this.sendTextMessage(from, `📦 Cargando detalles del producto... (ID: ${productId})`);
  }

  private async handleListSelection(from: string, itemId: string): Promise<void> {
    await this.sendTextMessage(from, `✅ Selección recibida: ${itemId}`);
  }

  private getOrderStatusText(status: string): string {
    const statusTexts = {
      pending: 'Pendiente ⏳',
      confirmed: 'Confirmado ✅',
      preparing: 'Preparando 👨‍🍳',
      ready: 'Listo 🎉',
      delivered: 'Entregado 📦',
      cancelled: 'Cancelado ❌'
    };

    return statusTexts[status as keyof typeof statusTexts] || status;
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();