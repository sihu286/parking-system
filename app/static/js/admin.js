function logout() {
    localStorage.removeItem("loginUser");
    window.location.href = "/";
}

function goMonitor() {
    window.location.href = "/monitor";
}

function updateClock() {
    const clockBox = document.getElementById("clockBox");
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    clockBox.textContent = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function createSlotBox(slot) {
    const div = document.createElement("div");
    div.classList.add("slot-box");

    if (slot.status === "빈자리") {
        div.classList.add("slot-empty");
    } else if (slot.status === "점유") {
        div.classList.add("slot-occupied");
    } else {
        div.classList.add("slot-abnormal");
    }

    div.textContent = slot.label;
    return div;
}

function setProgress(barId, percent) {
    document.getElementById(barId).style.width = `${percent}%`;
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function calculateZoneStats(slots) {
    const total = slots.length;
    const used = slots.filter(slot => slot.status !== "빈자리").length;
    const percent = total === 0 ? 0 : Math.round((used / total) * 100);
    return { total, used, percent };
}

function renderZone(containerId, slots) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    slots.forEach(slot => container.appendChild(createSlotBox(slot)));
}

function renderEvents(events) {
    const tbody = document.getElementById("eventTableBody");
    tbody.innerHTML = "";

    events.forEach(event => {
        const tr = document.createElement("tr");

        let eventClass = "event-rfid";
        if (event.type === "24시간 장기체류") eventClass = "event-long";
        if (event.type === "기간 만료") eventClass = "event-expire";

        let statusClass = "status-pending";
        if (event.status === "처리중") statusClass = "status-processing";

        tr.innerHTML = `
            <td>${event.time}</td>
            <td>${event.location}</td>
            <td>${event.car_number}</td>
            <td><span class="event-badge ${eventClass}">${event.type}</span></td>
            <td><span class="status-badge ${statusClass}">${event.status}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

function updateDonut(total, occupied, empty) {
    const donut = document.getElementById("donutChart");
    const occupiedDeg = total === 0 ? 0 : Math.round((occupied / total) * 360);
    donut.style.background = `conic-gradient(#ef4444 0deg, #ef4444 ${occupiedDeg}deg, #10b981 ${occupiedDeg}deg, #10b981 360deg)`;

    setText("occupiedCount", `${occupied}칸`);
    setText("emptyCount", `${empty}칸`);
    setText("availableCount", empty);
    setText("donutTotal", total);
    setText("totalSlotCount", total);
}

async function loadDashboard() {
    // 실제 DB API 연결 전까지는 화면용 샘플 데이터 사용
    const eastSlots = [
        { label: "01", status: "점유" }, { label: "02", status: "빈자리" },
        { label: "03", status: "빈자리" }, { label: "04", status: "점유" },
        { label: "05", status: "빈자리" }, { label: "06", status: "빈자리" },
        { label: "07", status: "점유" }, { label: "08", status: "빈자리" }
    ];

    const westSlots = [
        { label: "01", status: "점유" }, { label: "02", status: "빈자리" },
        { label: "03", status: "빈자리" }, { label: "04", status: "점유" },
        { label: "05", status: "빈자리" }, { label: "06", status: "빈자리" },
        { label: "07", status: "점유" }, { label: "08", status: "빈자리" }
    ];

    const southSlots = [
        { label: "01", status: "점유" }, { label: "02", status: "빈자리" },
        { label: "03", status: "빈자리" }, { label: "04", status: "점유" },
        { label: "05", status: "빈자리" }, { label: "06", status: "빈자리" },
        { label: "07", status: "점유" }, { label: "08", status: "빈자리" }
    ];

    const disabledSlots = [
        { label: "01", status: "점유" }, { label: "02", status: "빈자리" },
        { label: "03", status: "빈자리" }, { label: "04", status: "점유" },
        { label: "05", status: "빈자리" }, { label: "06", status: "빈자리" }
    ];

    const events = [
        { time: "2026-04-01 14:23:15", location: "D-02", car_number: "90마5678", type: "RFID 미인식", status: "미처리" },
        { time: "2026-04-01 13:45:22", location: "B-05", car_number: "78라1234", type: "24시간 장기체류", status: "처리중" },
        { time: "2026-03-30 10:15:20", location: "B-01", car_number: "55하8899", type: "기간 만료", status: "미처리" },
        { time: "2026-04-01 10:10:30", location: "D-06", car_number: "99호1122", type: "RFID 미인식", status: "미처리" },
        { time: "2026-03-31 14:20:15", location: "A-01", car_number: "22사4455", type: "24시간 장기체류", status: "처리중" }
    ];

    renderZone("eastSlots", eastSlots);
    renderZone("westSlots", westSlots);
    renderZone("southSlots", southSlots);
    renderZone("disabledSlots", disabledSlots);

    const east = calculateZoneStats(eastSlots);
    const west = calculateZoneStats(westSlots);
    const south = calculateZoneStats(southSlots);
    const disabled = calculateZoneStats(disabledSlots);

    setText("eastUsed", east.used);
    setText("eastTotal", east.total);
    setText("eastPercent", `${east.percent}%`);
    setProgress("eastBar", east.percent);

    setText("westUsed", west.used);
    setText("westTotal", west.total);
    setText("westPercent", `${west.percent}%`);
    setProgress("westBar", west.percent);

    setText("southUsed", south.used);
    setText("southTotal", south.total);
    setText("southPercent", `${south.percent}%`);
    setProgress("southBar", south.percent);

    setText("disabledUsed", disabled.used);
    setText("disabledTotal", disabled.total);
    setText("disabledPercent", `${disabled.percent}%`);
    setProgress("disabledBar", disabled.percent);

    setText("eastMiniUsed", east.used);
    setText("eastMiniTotal", east.total);
    setText("eastMiniPercent", `${east.percent}%`);
    setProgress("eastMiniBar", east.percent);

    setText("westMiniUsed", west.used);
    setText("westMiniTotal", west.total);
    setText("westMiniPercent", `${west.percent}%`);
    setProgress("westMiniBar", west.percent);

    setText("southMiniUsed", south.used);
    setText("southMiniTotal", south.total);
    setText("southMiniPercent", `${south.percent}%`);
    setProgress("southMiniBar", south.percent);

    setText("disabledMiniUsed", disabled.used);
    setText("disabledMiniTotal", disabled.total);
    setText("disabledMiniPercent", `${disabled.percent}%`);
    setProgress("disabledMiniBar", disabled.percent);

    const total = east.total + west.total + south.total + disabled.total;
    const occupied = east.used + west.used + south.used + disabled.used;
    const empty = total - occupied;

    updateDonut(total, occupied, empty);
    renderEvents(events);
}

const user = JSON.parse(localStorage.getItem("loginUser"));
if (!user) {
    alert("로그인이 필요합니다.");
    window.location.href = "/";
}

updateClock();
setInterval(updateClock, 1000);
loadDashboard();