function renderRoleDashboard() {
    const u = state.user;
    if (!u) return;

    const r = u.role; // 'user', 'member', 'officer', 'admin'
    const studentView = document.getElementById("studentDashboardView");
    const medicView = document.getElementById("medicDashboardView");
    const officerView = document.getElementById("officerDashboardView");

    const badgeHeader = document.getElementById("roleBadgeHeader");
    const roleHeaderBadge = document.getElementById("roleHeaderBadge");
    const roleHeaderTitle = document.getElementById("roleHeaderTitle");
    const roleHeaderAction = document.getElementById("roleHeaderAction");
    const navDashText = document.getElementById("navDashText");

    if (badgeHeader) {
        if (r === "officer" || r === "admin") {
            badgeHeader.textContent = "OFFICER";
            badgeHeader.style.background = "#2563eb";
        } else if (r === "member") {
            badgeHeader.textContent = "MEDIC";
            badgeHeader.style.background = "#059669";
        } else {
            badgeHeader.textContent = "STUDENT";
            badgeHeader.style.background = "#dc2626";
        }
    }

    if (r === "officer" || r === "admin") {
        if (studentView) studentView.style.display = "none";
        if (medicView) medicView.style.display = "none";
        if (officerView) officerView.style.display = "block";

        if (roleHeaderBadge) {
            roleHeaderBadge.textContent = "DISPATCH CONTROL CENTER";
            roleHeaderBadge.style.background = "#dbeafe";
            roleHeaderBadge.style.color = "#1e40af";
        }
        if (roleHeaderTitle) roleHeaderTitle.textContent = "CPR Officer & Dispatch Command";
        if (navDashText) navDashText.textContent = "Dispatch Hub";
        if (roleHeaderAction) roleHeaderAction.innerHTML = `<button class="primary-button btn-sm" onclick="showSection('roster')">🛡️ Manage Roster</button>`;

    } else if (r === "member") {
        if (studentView) studentView.style.display = "none";
        if (officerView) officerView.style.display = "none";
        if (medicView) medicView.style.display = "block";

        if (roleHeaderBadge) {
            roleHeaderBadge.textContent = "CPR MEDIC RESPONDER VIEW";
            roleHeaderBadge.style.background = "#d1fae5";
            roleHeaderBadge.style.color = "#065f46";
        }
        if (roleHeaderTitle) roleHeaderTitle.textContent = "Active Responder Dispatch Queue";
        if (navDashText) navDashText.textContent = "Responder Hub";
        if (roleHeaderAction) roleHeaderAction.innerHTML = `<button class="primary-button btn-sm" onclick="showSection('emergency')">🚨 Send Alert</button>`;

    } else {
        if (medicView) medicView.style.display = "none";
        if (officerView) officerView.style.display = "none";
        if (studentView) studentView.style.display = "block";

        if (roleHeaderBadge) {
            roleHeaderBadge.textContent = "STUDENT EMERGENCY HUB";
            roleHeaderBadge.style.background = "#fef3c7";
            roleHeaderBadge.style.color = "#92400e";
        }
        if (roleHeaderTitle) roleHeaderTitle.textContent = "Student Safety & Emergency Assistance";
        if (navDashText) navDashText.textContent = "Student Hub";
        if (roleHeaderAction) roleHeaderAction.innerHTML = `<button class="primary-button btn-sm btn-red" onclick="showSection('emergency')">🚨 Request Help</button>`;
    }
}

async function toggleSelfDuty() {
    if (!state.user) return;
    try {
        await api("roster.php?action=toggle_duty", { method: "POST", body: { student_id: state.user.studentId } });
        toast("Duty status updated.", "success");
        await pollTick();
    } catch (err) {
        toast(err.message, "error");
    }
}

/* =====================================================================
   PRIORITY-BASED SYNTHESIZED EMERGENCY ALARMS
   ===================================================================== */
