/* ── 슬롯 클래스 결정 (dashboard · monitoring 공유) ── */
function slotClass(slot) {
  if (slot.status === '이상')    return 'violation';
  if (slot.status === '빈자리')  return slot.slot_type === 'DISABLED' ? 'available-disabled' : 'empty';
  return 'occupied';
}

/* 슬롯 그리드를 containerId 요소에 렌더링 */
function renderSlotGrid(slots, containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  if (!slots || !slots.length) {
    wrap.innerHTML = '<div style="color:var(--text-soft);font-size:14px;">구획 없음</div>';
    return;
  }

  wrap.innerHTML = slots.map(slot => {
    const cls  = slotClass(slot);
    const label = getSlotLabel(slot.slot_id);
    const icon  = slot.slot_type === 'DISABLED' ? '<small>♿</small>' : '';
    return `<div class="slot-mini ${cls}" title="${slot.slot_id}"><span>${label}</span>${icon}</div>`;
  }).join('');
}

const APP_ROUTES = {
  dashboard: '/',
  login: '/login',
  monitoring: '/monitoring',
  abnormal: '/abnormal',
  statistics: '/statistics',
  registration: '/registration',
  device_error: '/device-error' //장비오류
};

const SIDEBAR_STORAGE_KEY = 'parking_sidebar_collapsed';

