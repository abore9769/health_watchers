import { z } from 'zod';

export const portalLoginSchema = z.object({
  email: z.string().email(),
  dateOfBirth: z.string().min(1),
});

export type PortalLoginDto = z.infer<typeof portalLoginSchema>;

export const portalMfaSetupSchema = z.object({
  method: z.enum(['totp', 'sms']),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

export type PortalMfaSetupDto = z.infer<typeof portalMfaSetupSchema>;

export const portalMfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  tempToken: z.string().min(1),
});

export type PortalMfaVerifyDto = z.infer<typeof portalMfaVerifySchema>;

export const portalMfaConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  backupCodes: z.array(z.string()).optional(),
});

export type PortalMfaConfirmDto = z.infer<typeof portalMfaConfirmSchema>;

export const portalMfaDisableSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export type PortalMfaDisableDto = z.infer<typeof portalMfaDisableSchema>;
