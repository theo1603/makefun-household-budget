// RumahKas — router + wiring. Hash routes: #/dashboard, #/transactions,
// #/budgets, #/goals, #/reports. Unknown hashes fall back to the dashboard.

import { loadState, formatMonth } from './data.js';
import {
  renderDashboard, wireDashboard,
  renderTransactions, wireTransactions,
  renderBudgets, wireBudgets,
  renderGoals, wireGoals,
  renderReports, wireReports,
} from './views.js';

const app = document.getElementById('app');
const monthChip = document.getElementById('monthChip');
let state = loadState();
let txFilter = { category: 'all', type: 'all' };

monthChip.textContent = formatMonth(state.activeMonth);

function route() {
  const hash = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  const page = ['dashboard', 'transactions', 'budgets', 'goals', 'reports'].includes(hash) ? hash : 'dashboard';
  document.querySelectorAll('.mainnav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === page);
  });
  return page;
}

function render(filter) {
  state = loadState();
  monthChip.textContent = formatMonth(state.activeMonth);
  const page = route();
  const refresh = (nextFilter) => {
    if (nextFilter) txFilter = nextFilter;
    render(txFilter);
  };
  if (page === 'dashboard') {
    app.innerHTML = renderDashboard(state);
    wireDashboard(state);
  } else if (page === 'transactions') {
    app.innerHTML = renderTransactions(state, filter || txFilter);
    wireTransactions(state, refresh, filter || txFilter);
  } else if (page === 'budgets') {
    app.innerHTML = renderBudgets(state);
    wireBudgets(state, refresh);
  } else if (page === 'goals') {
    app.innerHTML = renderGoals(state);
    wireGoals(state, refresh);
  } else {
    app.innerHTML = renderReports(state);
    wireReports(state);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => render(txFilter));
render(txFilter);