function playEmergencyAlarm(priority = "RED") {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const ctx = audioCtx;

        if (priority === "RED") {
            let pulseCount = 0;
            const sirenInterval = setInterval(() => {
                if (pulseCount >= 6) {
                    clearInterval(sirenInterval);
                    return;
                }
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(pulseCount % 2 === 0 ? 880 : 660, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.18);
                pulseCount++;
            }, 200);

        } else if (priority === "YELLOW") {
            [0, 0.25].forEach(delay => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.15);
            });

        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.warn("Audio alarm blocked or unsupported:", e);
    }
}

const API_BASE = ".";
const POLL_MS = 5000;
const ID_REGEX = /^2\d-\d{4}-\d{3}$/;

const LS = {
    sidebar: "lifelineSidebarCollapsed",
    section: "lifelineActiveSection",
    alerts: "lifelineAlertsEnabled"
};

const STATUS_LABEL = { DISPATCHED: "Dispatched", RESPONDING: "Responding", ON_SCENE: "On-scene", RESOLVED: "Resolved" };
const STATUS_CLASS = { DISPATCHED: "dispatched", RESPONDING: "responding", ON_SCENE: "onscene", RESOLVED: "resolved" };
const NEXT_STATUS = { DISPATCHED: "RESPONDING", RESPONDING: "ON_SCENE", ON_SCENE: "RESOLVED" };

const state = {
    user: null,
    meta: { buildings: [], squads: [], zones: [], types: [] },
    active: [],
    mine: [],
    recent: [],
    roster: [],
    announcements: [],
    training: { sessions: [], mine: [] },
    stats: null,
    charts: {}
};

let redirecting = false;
function goToLogin() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("index.html");
}

