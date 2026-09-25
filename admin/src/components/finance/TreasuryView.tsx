import React, { useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import { TreasuryPurpose, TreasurySource } from '../../types';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import {
  Wallet, Plus, ArrowRightLeft, Pencil, Trash2, X, CheckCircle2,
  AlertTriangle, Download, Search, Landmark, ShoppingBag, GraduationCap,
  Banknote, Zap, Calendar, TrendingUp, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PURPOSE_META: Record<TreasuryPurpose, { en: string; ar: string; cls: string }> = {
  store: { en: 'Store', ar: 'المتجر', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
  subscription: { en: 'Subscriptions', ar: 'الاشتراكات', cls: 'bg-violet-500/15 border-violet-500/30 text-violet-300' },
  general: { en: 'General', ar: 'عام', cls: 'bg-sky-500/15 border-sky-500/30 text-sky-300' },
  payroll: { en: 'Payroll', ar: 'الرواتب', cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300' },
  opex: { en: 'Expenses', ar: 'المصروفات', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
};

const SOURCE_LABEL: Record<TreasurySource, string> = {
  store_sales: 'Store sales',
  subscription: 'Subscription',
  other_income: 'Other income',
  expense: 'Expense',
  payroll: 'Payroll',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
};

export const TreasuryView: React.FC = () => {
  const {
    language, orders, invoices, financials,
    treasuryAccounts, treasuryTransactions,
    addTreasuryAccount, updateTreasuryAccount, deleteTreasuryAccount,
    reconcileTreasuryAccount, addTreasuryTransaction, deleteTreasuryTransaction,
    showToast,
  } = useAdmin();
  const isRtl = language === 'ar';
  const treasuryView = useViewPrefs('finance-treasury', 'cards');

  // ---- System-computed gains (live from POS + invoices) ----
  const system = useMemo(() => {
    const posStore = orders.reduce((s, o: any) => s + Number(o?.total ?? o?.totalAmount ?? 0), 0);
    const invTuitionPaid = invoices
      .filter((i) => i.type === 'tuition' || i.type === 'private_lesson')
      .reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const invBoutiquePaid = invoices
      .filter((i) => i.type === 'boutique')
      .reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const storeSystem = posStore + invBoutiquePaid;
    const subscriptionSystem = invTuitionPaid;
    return { posStore, invTuitionPaid, invBoutiquePaid, storeSystem, subscriptionSystem, totalSystem: storeSystem + subscriptionSystem };
  }, [orders, invoices]);

  // ---- Per-account math ----
  const accountStats = useMemo(() => {
    return treasuryAccounts.map((a) => {
      const txns = treasuryTransactions.filter((t) => t.accountId === a.id);
      const inflow = txns.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amount, 0);
      const outflow = txns.filter((t) => t.kind === 'withdraw').reduce((s, t) => s + t.amount, 0);
      const expected = a.openingBalance + inflow - outflow;
      const counted = a.countedBalance ?? expected;
      const variance = counted - expected;
      return { account: a, txns, inflow, outflow, expected, counted, variance };
    });
  }, [treasuryAccounts, treasuryTransactions]);

  const totals = useMemo(() => {
    const expected = accountStats.reduce((s, x) => s + x.expected, 0);
    const counted = accountStats.reduce((s, x) => s + x.counted, 0);
    const opening = treasuryAccounts.reduce((s, a) => s + (Number(a.openingBalance) || 0), 0);
    const deposits = treasuryTransactions.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawals = treasuryTransactions.filter((t) => t.kind === 'withdraw').reduce((s, t) => s + t.amount, 0);
    return { expected, counted, variance: counted - expected, opening, deposits, withdrawals };
  }, [accountStats, treasuryAccounts, treasuryTransactions]);

  // Recorded per source (deposits only, transfers excluded to avoid double count)
  const recordedBySource = useMemo(() => {
    const sum = (src: TreasurySource) =>
      treasuryTransactions.filter((t) => t.kind === 'deposit' && t.source === src).reduce((s, t) => s + t.amount, 0);
    return { store: sum('store_sales'), subscription: sum('subscription'), other: sum('other_income') + sum('adjustment') };
  }, [treasuryTransactions]);

  // Counted per purpose
  const countedByPurpose = useMemo(() => {
    const sum = (p: TreasuryPurpose) =>
      accountStats.filter((x) => x.account.purpose === p).reduce((s, x) => s + x.counted, 0);
    const exp = (p: TreasuryPurpose) =>
      accountStats.filter((x) => x.account.purpose === p).reduce((s, x) => s + x.expected, 0);
    return {
      store: { counted: sum('store'), expected: exp('store'), system: system.storeSystem },
      subscription: { counted: sum('subscription'), expected: exp('subscription'), system: system.subscriptionSystem },
    };
  }, [accountStats, system]);

  const healthy = Math.abs(totals.variance) < 1;

  // ---- End-of-Month Closing State & Analytics ----
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const monthClosingData = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEndDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    const monthStartDate = `${selectedMonth}-01`;

    const computeAccount = (acc: typeof treasuryAccounts[0]) => {
      const allAccTxns = treasuryTransactions.filter((t) => t.accountId === acc.id);

      // Prior movements (before this month)
      const priorTxns = allAccTxns.filter((t) => t.date < monthStartDate);
      const priorIn = priorTxns.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amount, 0);
      const priorOut = priorTxns.filter((t) => t.kind === 'withdraw').reduce((s, t) => s + t.amount, 0);
      const monthOpening = Number(acc.openingBalance || 0) + priorIn - priorOut;

      // Month movements
      const monthTxns = allAccTxns.filter((t) => t.date.startsWith(selectedMonth));
      const cashIn = monthTxns
        .filter((t) => t.kind === 'deposit' && (t.paymentMethod === 'cash' || (!t.paymentMethod && t.source === 'store_sales')))
        .reduce((s, t) => s + t.amount, 0);
      const instapayIn = monthTxns
        .filter((t) => t.kind === 'deposit' && t.paymentMethod === 'instapay')
        .reduce((s, t) => s + t.amount, 0);
      const otherIn = monthTxns
        .filter((t) => t.kind === 'deposit' && t.paymentMethod !== 'cash' && t.paymentMethod !== 'instapay' && (t.paymentMethod !== undefined || t.source !== 'store_sales'))
        .reduce((s, t) => s + t.amount, 0);

      const totalMonthIn = cashIn + instapayIn + otherIn;
      const totalMonthOut = monthTxns.filter((t) => t.kind === 'withdraw').reduce((s, t) => s + t.amount, 0);
      const netMonth = totalMonthIn - totalMonthOut;
      const monthEnding = monthOpening + netMonth;

      return {
        account: acc,
        monthOpening,
        cashIn,
        instapayIn,
        otherIn,
        totalMonthIn,
        totalMonthOut,
        netMonth,
        monthEnding,
        txnsCount: monthTxns.length,
      };
    };

    const storeSummaries = treasuryAccounts.filter((a) => a.purpose === 'store').map(computeAccount);
    const subsSummaries = treasuryAccounts.filter((a) => a.purpose === 'subscription').map(computeAccount);
    const allSummaries = treasuryAccounts.map(computeAccount);

    const aggregate = (list: ReturnType<typeof computeAccount>[]) => ({
      opening: list.reduce((s, x) => s + x.monthOpening, 0),
      cashIn: list.reduce((s, x) => s + x.cashIn, 0),
      instapayIn: list.reduce((s, x) => s + x.instapayIn, 0),
      otherIn: list.reduce((s, x) => s + x.otherIn, 0),
      totalIn: list.reduce((s, x) => s + x.totalMonthIn, 0),
      totalOut: list.reduce((s, x) => s + x.totalMonthOut, 0),
      net: list.reduce((s, x) => s + x.netMonth, 0),
      ending: list.reduce((s, x) => s + x.monthEnding, 0),
    });

    const storeTotal = aggregate(storeSummaries);
    const subsTotal = aggregate(subsSummaries);
    const grandTotal = aggregate(allSummaries);

    const monthDate = new Date(y, m - 1, 1);
    const monthLabel = monthDate.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

    return {
      selectedMonth,
      monthLabel,
      monthStartDate,
      monthEndDate,
      storeSummaries,
      subsSummaries,
      allSummaries,
      storeTotal,
      subsTotal,
      grandTotal,
    };
  }, [selectedMonth, treasuryAccounts, treasuryTransactions, isRtl]);

  const handleMonthShift = (delta: number) => {
    const [yStr, mStr] = selectedMonth.split('-');
    const curDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + delta, 1);
    const ny = curDate.getFullYear();
    const nm = String(curDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${ny}-${nm}`);
  };

  const exportMonthClosing = () => {
    exportCsv(
      `etoile-month-closing-${selectedMonth}`,
      ['Account', 'Purpose', 'Opening_Balance', 'Cash_Deposits', 'InstaPay_Deposits', 'Other_Inflow', 'Outflows', 'Month_Ending_Balance'],
      monthClosingData.allSummaries.map((s) => ({
        Account: s.account.name,
        Purpose: s.account.purpose,
        Opening_Balance: s.monthOpening,
        Cash_Deposits: s.cashIn,
        InstaPay_Deposits: s.instapayIn,
        Other_Inflow: s.otherIn,
        Outflows: s.totalMonthOut,
        Month_Ending_Balance: s.monthEnding,
      })),
      { module: 'treasury-closing' }
    );
    showToast('Exported', `Month-end closing for ${monthClosingData.monthLabel} exported as CSV.`, 'success');
  };

  // ---- Filters for movements table ----
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'instapay' | 'other'>('all');
  const [search, setSearch] = useState('');
  const filteredTxns = useMemo(() => {
    return treasuryTransactions.filter((t) => {
      if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
      if (filterSource !== 'all' && t.source !== filterSource) return false;
      if (filterMethod !== 'all') {
        const isInsta = t.paymentMethod === 'instapay';
        const isCash = t.paymentMethod === 'cash' || (!t.paymentMethod && t.source === 'store_sales');
        if (filterMethod === 'cash' && !isCash) return false;
        if (filterMethod === 'instapay' && !isInsta) return false;
        if (filterMethod === 'other' && (isCash || isInsta)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const acc = treasuryAccounts.find((a) => a.id === t.accountId)?.name.toLowerCase() || '';
        if (
          !t.description?.toLowerCase().includes(q) &&
          !acc.includes(q) &&
          !t.source.includes(q) &&
          !t.referenceNo?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    }).slice(0, 80);
  }, [treasuryTransactions, filterAccount, filterSource, filterMethod, search, treasuryAccounts]);

  // ---- Modals ----
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [accPurpose, setAccPurpose] = useState<TreasuryPurpose>('store');
  const [accOpening, setAccOpening] = useState<number>(0);
  const [accNotes, setAccNotes] = useState('');

  const openAddAccount = () => {
    setEditingAccountId(null);
    setAccName(''); setAccPurpose('store'); setAccOpening(0); setAccNotes('');
    setShowAccountModal(true);
  };
  const openEditAccount = (id: string) => {
    const a = treasuryAccounts.find((x) => x.id === id);
    if (!a) return;
    setEditingAccountId(id);
    setAccName(a.name); setAccPurpose(a.purpose); setAccOpening(a.openingBalance); setAccNotes(a.notes || '');
    setShowAccountModal(true);
  };
  const submitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || accName.trim().length < 2) { showToast('Cannot save', 'Account name is required (min 2 chars).', 'error'); return; }
    if (!Number.isFinite(Number(accOpening)) || Number(accOpening) < 0 || Number(accOpening) > 100000000) { showToast('Cannot save', 'Opening balance must be 0 or more.', 'error'); return; }
    if (editingAccountId) {
      updateTreasuryAccount(editingAccountId, { name: accName.trim(), purpose: accPurpose, openingBalance: Number(accOpening), notes: accNotes.trim() || undefined });
    } else {
      addTreasuryAccount({ name: accName.trim(), purpose: accPurpose, openingBalance: Number(accOpening), notes: accNotes.trim() || undefined });
    }
    setShowAccountModal(false);
  };

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveAccountId, setMoveAccountId] = useState('');
  const [moveKind, setMoveKind] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [moveSource, setMoveSource] = useState<TreasurySource>('store_sales');
  const [moveAmount, setMoveAmount] = useState<number>(1000);
  const [moveToAccount, setMoveToAccount] = useState('');
  const [moveDesc, setMoveDesc] = useState('');
  const [moveDate, setMoveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [moveMethod, setMoveMethod] = useState<'cash' | 'instapay' | 'card' | 'transfer'>('cash');
  const [moveRefNo, setMoveRefNo] = useState('');

  const openMove = (accountId?: string) => {
    setMoveAccountId(accountId || treasuryAccounts[0]?.id || '');
    setMoveKind('deposit'); setMoveSource('store_sales');
    setMoveAmount(1000); setMoveToAccount(''); setMoveDesc('');
    setMoveDate(new Date().toISOString().split('T')[0]);
    setMoveMethod('cash'); setMoveRefNo('');
    setShowMoveModal(true);
  };
  const submitMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveAccountId) { showToast('Cannot record', 'Select an account.', 'error'); return; }
    if (!Number.isFinite(Number(moveAmount)) || Number(moveAmount) <= 0) { showToast('Cannot record', 'Amount must be greater than 0.', 'error'); return; }
    if (moveKind === 'transfer') {
      if (!moveToAccount || moveToAccount === moveAccountId) { showToast('Cannot transfer', 'Select a different destination account.', 'error'); return; }
      addTreasuryTransaction({
        accountId: moveAccountId,
        kind: 'withdraw',
        source: 'transfer',
        amount: Number(moveAmount),
        description: moveDesc || 'Transfer',
        date: moveDate,
        toAccountId: moveToAccount,
        paymentMethod: moveMethod,
        referenceNo: moveRefNo.trim() || undefined,
      });
    } else {
      const res = addTreasuryTransaction({
        accountId: moveAccountId,
        kind: moveKind,
        source: moveSource,
        amount: Number(moveAmount),
        description: moveDesc || undefined,
        date: moveDate,
        paymentMethod: moveMethod,
        referenceNo: moveRefNo.trim() || undefined,
      });
      if (!res.success) return;
    }
    setShowMoveModal(false);
  };

  // Inline reconcile per account
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});
  const submitReconcile = (accountId: string) => {
    const raw = countInputs[accountId];
    if (raw === undefined || raw === '') { showToast('Enter counted cash', 'Type what you actually found in this account.', 'error'); return; }
    const counted = Number(raw);
    if (!Number.isFinite(counted) || counted < 0) { showToast('Invalid amount', 'Counted balance must be 0 or more.', 'error'); return; }
    reconcileTreasuryAccount(accountId, counted);
    setCountInputs((p) => ({ ...p, [accountId]: '' }));
  };

  const exportTreasury = () => {
    exportCsv('etoile-treasury', ['account', 'purpose', 'opening', 'deposits', 'withdrawals', 'expected', 'counted', 'variance'], accountStats.map((x) => ({
      account: x.account.name, purpose: x.account.purpose, opening: x.account.openingBalance,
      deposits: x.inflow, withdrawals: x.outflow, expected: x.expected, counted: x.counted, variance: x.variance,
    })), { module: 'treasury' });
    showToast('Exported', 'Treasury reconciliation downloaded as CSV.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Landmark className="w-4 h-4 text-emerald-300" />
          <span>{isRtl ? 'أضف حساباً لكل جهة تحصيل (متجر / اشتراكات) وسجّل عليه ثم طابق بالفعلي.' : 'Add one account per collection point (store / subscriptions), record on it, then reconcile with what you found.'}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewSwitcher moduleKey="finance-treasury" modes={['cards', 'rows']} value={{ mode: treasuryView.mode, density: treasuryView.density }} onChange={(p) => { treasuryView.setMode(p.mode); treasuryView.setDensity(p.density); }} />
          <button onClick={exportTreasury} className="btn-ghost px-3.5 py-2 text-xs font-bold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => openMove()} className="btn-ghost px-3.5 py-2 text-xs font-bold flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" /> {isRtl ? 'حركة' : 'Movement'}
          </button>
          <button onClick={openAddAccount} className="gold-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {isRtl ? 'حساب جديد' : 'New account'}
          </button>
        </div>
      </div>

      {/* ========================================================
          End-of-Month Accounts Ledger (كشف وتقفيل نهاية الشهر للحسابات)
          Strict separation: Store Safe vs. Subscriptions Safe (Cash vs. InstaPay)
          ======================================================== */}
      <div className="bg-gradient-to-br from-[#161c2e] via-[#121622] to-[#10131d] border border-amber-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-violet-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* Header row with month navigator & export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2 flex-wrap">
                  {isRtl ? 'كشف وتقفيل نهاية الشهر للحسابات' : 'End-of-Month Accounts Closing Ledger'}
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {monthClosingData.monthLabel}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRtl
                    ? 'فصل مالي تام بين رصيد المتجر ورصيد الاشتراكات ومطابقة الكاش وإنستاباي دون وسيط'
                    : 'Segregated ending balances: Store POS vs. Academy Subscriptions (Cash vs. InstaPay)'}
                </p>
              </div>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1">
              <button
                type="button"
                onClick={() => handleMonthShift(-1)}
                title={isRtl ? 'الشهر السابق' : 'Previous Month'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white px-2 py-1 focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleMonthShift(1)}
                title={isRtl ? 'الشهر التالي' : 'Next Month'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="btn-ghost px-3 py-1.5 text-xs font-bold"
            >
              {isRtl ? 'هذا الشهر' : 'Current'}
            </button>

            <button
              type="button"
              onClick={exportMonthClosing}
              className="btn-ghost px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              {isRtl ? 'تقرير التقفيل CSV' : 'Closing CSV'}
            </button>
          </div>
        </div>

        {/* Accounts Side-by-Side: Store Account vs Subscriptions Account */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* STORE ACCOUNT CARD */}
          <div className="bg-gradient-to-br from-[#1d2333] to-[#141926] border border-orange-500/30 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-orange-500/50 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-white">
                    {isRtl ? 'حساب المتجر والبوتيك' : 'Store & Boutique Account'}
                  </h3>
                  <span className="text-[11px] text-orange-300/80 font-medium">
                    {isRtl ? 'مبيعات البوتيك وأدوات الباليه (POS)' : 'Retail sales & ballet gear (POS)'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 whitespace-nowrap">
                {isRtl ? 'حساب مستقل' : 'Dedicated'}
              </span>
            </div>

            {/* Prominent Ending Balance */}
            <div className="rounded-xl bg-black/25 border border-white/5 p-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                {isRtl ? 'رصيد نهاية الشهر' : 'Month-End Balance'}
              </span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                  {formatCurrency(monthClosingData.storeTotal.ending, language)}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  {isRtl ? 'الرصيد المالي المقفل حتى آخر الشهر' : 'Cumulative ending balance at month close'}
                </span>
              </div>
            </div>

            {/* Cash vs InstaPay Inflow Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                  <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> {isRtl ? 'كاش البوتيك' : 'Store Cash'}</span>
                  <span className="text-[10px] opacity-75 font-mono">CASH</span>
                </div>
                <p className="text-lg font-mono font-extrabold text-white">
                  {formatCurrency(monthClosingData.storeTotal.cashIn, language)}
                </p>
                <p className="text-[10px] text-emerald-200/70">
                  {isRtl ? 'تحصيلات نقدية في درج الخزينة' : 'Physical cash received'}
                </p>
              </div>

              <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-violet-300">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {isRtl ? 'إنستاباي المتجر' : 'Store InstaPay'}</span>
                  <span className="text-[10px] opacity-75 font-mono">INSTAPAY</span>
                </div>
                <p className="text-lg font-mono font-extrabold text-white">
                  {formatCurrency(monthClosingData.storeTotal.instapayIn, language)}
                </p>
                <p className="text-[10px] text-violet-200/70">
                  {isRtl ? 'تحويلات لحظية بحساب البنك' : 'Instant bank transfers'}
                </p>
              </div>
            </div>

            {/* Financial reconciliation strip */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5 flex-wrap gap-1">
              <span>{isRtl ? 'افتتاحي:' : 'Opening:'} <strong className="text-slate-200 font-mono">{formatCurrency(monthClosingData.storeTotal.opening, language)}</strong></span>
              <span>{isRtl ? 'إجمالي الدخل:' : 'In:'} <strong className="text-emerald-300 font-mono">+{formatCurrency(monthClosingData.storeTotal.totalIn, language)}</strong></span>
              <span>{isRtl ? 'مصروفات:' : 'Out:'} <strong className="text-rose-300 font-mono">−{formatCurrency(monthClosingData.storeTotal.totalOut, language)}</strong></span>
              <span>{isRtl ? 'صافي الشهر:' : 'Net:'} <strong className={`font-mono ${monthClosingData.storeTotal.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrency(monthClosingData.storeTotal.net, language)}</strong></span>
            </div>
          </div>

          {/* SUBSCRIPTIONS ACCOUNT CARD */}
          <div className="bg-gradient-to-br from-[#1e1c33] to-[#151326] border border-violet-500/30 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-violet-500/50 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-white">
                    {isRtl ? 'حساب الاشتراكات والأكاديمية' : 'Subscriptions & Academy Account'}
                  </h3>
                  <span className="text-[11px] text-violet-300/80 font-medium">
                    {isRtl ? 'رسوم اشتراكات الطلاب والباقات الشهرية' : 'Tuition, class passes & enrollments'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 whitespace-nowrap">
                {isRtl ? 'حساب مستقل' : 'Dedicated'}
              </span>
            </div>

            {/* Prominent Ending Balance */}
            <div className="rounded-xl bg-black/25 border border-white/5 p-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                {isRtl ? 'رصيد نهاية الشهر' : 'Month-End Balance'}
              </span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                  {formatCurrency(monthClosingData.subsTotal.ending, language)}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  {isRtl ? 'الرصيد المالي المقفل حتى آخر الشهر' : 'Cumulative ending balance at month close'}
                </span>
              </div>
            </div>

            {/* Cash vs InstaPay Inflow Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                  <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> {isRtl ? 'كاش الاشتراكات' : 'Tuition Cash'}</span>
                  <span className="text-[10px] opacity-75 font-mono">CASH</span>
                </div>
                <p className="text-lg font-mono font-extrabold text-white">
                  {formatCurrency(monthClosingData.subsTotal.cashIn, language)}
                </p>
                <p className="text-[10px] text-emerald-200/70">
                  {isRtl ? 'تحصيلات نقدية في درج الاستقبال' : 'Physical cash collected at desk'}
                </p>
              </div>

              <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-violet-300">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {isRtl ? 'إنستاباي الاشتراكات' : 'Tuition InstaPay'}</span>
                  <span className="text-[10px] opacity-75 font-mono">INSTAPAY</span>
                </div>
                <p className="text-lg font-mono font-extrabold text-white">
                  {formatCurrency(monthClosingData.subsTotal.instapayIn, language)}
                </p>
                <p className="text-[10px] text-violet-200/70">
                  {isRtl ? 'تحويلات لحظية بحساب الأكاديمية' : 'Instant bank transfers'}
                </p>
              </div>
            </div>

            {/* Financial reconciliation strip */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5 flex-wrap gap-1">
              <span>{isRtl ? 'افتتاحي:' : 'Opening:'} <strong className="text-slate-200 font-mono">{formatCurrency(monthClosingData.subsTotal.opening, language)}</strong></span>
              <span>{isRtl ? 'إجمالي الدخل:' : 'In:'} <strong className="text-emerald-300 font-mono">+{formatCurrency(monthClosingData.subsTotal.totalIn, language)}</strong></span>
              <span>{isRtl ? 'مصروفات:' : 'Out:'} <strong className="text-rose-300 font-mono">−{formatCurrency(monthClosingData.subsTotal.totalOut, language)}</strong></span>
              <span>{isRtl ? 'صافي الشهر:' : 'Net:'} <strong className={`font-mono ${monthClosingData.subsTotal.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrency(monthClosingData.subsTotal.net, language)}</strong></span>
            </div>
          </div>
        </div>

        {/* Consolidated Month-End Liquidity Bar */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="sm:border-r sm:border-white/10 p-2">
              <p className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <Banknote className="w-4 h-4" /> {isRtl ? 'إجمالي كاش الشهر (المتجر + الاشتراكات)' : 'Total Month Cash (Store + Tuition)'}
              </p>
              <p className="text-xl font-mono font-extrabold text-white mt-1">
                {formatCurrency(monthClosingData.grandTotal.cashIn, language)}
              </p>
            </div>

            <div className="sm:border-r sm:border-white/10 p-2">
              <p className="text-[11px] font-bold text-violet-400 flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4" /> {isRtl ? 'إجمالي إنستاباي الشهر (المتجر + الاشتراكات)' : 'Total Month InstaPay (Store + Tuition)'}
              </p>
              <p className="text-xl font-mono font-extrabold text-white mt-1">
                {formatCurrency(monthClosingData.grandTotal.instapayIn, language)}
              </p>
            </div>

            <div className="p-2">
              <p className="text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5">
                <Wallet className="w-4 h-4" /> {isRtl ? 'الرصيد الختامي المجمع لجميع الحسابات' : 'Consolidated Grand Ending Balance'}
              </p>
              <p className="text-xl font-mono font-extrabold text-white mt-1">
                {formatCurrency(monthClosingData.grandTotal.ending, language)}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {isRtl
                ? 'تم فصل وتوزيع التحصيلات تلقائياً بين حسابات البوتيك والاشتراكات دون الحاجة إلى بوابات دفع إلكترونية.'
                : 'Collections automatically auto-routed into segregated Store and Subscription accounts without gateway fees.'}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Period: {monthClosingData.monthStartDate} → {monthClosingData.monthEndDate}
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip: system vs recorded vs counted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl kpi-gradient-amber flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/85 font-medium flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> {isRtl ? 'مكسب المتجر (سيستم)' : 'Store gained (system)'}</span>
          <span className="font-heading text-2xl font-extrabold text-white mt-1">{formatCurrency(system.storeSystem, language)}</span>
          <span className="text-[10px] text-white/75 mt-1">POS {formatCurrency(system.posStore, language)}{system.invBoutiquePaid > 0 ? ` + invoices ${formatCurrency(system.invBoutiquePaid, language)}` : ''} • recorded {formatCurrency(recordedBySource.store, language)}</span>
        </div>
        <div className="p-4 rounded-2xl kpi-gradient-purple flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/85 font-medium flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {isRtl ? 'مكسب الاشتراكات (سيستم)' : 'Subscriptions (system)'}</span>
          <span className="font-heading text-2xl font-extrabold text-white mt-1">{formatCurrency(system.subscriptionSystem, language)}</span>
          <span className="text-[10px] text-white/75 mt-1">Invoices paid (tuition) • recorded {formatCurrency(recordedBySource.subscription, language)}</span>
        </div>
        <div className="p-4 rounded-2xl kpi-gradient-blue flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/85 font-medium flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> {isRtl ? 'المسجل في الحسابات (متوقع)' : 'Recorded (expected)'}</span>
          <span className="font-heading text-2xl font-extrabold text-white mt-1">{formatCurrency(totals.expected, language)}</span>
          <span className="text-[10px] text-white/75 mt-1">Opening {formatCurrency(totals.opening, language)} + in {formatCurrency(totals.deposits, language)} − out {formatCurrency(totals.withdrawals, language)}</span>
        </div>
        <div className={`p-4 rounded-2xl flex flex-col justify-between border ${healthy ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <span className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1.5 text-white/85">
            {healthy ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />}
            {isRtl ? 'الفعلي (وجدت) — هل نحن تمام؟' : 'Counted — are we good?'}
          </span>
          <span className="font-heading text-2xl font-extrabold text-white mt-1">{formatCurrency(totals.counted, language)}</span>
          <span className={`text-[11px] font-bold mt-1 ${healthy ? 'text-emerald-300' : 'text-rose-300'}`}>
            {healthy ? (isRtl ? '✓ متطابق — تمام' : '✓ Balanced — we are good') : `Δ ${formatCurrency(totals.variance, language)} ${totals.variance > 0 ? (isRtl ? 'زيادة' : 'over') : (isRtl ? 'عجز' : 'short')}`}
          </span>
        </div>
      </div>

      {/* Source comparison: system vs recorded vs counted */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {([
          { key: 'store', label: isRtl ? 'المتجر' : 'Store', icon: <ShoppingBag className="w-4 h-4 text-orange-300" /> },
          { key: 'subscription', label: isRtl ? 'الاشتراكات' : 'Subscriptions', icon: <GraduationCap className="w-4 h-4 text-violet-300" /> },
        ] as const).map((row) => {
          const d = countedByPurpose[row.key];
          const rec = row.key === 'store' ? recordedBySource.store : recordedBySource.subscription;
          const sysVar = rec - d.system;
          const countVar = d.counted - d.expected;
          return (
            <div key={row.key} className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">{row.icon} {row.label}</span>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${Math.abs(countVar) < 1 ? 'status-pill-emerald' : 'status-pill-pink'}`}>
                  {Math.abs(countVar) < 1 ? (isRtl ? 'مطابق' : 'Matched') : `Δ ${formatCurrency(countVar, language)}`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isRtl ? 'سيستم' : 'System'}</p>
                  <p className="text-sm font-bold text-white font-mono truncate">{formatCurrency(d.system, language)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isRtl ? 'مسجل' : 'Recorded'}</p>
                  <p className="text-sm font-bold text-sky-300 font-mono truncate">{formatCurrency(rec, language)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{isRtl ? 'موجود' : 'Counted'}</p>
                  <p className="text-sm font-bold text-emerald-300 font-mono truncate">{formatCurrency(d.counted, language)}</p>
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                {isRtl ? 'الفرق سيستم/مسجل:' : 'System vs recorded:'}{' '}
                <strong className={Math.abs(sysVar) < 1 ? 'text-emerald-300' : 'text-amber-300'}>{formatCurrency(sysVar, language)}</strong>
                <span className="text-slate-500"> — {isRtl ? 'سجّل كل تحصيل بحسابه لتصفير الفرق.' : 'record every collection on its account to close the gap.'}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div className="h-full bg-violet-400/70" style={{ width: `${d.system + rec + d.counted > 0 ? (d.system / Math.max(1, d.system + rec + d.counted)) * 100 : 0}%` }} />
                <div className="h-full bg-sky-400/70" style={{ width: `${d.system + rec + d.counted > 0 ? (rec / Math.max(1, d.system + rec + d.counted)) * 100 : 0}%` }} />
                <div className="h-full bg-emerald-400/70" style={{ width: `${d.system + rec + d.counted > 0 ? (d.counted / Math.max(1, d.system + rec + d.counted)) * 100 : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Accounts grid / rows */}
      {treasuryView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {accountStats.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No accounts yet — add your first Store / Subscription account.</p>
          ) : (
            accountStats.map(({ account: a, inflow, outflow, expected, counted, variance }) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-white truncate">{a.name}</span>
                  <span className="block text-[11px] text-slate-500">In +{formatCurrency(inflow, language)} • Out −{formatCurrency(outflow, language)}</span>
                </span>
                <span className="font-mono font-extrabold text-white flex-shrink-0">{formatCurrency(expected, language)}</span>
                <span className={`font-bold px-2 py-0.5 rounded-full border text-[11px] flex-shrink-0 ${Math.abs(variance) < 1 ? 'status-pill-emerald' : variance > 0 ? 'status-pill-blue' : 'status-pill-pink'}`}>
                  Δ {formatCurrency(variance, language)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountStats.map(({ account: a, txns, inflow, outflow, expected, counted, variance }) => (
          <div key={a.id} className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{a.name}</p>
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${PURPOSE_META[a.purpose].cls}`}>
                  {isRtl ? PURPOSE_META[a.purpose].ar : PURPOSE_META[a.purpose].en}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openMove(a.id)} title="Add movement" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEditAccount(a.id)} title="Edit" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (window.confirm(`Delete ${a.name} and its ${txns.length} movements?`)) deleteTreasuryAccount(a.id); }} title="Delete" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-rose-300 transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div><p className="text-slate-500 uppercase text-[9px] font-bold">{isRtl ? 'افتتاحي' : 'Opening'}</p><p className="font-mono font-bold text-slate-300">{formatCurrency(a.openingBalance, language)}</p></div>
              <div><p className="text-slate-500 uppercase text-[9px] font-bold">In</p><p className="font-mono font-bold text-emerald-300">+{formatCurrency(inflow, language)}</p></div>
              <div><p className="text-slate-500 uppercase text-[9px] font-bold">Out</p><p className="font-mono font-bold text-rose-300">−{formatCurrency(outflow, language)}</p></div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2">
              <span className="text-[11px] text-slate-400 font-bold">{isRtl ? 'متوقع' : 'Expected'}</span>
              <span className="font-mono font-extrabold text-white">{formatCurrency(expected, language)}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={countInputs[a.id] ?? ''}
                onChange={(e) => setCountInputs((p) => ({ ...p, [a.id]: e.target.value.replace(/[^0-9.\-]/g, '') }))}
                placeholder={isRtl ? 'وجدت كام؟' : 'Found how much?'}
                type="number" min={0}
                className="input-premium flex-1 text-xs px-3 py-2"
              />
              <button onClick={() => submitReconcile(a.id)} className="gold-btn px-3.5 py-2 text-[11px] font-bold flex-shrink-0">{isRtl ? 'طابق' : 'Count'}</button>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{isRtl ? 'الفعلي:' : 'Counted:'} <strong className="text-white font-mono">{formatCurrency(counted, language)}</strong></span>
              <span className={`font-bold px-2 py-0.5 rounded-full border ${Math.abs(variance) < 1 ? 'status-pill-emerald' : variance > 0 ? 'status-pill-blue' : 'status-pill-pink'}`}>
                Δ {formatCurrency(variance, language)}
              </span>
            </div>
            {a.notes && <p className="text-[11px] text-slate-500 truncate">{a.notes}</p>}
          </div>
        ))}
        {accountStats.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-2xl col-span-full">No accounts yet — add your first Store / Subscription account.</p>
        )}
      </div>
      )}

      {/* Movements table */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 border-b border-white/10">
          <span className="text-sm font-bold text-white flex-1">{isRtl ? 'الحركات' : 'Movements'} • {treasuryTransactions.length}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="input-premium text-xs px-2.5 py-1.5">
              <option value="all">{isRtl ? 'كل الحسابات' : 'All accounts'}</option>
              {treasuryAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="input-premium text-xs px-2.5 py-1.5">
              <option value="all">{isRtl ? 'كل المصادر' : 'All sources'}</option>
              {Object.entries(SOURCE_LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value as any)} className="input-premium text-xs px-2.5 py-1.5">
              <option value="all">{isRtl ? 'كل طرق الدفع' : 'All methods'}</option>
              <option value="cash">💵 {isRtl ? 'كاش فقط' : 'Cash only'}</option>
              <option value="instapay">⚡ {isRtl ? 'إنستاباي فقط' : 'InstaPay only'}</option>
              <option value="other">{isRtl ? 'طرق أخرى' : 'Other methods'}</option>
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input-premium text-xs pl-7 pr-2 py-1.5 w-36" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111622] text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-start">{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? 'الحساب' : 'Account'}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? 'المصدر' : 'Source'}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? 'طريقة الدفع' : 'Method'}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? 'ملاحظة / المرجع' : 'Note / Ref'}</th>
                <th className="px-4 py-2.5 text-end">{isRtl ? 'المبلغ' : 'Amount'}</th>
                <th className="px-4 py-2.5 text-end">{isRtl ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map((t) => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-2.5 text-white font-semibold whitespace-nowrap">{treasuryAccounts.find((a) => a.id === t.accountId)?.name || '—'}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">{SOURCE_LABEL[t.source]}</span></td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {t.paymentMethod === 'instapay' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <Zap className="w-3 h-3 text-violet-300" />
                        <span>InstaPay</span>
                      </span>
                    ) : t.paymentMethod === 'cash' || (!t.paymentMethod && t.source === 'store_sales') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Banknote className="w-3 h-3 text-emerald-300" />
                        <span>{isRtl ? 'كاش' : 'Cash'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/10">
                        {t.paymentMethod || 'Manual'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 max-w-[220px]">
                    <div className="truncate">{t.description || '—'}</div>
                    {t.referenceNo && (
                      <span className="text-[10px] font-mono text-violet-300/80 block">Ref: #{t.referenceNo}</span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-end font-mono font-bold whitespace-nowrap ${t.kind === 'deposit' ? 'text-emerald-300' : 'text-rose-300'}`}>{t.kind === 'deposit' ? '+' : '−'}{formatCurrency(t.amount, language)}</td>
                  <td className="px-4 py-2.5 text-end"><button onClick={() => { if (window.confirm('Delete this movement?')) deleteTreasuryTransaction(t.id); }} className="text-slate-500 hover:text-rose-300 transition"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
              {filteredTxns.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No movements found matching the selected filters.</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2.5 text-[11px] text-slate-500 border-t border-white/10">Net P&L this view: inflow {formatCurrency(financials.totalInflow || 0, language)} − outflow {formatCurrency(financials.totalOutflow || 0, language)} = <strong className="text-white">{formatCurrency(financials.netProfit || 0, language)}</strong></p>
      </div>

      {/* Account modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAccountModal(false)}>
          <div className="w-full max-w-md bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">{editingAccountId ? (isRtl ? 'تعديل الحساب' : 'Edit account') : (isRtl ? 'حساب جديد' : 'New money account')}</h3>
              <button onClick={() => setShowAccountModal(false)} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitAccount} className="space-y-3 text-xs">
              <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Name *</label>
                <input value={accName} onChange={(e) => setAccName(e.target.value)} required minLength={2} placeholder="e.g. CIB — Store" className="input-premium w-full px-3 py-2.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Purpose *</label>
                  <select value={accPurpose} onChange={(e) => setAccPurpose(e.target.value as TreasuryPurpose)} className="input-premium w-full px-3 py-2.5">
                    <option value="store">Store</option><option value="subscription">Subscriptions</option><option value="general">General</option><option value="payroll">Payroll</option><option value="opex">Expenses</option>
                  </select></div>
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Opening (EGP) *</label>
                  <input value={accOpening} onChange={(e) => setAccOpening(Number(e.target.value))} type="number" min={0} required className="input-premium w-full px-3 py-2.5" /></div>
              </div>
              <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Notes</label>
                <input value={accNotes} onChange={(e) => setAccNotes(e.target.value)} maxLength={200} placeholder="Bank last 4 digits, safe location…" className="input-premium w-full px-3 py-2.5" /></div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn-ghost flex-1 py-2.5 font-bold">Cancel</button>
                <button type="submit" className="gold-btn flex-1 py-2.5 font-bold">{editingAccountId ? 'Save' : 'Add account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMoveModal(false)}>
          <div className="w-full max-w-md bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">{isRtl ? 'تسجيل حركة' : 'Record movement'}</h3>
              <button onClick={() => setShowMoveModal(false)} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitMove} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Account *</label>
                  <select value={moveAccountId} onChange={(e) => setMoveAccountId(e.target.value)} required className="input-premium w-full px-3 py-2.5">
                    {treasuryAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select></div>
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Type *</label>
                  <select value={moveKind} onChange={(e) => setMoveKind(e.target.value as any)} className="input-premium w-full px-3 py-2.5">
                    <option value="deposit">Deposit (+) — money in</option><option value="withdraw">Withdraw (−) — money out</option><option value="transfer">Transfer ⇄</option>
                  </select></div>
              </div>
              {moveKind === 'transfer' ? (
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">To account *</label>
                  <select value={moveToAccount} onChange={(e) => setMoveToAccount(e.target.value)} required className="input-premium w-full px-3 py-2.5">
                    <option value="">— Select destination —</option>
                    {treasuryAccounts.filter((a) => a.id !== moveAccountId).map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select></div>
              ) : (
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Source *</label>
                  <select value={moveSource} onChange={(e) => setMoveSource(e.target.value as TreasurySource)} className="input-premium w-full px-3 py-2.5">
                    <option value="store_sales">Store sales</option><option value="subscription">Subscription</option><option value="other_income">Other income</option><option value="expense">Expense payout</option><option value="payroll">Payroll payout</option><option value="adjustment">Adjustment</option>
                  </select></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Amount (EGP) *</label>
                  <input value={moveAmount} onChange={(e) => setMoveAmount(Number(e.target.value))} type="number" min={1} required className="input-premium w-full px-3 py-2.5" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Date *</label>
                  <input value={moveDate} onChange={(e) => setMoveDate(e.target.value)} type="date" required className="input-premium w-full px-3 py-2.5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select value={moveMethod} onChange={(e) => setMoveMethod(e.target.value as any)} className="input-premium w-full px-3 py-2.5">
                    <option value="cash">💵 {isRtl ? 'كاش (نقدي)' : 'Cash'}</option>
                    <option value="instapay">⚡ {isRtl ? 'إنستاباي (تحويل لحظي)' : 'InstaPay'}</option>
                    <option value="transfer">🏦 {isRtl ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="card">💳 {isRtl ? 'بطاقة' : 'Card'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">{isRtl ? 'الرقم المرجعي / التحويل' : 'Reference / Txn ID'}</label>
                  <input value={moveRefNo} onChange={(e) => setMoveRefNo(e.target.value)} placeholder="e.g. IP-1092 or Receipt #" className="input-premium w-full px-3 py-2.5" />
                </div>
              </div>
              <div><label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Note</label>
                <input value={moveDesc} onChange={(e) => setMoveDesc(e.target.value)} maxLength={200} placeholder="e.g. Today store cash dropped to safe" className="input-premium w-full px-3 py-2.5" /></div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowMoveModal(false)} className="btn-ghost flex-1 py-2.5 font-bold">Cancel</button>
                <button type="submit" className="gold-btn flex-1 py-2.5 font-bold">Save movement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
