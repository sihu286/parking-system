let abnormalItems = [];
let selectedPeriod = 'all';
let selectedStatus = '전체';
let abnormalDirty = false;

function isAdmin() {
  const user = getStoredUser();
  return user?.role === 'ADMIN';
}

function getCurrentUserId() {
  const user = getStoredUser();
  return user?.user_id || '';
}

function calculateSummary(items) {
  return {
    total: items.length,
    미처리: items.filter(i => (i.status || '미처리') === '미처리').length,
    처리중: items.filter(i => i.status === '처리중').length,
    완료: items.filter(i => i.status === '완료').length,
  };
}

function updateSummaryAndTable() {
  const filtered = filterAbnormalItems(abnormalItems);
  const summary = calculateSummary(filtered);

  renderSummary(summary);
  renderAbnormalTable();
}

function getDateRangeByPeriod(period) {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (period === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

function syncDateInputsByPeriod(period) {
  const startInput = document.getElementById('abnormalStartDate');
  const endInput = document.getElementById('abnormalEndDate');
  if (!startInput || !endInput) return;

  if (period === 'custom') return;

  if (period === 'all') {
    startInput.value = '';
    endInput.value = '';
    return;
  }

  const range = getDateRangeByPeriod(period);
  startInput.value = range.start;
  endInput.value = range.end;
}

function bindPeriodButtons() {
  const buttons = document.querySelectorAll('#periodButtons .chip-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      buttons.forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      selectedPeriod = btn.dataset.period;

      syncDateInputsByPeriod(selectedPeriod);
      toggleCustomDateRow(selectedPeriod);

      await loadAbnormalPageData();
    });
  });
}

function bindStatusButtons() {
  const buttons = document.querySelectorAll('#statusButtons .chip-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      selectedStatus = btn.dataset.status;

      updateSummaryAndTable();
    });
  });
}

function getCustomDateRange() {
  const startDate = document.getElementById('abnormalStartDate')?.value || '';
  const endDate = document.getElementById('abnormalEndDate')?.value || '';

  return { startDate, endDate };
}

function bindDateInputs() {
  const startInput = document.getElementById('abnormalStartDate');
  const endInput = document.getElementById('abnormalEndDate');

  const handler = async () => {
    selectedPeriod = 'custom';
    activateCustomPeriodButton();

    const { startDate, endDate } = getCustomDateRange();

    if (!startDate || !endDate) {
      return;
    }

    await loadAbnormalPageData();
  };

  if (startInput) startInput.addEventListener('change', handler);
  if (endInput) endInput.addEventListener('change', handler);
}

function activateCustomPeriodButton() {
  const buttons = document.querySelectorAll('#periodButtons .chip-btn');

  buttons.forEach(el => {
    el.classList.toggle('active', el.dataset.period === 'custom');
  });

  const customRow = document.getElementById('customDateRange');
  if (customRow) customRow.classList.remove('hidden');
}

function toggleCustomDateRow(period) {
  const customRow = document.getElementById('customDateRange');
  if (customRow) customRow.classList.toggle('hidden', period !== 'custom');
}

function parseDateSafe(value) {
  if (!value) return null;

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterAbnormalItems(items) {
  let filtered = [...items];

  if (selectedStatus !== '전체') {
    filtered = filtered.filter(item => (item.status || '미처리') === selectedStatus);
  }

  return filtered;
}

function renderSummary(summary) {
  const total = summary?.total || 0;
  const pending = summary?.미처리 || 0;
  const processing = summary?.처리중 || 0;
  const done = summary?.완료 || 0;

  const el = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  el('abnormalStatTotal', total);
  el('abnormalStatPending', pending);
  el('abnormalStatProcessing', processing);
  el('abnormalStatDone', done);
}

function bindStatCards() {
  document.querySelectorAll('[data-status]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-status]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      selectedStatus = card.dataset.status;

      updateSummaryAndTable();
    });
  });
}

function renderAbnormalActionCell(item) {
  if (isAdmin()) return '-';

  const baseSaveButton = `<button class="save-btn" onclick="saveAbnormal(${item.violation_id})">저장</button>`;

  if (item.violation_type !== '24시간초과') {
    return baseSaveButton;
  }

  const carNumber = encodeURIComponent(item.car_number || '');

  return `
    <div class="abnormal-action-stack">
      ${baseSaveButton}
      <div class="action-btn-group">
        <button class="text-link-btn" data-restore-overtime type="button"
          onclick="restoreOvertimeVehicle(${item.violation_id}, '${carNumber}')">정상처리</button>
        <button class="text-link-btn" data-remove-overtime type="button"
          onclick="deleteOvertimeVehicle(${item.violation_id}, '${carNumber}')">삭제</button>
      </div>
    </div>
  `;
}

function renderAbnormalTable() {
  const body = document.getElementById('abnormalTableBody');
  if (!body) return;

  const rows = filterAbnormalItems(abnormalItems);

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">표시할 이상 상황이 없습니다.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(item => `
    <tr>
      <td>${formatDateTime(item.detected_at)}</td>
      <td>${item.slot_id || '-'}</td>
      <td>${item.car_number || '-'}</td>
      <td>${violationTypeBadge(item.violation_type)}</td>
      <td>
        <select class="status-select" data-status-select="${item.violation_id}" ${isAdmin() ? 'disabled' : ''}>
          <option value="미처리" ${(item.status || '미처리') === '미처리' ? 'selected' : ''}>미처리</option>
          <option value="처리중" ${(item.status || '미처리') === '처리중' ? 'selected' : ''}>처리중</option>
          <option value="완료" ${(item.status || '미처리') === '완료' ? 'selected' : ''}>완료</option>
        </select>
      </td>
      <td>
        <textarea class="abnormal-note-input" data-note-input="${item.violation_id}" rows="2"
          ${isAdmin() ? 'disabled' : ''}>${item.action || ''}</textarea>
      </td>
      <td>${renderAbnormalActionCell(item)}</td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-status-select], [data-note-input]').forEach(el => {
    el.addEventListener('change', () => {
      abnormalDirty = true;
    });

    el.addEventListener('input', () => {
      abnormalDirty = true;
    });
  });
}