async function api(path, opts = {}) {
    const { method = "GET", body } = opts;
    const headers = { "X-Requested-With": "lifeline" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res;
    try {
        res = await fetch(`${API_BASE}/${path}`, {
            method,
            headers,
            credentials: "same-origin",
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch (e) {
        const err = new Error("Cannot reach the server. Check your connection.");
        err.network = true;
        throw err;
    }

    let data = null;
    const rawText = await res.text();
    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
        console.error("Non-JSON response from server:", rawText);
    }

    if (!res.ok) {
        const err = new Error((data && data.error) || `Request failed (${res.status})`);
        err.status = res.status;
        err.code = data && data.code;
        if (res.status === 401 && document.getElementById("dashboard")) goToLogin();
        throw err;
    }
    if (!data) {
        throw new Error("Server returned an empty or invalid response. Check PHP/database logs.");
    }
    return data;
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function timeAgo(ts) {
    if (!ts) return "—";
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    return new Date(ts).toLocaleDateString();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function role() { return state.user ? state.user.role : "user"; }
function isOfficer() { return role() === "officer" || role() === "admin"; }
function isResponder() { return ["member", "officer", "admin"].includes(role()); }

function toast(message, type = "info", duration = 4000) {
    let box = document.getElementById("toastContainer");
    if (!box) {
        box = document.createElement("div");
        box.id = "toastContainer";
        box.setAttribute("aria-live", "polite");
        document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => {
        t.classList.add("hide");
        setTimeout(() => t.remove(), 300);
    }, duration);
}

function fillSelect(select, items, placeholder) {
    if (!select) return;
    const prev = select.value;
    select.innerHTML = "";
    if (placeholder !== undefined) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = placeholder;
        select.appendChild(o);
    }
    items.forEach(it => {
        const o = document.createElement("option");
        o.value = it.id;
        o.textContent = it.name;
        select.appendChild(o);
    });
    if (prev && [...select.options].some(o => o.value === prev)) select.value = prev;
}

function toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("profileDropdownMenu");
    if (menu) menu.classList.toggle("show");
}

function closeProfileDropdown() {
    const menu = document.getElementById("profileDropdownMenu");
    if (menu) menu.classList.remove("show");
}

document.addEventListener("click", function (event) {
    const container = document.getElementById("userProfileMenuContainer");
    if (container && !container.contains(event.target)) closeProfileDropdown();
});

function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById("loginTabBtn");
    const registerTabBtn = document.getElementById("registerTabBtn");
    const loginContainer = document.getElementById("loginFormContainer");
    const registerContainer = document.getElementById("registerFormContainer");

    if (tab === "register") {
        if (loginTabBtn) loginTabBtn.classList.remove("active");
        if (registerTabBtn) registerTabBtn.classList.add("active");
        if (loginContainer) loginContainer.style.display = "none";
        if (registerContainer) registerContainer.style.display = "block";
    } else {
        if (registerTabBtn) registerTabBtn.classList.remove("active");
        if (loginTabBtn) loginTabBtn.classList.add("active");
        if (registerContainer) registerContainer.style.display = "none";
        if (loginContainer) loginContainer.style.display = "block";
    }
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const studentId = document.getElementById("studentId").value.trim();
        const password = document.getElementById("password").value;
        const btn = loginForm.querySelector("button[type=submit]");

        if (!ID_REGEX.test(studentId)) {
            toast("Invalid Student ID format. Use 2X-XXXX-XXX (e.g. 23-1234-567).", "error");
            return;
        }

        btn.disabled = true;
        try {
            await api("auth.php?action=login", { method: "POST", body: { student_id: studentId, password } });
            localStorage.setItem(LS.section, "dashboard");
            window.location.href = "dashboard.html";
        } catch (err) {
            if (err.code === "not_registered" || err.code === "needs_activation") {
                toast(err.message, "error", 6000);
                switchAuthTab("register");
                const reg = document.getElementById("regStudentId");
                if (reg) reg.value = studentId;
            } else {
                toast(err.message, "error");
            }
        } finally {
            btn.disabled = false;
        }
    });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const btn = registerForm.querySelector("button[type=submit]");

        const payload = {
            full_name: document.getElementById("regFullName").value.trim(),
            student_id: document.getElementById("regStudentId").value.trim(),
            role: document.getElementById("regRole") ? document.getElementById("regRole").value : "user",
            course: document.getElementById("regCourse").value.trim(),
            password: document.getElementById("regPassword").value,
            activation_code: (document.getElementById("regActivationCode")?.value || "").trim()
        };

        if (!ID_REGEX.test(payload.student_id)) {
            toast("Invalid Student ID format. Use 2X-XXXX-XXX (e.g. 23-1234-567).", "error");
            return;
        }
        if (payload.password.length < 6) {
            toast("Password must be at least 6 characters.", "error");
            return;
        }

        btn.disabled = true;
        try {
            const res = await api("auth.php?action=register", { method: "POST", body: payload });
            toast(res.activated
                ? `Welcome, ${res.name}! Your account is activated. Please sign in.`
                : `Account created for ${res.name}. Please sign in.`, "success", 6000);
            registerForm.reset();
            const loginId = document.getElementById("studentId");
            if (loginId) loginId.value = payload.student_id;
            switchAuthTab("login");
        } catch (err) {
            if (err.code === "already_registered") {
                toast(err.message, "error");
                switchAuthTab("login");
                const loginId = document.getElementById("studentId");
                if (loginId) loginId.value = payload.student_id;
            } else {
                toast(err.message, "error", 6000);
            }
        } finally {
            btn.disabled = false;
        }
    });
}

