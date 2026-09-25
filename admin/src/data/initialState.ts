import {
  Student,
  ProductItem,
  OpenWaMessage,
  FinancialMetrics,
  AttendanceRecord,
  StaffMember,
  AdmissionLead,
  StudentNote,
  SkillEvaluation,
  CrmAuditEntry,
  BoutiqueOrder,
  ExpenseItem,
  InvoiceItem,
  PayrollSlip,
  JournalVoucher,
  CashDrawerShift,
} from '../types';

// Clean initial state — populated from backend API at runtime
export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_PRODUCTS: ProductItem[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_FINANCIALS: FinancialMetrics = {
  mrr: 0,
  churnRate: 0,
  quotaUtilization: 0,
  totalSubscriptionsSold: 0,
  recognizedRevenue: 0,
  deferredRevenue: 0,
  retailGrossMargin: 0,
  payrollExpenses: 0,
  operatingExpenses: 0,
  netProfit: 0,
  totalInflow: 0,
  totalOutflow: 0,
  cashOnHand: 0,
};

export const INITIAL_BOUTIQUE_ORDERS: BoutiqueOrder[] = [];

export const INITIAL_OPENWA_MESSAGES: OpenWaMessage[] = [];

export const INITIAL_STAFF: StaffMember[] = [];

export const INITIAL_LEADS: AdmissionLead[] = [];

export const INITIAL_NOTES: StudentNote[] = [];

export const INITIAL_EVALUATIONS: SkillEvaluation[] = [];

export const INITIAL_AUDIT_LOGS: CrmAuditEntry[] = [];

export const INITIAL_EXPENSES: ExpenseItem[] = [];

export const INITIAL_INVOICES: InvoiceItem[] = [];

export const INITIAL_PAYROLL: PayrollSlip[] = [];

export const INITIAL_JOURNAL: JournalVoucher[] = [];

export const INITIAL_DRAWER_SHIFT: CashDrawerShift | null = null;
