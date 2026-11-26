// RumahKas — page renderers + wiring. Each view returns HTML; its wire()
// attaches the handlers after main.js drops the HTML into #app.

import {
  CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  formatMonth, formatDate, formatRp, formatRpShort,
  monthTx, monthTotals, spentByCategory, budgetStatus, monthlySeries, totalSaved,
  addTransaction, updateTransaction, deleteTransaction, setBudget,
  addContribution, addGoal, deleteGoal, resetState,
} from './data.js';
import { drawDonut, drawMonthlyBars } from './charts.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ================= Dashboard ================= */

export function renderDashboard(state) {
  const t = monthTotals(state);
  const spent = spentByCategory(state);
  const rate = t.income > 0 ? Math.round((t.balance / t.income) * 100) : 0;
  const budgets = budgetStatus(state);
  const over = budgets.filter((b) => b.pct > 100);
  const near = budgets.filter((b) => b.pct > 80 && b.pct <= 100);
  const recent = [...monthTx(state)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const saved = totalSaved(state);
  const goalTarget = state.goals.reduce((s, g) => s + g.target, 0);

  const alerts = [];
  for (const b of over) {
    alerts.push(`<p class="alert red"><strong>${esc(b.category)} lewat anggaran</strong> — terpakai ${formatRp(b.used)} dari batas ${formatRp(b.limit)} (lebih ${formatRp(b.used - b.limit)}).</p>`);
  }
  for (const b of near) {
    alerts.push(`<p class="alert amber"><strong>${esc(b.category)} hampir habis</strong> — terpakai ${formatRp(b.used)} dari ${formatRp(b.limit)} (${Math.round(b.pct)}%).</p>`);
  }
  if (!alerts.length) alerts.push(`<p class="alert green">Semua anggaran bulan ini masih dalam batas. Bagus!</p>`);

  return `
  <div class="page-head">
    <h1>Dasbor ${formatMonth(state.activeMonth)}</h1>
    <p>Ringkasan keuangan ${esc(state.household)} bulan ini — pemasukan, pengeluaran, dan sisa uang yang bisa ditabung.</p>
  </div>

  <div class="grid grid-4">
    <div class="card stat good"><div class="label">Pemasukan</div><div class="value">${formatRp(t.income)}</div><div class="hint">Gaji Rp 7,5 jt + usaha Rp 1 jt</div></div>
    <div class="card stat warn"><div class="label">Pengeluaran</div><div class="value">${formatRp(t.expense)}</div><div class="hint">${monthTx(state).filter((x) => x.type === 'expense').length} transaksi bulan ini</div></div>
    <div class="card stat accent"><div class="label">Sisa Uang</div><div class="value">${formatRp(t.balance)}</div><div class="hint">${rate}% dari pemasukan bisa ditabung</div></div>
    <div class="card stat"><div class="label">Total Tabungan</div><div class="value small">${formatRp(saved)}</div><div class="hint">dari target ${formatRp(goalTarget)} di 3 target tabungan</div></div>
  </div>

  <div class="grid grid-2 mt">
    <section class="card" aria-label="Pengeluaran per kategori">
      <h2>Pengeluaran per Kategori</h2>
      <p class="sub">Total ${formatRp(t.expense)} · ${formatMonth(state.activeMonth)}</p>
      <div class="chart-wrap">
        <canvas id="donut" class="chart" width="220" height="220" role="img" aria-label="Diagram lingkaran pengeluaran per kategori"></canvas>
        <ul class="legend" id="donutLegend"></ul>
      </div>
    </section>
    <section class="card" aria-label="Peringatan anggaran">
      <h2>Peringatan Anggaran</h2>
      <p class="sub">Kategori yang sudah lewat atau hampir habis bulan ini.</p>
      ${alerts.join('')}
      <p><a class="btn secondary" href="#/budgets">Lihat Semua Anggaran</a></p>
    </section>
  </div>

  <div class="grid grid-2 mt">
    <section class="card" aria-label="Transaksi terbaru">
      <h2>Transaksi Terbaru</h2>
      <p class="sub">5 transaksi terakhir bulan ini.</p>
      <div class="table-scroll"><table>
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead>
        <tbody>
        ${recent.map((x) => `<tr class="${x.type}"><td>${formatDate(x.date)}</td><td>${esc(x.desc)}<br><small style="color:var(--muted)">${esc(x.category)}</small></td><td class="num amount">${x.type === 'expense' ? '−' : '+'} ${formatRp(x.amount)}</td></tr>`).join('')}
        </tbody>
      </table></div>
      <p style="margin:12px 0 0"><a class="btn secondary" href="#/transactions">Semua Transaksi</a></p>
    </section>
    <section class="card" aria-label="Target tabungan">
      <h2>Target Tabungan</h2>
      <p class="sub">${state.goals.length} target aktif — total terkumpul ${formatRp(saved)}.</p>
      ${state.goals.map((g) => {
        const pct = Math.round((g.saved / g.target) * 100);
        return `<div class="budget-item">
          <div class="budget-head"><span class="name">${esc(g.name)}</span><span class="pct">${pct}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, pct)}%"></div></div>
          <div class="bar-row"><span class="spent">${formatRp(g.saved)}</span><span class="limit">dari ${formatRp(g.target)}</span></div>
        </div>`;
      }).join('')}
      <p style="margin:12px 0 0"><a class="btn secondary" href="#/goals">Kelola Target Tabungan</a></p>
    </section>
  </div>`;
}

