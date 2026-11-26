// RumahKas — data + store.
// Seeded with a realistic Indonesian household (Keluarga Prasetyo, November 2026).
// State persists in localStorage under "rumahkas-v1"; every mutation saves and
// every view re-reads from the store, so edits show up everywhere at once.

export const ACTIVE_MONTH = '2026-11';
export const STORAGE_KEY = 'rumahkas-v1';

export const CATEGORIES = {
  Belanja:   { color: '#0e6b5c', kind: 'expense' },
  Listrik:   { color: '#d97706', kind: 'expense' },
  Air:       { color: '#2563eb', kind: 'expense' },
  Internet:  { color: '#7c3aed', kind: 'expense' },
  Transport: { color: '#0891b2', kind: 'expense' },
  Sekolah:   { color: '#db2777', kind: 'expense' },
  Makan:     { color: '#65a30d', kind: 'expense' },
  Kesehatan: { color: '#dc2626', kind: 'expense' },
  Hiburan:   { color: '#ea580c', kind: 'expense' },
  Lainnya:   { color: '#64748b', kind: 'expense' },
  Gaji:      { color: '#15803d', kind: 'income' },
  Usaha:     { color: '#0e7490', kind: 'income' },
};
export const EXPENSE_CATEGORIES = Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].kind === 'expense');
export const INCOME_CATEGORIES = Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].kind === 'income');

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function formatRp(n) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));
}

