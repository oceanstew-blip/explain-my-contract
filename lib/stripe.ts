import "server-only";

import Stripe from "stripe";

export function createStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    appInfo: {
      name: "Explain My Contract",
      version: "0.1.0",
    },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
}
