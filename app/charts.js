// RumahKas — canvas charts (plain Canvas 2D, no libraries).
// Donut: spending share per category. Bars: monthly income vs expense.

function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

export function drawDonut(canvas, slices, centerLabel, centerValue) {
  const size = 220;
  const ctx = setupCanvas(canvas, size, size);
  const cx = size / 2, cy = size / 2, r = 92, hole = 58;
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    ctx.fillStyle = '#e2ddd2';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, hole, 0, Math.PI * 2); ctx.fill();
    return;
  }
  let angle = -Math.PI / 2;
  for (const s of slices) {
    const sweep = (s.value / total) * Math.PI * 2;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fill();
    angle += sweep;
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, hole, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#22302c';
  ctx.font = '700 13px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(centerLabel, cx, cy - 4);
  ctx.font = '800 15px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(centerValue, cx, cy + 16);
}

export function drawMonthlyBars(canvas, series, fmtShort) {
  // series: [{month:'2026-06', income, expense}] — grouped bars, 6 months.
  const width = 640, height = 280;
  const ctx = setupCanvas(canvas, width, height);
  const padL = 68, padR = 10, padT = 18, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const maxVal = Math.max(...series.flatMap((s) => [s.income, s.expense])) * 1.08;

  // gridlines + y labels
  ctx.font = '12px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#5d6d68';
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 1.08 / 4) * i;
    const y = padT + plotH - (v / maxVal) * plotH;
    ctx.strokeStyle = i === 0 ? '#cfc9ba' : '#ece7da';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(width - padR, y); ctx.stroke();
    ctx.fillText(fmtShort(v), padL - 8, y + 4);
  }

  const groupW = plotW / series.length;
  const barW = Math.min(30, (groupW - 24) / 2);
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  series.forEach((s, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const hI = (s.income / maxVal) * plotH;
    const hE = (s.expense / maxVal) * plotH;
    ctx.fillStyle = '#0e6b5c';
    ctx.fillRect(gx - barW - 3, padT + plotH - hI, barW, hI);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(gx + 3, padT + plotH - hE, barW, hE);
    const m = Number(s.month.slice(5, 7));
    ctx.fillStyle = '#22302c';
    ctx.font = '700 12.5px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(monthShort[m - 1], gx, height - 12);
  });

  // legend
  ctx.textAlign = 'left';
  ctx.font = '13px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0e6b5c';
  ctx.fillRect(padL, 2, 12, 12);
  ctx.fillStyle = '#22302c';
  ctx.fillText('Pemasukan', padL + 17, 12);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(padL + 110, 2, 12, 12);
  ctx.fillStyle = '#22302c';
  ctx.fillText('Pengeluaran', padL + 127, 12);
}
