#!/usr/bin/env node

/**
 * WhatsApp Business API Testing Script for WhatsOpí
 * Tests Dominican Spanish integration and colmado commerce flows
 */

import readline from 'readline';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('Could not load .env file:', error.message);
    return {};
  }
}

const env = loadEnv();

// Configuration
const WEBHOOK_URL = env.VITE_WEBHOOK_URL || 'http://localhost:3002/webhooks/whatsapp';
const ACCESS_TOKEN = env.VITE_WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = env.VITE_WHATSAPP_PHONE_NUMBER_ID;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🇩🇴 WhatsOpí - WhatsApp Business API Testing Tool');
console.log('================================================\n');

// Test webhook endpoint
async function testWebhookEndpoint() {
  console.log('🔍 Testing webhook endpoint...');
  
  try {
    const response = await fetch(`${WEBHOOK_URL.replace('/webhooks/whatsapp', '/health')}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook server is running:', data);
      return true;
    } else {
      console.log('❌ Webhook server not responding');
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook server error:', error.message);
    return false;
  }
}

// Test WhatsApp API credentials
async function testWhatsAppCredentials() {
  console.log('\n🔑 Testing WhatsApp Business API credentials...');
  
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log('❌ Missing WhatsApp credentials');
    console.log('Please set VITE_WHATSAPP_ACCESS_TOKEN and VITE_WHATSAPP_PHONE_NUMBER_ID in .env');
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ WhatsApp API credentials valid');
      console.log('📱 Phone number info:', data);
      return true;
    } else {
      console.log('❌ Invalid WhatsApp credentials');
      return false;
    }
  } catch (error) {
    console.log('❌ WhatsApp API error:', error.message);
    return false;
  }
}

// Send test message in Dominican Spanish
async function sendDominicanTestMessage(phoneNumber) {
  console.log(`\n📱 Sending Dominican Spanish test message to ${phoneNumber}...`);

  const dominicanMessages = [
    "¡Klk loco! 🇩🇴 Este es un mensaje de prueba de WhatsOpí",
    "¡Que lo que tiguer! Testing desde tu colmado digital favorito 🏪",
    "¡Buenas! WhatsOpí está funcionando brutal 💪",
    "¡Eyyy! Probando el sistema de mensajería dominicano 🚀"
  ];

  const randomMessage = dominicanMessages[Math.floor(Math.random() * dominicanMessages.length)];

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: randomMessage
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dominican test message sent successfully!');
      console.log('📬 Message ID:', data.messages[0].id);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Failed to send message:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error sending message:', error.message);
    return false;
  }
}

// Send colmado product list
async function sendColmadoProductList(phoneNumber) {
  console.log(`\n🏪 Sending colmado product list to ${phoneNumber}...`);

  const productListMessage = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: 'Colmado El Tigueraje 🇩🇴'
      },
      body: {
        text: '¡Buenas! Estos son nuestros productos disponibles hoy:\n\nPrecios al día y productos frescos 🌱'
      },
      footer: {
        text: 'WhatsOpí - Tu colmado digital'
      },
      action: {
        button: 'Ver Productos',
        sections: [
          {
            title: 'Productos Básicos',
            rows: [
              {
                id: 'arroz_5lb',
                title: 'Arroz Blanco (5 lb)',
                description: 'RD$ 180.00 - Calidad premium'
              },
              {
                id: 'pollo_fresco',
                title: 'Pollo Fresco (por libra)',
                description: 'RD$ 85.00 - Recién llegado'
              },
              {
                id: 'huevos_12',
                title: 'Huevos (Cartón 12)',
                description: 'RD$ 120.00 - Frescos del día'
              }
            ]
          },
          {
            title: 'Bebidas y Lácteos',
            rows: [
              {
                id: 'leche_1lt',
                title: 'Leche Entera (1 litro)',
                description: 'RD$ 85.00 - Rica Rica'
              },
              {
                id: 'refresco_2lt',
                title: 'Refresco (2 litros)',
                description: 'RD$ 75.00 - Coca Cola, Pepsi'
              },
              {
                id: 'cerveza_presidente',
                title: 'Cerveza Presidente',
                description: 'RD$ 65.00 - Bien fría 🍺'
              }
            ]
          }
        ]
      }
    }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productListMessage)
    });

    if (response.ok) {
      console.log('✅ Colmado product list sent successfully!');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Failed to send product list:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error sending product list:', error.message);
    return false;
  }
}

// Send payment options message
async function sendPaymentOptions(phoneNumber) {
  console.log(`\n💳 Sending Dominican payment options to ${phoneNumber}...`);

  const paymentMessage = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: 'Formas de Pago 💳'
      },
      body: {
        text: '¿Cómo quieres pagar tu pedido?\n\nTenemos todas las opciones dominicanas disponibles:'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'pay_cash',
              title: 'Efectivo 💵'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'pay_tpago',
              title: 'tPago 📱'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'pay_card',
              title: 'Tarjeta 💳'
            }
          }
        ]
      }
    }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentMessage)
    });

    if (response.ok) {
      console.log('✅ Payment options sent successfully!');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Failed to send payment options:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error sending payment options:', error.message);
    return false;
  }
}

// Test webhook verification
async function testWebhookVerification() {
  console.log('\n🔍 Testing webhook verification...');
  
  const verifyToken = env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsopi_webhook_2024';
  const challenge = 'test_challenge_123';
  
  try {
    const response = await fetch(
      `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
    );
    
    if (response.ok) {
      const responseText = await response.text();
      if (responseText === challenge) {
        console.log('✅ Webhook verification successful');
        return true;
      } else {
        console.log('❌ Webhook verification failed - wrong challenge response');
        return false;
      }
    } else {
      console.log('❌ Webhook verification failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook verification error:', error.message);
    return false;
  }
}

// Main testing function
async function runTests() {
  console.log('Starting WhatsOpí WhatsApp integration tests...\n');
  
  // Test 1: Webhook endpoint
  const webhookOk = await testWebhookEndpoint();
  
  // Test 2: WhatsApp credentials
  const credentialsOk = await testWhatsAppCredentials();
  
  // Test 3: Webhook verification
  const verificationOk = await testWebhookVerification();
  
  if (!credentialsOk) {
    console.log('\n⚠️ Cannot run message tests without valid WhatsApp credentials');
    console.log('Please configure your .env file with WhatsApp Business API credentials');
    return;
  }

  // Get phone number for testing
  rl.question('\n📱 Enter Dominican phone number to test (with +1809): ', async (phoneNumber) => {
    if (!phoneNumber.startsWith('+1809') && !phoneNumber.startsWith('+1829') && !phoneNumber.startsWith('+1849')) {
      console.log('⚠️ Please use a valid Dominican phone number (+1809, +1829, or +1849)');
      rl.close();
      return;
    }

    console.log(`\n🇩🇴 Testing with Dominican number: ${phoneNumber}`);
    
    // Test 4: Send Dominican greeting
    await sendDominicanTestMessage(phoneNumber);
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Send colmado product list
    await sendColmadoProductList(phoneNumber);
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 6: Send payment options
    await sendPaymentOptions(phoneNumber);
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log(`   Webhook endpoint: ${webhookOk ? '✅' : '❌'}`);
    console.log(`   WhatsApp credentials: ${credentialsOk ? '✅' : '❌'}`);
    console.log(`   Webhook verification: ${verificationOk ? '✅' : '❌'}`);
    console.log(`   Message sending: Check your WhatsApp! 📱`);
    
    console.log('\n🇩🇴 ¡WhatsOpí listo para conquistar los colmados dominicanos!');
    
    rl.close();
  });
}

// Run tests
runTests().catch(console.error);