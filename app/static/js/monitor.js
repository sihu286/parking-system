function renderMonitoringMap(zones, filter) {
  const container = document.getElementById('parkingMapGrid');
  const zoneKeys = filter === 'ALL' ? ['A', 'B', 'C', 'D'] : [filter];
  const names = { A: '동쪽 구역 (A)', B: '서쪽 구역 (B)', C: '남쪽 구역 (C)', D: '장애인 전용 (D)' };
  const slotCarMap = getSlotCarMap();

  container.innerHTML = zoneKeys.map(zone => {
    const items = zones[zone] || [];
    const used = items.filter(slot => slot.status !== '빈자리').length;

    return `
      <section class="monitor-zone-card">
        <div class="monitor-zone-header">
          <div class="zone-title"><span class="color-dot ${zone.toLowerCase()}"></span>${names[zone]}</div>
          <span>${used}/${items.length}</span>
        </div>
        <div class="monitor-zone-slots">
          ${items.map(slot => {
            const cls =
              slot.status === '빈자리'
                ? 'empty'
                : slot.status === '이상'
                  ? 'violation'
                  : (slot.slot_type === 'DISABLED' ? 'disabled' : 'occupied');

            const label = slot.slot_id.split('-')[1];
            const number = slotCarMap[slot.slot_id] || '';
            return `<div class="monitor-slot ${cls}"><span>${label}</span><small>${number ? '🚗' : (slot.slot_type === 'DISABLED' ? '♿' : '')}</small></div>`;
          }).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function renderActiveParkingRows(data) {
  const slotCarMap = getSlotCarMap();
  const reverseMap = Object.entries(slotCarMap).reduce((acc, [slot, car]) => {
    acc[car] = slot;
    return acc;
  }, {});

  const body = document.getElementById('activeParkingBody');

  if (!data || data.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">현재 주차 중인 차량이 없습니다.</td>
      </tr>
    `;
    document.getElementById('activeCountText').textContent = '0대';
    return;
  }

  body.innerHTML = data.map(item => {
    const state = calcVehicleStatus(item.entry_time);
    return `
      <tr>
        <td>${item.car_number}</td>
        <td>${reverseMap[item.car_number] || '-'}</td>
        <td>${formatDateTime(item.entry_time)}</td>
        <td>${statusBadge(state)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('activeCountText').textContent = `${data.length}대`;
}

async function loadMonitoring() {
  initializeLayout('실시간 모니터링', 'monitoring');

  const data = await safeFetch('/api/monitoring');
  if (!data) {
    console.error('모니터링 데이터를 불러오지 못했습니다.');
    return;
  }

  const zones = { A: [], B: [], C: [], D: [] };
  (data.parking_slots || []).forEach(slot => {
    zones[slot.slot_id[0]].push(slot);
  });

  let currentFilter = 'ALL';

  const rerender = () => {
    renderMonitoringMap(zones, currentFilter);
    const visibleCount =
      currentFilter === 'ALL'
        ? (data.parking_slots || []).length
        : zones[currentFilter].length;

    document.getElementById('monitorCountText').textContent = `총 ${visibleCount}개 구획`;
  };

  document.querySelectorAll('[data-zone-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-zone-filter]').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.zoneFilter;
      rerender();
    });
  });

  rerender();
  renderActiveParkingRows(data.active_parkings || []);
  document.getElementById('monitorUpdated').textContent = formatDateTime(new Date());
}

document.addEventListener('DOMContentLoaded', loadMonitoring);