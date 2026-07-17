/**
 * Future fulfillment provider contract.
 * NOT wired to any hot wallet or private key in this phase.
 * AUTO_FULFILLMENT_ENABLED must remain false.
 */

export interface ValidationResult {
  ok: boolean;
  network: string;
  address: string;
  reason?: string;
}

export interface TransferResult {
  ok: boolean;
  providerTransferId?: string;
  txHash?: string;
  status: "blocked" | "queued" | "submitted" | "confirmed" | "failed";
  message: string;
}

export interface TransferStatus {
  providerTransferId: string;
  status: "blocked" | "queued" | "submitted" | "confirmed" | "failed";
  txHash?: string;
  confirmations?: number;
}

export interface FulfillmentProvider {
  validateDestination(): Promise<ValidationResult>;
  createTransfer(): Promise<TransferResult>;
  getTransferStatus(): Promise<TransferStatus>;
}

/** Locked stub — refuses all automatic sends. */
export class LockedFulfillmentProvider implements FulfillmentProvider {
  async validateDestination(): Promise<ValidationResult> {
    return { ok: false, network: "", address: "", reason: "AUTO_FULFILLMENT_DISABLED" };
  }

  async createTransfer(): Promise<TransferResult> {
    return {
      ok: false,
      status: "blocked",
      message: "Automatic USDT fulfillment is locked. Human approval and a real blockchain tx hash are required.",
    };
  }

  async getTransferStatus(): Promise<TransferStatus> {
    return { providerTransferId: "none", status: "blocked" };
  }
}
