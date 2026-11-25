let vehicles = [];

function renderVehicleTable() {
  const body = document.getElementById('vehicleTableBody');

  if (!vehicles || vehicles.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">등록된 차량이 없습니다.</td>
      </tr>
    `;
    document.getElementById('vehicleCountText').textContent = '0대';
    return;
  }

  body.innerHTML = vehicles.map(vehicle => {
    const status = expirationStatus(vehicle.expire_date);
    return `
      <tr>
        <td>${vehicle.rfid_uid}</td>
        <td>${vehicle.car_number || '-'}</td>
        <td>${vehicle.owner_name || '-'}</td>
        <td>${vehicle.disabled_person_name || '-'}</td>
        <td>${formatDateOnly(vehicle.expire_date)}</td>
        <td>${statusBadge(status)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('vehicleCountText').textContent = `${vehicles.length}대`;
}

function resetForm(message = '', isError = false) {
  document.getElementById('vehicleForm').reset();

  const msg = document.getElementById('vehicleFormMessage');
  if (!msg) return;

  msg.textContent = message;
  msg.className = `form-message ${message ? (isError ? 'error' : 'success') : ''}`;
}

async function loadVehicleListOnly() {
  const result = await safeFetch('/api/admin/vehicles');

  if (!result) {
    vehicles = [];
    renderVehicleTable();
    resetForm('차량 목록을 불러오지 못했습니다.', true);
    return;
  }

  vehicles = result;
  renderVehicleTable();
}

async function loadVehicles() {
  if (!requireAuth({ adminOnly: true })) return;
  initializeLayout('장애인 차량 등록', 'registration', { adminOnly: true });

  const cancelBtn = document.getElementById('vehicleCancelBtn');
  if (cancelBtn) {
    cancelBtn.classList.add('hidden');
  }

  await loadVehicleListOnly();

  document.getElementById('vehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      rfid_uid: document.getElementById('rfid_uid').value.trim(),
      car_number: document.getElementById('car_number').value.trim() || null,
      owner_name: document.getElementById('owner_name').value.trim() || null,
      disabled_person_name: document.getElementById('disabled_person_name').value.trim() || null,
      expire_date: document.getElementById('expire_date').value,
    };

    if (!payload.rfid_uid || !payload.expire_date) {
      resetForm('RFID UID와 만료일은 필수입니다.', true);
      alert('RFID UID와 만료일은 필수입니다.');
      return;
    }

    try {
      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.detail || '등록에 실패했습니다.';
        resetForm(message, true);
        alert(message);
        return;
      }

      await loadVehicleListOnly();
      resetForm('등록이 완료되었습니다.');

    } catch (error) {
      console.error(error);
      resetForm('서버 오류가 발생했습니다.', true);
      alert('서버 오류가 발생했습니다.');
    }
  });
}

document.addEventListener('DOMContentLoaded', loadVehicles);