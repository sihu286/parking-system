const MON_ZONES = ['A', 'B', 'C', 'D'];
const MON_ZONE_NAMES = {
  A: 'A · 동쪽 구역',
  B: 'B · 서쪽 구역',
  C: 'C · 남쪽 구역',
  D: 'D · 장애인 전용',
};

let monZoneIndex = 0;
let monZoneData = { A: [], B: [], C: [], D: [] };
let monControlsBound = false;
let monZoneChipsRendered = false;

function resetMonZoneData() {
  monZoneData = { A: [], B: [], C: [], D: [] };
}

function renderMonZone() {
  const zone = MON_ZONES[monZoneIndex];
  const slots = monZoneData[zone] || [];

  document.getElementById('monCurrentZoneName').textContent = MON_ZONE_NAMES[zone];

  document.querySelectorAll('[data-mon-zone]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.monZone === zone);
  });

  const wrap = document.getElementById('monZoneSlots');
  if (!slots.length) {
    wrap.innerHTML = '<div style="color:var(--text-soft);font-size:14px;">구획 없음</div>';
    return;
  }

  renderSlotGrid(slots, 'monZoneSlots');
}

function renderMonZoneChips() {
  if (monZoneChipsRendered) return;

  const chips = document.getElementById('monZoneChips');
  chips.innerHTML = MON_ZONES.map(z => `
    <button class="chip-btn" data-mon-zone="${z}">${z}</button>
  `).join('');

  chips.querySelectorAll('[data-mon-zone]').forEach(btn => {
    btn.addEventListener('click', () => {
      monZoneIndex = MON_ZONES.indexOf(btn.dataset.monZone);
      renderMonZone();
    });
  });

  monZoneChipsRendered = true;
}

function bindMonControls() {
  if (monControlsBound) return;

  document.getElementById('monPrevZone').addEventListener('click', () => {
    monZoneIndex = (monZoneIndex - 1 + MON_ZONES.length) % MON_ZONES.length;
    renderMonZone();
  });
  document.getElementById('monNextZone').addEventListener('click', () => {
    monZoneIndex = (monZoneIndex + 1) % MON_ZONES.length;
    renderMonZone();
  });

  monControlsBound = true;
}

function renderStatChips(slots) {
  const general  = slots.filter(s => s.slot_type !== 'DISABLED');
  const disabled = slots.filter(s => s.slot_type === 'DISABLED');

  document.getElementById('monStatGeneralOn').textContent =
    general.filter(s => s.status === '빈자리').length;

  document.getElementById('monStatGeneralOff').textContent =
    general.filter(s => s.status !== '빈자리').length;

  document.getElementById('monStatDisabledOn').textContent =
    disabled.filter(s => s.status === '빈자리').length;

  document.getElementById('monStatDisabledOff').textContent =
    disabled.filter(s => s.status !== '빈자리').length;
}

function renderActiveParkingRows(actives) {
  const body = document.getElementById('activeParkingBody');
  if (!actives || !actives.length) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-soft);">현재 주차 중인 차량이 없습니다.</td></tr>`;
    document.getElementById('activeCountText').textContent = '0대';
    return;
  }

  const sortedActives = [...actives].sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

  body.innerHTML = sortedActives.map(item => {
    const rfidLabel = item.rfid_uid
      ? `<span class="status-chip blue">등록</span>`
      : `<span class="status-chip gray">미등록</span>`;
    return `
      <tr>
        <td>${item.car_number}</td>
        <td>${formatDateTime(item.entry_time)}</td>
        <td>${rfidLabel}</td>
        <td>${statusBadge(item.status)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('activeCountText').textContent = `${actives.length}대`;
}

async function refreshMonitoringData() {
  const data = await safeFetch('/api/monitoring');
  if (!data) return;

  const slots = data.parking_slots || [];
  resetMonZoneData();
  slots.forEach(slot => {
    const zk = (slot.slot_id || '')[0];
    if (monZoneData[zk]) monZoneData[zk].push(slot);
  });

  renderStatChips(slots);
  renderMonZone();
  renderActiveParkingRows(data.active_parkings || []);

  loadAlarmCount();
}

async function loadMonitoring() {
  if (!initializeLayout('실시간 모니터링', 'monitoring')) return;

  renderMonZoneChips();
  bindMonControls();
  await refreshMonitoringData();

  setInterval(refreshMonitoringData, 5000);
}

document.addEventListener('DOMContentLoaded', loadMonitoring);