export function wireDashboard(state) {
  const canvas = document.getElementById('donut');
  const spent = spentByCategory(state);
  const slices = EXPENSE_CATEGORIES
    .map((c) => ({ label: c, value: spent[c] || 0, color: CATEGORIES[c].color }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = monthTotals(state).expense;
  drawDonut(canvas, slices, 'Total keluar', formatRpShort(total));
  document.getElementById('donutLegend').innerHTML = slices.map((s) => {
    const pct = Math.round((s.value / total) * 100);
    return `<li><span><span class="cat-dot" style="background:${s.color}"></span>${esc(s.label)} · ${pct}%</span><span class="lg-amount">${formatRp(s.value)}</span></li>`;
  }).join('');
}

/* ================= Transactions ================= */

export function renderTransactions(state, filter = {}) {
  const cat = filter.category || 'all';
  const type = filter.type || 'all';
  let rows = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (cat !== 'all') rows = rows.filter((t) => t.category === cat);
  if (type !== 'all') rows = rows.filter((t) => t.type === type);

  // Running balance: walk oldest -> newest, then display newest first.
  const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const bal = new Map();
  let running = 0;
  for (const t of asc) {
    running += t.type === 'income' ? t.amount : -t.amount;
    bal.set(t.id, running);
  }
  const shown = [...rows].reverse();

  const catOptions = ['all', ...Object.keys(CATEGORIES)].map((c) =>
    `<option value="${c}" ${c === cat ? 'selected' : ''}>${c === 'all' ? 'Semua kategori' : esc(c)}</option>`).join('');

  return `
  <div class="page-head">
    <h1>Transaksi</h1>
    <p>Semua pemasukan dan pengeluaran ${esc(state.household)}. Tambah, ubah, atau hapus — saldo berjalan dan semua halaman ikut berubah.</p>
  </div>

  <section class="card" aria-label="Tambah transaksi">
    <h2 id="txFormTitle">Tambah Transaksi</h2>
    <p class="sub">Isi formulir di bawah ini, lalu tekan Simpan. Data tersimpan di peramban Anda.</p>
    <p class="form-error" id="txError" hidden></p>
    <form id="txForm">
      <input type="hidden" id="txId" value="">
      <div class="form-row">
        <div class="field"><label for="txDate">Tanggal</label><input type="date" id="txDate" value="2026-11-26" required></div>
        <div class="field"><label for="txType">Jenis</label>
          <select id="txType"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="txDesc">Keterangan</label><input type="text" id="txDesc" maxlength="80" placeholder="cth. Belanja pasar Minggu" required></div>
        <div class="field"><label for="txAmount">Jumlah (Rp)</label><input type="number" id="txAmount" min="1000" step="500" placeholder="cth. 185000" required></div>
      </div>
      <div class="field"><label for="txCategory">Kategori</label><select id="txCategory"></select></div>
      <button class="btn" type="submit" id="txSubmit">Simpan Transaksi</button>
      <button class="btn secondary" type="button" id="txCancel" hidden>Batal Mengubah</button>
    </form>
  </section>

  <section class="card mt" aria-label="Daftar transaksi">
    <h2>Daftar Transaksi <span class="pill teal">${rows.length} transaksi</span></h2>
    <div class="toolbar">
      <div class="field"><label for="fltCat">Kategori</label><select id="fltCat">${catOptions}</select></div>
      <div class="field"><label for="fltType">Jenis</label>
        <select id="fltType">
          <option value="all" ${type === 'all' ? 'selected' : ''}>Semua</option>
          <option value="expense" ${type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
          <option value="income" ${type === 'income' ? 'selected' : ''}>Pemasukan</option>
        </select></div>
      <button class="btn secondary" type="button" id="fltReset">Reset Data Awal</button>
    </div>
    <div class="table-scroll"><table>
      <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="num">Jumlah</th><th class="num">Saldo Berjalan</th><th></th></tr></thead>
      <tbody>
      ${shown.length ? shown.map((t) => `<tr class="${t.type}">
        <td>${formatDate(t.date)}</td>
        <td>${esc(t.desc)}</td>
        <td><span class="cat-dot" style="background:${CATEGORIES[t.category].color}"></span>${esc(t.category)}</td>
        <td class="num amount">${t.type === 'expense' ? '−' : '+'} ${formatRp(t.amount)}</td>
        <td class="num">${formatRp(bal.get(t.id))}</td>
        <td class="row-actions">
          <button class="btn small secondary" type="button" data-edit="${t.id}">Ubah</button>
          <button class="btn small danger" type="button" data-del="${t.id}">Hapus</button>
        </td></tr>`).join('') : `<tr><td colspan="6" class="empty">Tidak ada transaksi untuk filter ini.</td></tr>`}
      </tbody>
    </table></div>
  </section>`;
}

export function wireTransactions(state, refresh, filter) {
  const form = document.getElementById('txForm');
  const catSel = document.getElementById('txCategory');
  const typeSel = document.getElementById('txType');
  const fillCats = () => {
    const list = typeSel.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    catSel.innerHTML = list.map((c) => `<option value="${c}">${esc(c)}</option>`).join('');
  };
  fillCats();
  typeSel.addEventListener('change', fillCats);

  const err = document.getElementById('txError');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('txAmount').value);
    const desc = document.getElementById('txDesc').value;
    const date = document.getElementById('txDate').value;
    if (!desc.trim()) { err.textContent = 'Keterangan wajib diisi.'; err.hidden = false; return; }
    if (!date) { err.textContent = 'Tanggal wajib diisi.'; err.hidden = false; return; }
    if (!Number.isFinite(amount) || amount < 1000) { err.textContent = 'Jumlah minimal Rp 1.000.'; err.hidden = false; return; }
    err.hidden = true;
    const fields = { date, desc, category: catSel.value, type: typeSel.value, amount };
    const id = document.getElementById('txId').value;
    if (id) updateTransaction(state, id, fields); else addTransaction(state, fields);
    refresh();
  });

  document.getElementById('txCancel').addEventListener('click', () => refresh());

  document.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
    const t = state.transactions.find((x) => x.id === btn.dataset.edit);
    if (!t) return;
    document.getElementById('txId').value = t.id;
    document.getElementById('txDate').value = t.date;
    document.getElementById('txDesc').value = t.desc;
    document.getElementById('txAmount').value = t.amount;
    typeSel.value = t.type;
    fillCats();
    catSel.value = t.category;
    document.getElementById('txFormTitle').textContent = 'Ubah Transaksi';
    document.getElementById('txSubmit').textContent = 'Simpan Perubahan';
    document.getElementById('txCancel').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => {
    const t = state.transactions.find((x) => x.id === btn.dataset.del);
    if (!t) return;
    if (window.confirm(`Hapus transaksi "${t.desc}" (${formatRp(t.amount)})?`)) {
      deleteTransaction(state, t.id);
      refresh();
    }
  }));

  document.getElementById('fltCat').addEventListener('change', (e) => refresh({ ...filter, category: e.target.value }));
  document.getElementById('fltType').addEventListener('change', (e) => refresh({ ...filter, type: e.target.value }));
  document.getElementById('fltReset').addEventListener('click', () => {
    if (window.confirm('Kembalikan semua data ke data awal Keluarga Prasetyo? Perubahan Anda akan hilang.')) {
      resetState();
      refresh();
    }
  });
}

