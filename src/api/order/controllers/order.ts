const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY);

/**
 * order controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;

    const lineItems = await Promise.all(
      products.map(async (cartItem) => {
        const item = await strapi
          .service("api::product.product")
          .findOne(cartItem.product.id)

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
            },
            unit_amount: item.price * 100,
          },
          quantity: cartItem.quantity,
        }
      })
    )

    try {
      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: {allowed_countries: ['US', 'CA', 'UA']},
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/cart?success=true`,
        cancel_url: `${process.env.CLIENT_URL}/cart?canceled=true`,
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({
          data: {
            products,
            stripeId: session.id
          }
        });

      return { stripeSession: session }

    } catch (error) {
      console.log('error ', error)
      ctx.response.status = 500;
    }
  }
}));
