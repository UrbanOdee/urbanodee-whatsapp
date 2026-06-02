const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const SHOPIFY_SECRET = process.env.SHOPIFY_SECRET;

function verifyShopify(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const hash = crypto
    .createHmac('sha256', SHOPIFY_SECRET)
    .update(JSON.stringify(req.body))
    .digest('base64');
  return hmac === hash;
}

app.post('/webhook', async (req, res) => {
  if (!verifyShopify(req)) {
    return res.status(401).send('Unauthorized');
  }

  const order = req.body;
  const name = order.customer?.first_name || 'Cliente';
  const orderNumber = order.order_number;
  const phone = order.customer?.phone || order.billing_address?.phone;

  if (!phone) {
    return res.status(200).send('No phone number');
  }

  // Limpiar número: quitar +, espacios, guiones
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            body: `¡Hola ${name}! 🎉 Hemos recibido tu pedido #${orderNumber} en Urban Odee. Lo estamos preparando con mucho cuidado. Pronto recibirás más novedades. ¡Gracias por tu compra! 🛍️`
          }
        })
      }
    );

    const data = await response.json();
    console.log('WhatsApp response:', JSON.stringify(data));
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Urban Odee WhatsApp Server activo ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
