---
name: mercado-pago
description: Expertise in Mercado Pago payment integration for Brazilian market. Use for PIX, Boleto, and Checkout Pro.
---

You have expertise in Mercado Pago payment integration for Brazilian market. Follow these patterns:

## Environment Variables
The user needs to configure these env vars (guide them to add via UI):
- MERCADO_PAGO_ACCESS_TOKEN: Server-side access token
- MERCADO_PAGO_PUBLIC_KEY: Client-side public key

For Vite projects, prefix client vars: VITE_MERCADO_PAGO_PUBLIC_KEY

## Recommended Packages
- mercadopago: Official SDK v2

Install command: npm install mercadopago

## Checkout Pro Pattern (Recommended)
Server-side (API route):
```typescript
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
});

const preference = new Preference(client);

const result = await preference.create({
  body: {
    items: [
      {
        id: 'item-1',
        title: 'Product Name',
        quantity: 1,
        unit_price: 100.00, // R$100.00 (use decimals, not centavos)
        currency_id: 'BRL',
      }
    ],
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/failure`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/pending`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
  }
});

return { init_point: result.init_point };
```

Client-side redirect:
```typescript
const response = await fetch('/api/checkout', { method: 'POST' });
const { init_point } = await response.json();
window.location.href = init_point;
```

## Webhook Handler Pattern (IPN)
```typescript
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
});

export async function POST(req: Request) {
  const body = await req.json();

  // Mercado Pago sends different notification types
  if (body.type === 'payment') {
    const paymentId = body.data.id;

    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    switch (paymentData.status) {
      case 'approved':
        // Payment approved - fulfill order
        // Update database, send email, etc.
        break;
      case 'pending':
        // Payment pending (boleto, PIX waiting)
        break;
      case 'rejected':
        // Payment rejected
        break;
      case 'refunded':
        // Payment refunded
        break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

## PIX Payment Pattern
```typescript
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
});

const payment = new Payment(client);

const result = await payment.create({
  body: {
    transaction_amount: 100.00,
    description: 'Product Name',
    payment_method_id: 'pix',
    payer: {
      email: 'customer@email.com',
      first_name: 'Customer',
      last_name: 'Name',
      identification: {
        type: 'CPF',
        number: '12345678900'
      }
    }
  }
});

// result.point_of_interaction.transaction_data contains:
// - qr_code: PIX copy-paste code
// - qr_code_base64: QR code image as base64
// - ticket_url: URL to payment page
```

## Boleto Payment Pattern
```typescript
const result = await payment.create({
  body: {
    transaction_amount: 100.00,
    description: 'Product Name',
    payment_method_id: 'bolbradesco', // or 'pec' for Caixa
    payer: {
      email: 'customer@email.com',
      first_name: 'Customer',
      last_name: 'Name',
      identification: {
        type: 'CPF',
        number: '12345678900'
      },
      address: {
        zip_code: '06233-200',
        street_name: 'Street Name',
        street_number: '123',
        neighborhood: 'Bairro',
        city: 'City',
        federal_unit: 'SP'
      }
    }
  }
});

// result.transaction_details.external_resource_url = boleto URL
```

## Subscription Pattern
```typescript
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
});

const preapproval = new PreApproval(client);

const result = await preapproval.create({
  body: {
    payer_email: 'customer@email.com',
    back_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/callback`,
    reason: 'Monthly Plan',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 49.90,
      currency_id: 'BRL'
    }
  }
});

return { init_point: result.init_point };
```

## Best Practices
1. NEVER expose ACCESS_TOKEN to client - only use PUBLIC_KEY
2. Always verify payment status via API before fulfilling orders
3. Handle all payment statuses (approved, pending, rejected, refunded)
4. Use IPN (Instant Payment Notification) webhooks
5. Store payment ID and preference ID in your database
6. Amounts are in BRL with decimals (100.00 = R$100, not centavos like Stripe)
7. PIX payments are instant, boletos may take 1-3 business days

## Common Issues
- "invalid_access_token": Check MERCADO_PAGO_ACCESS_TOKEN
- "invalid_payer": CPF/email required for PIX/boleto
- Use production credentials for live payments
- Test credentials only work in sandbox mode