/* ================= Budgets ================= */

export function renderBudgets(state) {
  const budgets = budgetStatus(state);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalUsed = budgets.reduce((s, b) => s + b.used, 0);
  const overCount = budgets.filter((b) => b.pct > 100).length;
  const totalPct = totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0;

  return `
  <div class="page-head">
    <h1>Anggaran ${formatMonth(state.activeMonth)}</h1>
    <p>Atur batas belanja tiap kategori. Ubah batasnya kapan pun — batang dan peringatan langsung mengikuti.</p>
  </div>

  <div class="grid grid-3">
    <div class="card stat"><div class="label">Total Anggaran</div><div class="value small">${formatRp(totalLimit)}</div><div class="hint">10 kategori pengeluaran</div></div>
    <div class="card stat warn"><div class="label">Terpakai</div><div class="value small">${formatRp(totalUsed)}</div><div class="hint">${totalPct}% dari total anggaran</div></div>
    <div class="card stat ${overCount ? 'warn' : 'good'}"><div class="label">Kategori Lewat Batas</div><div class="value small">${overCount} dari 10</div><div class="hint">${overCount ? 'Segera tinjau kategori di bawah' : 'Semua kategori masih aman'}</div></div>
  </div>

  <section class="card mt" aria-label="Anggaran per kategori">
    <h2>Anggaran per Kategori</h2>
    <p class="sub">Terpakai dihitung dari transaksi ${formatMonth(state.activeMonth)}.</p>
    ${budgets.map((b) => {
      const cls = b.pct > 100 ? 'over' : b.pct > 80 ? 'near' : '';
      const pill = b.pct > 100 ? '<span class="pill red">Lewat batas</span>'
        : b.pct > 80 ? '<span class="pill amber">Hampir habis</span>'
        : '<span class="pill green">Aman</span>';
      return `<div class="budget-item">
        <div class="budget-head">
          <span class="name"><span class="cat-dot" style="background:${CATEGORIES[b.category].color}"></span>${esc(b.category)} ${pill}</span>
          <span class="pct ${b.pct > 100 ? 'over' : ''}">${Math.round(b.pct)}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.min(100, b.pct)}%"></div></div>
        <div class="bar-row"><span class="spent">${formatRp(b.used)} terpakai</span><span class="limit">dari ${formatRp(b.limit)} · sisa ${formatRp(Math.max(0, b.remaining))}${b.remaining < 0 ? ` · lebih ${formatRp(-b.remaining)}` : ''}</span></div>
        <form class="budget-edit" data-cat="${esc(b.category)}" style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap">
          <label for="limit-${esc(b.category)}" style="font-size:13.5px;font-weight:700">Ubah batas (Rp)</label>
          <input id="limit-${esc(b.category)}" type="number" min="0" step="10000" value="${b.limit}" style="width:170px;font:inherit;font-size:14.5px;padding:7px 10px;border:1px solid #cfc9ba;border-radius:8px">
          <button class="btn small" type="submit">Simpan Batas</button>
          <span class="form-ok" data-saved hidden>Tersimpan.</span>
        </form>
      </div>`;
    }).join('')}
  </section>`;
}

