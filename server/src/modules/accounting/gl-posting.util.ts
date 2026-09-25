import { round2 } from '../../common/money.util';

/** Unified GL auto-posting: every financial event emits a balanced voucher.
 * Uses the unified COA (1010 cash, 1020 bank, 1200 AR, 4010 tuition, 4020 retail,
 * 5010 payroll, 60100+ opex, 60900 shortage, 40500 other income).
 * All posts are best-effort (catch inside callers) so operations never block.
 */

interface VoucherLine {
  accountCode: string;
  accountName: string;
  debit?: number;
  credit?: number;
  notes?: string;
}

type PrismaLike = {
  journalEntry: { create: (a: unknown) => Promise<unknown> };
};

export async function postVoucher(
  prisma: PrismaLike,
  memo: string,
  lines: VoucherLine[],
  postedBy = 'Auto-GL',
): Promise<unknown | null> {
  const norm = lines.map((l) => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    debit: round2(l.debit || 0),
    credit: round2(l.credit || 0),
    notes: l.notes || memo,
  }));
  const dr = round2(norm.reduce((s, l) => s + l.debit, 0));
  const cr = round2(norm.reduce((s, l) => s + l.credit, 0));
  if (norm.length < 2 || Math.abs(dr - cr) > 0.01 || dr === 0) return null;
  try {
    return await prisma.journalEntry.create({
      data: {
        voucherNumber: `GL-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        memo,
        totalDebit: dr,
        totalCredit: cr,
        status: 'posted',
        postedBy,
        lines: { create: norm },
      },
    } as never);
  } catch {
    return null;
  }
}

const EXPENSE_COA: Record<string, { code: string; name: string }> = {
  studio_rent: { code: '60100', name: 'Studio Rent' },
  utilities: { code: '60200', name: 'Utilities' },
  piano_maintenance: { code: '60300', name: 'Piano Maintenance' },
  costumes_production: { code: '60400', name: 'Costumes Production' },
  cleaning_sanitization: { code: '60500', name: 'Cleaning' },
  marketing_social: { code: '60600', name: 'Marketing' },
  software_licenses: { code: '60700', name: 'Software Licenses' },
  administrative_legal: { code: '60900', name: 'Admin & Legal' },
};

export function expenseCoa(category: string): { code: string; name: string } {
  return EXPENSE_COA[category] || { code: '60900', name: 'Operating Expense' };
}

export function cashAccount(method: string): { code: string; name: string } {
  if (method === 'instapay') return { code: '1025', name: 'InstaPay' };
  if (method === 'card' || method === 'bank_transfer') return { code: '1020', name: 'Bank' };
  return { code: '1010', name: 'Cash' };
}
