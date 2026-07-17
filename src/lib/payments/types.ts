/** Shared payment provider contracts — server-only usage. */

export type PaymentProviderId =
  | "stripe"
  | "zaincash"
  | "bank_transfer"
  | "eand_money"
  | "dupay"
  | "manual_proof";

export type ProviderPaymentStatus =
  | "created"
  | "redirected"
  | "pending"
  | "authentication_required"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "under_review";

export interface CreatePaymentInput {
  orderId: string;
  orderReference: string;
  amount: number;
  currency: string;
  countryCode: string;
  customerEmail?: string;
  successUrl: string;
  failureUrl: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  provider: PaymentProviderId;
  status: ProviderPaymentStatus;
  providerPaymentId?: string;
  redirectUrl?: string;
  instructions?: { ar: string; en: string };
  requiresProof: boolean;
  message?: string;
}

export interface VerifiedPaymentEvent {
  provider: PaymentProviderId;
  externalEventId: string;
  eventType: string;
  providerPaymentId?: string;
  orderId?: string;
  orderReference?: string;
  status: ProviderPaymentStatus;
  amount?: number;
  currency?: string;
  payloadHash: string;
  rawType?: string;
}

export interface PaymentStatus {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  amount?: number;
  currency?: string;
}

export interface RefundResult {
  providerPaymentId: string;
  status: "refunded" | "pending" | "failed";
  refundId?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(request: Request): Promise<VerifiedPaymentEvent>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;
  refundPayment?(providerPaymentId: string, amount?: number): Promise<RefundResult>;
}