export function wireBudgets(state, refresh) {
  document.querySelectorAll('.budget-edit').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = f.querySelector('input[type="number"]');
    const limit = Number(input.value);
    if (!Number.isFinite(limit) || limit < 0) return;
    setBudget(state, f.dataset.cat, limit);
    const saved = f.querySelector('[data-saved]');
    saved.hidden = false;
    setTimeout(() => refresh(), 500);
  }));
}

/* ================= Goals ================= */

export function renderGoals(state) {
  const saved = totalSaved(state);
  const target = state.goals.reduce((s, g) => s + g.target, 0);
  const overall = target ? Math.round((saved / target) * 100) : 0;

  return `
  <div class="page-head">
    <h1>Target Tabungan</h1>
    <p>Tabungan ${esc(state.household)}: ${formatRp(saved)} dari total target ${formatRp(target)} (${overall}% tercapai). Tambah setoran kapan pun ada sisa uang.</p>
  </div>

  <div class="grid grid-2">
    ${state.goals.map((g) => {
      const pct = Math.round((g.saved / g.target) * 100);
      const remaining = g.target - g.saved;
      return `<section class="card goal-card" aria-label="Target ${esc(g.name)}">
        <div class="goal-top"><span class="goal-name">${esc(g.name)}</span><span class="pill ${pct >= 100 ? 'green' : 'teal'}">${pct}%</span></div>
        <p class="goal-meta">${esc(g.note || '')}</p>
        <div class="bar-track progress-big"><div class="bar-fill" style="width:${Math.min(100, pct)}%"></div></div>
        <div class="bar-row"><span class="spent">${formatRp(g.saved)}</span><span class="limit">dari ${formatRp(g.target)}</span></div>
        <p style="margin:8px 0 0;font-size:14px;color:var(--muted)">${remaining > 0 ? `Kurang ${formatRp(remaining)} lagi.` : 'Target tercapai! Selamat!'}</p>
        <form class="goal-add" data-goal="${g.id}">
          <input type="number" min="1000" step="1000" placeholder="Setoran (Rp)" aria-label="Jumlah setoran untuk ${esc(g.name)}" required>
          <button class="btn small" type="submit">Tambah Setoran</button>
        </form>
        <p style="margin:10px 0 0"><button class="btn small danger" type="button" data-delgoal="${g.id}">Hapus Target</button></p>
      </section>`;
    }).join('')}
  </div>

  <section class="card mt" aria-label="Tambah target baru">
    <h2>Buat Target Tabungan Baru</h2>
    <p class="sub">Contoh: dana pendidikan, renovasi rumah, atau tabungan umrah.</p>
    <p class="form-error" id="goalError" hidden></p>
    <form id="goalForm">
      <div class="form-row">
        <div class="field"><label for="goalName">Nama target</label><input type="text" id="goalName" maxlength="60" placeholder="cth. Dana Pendidikan" required></div>
        <div class="field"><label for="goalTarget">Target (Rp)</label><input type="number" id="goalTarget" min="100000" step="50000" placeholder="cth. 12000000" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="goalSaved">Sudah terkumpul (Rp)</label><input type="number" id="goalSaved" min="0" step="50000" value="0"></div>
        <div class="field"><label for="goalNote">Catatan (opsional)</label><input type="text" id="goalNote" maxlength="100" placeholder="cth. Untuk tahun ajaran baru"></div>
      </div>
      <button class="btn" type="submit">Simpan Target Baru</button>
    </form>
  </section>`;
}