function getStoredUser() {
  const raw = sessionStorage.getItem('parking_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setStoredUser(user) {
  sessionStorage.setItem('parking_user', JSON.stringify(user));
}

function clearStoredUser() {
  sessionStorage.removeItem('parking_user');
}

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let detail = '';
      try {
        const errorData = await response.json();
        detail = errorData?.detail || '';
      } catch (_) {
        detail = '';
      }

      console.error(`[${response.status}] ${url}`, detail);
      return null;
    }

    if (response.status === 204) return {};
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatDateOnly(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function statusBadge(text) {
  if (text === '입차' || text === 'IN') return `<span class="status-chip blue">입차</span>`;
  if (text === '출차' || text === 'OUT') return `<span class="status-chip green">출차</span>`;
  if (text === '미처리') return `<span class="status-chip red">미처리</span>`;
  if (text === '처리중') return `<span class="status-chip yellow">처리중</span>`;
  if (text === '완료') return `<span class="status-chip green">완료</span>`;
  if (text === '정상') return `<span class="status-chip green">정상</span>`;
  if (text === '기간만료') return `<span class="status-chip red">기간만료</span>`;
  if (text === '24시간 초과') return `<span class="status-chip red">24시간 초과</span>`;
  return `<span class="status-chip gray">${text ?? '-'}</span>`;
}

function violationTypeLabel(type) {
  if (type === '미인식') return 'RFID 미인식';
  if (type === '불일치') return 'RFID 불일치';
  if (type === '기간만료') return '기간 만료';
  if (type === '24시간초과') return '24시간 초과';
  if (type === '장비이상') return '장비 이상';
  return type || '-';
}

function violationTypeBadge(type) {
  return `<span class="status-chip red">${violationTypeLabel(type)}</span>`;
}

function expirationStatus(expireDate) {
  if (!expireDate) return '미등록';

  const now = new Date();
  const target = new Date(expireDate);

  if (Number.isNaN(target.getTime())) return '확인불가';
  return target < now ? '기간만료' : '정상';
}

function calcVehicleStatus(entryTime) {
  if (!entryTime) return '확인불가';

  const now = new Date();
  const entry = new Date(entryTime);

  if (Number.isNaN(entry.getTime())) return '확인불가';

  const diffMs = now - entry;
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= 24 ? '24시간 초과' : '정상';
}

function getSlotLabel(slotId) {
  if (!slotId) return '-';
  if (slotId.includes('-')) {
    const parts = slotId.split('-');
    return parts[1] || slotId;
  }
  return slotId.slice(1) || slotId;
}

function getSlotCarMap(data = null) {
  const map = {};
  const activeList = data?.active_parkings || [];
  const slots = data?.parking_slots || [];

  const disabledOccupied = slots
    .filter(slot => slot.slot_type === 'DISABLED' && slot.status !== '빈자리')
    .sort((a, b) => a.slot_id.localeCompare(b.slot_id));
  const activeWithRfid = activeList
    .filter(item => item.rfid_uid)
    .sort((a, b) => a.car_number.localeCompare(b.car_number));

  disabledOccupied.forEach((slot, idx) => {
    if (activeWithRfid[idx]) {
      map[slot.slot_id] = activeWithRfid[idx].car_number;
    }
  });

  return map;
}

function requireAuth(options = {}) {
  const user = getStoredUser();

  if (!user) {
    location.href = APP_ROUTES.login;
    return false;
  }

  if (options.adminOnly && user.role !== 'ADMIN') {
    alert('관리자만 접근할 수 있습니다.');
    location.href = APP_ROUTES.dashboard;
    return false;
  }

  return true;
}

const MENU_ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`,
  monitoring: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" opacity="0.7"/>
    <path d="M8 10h1m6 0h1"/>
  </svg>`,
  abnormal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  statistics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>`,
  registration: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l3 4v6a2 2 0 0 1-2 2z"/>
    <circle cx="7.5" cy="17" r="2"/>
    <circle cx="16.5" cy="17" r="2"/>
    <line x1="12" y1="5" x2="12" y2="9"/>
    <line x1="10" y1="7" x2="14" y2="7"/>
  </svg>`,
  //장비오류
  device_error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="4" width="18" height="14" rx="2"/>
  <path d="M8 20h8"/>
  <path d="M12 18v2"/>
  <path d="M8 9h8"/>
  <path d="M8 13h5"/>
</svg>`,
};

function getMenuItems(isAdmin) {
  const items = [
    { key: 'dashboard',  label: '대시보드',        href: APP_ROUTES.dashboard },
    { key: 'monitoring', label: '실시간 모니터링',  href: APP_ROUTES.monitoring },
    { key: 'abnormal',   label: '이상 상황 관리',   href: APP_ROUTES.abnormal },
    { key: 'device_error', label: '장비이상 로그', href: APP_ROUTES.device_error }, //장비오류
    { key: 'statistics', label: '통계 및 로그',     href: APP_ROUTES.statistics },

  ];

  if (isAdmin) {
    items.push({ key: 'registration', label: '장애인 차량 등록', href: APP_ROUTES.registration });
  }

  return items;
}

function renderSidebar(currentKey) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const user = getStoredUser();
  const isAdmin = user?.role === 'ADMIN';
  const items = getMenuItems(isAdmin);

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" type="button" aria-label="사이드바 접기">
        <span></span><span></span><span></span>
      </button>
      <div class="brand-block">
        <div class="brand-badge">주차관리</div>
        <h1 class="sidebar-title">주차 관제 시스템</h1>
        <p class="sidebar-subtitle">RFID 기반 장애인 주차 관리</p>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${items.map(item => `
        <a class="sidebar-link ${item.key === currentKey ? 'active' : ''}" href="${item.href}" data-nav="${item.key}" title="${item.label}">
          <span class="sidebar-link-tag">${MENU_ICONS[item.key] || ''}</span>
          <span class="sidebar-link-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-profile">
      <div class="profile-avatar">
        <img src="/static/profile.svg" alt="profile">
      </div>
      <div class="profile-info">
        <strong>${user?.name || '-'}</strong>
        <span>${user?.user_id || '-'}</span>
      </div>
    </div>
  `;
}

function renderTopbar(pageTitle) {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="mobile-sidebar-btn" id="mobileSidebarBtn" type="button" aria-label="메뉴 열기">
        ☰
      </button>
      <div>
        <div class="topbar-crumb">주차관리시스템</div>
        <h2 class="page-title" id="pageTitle">${pageTitle}</h2>
      </div>
    </div>
    <div class="topbar-right">
      <div class="alarm-container">
        <button id="alarmBtn" class="alarm-btn" type="button" aria-label="알림 보기">
          <span class="alarm-icon">⚠</span>
          <span id="alarmCount" class="alarm-badge" style="display:none;">0</span>
        </button>
        <div id="alarmDropdown" class="alarm-dropdown hidden"></div>
      </div>
      <div class="header-user">
        <span id="headerUserName"></span>
        <span id="headerUserRole" class="role-badge"></span>
      </div>
      <button class="logout-btn" id="logoutBtn" type="button">로그아웃</button>
    </div>
  `;
}