export function formatRpShort(n) {
  if (Math.abs(n) >= 1_000_000) return 'Rp ' + (n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt';
  if (Math.abs(n) >= 1_000) return 'Rp ' + Math.round(n / 1_000) + ' rb';
  return formatRp(n);
}

function seedTransactions() {
  // November 2026, the active month. Income Rp 8.500.000, spending Rp 6.058.000.
  const rows = [
    // income
    ['2026-11-01', 'Gaji bulanan — PT Nusantara Jaya', 'Gaji', 'income', 7500000],
    ['2026-11-07', 'Usaha sampingan — jualan online', 'Usaha', 'income', 1000000],
    // belanja (Rp 2.238.000)
    ['2026-11-02', 'Belanja pasar Minggu', 'Belanja', 'expense', 185000],
    ['2026-11-05', 'Belanja supermarket — mingguan', 'Belanja', 'expense', 642000],
    ['2026-11-09', 'Belanja pasar Minggu', 'Belanja', 'expense', 210000],
    ['2026-11-14', 'Belanja supermarket — mingguan', 'Belanja', 'expense', 538000],
    ['2026-11-18', 'Belanja pasar — sayur & lauk', 'Belanja', 'expense', 176000],
    ['2026-11-22', 'Belanja supermarket — mingguan', 'Belanja', 'expense', 487000],
    // listrik (Rp 450.000)
    ['2026-11-03', 'Token listrik PLN 300 ribu', 'Listrik', 'expense', 300000],
    ['2026-11-20', 'Token listrik PLN 150 ribu', 'Listrik', 'expense', 150000],
    // air
    ['2026-11-10', 'Tagihan air PDAM', 'Air', 'expense', 128000],
    // internet
    ['2026-11-08', 'Tagihan internet IndiHome', 'Internet', 'expense', 330000],
    // transport (Rp 631.000)
    ['2026-11-04', 'Bensin motor', 'Transport', 'expense', 150000],
    ['2026-11-12', 'Bensin motor', 'Transport', 'expense', 150000],
    ['2026-11-16', 'Parkir & tol', 'Transport', 'expense', 85000],
    ['2026-11-21', 'Bensin motor', 'Transport', 'expense', 150000],
    ['2026-11-23', 'Ojek online — antar anak les', 'Transport', 'expense', 96000],
    // sekolah (Rp 1.135.000)
    ['2026-11-05', 'SPP anak — November', 'Sekolah', 'expense', 650000],
    ['2026-11-12', 'Buku & alat tulis', 'Sekolah', 'expense', 185000],
    ['2026-11-15', 'Les matematika anak', 'Sekolah', 'expense', 300000],
    // makan (Rp 410.000)
    ['2026-11-06', 'Makan di luar — warteg', 'Makan', 'expense', 125000],
    ['2026-11-13', 'Jajan anak sekolah', 'Makan', 'expense', 75000],
    ['2026-11-24', 'Makan keluarga — akhir pekan', 'Makan', 'expense', 210000],
    // kesehatan (Rp 345.000 — over budget)
    ['2026-11-11', 'Obat & vitamin di apotek', 'Kesehatan', 'expense', 95000],
    ['2026-11-19', 'Periksa gigi di klinik', 'Kesehatan', 'expense', 250000],
    // hiburan (Rp 174.000)
    ['2026-11-09', 'Langganan streaming', 'Hiburan', 'expense', 54000],
    ['2026-11-21', 'Nonton bioskop keluarga', 'Hiburan', 'expense', 120000],
    // lainnya (Rp 217.000)
    ['2026-11-17', 'Sabun & keperluan rumah', 'Lainnya', 'expense', 132000],
    ['2026-11-25', 'Servis kipas angin', 'Lainnya', 'expense', 85000],
  ];
  return rows.map(([date, desc, category, type, amount], i) => ({
    id: 't' + String(i + 1).padStart(3, '0'),
    date, desc, category, type, amount,
  }));
}

export function seedState() {
  return {
    version: 1,
    household: 'Keluarga Prasetyo',
    activeMonth: ACTIVE_MONTH,
    transactions: seedTransactions(),
    budgets: {
      Belanja: 2500000, Listrik: 450000, Air: 150000, Internet: 350000,
      Transport: 800000, Sekolah: 1200000, Makan: 900000, Kesehatan: 300000,
      Hiburan: 400000, Lainnya: 300000,
    },
    goals: [
      { id: 'g1', name: 'Dana Darurat', target: 10000000, saved: 6250000, note: 'Target 4 bulan gaji pokok' },
      { id: 'g2', name: 'Liburan Keluarga', target: 5000000, saved: 1800000, note: 'Liburan ke Yogyakarta, Juni 2027' },
      { id: 'g3', name: 'DP Motor Baru', target: 8000000, saved: 3400000, note: 'Ganti motor lama yang sering mogok' },
    ],
    // Monthly totals for June–October 2026 (real closed months, used by Reports).
    history: [
      { month: '2026-06', income: 8200000, expense: 6900000 },
      { month: '2026-07', income: 8500000, expense: 7400000 },
      { month: '2026-08', income: 8500000, expense: 6400000 },
      { month: '2026-09', income: 8500000, expense: 7100000 },
      { month: '2026-10', income: 8700000, expense: 6800000 },
    ],
    nextTx: 100,
    nextGoal: 4,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch { /* corrupted storage: fall through to seed */ }
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

/* ---- derived numbers, all computed from the store ---- */

export function monthTx(state, month = state.activeMonth) {
  return state.transactions.filter((t) => t.date.startsWith(month));
}

export function monthTotals(state, month = state.activeMonth) {
  const tx = monthTx(state, month);
  let income = 0, expense = 0;
  for (const t of tx) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function spentByCategory(state, month = state.activeMonth) {
  const out = {};
  for (const t of monthTx(state, month)) {
    if (t.type !== 'expense') continue;
    out[t.category] = (out[t.category] || 0) + t.amount;
  }
  return out;
}

export function budgetStatus(state) {
  const spent = spentByCategory(state);
  return EXPENSE_CATEGORIES.map((cat) => {
    const limit = state.budgets[cat] || 0;
    const used = spent[cat] || 0;
    return { category: cat, limit, used, remaining: limit - used, pct: limit > 0 ? (used / limit) * 100 : 0 };
  });
}

export function monthlySeries(state) {
  const current = monthTotals(state);
  const series = state.history.map((h) => ({ ...h, balance: h.income - h.expense }));
  series.push({ month: state.activeMonth, income: current.income, expense: current.expense, balance: current.balance });
  return series;
}

export function totalSaved(state) {
  return state.goals.reduce((sum, g) => sum + g.saved, 0);
}

/* ---- mutations (each saves immediately) ---- */

export function addTransaction(state, fields) {
  const tx = {
    id: 't' + String(state.nextTx++).padStart(3, '0'),
    date: fields.date,
    desc: fields.desc.trim(),
    category: fields.category,
    type: fields.type,
    amount: Math.round(Number(fields.amount)),
  };
  state.transactions.push(tx);
  saveState(state);
  return tx;
}

export function updateTransaction(state, id, fields) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return null;
  tx.date = fields.date;
  tx.desc = fields.desc.trim();
  tx.category = fields.category;
  tx.type = fields.type;
  tx.amount = Math.round(Number(fields.amount));
  saveState(state);
  return tx;
}

export function deleteTransaction(state, id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveState(state);
}

export function setBudget(state, category, limit) {
  state.budgets[category] = Math.round(Number(limit));
  saveState(state);
}

export function addContribution(state, goalId, amount) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  goal.saved = Math.min(goal.target, goal.saved + Math.round(Number(amount)));
  saveState(state);
  return goal;
}

export function addGoal(state, fields) {
  const goal = {
    id: 'g' + String(state.nextGoal++),
    name: fields.name.trim(),
    target: Math.round(Number(fields.target)),
    saved: Math.round(Number(fields.saved || 0)),
    note: (fields.note || '').trim(),
  };
  state.goals.push(goal);
  saveState(state);
  return goal;
}

export function deleteGoal(state, goalId) {
  state.goals = state.goals.filter((g) => g.id !== goalId);
  saveState(state);
}