export function wireGoals(state, refresh) {
  document.querySelectorAll('.goal-add').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = f.querySelector('input[type="number"]');
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount < 1000) return;
    addContribution(state, f.dataset.goal, amount);
    refresh();
  }));
  document.querySelectorAll('[data-delgoal]').forEach((btn) => btn.addEventListener('click', () => {
    const g = state.goals.find((x) => x.id === btn.dataset.delgoal);
    if (!g) return;
    if (window.confirm(`Hapus target "${g.name}" (${formatRp(g.saved)} sudah terkumpul)?`)) {
      deleteGoal(state, g.id);
      refresh();
    }
  }));
  document.getElementById('goalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('goalName').value;
    const target = Number(document.getElementById('goalTarget').value);
    const saved = Number(document.getElementById('goalSaved').value || 0);
    const err = document.getElementById('goalError');
    if (!name.trim()) { err.textContent = 'Nama target wajib diisi.'; err.hidden = false; return; }
    if (!Number.isFinite(target) || target < 100000) { err.textContent = 'Target minimal Rp 100.000.'; err.hidden = false; return; }
    if (saved > target) { err.textContent = 'Tabungan awal tidak boleh lebih besar dari target.'; err.hidden = false; return; }
    err.hidden = true;
    addGoal(state, { name, target, saved, note: document.getElementById('goalNote').value });
    refresh();
  });
}

/* ================= Reports ================= */

