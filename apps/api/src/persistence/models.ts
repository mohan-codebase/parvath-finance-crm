// Persistent record types. References are resolved only when requested by a repository query.
export interface Organization {
  id: string;
  name: string;
  timezone: string;
  createdAt: Date;
  members: Membership[];
  contacts: Contact[];
  clients: Client[];
  providers: Provider[];
  definitions: ProductDefinition[];
  opportunities: Opportunity[];
  products: ClientProduct[];
  events: FinancialEvent[];
  followups: FollowUp[];
  documents: Document[];
  activities: Activity[];
  notifications: Notification[];
  imports: ImportJob[];
  jobs: Job[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  createdAt: Date;
  memberships: Membership[];
  resets: PasswordReset[];
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  organization: Organization;
  user: User;
}

export interface PasswordReset {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: User;
}

export interface Contact {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string | null;
  kind: string;
  dob: Date | null;
  gender: string | null;
  occupation: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  version: number;
  organization: Organization;
  business: Business | null;
  client: Client | null;
  relationsFrom: ContactRelationship[];
  relationsTo: ContactRelationship[];
}

export interface Business {
  id: string;
  contactId: string;
  registrationNumber: string | null;
  industry: string | null;
  contact: Contact;
}

export interface ContactRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  from: Contact;
  to: Contact;
}

export interface Client {
  id: string;
  organizationId: string;
  contactId: string;
  isClient: boolean;
  status: string;
  source: string;
  ownerId: string;
  annualIncome: string | null;
  riskProfile: string | null;
  investmentInterest: string | null;
  loanInterest: string | null;
  preferredContact: string | null;
  notesText: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  organization: Organization;
  contact: Contact;
  opportunities: Opportunity[];
  products: ClientProduct[];
  events: FinancialEvent[];
  followups: FollowUp[];
  communications: Communication[];
  documents: Document[];
  notes: Note[];
  tags: ClientTag[];
  consents: Consent[];
}

export interface Tag {
  id: string;
  name: string;
  clients: ClientTag[];
}

export interface ClientTag {
  id: string;
  clientId: string;
  tagId: string;
  client: Client;
  tag: Tag;
}

export interface Consent {
  id: string;
  clientId: string;
  channel: string;
  granted: boolean;
  source: string;
  recordedAt: Date;
  client: Client;
}

export interface Provider {
  id: string;
  organizationId: string;
  name: string;
  organization: Organization;
  definitions: ProductDefinition[];
}

export interface ProductDefinition {
  id: string;
  organizationId: string;
  providerId: string;
  name: string;
  category: string;
  organization: Organization;
  provider: Provider;
  products: ClientProduct[];
}

export interface ClientProduct {
  id: string;
  organizationId: string;
  clientId: string;
  definitionId: string;
  opportunityId: string | null;
  identifier: string;
  status: string;
  currency: string;
  premiumMinor: bigint | null;
  principalMinor: bigint | null;
  expectedCommissionMinor: bigint;
  insuranceDetails: any | null;
  loanDetails: any | null;
  investmentDetails: any | null;
  startDate: Date;
  version: number;
  createdAt: Date;
  organization: Organization;
  client: Client;
  definition: ProductDefinition;
  opportunity: Opportunity | null;
  events: FinancialEvent[];
  followups: FollowUp[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  clientId: string;
  requirement: string;
  stage: string;
  ownerId: string;
  priority: string;
  source: string;
  notes: string | null;
  nextAction: string;
  nextFollowUp: Date | null;
  lostReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  organization: Organization;
  client: Client;
  history: OpportunityStageHistory[];
  product: ClientProduct | null;
  followups: FollowUp[];
}

export interface OpportunityStageHistory {
  id: string;
  opportunityId: string;
  fromStage: string | null;
  toStage: string;
  reason: string | null;
  actorId: string;
  createdAt: Date;
  opportunity: Opportunity;
}

export interface FinancialEvent {
  id: string;
  organizationId: string;
  clientId: string;
  productId: string;
  type: string;
  dueDate: Date;
  amountMinor: bigint;
  amountMeaning: string;
  currency: string;
  status: string;
  recurrenceMonths: number | null;
  version: number;
  completedAt: Date | null;
  organization: Organization;
  client: Client;
  product: ClientProduct;
  payments: Payment[];
  followups: FollowUp[];
}

export interface Payment {
  id: string;
  eventId: string;
  amountMinor: bigint;
  reference: string;
  recordedBy: string;
  recordedAt: Date;
  event: FinancialEvent;
}

export interface FollowUp {
  id: string;
  organizationId: string;
  clientId: string;
  opportunityId: string | null;
  productId: string | null;
  eventId: string | null;
  ownerId: string;
  channel: string;
  dueAt: Date;
  priority: string;
  notes: string;
  state: string;
  outcome: string | null;
  completedAt: Date | null;
  version: number;
  createdAt: Date;
  organization: Organization;
  client: Client;
  opportunity: Opportunity | null;
  product: ClientProduct | null;
  event: FinancialEvent | null;
}

export interface Communication {
  id: string;
  clientId: string;
  channel: string;
  event: string;
  body: string | null;
  providerId: string | null;
  actorId: string;
  createdAt: Date;
  client: Client;
}

export interface Document {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  key: string;
  contentType: string;
  purpose: string;
  size: number;
  status: string;
  uploadedBy: string;
  createdAt: Date;
  organization: Organization;
  client: Client;
}

export interface Note {
  id: string;
  clientId: string;
  body: string;
  authorId: string;
  createdAt: Date;
  client: Client;
}

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  link: string;
  readAt: Date | null;
  createdAt: Date;
  organization: Organization;
}

export interface Activity {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  requestId: string | null;
  createdAt: Date;
  organization: Organization;
}

export interface ImportJob {
  id: string;
  organizationId: string;
  actorId: string;
  rows: any;
  result: any | null;
  state: string;
  createdAt: Date;
  organization: Organization;
}

export interface Job {
  leaseToken: string | null;
  id: string;
  organizationId: string;
  key: string;
  type: string;
  payload: any;
  runAt: Date;
  state: string;
  attempts: number;
  lockedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  organization: Organization;
}

export interface Models {
  organization: Organization;
  user: User;
  membership: Membership;
  passwordReset: PasswordReset;
  contact: Contact;
  business: Business;
  contactRelationship: ContactRelationship;
  client: Client;
  tag: Tag;
  clientTag: ClientTag;
  consent: Consent;
  provider: Provider;
  productDefinition: ProductDefinition;
  clientProduct: ClientProduct;
  opportunity: Opportunity;
  opportunityStageHistory: OpportunityStageHistory;
  financialEvent: FinancialEvent;
  payment: Payment;
  followUp: FollowUp;
  communication: Communication;
  document: Document;
  note: Note;
  notification: Notification;
  activity: Activity;
  importJob: ImportJob;
  job: Job;
}