async function loadAlarmCount() {
  const data = await safeFetch('/api/abnormal-events/summary');
  const badge = document.getElementById('alarmCount');
  if (!badge) return;

  const count = (data?.미처리 || 0) + (data?.처리중 || 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

async function loadAlarmDropdown() {
  const dropdown = document.getElementById('alarmDropdown');
  if (!dropdown) return;

  const items = await safeFetch('/api/abnormal-events/alerts');

  if (!items || items.length === 0) {
    dropdown.innerHTML = `<div class="alarm-empty">현재 확인할 이상 상황이 없습니다.</div>`;
    return;
  }

  dropdown.innerHTML = items.map(item => `
    <div class="alarm-item" data-id="${item.violation_id}">
      <div class="alarm-item-top">
        <strong>${item.location || item.slot_id || '-'}</strong>
        ${statusBadge(item.status)}
      </div>
      <div class="alarm-item-body">
        <div>차량번호: ${item.car_number || '-'}</div>
        <div>유형: ${violationTypeLabel(item.violation_type)}</div>
        <div>시간: ${formatDateTime(item.detected_at)}</div>
      </div>
    </div>
  `).join('');

  dropdown.querySelectorAll('.alarm-item').forEach(item => {
  item.addEventListener('click', () => {
    window.location.href = APP_ROUTES.abnormal;
  });
});
}

function bindAlarmDropdown() {
  const btn = document.getElementById('alarmBtn');
  const dropdown = document.getElementById('alarmDropdown');

  if (!btn || !dropdown) return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');

    if (!dropdown.classList.contains('hidden')) {
      await loadAlarmDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.classList.contains('hidden') && !dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.add('hidden');
    }
  });
}

function bindLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    clearStoredUser();
    location.href = APP_ROUTES.login;
  });
}

function renderHeaderUser() {
  const user = getStoredUser();
  const userNameEl = document.getElementById('headerUserName');
  const userRoleEl = document.getElementById('headerUserRole');

  if (!user) return;

  if (userNameEl) userNameEl.textContent = `${user.name} (${user.user_id})`;
  if (userRoleEl) userRoleEl.textContent = user.role === 'ADMIN' ? '관리자' : '사용자';
}

function applySidebarState(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
}

function initializeSidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  // 초기 적용 시 transition 끄기 → 깜빡임 방지
  document.body.classList.add('no-transition');
  applySidebarState(collapsed);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove('no-transition');
    });
  });
}

function toggleSidebar(forceValue = null) {
  const next = typeof forceValue === 'boolean'
    ? forceValue
    : !document.body.classList.contains('sidebar-collapsed');

  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  applySidebarState(next);
}

function bindSidebarToggle() {
  const desktopBtn = document.getElementById('sidebarCollapseBtn');
  const mobileBtn = document.getElementById('mobileSidebarBtn');

  if (desktopBtn) {
    desktopBtn.addEventListener('click', () => {
      toggleSidebar();
    });
  }

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }

  document.addEventListener('click', (event) => {
    if (window.innerWidth > 1080) return;

    const sidebar = document.getElementById('sidebar');
    const mobileTrigger = document.getElementById('mobileSidebarBtn');

    if (!document.body.classList.contains('sidebar-open')) return;
    if (sidebar?.contains(event.target) || mobileTrigger?.contains(event.target)) return;

    document.body.classList.remove('sidebar-open');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) {
      document.body.classList.remove('sidebar-open');
    }
  });
}

function initializeLayout(pageTitle, currentKey, options = {}) {
  if (options.adminOnly && !requireAuth({ adminOnly: true })) return false;
  if (!options.adminOnly && !requireAuth()) return false;

  renderSidebar(currentKey);
  renderTopbar(pageTitle);
  renderHeaderUser();
  initializeSidebarState();
  bindSidebarToggle();
  bindLogoutButton();
  bindAlarmDropdown();
  loadAlarmCount();
  return true;
}
