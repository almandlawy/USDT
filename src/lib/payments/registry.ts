import "server-only";
import type { PaymentProvider, PaymentProviderId } from "@/lib/payments/types";
import { StripePaymentProvider } from "@/lib/payments/providers/stripe";
import { ZainCashPaymentProvider } from "@/lib/payments/providers/zaincash";
import {
  BankTransferPaymentProvider,
  DuPayPaymentProvider,
  EandMoneyPaymentProvider,
  ManualProofPaymentProvider,
} from "@/lib/payments/providers/manual";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  stripe: new StripePaymentProvider(),
  zaincash: new ZainCashPaymentProvider(),
  bank_transfer: new BankTransferPaymentProvider(),
  eand_money: new EandMoneyPaymentProvider(),
  dupay: new DuPayPaymentProvider(),
  manual_proof: new ManualProofPaymentProvider(),
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Unknown payment provider: ${id}`);
  return provider;
}

export function providerIdFromMethodCode(code: string): PaymentProviderId | null {
  switch (code) {
    case "stripe_card":
      return "stripe";
    case "zain_cash":
      return "zaincash";
    case "bank_transfer":
      return "bank_transfer";
    case "eand_money":
      return "eand_money";
    case "dupay":
      return "dupay";
    case "manual_proof":
    case "fib":
    case "superqi":
    case "cash_representative":
    case "wallet_transfer":
      return "manual_proof";
    default:
      return null;
  }
}
