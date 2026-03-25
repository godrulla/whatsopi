# WhatsOpí - WhatsApp Business API Setup Guide 🇩🇴

Complete guide for setting up WhatsApp Business integration for the Dominican Republic colmado platform.

## Prerequisites

1. **Meta Developer Account**: https://developers.facebook.com/
2. **WhatsApp Business Account**: Business verification required
3. **Dominican Phone Number**: For testing (+1809, +1829, +1849)
4. **ngrok** (for local development): https://ngrok.com/

## Phase 1: Meta Developer Console Setup (15 minutes)

### Step 1: Create WhatsApp Business App

1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill app details:
   - **App Name**: "WhatsOpí - Colmado Digital"
   - **Contact Email**: Your business email
   - **Business Account**: Select or create one

### Step 2: Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Accept WhatsApp Business terms
4. Create or select a WhatsApp Business Account

### Step 3: Get API Credentials

1. In WhatsApp → Getting Started:
   - Copy **Phone Number ID**
   - Copy **WhatsApp Business Account ID**
   - Generate **Permanent Access Token**

2. Add to your `.env` file:
```bash
VITE_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

## Phase 2: Local Development Setup (10 minutes)

### Step 1: Install Dependencies

```bash
cd /Users/mando/Desktop/🛠️\ Dev-Tools/whatsopi

# Install webhook server dependencies
cd src/api
npm install

# Install ngrok (if not already installed)
# macOS with Homebrew:
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Webhook Server

```bash
# Terminal 1: Start the WhatsApp webhook server
cd src/api
npm start

# Server will run on http://localhost:3002
```

### Step 3: Set up ngrok Tunnel

```bash
# Terminal 2: Create public tunnel for webhooks
ngrok http 3002

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to .env file:
# VITE_WEBHOOK_URL=https://abc123.ngrok.io/webhooks/whatsapp
```

## Phase 3: WhatsApp Webhook Configuration (5 minutes)

### Step 1: Configure Webhook in Meta Console

1. Go to WhatsApp → Configuration in your app
2. Click "Edit" next to Webhook
3. Enter webhook details:
   - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhooks/whatsapp`
   - **Verify Token**: `whatsopi_webhook_2024` (or your custom token)
4. Click "Verify and Save"

### Step 2: Subscribe to Webhook Events

1. In Webhook section, click "Manage"
2. Subscribe to these events:
   - ✅ **messages** (incoming messages)
   - ✅ **message_deliveries** (delivery status)
   - ✅ **message_reads** (read receipts)

## Phase 4: Testing WhatsApp Integration (10 minutes)

### Step 1: Test Basic Setup

```bash
# Terminal 3: Run the testing script
cd /Users/mando/Desktop/🛠️\ Dev-Tools/whatsopi
node scripts/test-whatsapp.js

# Follow the prompts to test your Dominican phone number
```

### Step 2: Manual Testing

1. **Send test message from Meta Console**:
   - Go to WhatsApp → API Setup
   - Enter Dominican phone number: +1809XXXXXXX
   - Send test message
   - Check your WhatsApp for message

2. **Test webhook reception**:
   - Send message to your WhatsApp Business number
   - Check webhook server logs for incoming message
   - Verify Dominican Spanish processing

### Step 3: Test Dominican Features

Send these messages to your WhatsApp Business number:

```
Test Messages (Spanish):
• "Klk loco" (Dominican greeting)
• "Quiero pollo" (Product request)
• "Colmados cerca" (Find nearby stores)
• "Cuanto cuesta el arroz" (Price inquiry)
• "Hacer un pedido" (Place order)

Expected Responses:
• Dominican-style greetings
• Product lists with RD$ prices
• Colmado information
• Voice command instructions
```

## Phase 5: Frontend Integration (5 minutes)

### Step 1: Start Frontend Application

```bash
# Terminal 4: Start React frontend
cd /Users/mando/Desktop/🛠️\ Dev-Tools/whatsopi
npm run dev

# Visit: http://localhost:3001
```

### Step 2: Test UI Features

1. **Dominican Interface**:
   - ✅ Spanish language
   - ✅ Dominican flag colors
   - ✅ "Klk" greetings
   - ✅ Mobile-responsive design

2. **Voice Interface**:
   - ✅ Voice button (🎤)
   - ✅ Speech recognition
   - ✅ Dominican Spanish support

3. **WhatsApp Integration**:
   - ✅ Order placement
   - ✅ Product selection
   - ✅ Payment options

## Phase 6: Production Deployment (Optional)

### Step 1: Production Webhook URL

1. Deploy to your hosting provider
2. Update webhook URL in Meta Console
3. Use production domain instead of ngrok

### Step 2: Business Verification

1. Complete WhatsApp Business verification
2. Add business information
3. Upload business documents
4. Get green checkmark verification

## Troubleshooting Common Issues

### Webhook Not Receiving Messages

```bash
# Check webhook server logs
curl http://localhost:3002/health

# Test webhook verification
curl "http://localhost:3002/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=whatsopi_webhook_2024&hub.challenge=test"
```

### WhatsApp API Errors

```bash
# Test API credentials
curl -X GET "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### ngrok Issues

```bash
# Check ngrok status
ngrok status

# Restart ngrok tunnel
ngrok kill
ngrok http 3002
```

## Dominican-Specific Features

### Language Support

- **Primary**: Dominican Spanish (es-DO)
- **Secondary**: Haitian Creole (ht)
- **Expressions**: "Klk", "Que lo que", "Tiguer", "Brutal"

### Payment Methods

- 💵 **Efectivo** (Cash on delivery)
- 📱 **tPago** (Dominican digital wallet)
- 💳 **Tarjetas** (Credit/debit cards)
- 🏦 **Bancos** (Dominican banks)

### Product Categories

- 🍚 **Alimentos básicos**: Arroz, habichuelas, aceite
- 🥩 **Proteínas**: Pollo, huevos, queso
- 🥛 **Lácteos**: Leche, mantequilla, yogur
- 🥤 **Bebidas**: Refrescos, cerveza, agua
- 🍞 **Panadería**: Pan, galletas, dulces

## Testing Checklist ✅

- [ ] Meta Developer account created
- [ ] WhatsApp Business app configured
- [ ] API credentials obtained
- [ ] Webhook server running (port 3002)
- [ ] ngrok tunnel active
- [ ] Webhook configured in Meta Console
- [ ] Test messages sent and received
- [ ] Dominican Spanish responses working
- [ ] Product lists displaying correctly
- [ ] Payment options functional
- [ ] Voice interface accessible
- [ ] Frontend application running (port 3001)

## Support and Resources

### Meta Documentation
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Webhook Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

### Dominican Resources
- [tPago Integration](https://www.tpago.do/developers)
- [Dominican Banking APIs](https://bancentral.gov.do)
- [RD Phone Number Format](https://en.wikipedia.org/wiki/Telephone_numbers_in_the_Dominican_Republic)

### WhatsOpí Specific
- Test number: Use your Dominican number (+1809/829/849)
- Webhook logs: Check Terminal 1 output
- API logs: Check Terminal 4 (frontend) Network tab

---

## 🇩🇴 ¡Listo para conquistar los colmados dominicanos!

Your WhatsOpí platform is now ready to serve the Dominican informal economy with authentic WhatsApp integration and cultural appropriateness.

**Next Steps:**
1. Complete business verification
2. Add real colmado data
3. Test with actual Dominican users
4. Deploy to production

**¡Klk! WhatsOpí está brutal! 🚀**