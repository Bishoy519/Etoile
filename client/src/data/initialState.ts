import { Student, ProductItem, OpenWaMessage, FinancialMetrics, AttendanceRecord } from '../types';

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
};

export const INITIAL_OPENWA_MESSAGES: OpenWaMessage[] = [];
