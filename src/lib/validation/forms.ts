import { z } from "zod";

export const authIdentifierSchema = z.union([z.string().email(), z.string().regex(/^\+[1-9]\d{7,14}$/)]);
export const passwordSchema = z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/).regex(/[^A-Za-z0-9]/);

export const registerSchema = z.object({
  identifier: z.string().email(),
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(100),
  locale: z.enum(["ar", "en"]),
  termsAccepted: z.literal("on"),
});

export const orderRequestSchema = z.object({
  orderType: z.enum(["buy", "sell", "p2p"]),
  fiatCurrency: z.enum(["USD", "AED", "IQD"]),
  network: z.enum(["TRC20", "ERC20"]),
  amount: z.coerce.number().positive().max(1_000_000),
  walletAddress: z.string().trim().transform((value) => value.replace(/\s+/g, "")).pipe(z.string().min(20).max(128)),
  transactionPurpose: z.string().trim().min(5).max(500),
  paymentMethodId: z.string().uuid(),
  customerNote: z.string().trim().max(1000).optional().default(""),
}).superRefine((value, context) => {
  const valid = value.network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.walletAddress) : /^0x[a-fA-F0-9]{40}$/.test(value.walletAddress);
  if (!valid) context.addIssue({ code: "custom", path: ["walletAddress"], message: `Invalid ${value.network} wallet address` });
});

export const proofMetadataSchema = z.object({
  transferReference: z.string().trim().min(3).max(100),
  senderName: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(1_000_000),
  paymentAt: z.coerce.date(),
  customerNote: z.string().trim().max(1000).optional().default(""),
});
