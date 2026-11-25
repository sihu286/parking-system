const ZONES = ['A', 'B', 'C', 'D'];
const ZONE_NAMES = {
  A: 'A · 동쪽 구역',
  B: 'B · 서쪽 구역',
  C: 'C · 남쪽 구역',
  D: 'D · 장애인 전용',
};

let dashZoneIndex = 0;
let dashZoneData = { A: [], B: [], C: [], D: [] };
let dashControlsBound = false;
let dashZoneChipsRendered = false;

function resetDashZoneData() {
  dashZoneData = { A: [], B: [], C: [], D: [] };
}

function renderDashZone() {
  const zone = ZONES[dashZoneIndex];
  const slots = dashZoneData[zone] || [];

  document.getElementById('dashCurrentZoneName').textContent = ZONE_NAMES[zone];

  document.querySelectorAll('[data-dash-zone]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dashZone === zone);
  });

  const wrap = document.getElementById('dashZoneSlots');
  if (!slots.length) {
    wrap.innerHTML = '<div style="color:var(--text-soft);font-size:14px;">구획 없음</div>';
    return;
  }

  renderSlotGrid(slots, 'dashZoneSlots');
}

function renderZoneChips() {
  if (dashZoneChipsRendered) return;

  const chips = document.getElementById('dashZoneChips');
  chips.innerHTML = ZONES.map(z => `
    <button class="chip-btn" data-dash-zone="${z}">${z}</button>
  `).join('');

  chips.querySelectorAll('[data-dash-zone]').forEach(btn => {
    btn.addEventListener('click', () => {
      dashZoneIndex = ZONES.indexOf(btn.dataset.dashZone);
      renderDashZone();
    });
  });

  dashZoneChipsRendered = true;
}

function bindDashboardControls() {
  if (dashControlsBound) return;

  document.getElementById('dashPrevZone').addEventListener('click', () => {
    dashZoneIndex = (dashZoneIndex - 1 + ZONES.length) % ZONES.length;
    renderDashZone();
  });
  document.getElementById('dashNextZone').addEventListener('click', () => {
    dashZoneIndex = (dashZoneIndex + 1) % ZONES.length;
    renderDashZone();
  });

  dashControlsBound = true;
}

function setDonut(total, occupied) {
  const available = Math.max(total - occupied, 0);
  const degree = total ? Math.round((available / total) * 360) : 0;
  const donut = document.getElementById('dashboardDonut');
  donut.style.background =
    `conic-gradient(var(--success) 0deg ${degree}deg, var(--danger) ${degree}deg 360deg)`;
  document.getElementById('donutCenterText').textContent = `${available}/${total}`;
  document.getElementById('occupiedText').textContent = `${occupied}칸`;
  document.getElementById('availableText').textContent = `${available}칸`;
}

function renderAbnormalTable(items) {
  const body = document.getElementById('dashboardAbnormalBody');
  if (!items || !items.length) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-soft);">이상 내역이 없습니다.</td></tr>`;
    document.getElementById('recentAbnormalCount').textContent = '0건 대기중';
    return;
  }
  body.innerHTML = items.slice(0, 5).map(item => `
    <tr>
      <td>${formatDateTime(item.detected_at)}</td>
      <td>${item.slot_id || '-'}</td>
      <td>${item.car_number || '-'}</td>
      <td>${violationTypeBadge(item.violation_type)}</td>
      <td>${statusBadge(item.status)}</td>
    </tr>
  `).join('');
  const pending = items.filter(i => i.status !== '완료').length;
  document.getElementById('recentAbnormalCount').textContent = `${pending}건 대기중`;
}

async function refreshDashboardData() {
  const data = await safeFetch('/api/monitoring');
  if (!data) return;

  const slots = data.parking_slots || [];
  resetDashZoneData();
  slots.forEach(slot => {
    const zk = (slot.slot_id || '')[0];
    if (dashZoneData[zk]) dashZoneData[zk].push(slot);
  });

  renderDashZone();

  const total = slots.length;
  const occupied = slots.filter(s => s.status !== '빈자리').length;
  setDonut(total, occupied);

  renderAbnormalTable(data.violations || []);
  loadAlarmCount();
}

async function loadDashboard() {
  if (!initializeLayout('대시보드', 'dashboard')) return;

  renderZoneChips();
  bindDashboardControls();
  await refreshDashboardData();

  setInterval(refreshDashboardData, 5000);
}

document.addEventListener('DOMContentLoaded', loadDashboard);