export function renderReports(state) {
  const series = monthlySeries(state);
  const t = monthTotals(state);
  const spent = spentByCategory(state);
  const top = Object.entries(spent).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgExpense = Math.round(series.reduce((s, m) => s + m.expense, 0) / series.length);
  const avgIncome = Math.round(series.reduce((s, m) => s + m.income, 0) / series.length);
  const prev = series[series.length - 2];
  const mom = prev ? Math.round(((t.expense - prev.expense) / prev.expense) * 100) : 0;
  const best = series.reduce((a, b) => (b.balance > a.balance ? b : a), series[0]);
  const rate = t.income > 0 ? Math.round((t.balance / t.income) * 100) : 0;
  const emergency = state.goals.find((g) => g.name === 'Dana Darurat');
  const emergencyLeft = emergency ? Math.max(0, emergency.target - emergency.saved) : 0;
  const emergencyMonths = Math.max(1, Math.ceil(emergencyLeft / Math.max(1, t.balance)));
  const [biggestCat, biggestAmt] = top[0] || ['—', 0];
  const biggestPct = t.expense > 0 ? Math.round((biggestAmt / t.expense) * 100) : 0;

  return `
  <div class="page-head">
    <h1>Laporan — Juni s.d. ${formatMonth(state.activeMonth)}</h1>
    <p>Tren pemasukan dan pengeluaran enam bulan terakhir, kategori terbesar, dan kesimpulan yang dihitung dari data Anda.</p>
  </div>

  <div class="grid grid-4">
    <div class="card stat"><div class="label">Rata-rata Pemasukan</div><div class="value small">${formatRp(avgIncome)}</div><div class="hint">per bulan, 6 bulan terakhir</div></div>
    <div class="card stat"><div class="label">Rata-rata Pengeluaran</div><div class="value small">${formatRp(avgExpense)}</div><div class="hint">per bulan, 6 bulan terakhir</div></div>
    <div class="card stat good"><div class="label">Bulan Terbaik</div><div class="value small">${formatMonth(best.month)}</div><div class="hint">sisa ${formatRp(best.balance)} — paling hemat</div></div>
    <div class="card stat accent"><div class="label">Tingkat Tabungan</div><div class="value small">${rate}%</div><div class="hint">${formatMonth(state.activeMonth)}: ${formatRp(t.balance)} dari ${formatRp(t.income)}</div></div>
  </div>

  <section class="card mt" aria-label="Tren bulanan">
    <h2>Tren Pemasukan vs Pengeluaran</h2>
    <p class="sub">Enam bulan terakhir (Juni–November 2026), dalam Rupiah.</p>
    <div class="table-scroll"><canvas id="bars" class="chart" width="640" height="280" role="img" aria-label="Grafik batang pemasukan dan pengeluaran per bulan"></canvas></div>
    <p class="chart-caption">Hijau: pemasukan · Kuning: pengeluaran. Bulan berjalan dihitung dari transaksi yang tercatat.</p>
  </section>

  <div class="grid grid-2 mt">
    <section class="card" aria-label="Kategori terbesar">
      <h2>5 Kategori Terbesar — ${formatMonth(state.activeMonth)}</h2>
      <p class="sub">Dari total pengeluaran ${formatRp(t.expense)}.</p>
      ${top.map(([cat, amt], i) => {
        const pct = Math.round((amt / t.expense) * 100);
        return `<div class="budget-item">
          <div class="budget-head"><span class="name">${i + 1}. <span class="cat-dot" style="background:${CATEGORIES[cat].color}"></span>${esc(cat)}</span><span class="pct">${pct}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${CATEGORIES[cat].color}"></div></div>
          <div class="bar-row"><span class="spent">${formatRp(amt)}</span><span class="limit">${formatRpShort(amt)} dari total</span></div>
        </div>`;
      }).join('')}
    </section>
    <section class="card" aria-label="Kesimpulan">
      <h2>Kesimpulan</h2>
      <p class="sub">Dihitung otomatis dari data ${formatMonth(state.activeMonth)}.</p>
      <ul class="insight-list">
        <li><strong>${esc(biggestCat)} adalah pengeluaran terbesar</strong> bulan ini: ${formatRp(biggestAmt)} (${biggestPct}% dari semua pengeluaran).</li>
        <li>Pengeluaran bulan ini <strong>${mom <= 0 ? `turun ${formatRp(Math.abs(t.expense - prev.expense))} (${Math.abs(mom)}%)` : `naik ${formatRp(t.expense - prev.expense)} (${mom}%)`}</strong> dibanding ${formatMonth(prev.month)} (${formatRp(prev.expense)}).</li>
        <li>Tingkat tabungan ${rate}% — ${rate >= 20 ? 'di atas patokan sehat 20%, pertahankan.' : 'di bawah patokan sehat 20%; coba pangkas kategori terbesar dulu.'}</li>
        <li>Rata-rata pengeluaran 6 bulan ${formatRp(avgExpense)}; bulan ini ${t.expense < avgExpense ? 'lebih hemat' : 'lebih boros'} ${formatRp(Math.abs(t.expense - avgExpense))} dari rata-rata.</li>
        <li>Jika sisa ${formatRp(t.balance)} disetor tiap bulan, Dana Darurat (${formatRp(emergencyLeft)} lagi) lunas dalam ${emergencyMonths} bulan.</li>
      </ul>
      <div class="kv" style="margin-top:12px"><span>Total pemasukan 6 bulan</span><b>${formatRp(series.reduce((s, m) => s + m.income, 0))}</b></div>
      <div class="kv"><span>Total pengeluaran 6 bulan</span><b>${formatRp(series.reduce((s, m) => s + m.expense, 0))}</b></div>
      <div class="kv"><span>Total sisa 6 bulan</span><b>${formatRp(series.reduce((s, m) => s + m.balance, 0))}</b></div>
    </section>
  </div>`;
}

export function wireReports(state) {
  drawMonthlyBars(document.getElementById('bars'), monthlySeries(state), formatRpShort);
}