async function logout() {
    try { await api("auth.php?action=logout", { method: "POST" }); } catch (e) { /* ignore */ }
    localStorage.removeItem(LS.section);
    goToLogin();
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById("appSidebar");
    if (sidebar) {
        sidebar.classList.toggle("collapsed");
        localStorage.setItem(LS.sidebar, sidebar.classList.contains("collapsed"));
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

function showSection(sectionId, isInitialLoad = false) {
    if (!sectionId) return;
    if (sectionId === "roster" && !isOfficer()) sectionId = "dashboard";
    if (!document.getElementById(sectionId)) sectionId = "dashboard";

    localStorage.setItem(LS.section, sectionId);

    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active-section"));
    document.getElementById(sectionId).classList.add("active-section");
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.section === sectionId);
    });

    const titleMap = {
        emergency: "Emergency Alert & Dispatch Hub",
        roster: "CPR Team & Volunteer Management",
        announcements: "Announcement Board",
        training: "Training & Seminar Hub",
        analytics: "Patient Analytics & Statistics",
        profile: "My Profile"
    };
    const subtitleMap = {
        dashboard: "Campus safety overview and emergency response dispatch hub.",
        emergency: "Send emergency dispatches or respond to active campus medical calls.",
        roster: "Manage volunteer medic deployment, team assignments, and shift rosters.",
        announcements: "Important university health and safety announcements.",
        training: "CPR certification, first aid workshops, and refresher courses.",
        analytics: "Anonymized campus health and emergency statistics.",
        profile: "View and manage your personal student information."
    };

    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
        if (sectionId === "dashboard") {
            titleEl.textContent = "Welcome back, ";
            const span = document.createElement("span");
            span.id = "welcomeUserName";
            span.textContent = state.user ? state.user.name : "User";
            titleEl.appendChild(span);
            titleEl.appendChild(document.createTextNode("!"));
        } else {
            titleEl.textContent = titleMap[sectionId] || "Lifeline";
        }
    }
    setText("pageSubtitle", subtitleMap[sectionId] || "");

    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("open");
    if (!isInitialLoad) window.scrollTo({ top: 0, behavior: "smooth" });

    if (sectionId === "analytics") loadAnalytics();
    if (sectionId === "training") loadTraining();
}

let audioCtx = null;
const knownIncidentIds = new Set();
let firstPollDone = false;

function unlockAudio() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* audio not supported */ }
}

function enableAlerts() {
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    localStorage.setItem(LS.alerts, "true");
    updateAlertsButton();
    beep(false);
    toast("Sound & desktop notifications enabled.", "success");
}

function updateAlertsButton() {
    const btn = document.getElementById("enableAlertsBtn");
    if (!btn) return;
    const on = localStorage.getItem(LS.alerts) === "true" && audioCtx;
    btn.style.display = on ? "none" : "inline-block";
}

function beep(urgent) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = urgent ? 880 : 660;
        gain.gain.value = 0.07;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (urgent ? 0.7 : 0.3));
    } catch (e) { /* ignore */ }
}

