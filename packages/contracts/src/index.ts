import { z } from "zod";
export const stages = [
  "New Enquiries",
  "Contacted",
  "Qualified",
  "Proposal / Discussion",
  "Won",
  "Lost",
] as const;
export const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Enter a valid calendar date");
export const channels = ["Call", "WhatsApp", "Email", "Meeting"] as const;
export const eventTypes = [
  "Insurance renewal",
  "Premium payment",
  "Loan instalment",
  "Loan review",
  "Bond interest",
  "Maturity",
] as const;
const optionalText = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .transform((v) => v ?? undefined);
const onboardingText = z.string().trim().max(1000).optional();
const onboardingDate = businessDate.or(z.literal("")).optional();
export const onboardingProfileSchema = z.object({
  maritalStatus: onboardingText,
  spouseName: onboardingText,
  spouseDob: onboardingDate,
  weddingDate: onboardingDate,
  children: z
    .array(
      z.object({
        name: onboardingText,
        dob: onboardingDate,
        relationship: onboardingText,
      }),
    )
    .max(20)
    .optional(),
  dependents: onboardingText,
  sameAddress: z.boolean().optional(),
  permanentAddress: onboardingText,
  pinCode: onboardingText,
  companyName: onboardingText,
  designation: onboardingText,
  professionalIndustry: onboardingText,
  experience: onboardingText,
  referredBy: onboardingText,
  clientCategory: onboardingText,
  clientSince: onboardingDate,
  monthlySavings: onboardingText,
  totalSavings: onboardingText,
  investmentHorizon: onboardingText,
  financialGoals: z.array(z.string().max(80)).max(20).optional(),
  policies: z
    .array(
      z.object({
        type: onboardingText,
        provider: onboardingText,
        name: onboardingText,
        sumAssured: onboardingText,
        renewalDate: onboardingDate,
      }),
    )
    .max(30)
    .optional(),
  loans: z
    .array(
      z.object({
        type: onboardingText,
        bank: onboardingText,
        amount: onboardingText,
        outstanding: onboardingText,
        emi: onboardingText,
        closureDate: onboardingDate,
      }),
    )
    .max(30)
    .optional(),
  investments: z
    .array(
      z.object({
        type: onboardingText,
        provider: onboardingText,
        amount: onboardingText,
        maturityDate: onboardingDate,
        expectedReturn: onboardingText,
      }),
    )
    .max(30)
    .optional(),
  communicationChannels: z.array(z.string().max(40)).max(10).optional(),
  preferredTime: onboardingText,
  bestDay: onboardingText,
  engagementTopics: z.array(z.string().max(80)).max(20).optional(),
  interests: z.array(z.string().max(80)).max(20).optional(),
  importantDates: z
    .array(
      z.object({
        type: onboardingText,
        date: onboardingDate,
        description: onboardingText,
      }),
    )
    .max(30)
    .optional(),
  language: onboardingText,
  noCallsDuringHours: z.boolean().optional(),
  whatsappOnly: z.boolean().optional(),
  initialFollowup: z
    .object({
      enabled: z.boolean(),
      date: onboardingDate,
      channel: z.enum(channels).optional(),
      notes: onboardingText,
    })
    .refine(
      (v) =>
        !v.enabled || (!!v.date && !!v.notes && v.notes.trim().length >= 2),
      "Add a date and notes for the follow-up",
    )
    .optional(),
});
export const phone = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .transform((v) => (/^\d{10}$/.test(v) ? `+91${v}` : v))
  .pipe(
    z
      .string()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Enter a valid phone number including country code",
      ),
  );
export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: z
    .union([z.email().transform((v) => v.toLowerCase().trim()), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  kind: z.enum(["Individual", "Business"]).default("Individual"),
  dob: businessDate
    .optional()
    .or(z.literal(""))
    .nullable()
    .transform((v) => v ?? undefined),
  gender: optionalText,
  occupation: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  source: z.string().max(80).default("Direct"),
  annualIncome: optionalText,
  riskProfile: optionalText,
  investmentInterest: optionalText,
  loanInterest: optionalText,
  preferredContact: optionalText,
  notesText: optionalText,
  onboardingProfile: onboardingProfileSchema.optional(),
  registrationNumber: optionalText,
  industry: optionalText,
  allowDuplicate: z.boolean().default(false),
  duplicateReason: optionalText,
  version: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
export const opportunitySchema = z.object({
  clientId: z.uuid(),
  requirement: z.string().trim().min(2).max(200),
  ownerId: z.uuid(),
  priority: z.enum(["Normal", "High", "Urgent"]).default("Normal"),
  source: z.string().max(80).default("Referral"),
  notes: optionalText,
  nextAction: z.string().trim().min(2).max(300),
  nextFollowUp: z.iso.datetime().optional(),
  stage: z.enum(stages).default("New Enquiries"),
});
export const followupSchema = z.object({
  clientId: z.uuid(),
  ownerId: z.uuid(),
  channel: z.enum(channels),
  dueAt: z.iso.datetime(),
  priority: z.enum(["Normal", "High", "Urgent"]).default("Normal"),
  notes: z.string().trim().min(2).max(2000),
  opportunityId: z.uuid().optional(),
  productId: z.uuid().optional(),
  eventId: z.uuid().optional(),
});
export const money = z
  .string()
  .regex(/^\d{1,15}$/, "Use a nonnegative whole number of paise");
export const productSchema = z.object({
  clientId: z.uuid(),
  definitionId: z.uuid(),
  identifier: z.string().trim().min(3).max(100),
  status: z.enum(["Application", "Active", "Closed"]).default("Application"),
  startDate: businessDate,
  premiumMinor: money.optional(),
  principalMinor: money.optional(),
  expectedCommissionMinor: money.default("0"),
  insuranceDetails: z
    .object({
      sumAssuredMinor: money,
      termYears: z.number().int().min(1).max(100),
    })
    .optional(),
  loanDetails: z
    .object({
      interestBasisPoints: z.number().int().min(0).max(10000),
      termMonths: z.number().int().min(1).max(600),
    })
    .optional(),
  investmentDetails: z
    .object({ units: z.string().max(50), maturityDate: z.string().optional() })
    .optional(),
});
export const eventSchema = z.object({
  productId: z.uuid(),
  type: z.enum(eventTypes),
  dueDate: businessDate,
  amountMinor: money,
  recurrenceMonths: z.number().int().min(1).max(120).optional(),
});
export type ClientInput = z.input<typeof clientSchema>;