async function updateOvertimeViolationStatus(violationId, actionText) {
  const response = await fetch(`/api/abnormal-events/${violationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: '완료',
      action: actionText,
      handler_id: getCurrentUserId(),
      action_time: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '이상 상황 상태 변경에 실패했습니다.');
  }
}

async function handleOvertimeVehicle(violationId, encodedCarNumber, mode) {
  if (isAdmin()) return;

  const carNumber = decodeURIComponent(encodedCarNumber || '');
  if (!carNumber) {
    alert('차량번호를 찾을 수 없습니다.');
    return;
  }

  const isDelete = mode === 'delete';
  const confirmMessage = isDelete
    ? `${carNumber} 차량을 현재 입차 목록에서 삭제하시겠습니까?`
    : `${carNumber} 차량의 24시간 초과 상태를 정상으로 변경하시겠습니까?`;

  if (!confirm(confirmMessage)) return;

  try {
    const response = await fetch(
      isDelete ? `/active-parking/${encodeURIComponent(carNumber)}` : `/active-parking/${encodeURIComponent(carNumber)}/restore`,
      { method: isDelete ? 'DELETE' : 'PATCH' }
    );

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || '24시간 초과 차량 처리에 실패했습니다.');
      return;
    }

    await updateOvertimeViolationStatus(
      violationId,
      isDelete ? '24시간 초과 차량을 현재 입차 목록에서 삭제 처리함' : '24시간 초과 차량을 정상 상태로 복구 처리함'
    );

    abnormalDirty = false;
    alert(isDelete ? '삭제 처리되었습니다.' : '정상 처리되었습니다.');
    await loadAbnormalPageData(true, false);
  } catch (error) {
    console.error(error);
    alert(error.message || '서버 오류가 발생했습니다.');
  }
}

function restoreOvertimeVehicle(violationId, encodedCarNumber) {
  return handleOvertimeVehicle(violationId, encodedCarNumber, 'restore');
}

function deleteOvertimeVehicle(violationId, encodedCarNumber) {
  return handleOvertimeVehicle(violationId, encodedCarNumber, 'delete');
}

async function saveAbnormal(violationId) {
  const statusEl = document.querySelector(`[data-status-select="${violationId}"]`);
  const noteEl = document.querySelector(`[data-note-input="${violationId}"]`);

  if (!statusEl || !noteEl) {
    alert('저장할 데이터를 찾을 수 없습니다.');
    return;
  }

  const status = statusEl.value;
  const action = noteEl.value;

  try {
    const response = await fetch(`/api/abnormal-events/${violationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: status,
        action: action,
        handler_id: getCurrentUserId(),
        action_time: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || '저장에 실패했습니다.');
      return;
    }

    abnormalDirty = false;
    alert('저장되었습니다.');
    await loadAbnormalPageData(true, true);

  } catch (error) {
    console.error(error);
    alert('서버 오류가 발생했습니다.');
  }
}

async function loadAbnormalPageData(force = false, showAlert = false) {
  if (abnormalDirty && !force) {
    return;
  }

  const query = new URLSearchParams();

  query.set('period', selectedPeriod);

  if (selectedPeriod !== 'all') {
    const startDate = document.getElementById('abnormalStartDate')?.value || '';
    const endDate = document.getElementById('abnormalEndDate')?.value || '';

    if (startDate && endDate && startDate > endDate) {
      if (showAlert) {
        alert('검색 시작일은 종료일보다 늦을 수 없습니다.');
      }
      return;
    }

    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);
  }

  const queryString = query.toString();

  const summaryResponse = await fetch(`/api/abnormal-events/summary?${queryString}`);
  const listResponse = await fetch(`/api/abnormal-events?${queryString}`);

  if (!summaryResponse.ok) {
    const errorData = await summaryResponse.json();

    if (showAlert) {
      alert(errorData.detail || '조회 기간이 올바르지 않습니다.');
    }

    return;
  }

  if (!listResponse.ok) {
    const errorData = await listResponse.json();

    if (showAlert) {
      alert(errorData.detail || '조회 기간이 올바르지 않습니다.');
    }

    return;
  }

  const summary = await summaryResponse.json();
  const list = await listResponse.json();

  renderSummary(summary || { total: 0, 미처리: 0, 처리중: 0, 완료: 0 });

  abnormalItems = Array.isArray(list) ? list : [];
  renderAbnormalTable();
  loadAlarmCount();
}

async function initializeAbnormalPage() {
  if (!initializeLayout('이상 상황 관리', 'abnormal')) return;

  syncDateInputsByPeriod(selectedPeriod);
  bindPeriodButtons();
  bindStatusButtons();
  bindStatCards();
  bindDateInputs();

  await loadAbnormalPageData(true, true);

  setInterval(() => loadAbnormalPageData(false, false), 5000);
}

document.addEventListener('DOMContentLoaded', initializeAbnormalPage);
