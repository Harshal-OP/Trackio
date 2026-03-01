import { z } from 'zod';

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const currencyCodeSchema = z.string().trim().length(3).toUpperCase();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
});

export const notificationSettingsSchema = z.object({
  subscriptionDue: z.boolean().default(true),
  budgetAlerts: z.boolean().default(true),
  weeklySummary: z.boolean().default(false),
  emailNotifications: z.boolean().default(false),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    settings: z
      .object({
        currency: currencyCodeSchema.optional(),
        notifications: notificationSettingsSchema.optional(),
      })
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.settings !== undefined, {
    message: 'At least one field must be provided',
  });

export const transactionCreateSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  date: z.string().datetime().or(z.string().date()),
  category: z.string().trim().min(1).max(64),
  label: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.string().trim().min(1).max(80),
  isRecurring: z.boolean().default(false),
  description: z.string().trim().min(1).max(160),
  icon: z.string().trim().max(64).optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const subscriptionCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(64),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'yearly', 'weekly']).default('monthly'),
  nextDueDate: z.string().datetime().or(z.string().date()),
  autopay: z.boolean().default(false),
  status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  logo: z.string().trim().max(64).optional(),
  icon: z.string().trim().max(64).optional(),
  color: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial();

export const budgetCreateSchema = z.object({
  category: z.string().trim().min(1).max(64),
  month: z.string().regex(monthRegex),
  limit: z.number().positive(),
});

export const budgetUpdateSchema = budgetCreateSchema.partial();

export const splitGroupCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  currency: z.string().trim().length(3).toUpperCase(),
  passcode: z.string().trim().min(4).max(32),
});

export const splitGroupUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const splitJoinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(16),
  passcode: z.string().trim().min(4).max(32),
});

export const splitMemberCreateSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    guestName: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    role: z.enum(['member', 'owner']).default('member'),
    status: z.enum(['active', 'invited', 'left']).default('active'),
  })
  .refine((value) => value.userId || value.guestName || value.email, {
    message: 'At least one member identity field is required',
  });

export const splitMemberUpdateSchema = z.object({
  guestName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['member', 'owner']).optional(),
  status: z.enum(['active', 'invited', 'left']).optional(),
});

const splitShareSchema = z.object({
  memberId: z.string().trim().min(1),
  amount: z.number().positive(),
});

export const splitExpenseCreateSchema = z
  .object({
    paidByMemberId: z.string().trim().min(1),
    amount: z.number().positive(),
    currency: z.string().trim().length(3).toUpperCase(),
    description: z.string().trim().min(1).max(200),
    splitType: z.enum(['equal', 'custom']),
    splits: z.array(splitShareSchema).min(1),
    date: z.string().datetime().or(z.string().date()).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => {
    const total = value.splits.reduce((sum, split) => sum + split.amount, 0);
    return Math.abs(total - value.amount) < 0.001;
  }, {
    message: 'Split amounts must match total amount',
    path: ['splits'],
  });

export const splitExpenseUpdateSchema = z.object({
  paidByMemberId: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  splitType: z.enum(['equal', 'custom']).optional(),
  splits: z.array(splitShareSchema).min(1).optional(),
  date: z.string().datetime().or(z.string().date()).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const splitSettlementCreateSchema = z.object({
  payerMemberId: z.string().trim().min(1),
  receiverMemberId: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).toUpperCase(),
  date: z.string().datetime().or(z.string().date()).optional(),
  note: z.string().trim().max(300).optional(),
});

export const reportQuerySchema = z.object({
  month: z.string().regex(monthRegex).optional(),
});

export const monthParamRegex = monthRegex;
