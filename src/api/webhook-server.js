const express = require('express');
const cors = require('cors');
const app = express();

// Dominican WhatsApp webhook handler for WhatsOpí
const PORT = process.env.PORT || 3002;
const WEBHOOK_VERIFY_TOKEN = process.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsopi_webhook_2024';

app.use(cors());
app.use(express.json());

// Webhook verification (required by WhatsApp)
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Webhook verification request received');
  console.log('Mode:', mode);
  console.log('Token:', token);
  console.log('Expected token:', WEBHOOK_VERIFY_TOKEN);

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Handle incoming WhatsApp messages
app.post('/webhooks/whatsapp', (req, res) => {
  console.log('📱 Incoming WhatsApp webhook data:');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;

    // Check if this is a WhatsApp message
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(entry => {
        entry.changes?.forEach(change => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            const metadata = change.value.metadata;

            messages?.forEach(message => {
              console.log(`📩 Message from ${message.from}:`, message.text?.body);
              
              // Process Dominican Spanish message
              processWhatsAppMessage(message, metadata);
            });
          }
        });
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Process incoming WhatsApp messages with Dominican context
async function processWhatsAppMessage(message, metadata) {
  const messageType = message.type;
  const from = message.from;
  const phoneNumberId = metadata.phone_number_id;

  console.log(`🇩🇴 Processing ${messageType} message from Dominican user: ${from}`);

  try {
    switch (messageType) {
      case 'text':
        await handleDominicanTextMessage(from, message.text.body, phoneNumberId);
        break;
      case 'audio':
        await handleVoiceMessage(from, message.audio, phoneNumberId);
        break;
      case 'location':
        await handleLocationMessage(from, message.location, phoneNumberId);
        break;
      case 'interactive':
        await handleInteractiveMessage(from, message.interactive, phoneNumberId);
        break;
      default:
        console.log(`⚠️ Unhandled message type: ${messageType}`);
        await sendWhatsAppMessage(from, phoneNumberId, 
          "Lo siento, no puedo procesar este tipo de mensaje. Intenta enviar texto. 🇩🇴");
    }
  } catch (error) {
    console.error('❌ Error processing message:', error);
    await sendWhatsAppMessage(from, phoneNumberId, 
      "Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.");
  }
}

// Handle Dominican Spanish text messages
async function handleDominicanTextMessage(from, text, phoneNumberId) {
  const lowerText = text.toLowerCase();
  console.log(`💬 Dominican text: "${text}"`);

  // Dominican Spanish greetings and expressions
  if (lowerText.includes('klk') || lowerText.includes('que lo que') || 
      lowerText.includes('hola') || lowerText.includes('buenas')) {
    
    const dominicanGreetings = [
      "¡Klk loco! 🇩🇴 Bienvenido a WhatsOpí, tu colmado digital",
      "¡Que lo que tiguer! 😄 ¿En qué te puedo ayudar hoy?",
      "¡Buenas! ¿Cómo tú tá? WhatsOpí a tu servicio 🏪",
      "¡Eyyy! ¿Qué tal todo? Soy tu asistente de colmado digital"
    ];

    const randomGreeting = dominicanGreetings[Math.floor(Math.random() * dominicanGreetings.length)];
    await sendWhatsAppMessage(from, phoneNumberId, randomGreeting);
    
    // Send main menu
    await sendDominicanMainMenu(from, phoneNumberId);
    
  } else if (lowerText.includes('colmado') || lowerText.includes('tienda') || 
             lowerText.includes('productos') || lowerText.includes('que tienen')) {
    
    await sendWhatsAppMessage(from, phoneNumberId, 
      "🏪 ¡Perfecto! Te voy a mostrar los colmados cerca de ti.\n\n" +
      "Los mejores colmados dominicanos con:\n" +
      "• Productos frescos 🥬\n" +
      "• Delivery rápido 🚚\n" +
      "• Precios justos 💰\n" +
      "• Pago en efectivo o digital 💳");
      
  } else if (lowerText.includes('precio') || lowerText.includes('cuanto cuesta') || 
             lowerText.includes('cuanto vale') || lowerText.includes('precio de')) {
    
    const products = extractDominicanProducts(text);
    if (products.length > 0) {
      await sendWhatsAppMessage(from, phoneNumberId, 
        `💰 Buscando precios de ${products.join(', ')} en colmados cercanos...\n\n` +
        "Te voy a conseguir los mejores precios en tu zona 🇩🇴");
    } else {
      await sendWhatsAppMessage(from, phoneNumberId, 
        "🔍 ¿Qué producto específico te interesa?\n\n" +
        "Por ejemplo: arroz, pollo, huevos, leche, pan, aceite...");
    }
    
  } else if (lowerText.includes('pedido') || lowerText.includes('quiero') || 
             lowerText.includes('comprar') || lowerText.includes('ordenar')) {
    
    await sendWhatsAppMessage(from, phoneNumberId, 
      "🛒 ¡Brutal! Vamos a hacer tu pedido.\n\n" +
      "¿Qué necesitas?\n" +
      "• Puedes escribir los productos\n" +
      "• O usar tu voz 🎤\n" +
      "• O elegir de una lista\n\n" +
      "Ejemplo: 'Quiero 2 libras de pollo y una botella de aceite'");
      
  } else {
    // Default response with Dominican touch
    await sendDominicanMainMenu(from, phoneNumberId);
  }
}

// Send Dominican-style main menu
async function sendDominicanMainMenu(from, phoneNumberId) {
  const menuMessage = `🏪 *WhatsOpí - Tu Colmado Digital* 🇩🇴

¿En qué te puedo ayudar hoy?

🔍 Buscar productos
🏪 Ver colmados cercanos
🛒 Hacer un pedido
💰 Comparar precios
🚚 Tracking de delivery
🎤 Usar comandos de voz

*¡Escribe lo que necesitas o usa los botones!*
_Ejemplo: "Quiero pollo" o "Colmados cerca"_`;

  await sendWhatsAppMessage(from, phoneNumberId, menuMessage);
}

// Extract Dominican product names from text
function extractDominicanProducts(text) {
  const dominicanProducts = {
    'arroz': 'arroz',
    'pollo': 'pollo',
    'huevo': 'huevos',
    'huevos': 'huevos',
    'leche': 'leche',
    'pan': 'pan',
    'aceite': 'aceite',
    'azucar': 'azúcar',
    'azúcar': 'azúcar',
    'habichuela': 'habichuelas',
    'habichuelas': 'habichuelas',
    'yuca': 'yuca',
    'platano': 'plátano',
    'plátano': 'plátano',
    'queso': 'queso',
    'mantequilla': 'mantequilla',
    'cafe': 'café',
    'café': 'café',
    'cerveza': 'cerveza',
    'refresco': 'refresco',
    'agua': 'agua',
    'ron': 'ron'
  };

  const foundProducts = [];
  const lowerText = text.toLowerCase();

  Object.keys(dominicanProducts).forEach(keyword => {
    if (lowerText.includes(keyword)) {
      foundProducts.push(dominicanProducts[keyword]);
    }
  });

  return [...new Set(foundProducts)]; // Remove duplicates
}

// Handle voice messages (Dominican Spanish)
async function handleVoiceMessage(from, audio, phoneNumberId) {
  console.log('🎤 Voice message received from Dominican user');
  
  await sendWhatsAppMessage(from, phoneNumberId, 
    "🎤 ¡Mensaje de voz recibido!\n\n" +
    "Estoy procesando tu audio en español dominicano...\n" +
    "(Esta función estará disponible pronto con reconocimiento de voz caribeño) 🇩🇴");
}

// Handle location sharing
async function handleLocationMessage(from, location, phoneNumberId) {
  const { latitude, longitude } = location;
  console.log(`📍 Location received: ${latitude}, ${longitude}`);
  
  await sendWhatsAppMessage(from, phoneNumberId, 
    `📍 ¡Ubicación recibida!\n\n` +
    `Buscando colmados cerca de ti en:\n` +
    `Lat: ${latitude}\n` +
    `Lng: ${longitude}\n\n` +
    `Te voy a mostrar los mejores colmados dominicanos en tu zona 🏪🇩🇴`);
}

// Handle interactive messages (buttons/lists)
async function handleInteractiveMessage(from, interactive, phoneNumberId) {
  console.log('🔘 Interactive message received:', interactive);
  
  if (interactive.button_reply) {
    const buttonId = interactive.button_reply.id;
    await sendWhatsAppMessage(from, phoneNumberId, 
      `✅ Selección recibida: ${buttonId}\n\nProcesando tu solicitud... 🇩🇴`);
  }
}

// Send WhatsApp message using Business API
async function sendWhatsAppMessage(to, phoneNumberId, message) {
  try {
    const accessToken = process.env.VITE_WHATSAPP_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('⚠️ No access token configured - would send:', message);
      return;
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

    if (response.ok) {
      console.log('✅ Message sent successfully to', to);
    } else {
      console.error('❌ Failed to send message:', response.status);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'WhatsOpí Webhook Server',
    country: 'Dominican Republic 🇩🇴',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsOpí webhook server running on port ${PORT}`);
  console.log(`🇩🇴 Ready to handle Dominican WhatsApp messages!`);
  console.log(`📋 Webhook URL: http://localhost:${PORT}/webhooks/whatsapp`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});