function notifyNewIncidents(active) {
    const fresh = active.filter(i => !knownIncidentIds.has(i.id));
    active.forEach(i => knownIncidentIds.add(i.id));
    if (!firstPollDone || !isResponder()) return;

    fresh
        .filter(i => i.status === "DISPATCHED" && i.reporterId !== state.user.studentId)
        .forEach(i => {
            toast(`🚨 ${i.priority} alert: ${i.building} – ${i.room}`, "error", 8000);
            playEmergencyAlarm(i.priority);
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Lifeline ${i.priority} emergency`, {
                    body: `${i.building} – ${i.room} • ${i.patients} patient(s)`
                });
            }
        });
}

function updateRoomDropdown() {
    const buildingSelect = document.getElementById("building");
    const roomSelect = document.getElementById("room");
    if (!buildingSelect || !roomSelect) return;

    roomSelect.innerHTML = '<option value="">Select Room / Area</option>';
    const b = state.meta.buildings.find(x => String(x.id) === buildingSelect.value);
    (b ? b.rooms : []).forEach(room => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });
}

const emergencyForm = document.getElementById("emergencyForm");
if (emergencyForm) {
    emergencyForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const priority = document.querySelector('input[name="priority"]:checked');
        const buildingSel = document.getElementById("building");
        const roomSel = document.getElementById("room");
        const patients = parseInt(document.getElementById("patients").value, 10) || 1;
        const others = document.getElementById("others").value.trim();
        const typeId = document.getElementById("incidentType").value;

        if (!priority) { toast("Please select the emergency priority.", "error"); return; }
        if (!buildingSel.value || !roomSel.value) { toast("Please select the building and room.", "error"); return; }

        const buildingName = buildingSel.options[buildingSel.selectedIndex].text;
        const roomName = roomSel.options[roomSel.selectedIndex].text;

        if (!confirm(`Send a ${priority.value} emergency alert for ${buildingName} – ${roomName}?\n\nFalse alarms delay help for real emergencies.`)) return;

        const btn = emergencyForm.querySelector(".dispatch-button");
        btn.disabled = true;
        try {
            const { incident } = await api("incidents.php?action=create", {
                method: "POST",
                body: {
                    priority: priority.value,
                    building_id: Number(buildingSel.value),
                    room_id: Number(roomSel.value),
                    patients,
                    incident_type_id: typeId || null,
                    details: others
                }
            });
            knownIncidentIds.add(incident.id);

            setText("alertMessage",
                `${incident.priority} priority emergency reported at ${incident.building} (${incident.room}). Patients: ${incident.patients}. ` +
                `Reference ID: ${incident.id}. Available CPR responders have been notified.`);
            playEmergencyAlarm(priority.value);
            document.getElementById("alertModal").classList.add("show");

            emergencyForm.reset();
            updateRoomDropdown();
            pollTick();
        } catch (err) {
            toast(err.message, err.code === "duplicate" ? "info" : "error", 6000);
        } finally {
            btn.disabled = false;
        }
    });
}

function canAdvance(inc) {
    if (!isResponder() || inc.status === "RESOLVED") return false;
    if (inc.status === "DISPATCHED") return true;
    return isOfficer() || inc.responderId === state.user.studentId;
}

function renderDispatchAlerts() {
    const container = document.getElementById("responderDispatchQueue");
    const list = document.getElementById("dispatchAlertsList");
    if (!container || !list) return;

    if (!isResponder()) {
        container.style.display = "none";
        return;
    }
    container.style.display = "block";

    const active = state.active;
    setText("activeAlertCount", `● ${active.length} Active Alert${active.length === 1 ? "" : "s"}`);

    if (active.length === 0) {
        list.innerHTML = `<p class="empty-note">No active emergency dispatches requiring response.</p>`;
        return;
    }

    list.innerHTML = active.map(inc => {
        let action;
        if (canAdvance(inc)) {
            const next = NEXT_STATUS[inc.status];
            const label = { RESPONDING: "Accept & Respond", ON_SCENE: "Mark Arrived On-Scene", RESOLVED: "Mark Resolved" }[next];
            const cls = { RESPONDING: "", ON_SCENE: "btn-yellow", RESOLVED: "btn-green" }[next];
            action = `<button class="primary-button btn-sm ${cls}" onclick="respondToDispatch('${esc(inc.id)}', '${next}', this)">${label}</button>`;
        } else {
            action = `<span class="handled-note">Handled by ${esc(inc.responderName || "another responder")}</span>`;
        }
        const pr = esc(String(inc.priority).toLowerCase());
        return `
        <div class="card dispatch-card ${pr}-card">
            <div class="dispatch-card-top">
                <strong>${esc(inc.id)} • ${esc(inc.reporterName)} (${esc(inc.reporterId)})</strong>
                <span class="priority ${pr}-priority">${esc(inc.priority)}</span>
            </div>
            <p class="dispatch-loc">📍 ${esc(inc.building)} - ${esc(inc.room)}</p>
            <p class="dispatch-meta">${inc.typeName ? esc(inc.typeName) + " | " : ""}Patients: ${esc(inc.patients)} | ${esc(inc.details)}</p>
            <p class="dispatch-meta">Reported ${esc(timeAgo(inc.createdAt))}</p>
            <p class="dispatch-status-line">Status: <span class="status ${STATUS_CLASS[inc.status] || "responding"}">${esc(STATUS_LABEL[inc.status] || inc.status)}</span>
                ${inc.responderName ? `(Medic: ${esc(inc.responderName)})` : ""}</p>
            <div class="dispatch-actions">${action}</div>
        </div>`;
    }).join("");
}

async function respondToDispatch(id, newStatus, btn) {
    if (btn) btn.disabled = true;
    try {
        await api("incidents.php?action=advance", { method: "POST", body: { id, status: newStatus } });
        toast(`Incident ${id} is now ${STATUS_LABEL[newStatus]}.`, "success");
    } catch (err) {
        toast(err.message, "error", 6000);
    }
    await pollTick();
}

function renderMyRequests() {
    const card = document.getElementById("myRequestsCard");
    const list = document.getElementById("myRequestsList");
    if (!card || !list) return;

    const mine = state.mine;
    if (mine.length === 0) {
        card.style.display = "none";
        return;
    }
    card.style.display = "block";

    const steps = ["DISPATCHED", "RESPONDING", "ON_SCENE", "RESOLVED"];
    const labels = ["Reported", "Responding", "On-scene", "Resolved"];

    list.innerHTML = mine.map(inc => {
        const idx = steps.indexOf(inc.status);
        const stepper = steps.map((s, i) =>
            `<div class="dispatch-step ${i <= idx ? "active" : ""}"><span>${i + 1}</span><p>${labels[i]}</p></div>` +
            (i < steps.length - 1 ? `<div class="dispatch-line ${i < idx ? "done" : ""}"></div>` : "")
        ).join("");
        const who = inc.responderName ? ` • Medic: ${esc(inc.responderName)}` : " • Waiting for a responder…";
        const pr = esc(String(inc.priority).toLowerCase());
        return `
        <div class="my-request">
            <div class="my-request-head">
                <strong>${esc(inc.id)}</strong>
                <span class="priority ${pr}-priority">${esc(inc.priority)}</span>
            </div>
            <p class="dispatch-meta">${esc(inc.building)} - ${esc(inc.room)} • ${esc(timeAgo(inc.createdAt))}${inc.status === "RESOLVED" ? "" : who}</p>
            <div class="dispatch-status">${stepper}</div>
        </div>`;
    }).join("");
}

async function startDashboard() {
    if (localStorage.getItem(LS.sidebar) === "true") {
        const sidebar = document.getElementById("appSidebar");
        if (sidebar) sidebar.classList.add("collapsed");
    }

    let me;
    try {
        me = await api("auth.php?action=me");
    } catch (err) {
        if (err.status === 401) {
            goToLogin();
            return;
        }
        toast(err.message, "error", 8000);
        return;
    }

    // Bulletproof guard against unauthenticated or null user sessions
    if (!me || !me.user) {
        goToLogin();
        return;
    }

    state.user = me.user;
    renderProfile(); 
    renderRoleDashboard();

    try {
        state.meta = await api("meta.php");
    } catch (err) {
        toast("Could not load campus data: " + err.message, "error", 8000);
    }

    fillSelect(document.getElementById("building"), state.meta.buildings, "Select Building");
    fillSelect(document.getElementById("incidentType"), state.meta.types, "Not sure / Other");
    fillSelect(document.getElementById("newMemberTeam"), state.meta.squads);
    fillSelect(document.getElementById("newMemberZone"), state.meta.zones);
    updateRoomDropdown();
    renderSquadOverview();

    await pollTick();

    if (localStorage.getItem(LS.alerts) === "true") {
        document.addEventListener("click", function once() {
            unlockAudio();
            updateAlertsButton();
            document.removeEventListener("click", once);
        });
    }
    updateAlertsButton();

    showSection(localStorage.getItem(LS.section) || "dashboard", true);
    setInterval(pollTick, POLL_MS);
}

function initApp() {
    if (document.getElementById("dashboard")) startDashboard();
    else {
        try {
            api("auth.php?action=me").then(me => {
                if (me && me.user) window.location.replace("dashboard.html");
            }).catch(() => {});
        } catch (e) {}
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
