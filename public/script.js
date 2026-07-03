const user = JSON.parse(localStorage.getItem("wasabi_user"));
if (!user) { window.location.href = "/login.html"; }

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById("installBtn").classList.remove("hidden");
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            document.getElementById("installBtn").classList.add("hidden");
            deferredPrompt = null;
        });
    }
}

window.addEventListener("load", () => {
    document.getElementById("userName").textContent = user.name;
    document.getElementById("userCity").textContent = user.city;
    loadIP();
    loadStats();
    loadHistory();
    setTimeout(() => {
        document.getElementById("mainApp").style.display = "block";
        document.getElementById("splash").style.display = "none";
    }, 2500);
});

function logout() {
    localStorage.removeItem("wasabi_user");
    window.location.href = "/login.html";
}

async function loadIP() {
    try {
        const res = await fetch("/api/ip");
        const json = await res.json();
        if (json.success && json.data) {
            const d = json.data;
            document.getElementById("ipInfo").textContent = [d.city, d.region, d.country].filter(Boolean).join(", ") || d.ip;
        }
    } catch {}
}

async function loadStats() {
    try {
        const res = await fetch("/api/recent");
        const json = await res.json();
        if (json.success && json.data) {
            document.getElementById("statTotal").textContent = json.data.length || 0;
            const highRisk = json.data.filter(d => d.risk_level === "TINGGI").length;
            document.getElementById("statHighRisk").textContent = highRisk;
            const today = json.data.filter(d => {
                const dDate = new Date(d.updated_at).toDateString();
                return dDate === new Date().toDateString();
            }).length;
            document.getElementById("statToday").textContent = today;
        }
    } catch {}
}

let currentPhone = "";
const searchInput = document.getElementById("searchInput");
const progress = document.getElementById("progress");
const progressText = document.querySelector(".progress-text");
const result = document.getElementById("result");
const reportForm = document.getElementById("reportForm");
const history = document.getElementById("history");
const historyList = document.getElementById("historyList");
const searchBtn = document.getElementById("searchBtn");
const STEPS = ["Menganalisis format input...", "Mencocokkan prefix database...", "Menghubungi NumVerify API...", "Menghubungi Abstract API...", "Menghubungi Veriphone API...", "Memeriksa database laporan...", "Menyusun hasil analisis..."];

async function startTracking() {
    const input = searchInput.value.trim();
    if (!input) return;
    result.classList.add("hidden"); reportForm.classList.add("hidden");
    progress.classList.remove("hidden"); searchBtn.disabled = true;
    let step = 0;
    const si = setInterval(() => { if (step < STEPS.length) { progressText.textContent = STEPS[step]; step++; } }, 350);
    try {
        const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
        const json = await res.json();
        clearInterval(si);
        if (json.success) { displayResult(json.data); } else { displayError(json.error); }
    } catch (err) { clearInterval(si); displayError("Error: " + err.message); }
    progress.classList.add("hidden"); searchBtn.disabled = false;
    progressText.textContent = "Menganalisis input..."; loadHistory(); loadStats();
}

function displayResult(data) {
    let html = '<div class="result-header"><h2>Hasil Pelacakan</h2>';
    html += data.type === "phone" ? '<span class="result-badge badge-phone">Nomor HP</span>' : '<span class="result-badge badge-email">Email</span>';
    html += '</div><div class="result-body">';
    html += `<div class="result-row"><span class="result-label">Input</span><span class="result-value">${escapeHtml(data.input)}</span></div>`;
    html += `<div class="result-row"><span class="result-label">Tipe</span><span class="result-value">${data.type === 'phone' ? 'Nomor Telepon' : 'Email'}</span></div>`;

    if (data.type === "phone") {
        currentPhone = data.phone_formatted || data.input;
        html += `<div class="result-row"><span class="result-label">Format</span><span class="result-value">${data.phone_formatted}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Operator</span><span class="result-value highlight">${data.merged?.operator || '-'}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Wilayah</span><span class="result-value">${data.merged?.region || '-'}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Negara</span><span class="result-value">${data.merged?.country || 'Indonesia'}</span></div>`;
        if (data.merged?.timezone) html += `<div class="result-row"><span class="result-label">Timezone</span><span class="result-value">${data.merged.timezone}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Tipe Jalur</span><span class="result-value">${data.merged?.line_type || '-'}</span></div>`;
        if (data.merged?.risk_level) html += `<div class="result-row"><span class="result-label">Risk Level</span><span class="result-value highlight">${data.merged.risk_level.toUpperCase()}</span></div>`;
        html += '<div class="result-section"><h3>Status API</h3><div class="api-grid">';
        html += apiCard("NumVerify", data.apis?.numverify);
        html += apiCard("Abstract API", data.apis?.abstract);
        html += apiCard("Veriphone", data.apis?.veriphone);
        html += '</div></div>';
    } else {
        html += `<div class="result-row"><span class="result-label">Domain</span><span class="result-value">${data.email_domain}</span></div>`;
    }

    if (data.tracked) {
        html += '<div class="result-section"><h3>Data Laporan</h3>';
        html += `<div class="result-row"><span class="result-label">Nama</span><span class="result-value highlight">${escapeHtml(data.tracked.name || '-')}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Label</span><span class="result-value">${escapeHtml(Array.isArray(data.tracked.labels) ? data.tracked.labels.join(', ') : '-')}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Lokasi</span><span class="result-value">${escapeHtml(data.tracked.location || '-')}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Laporan</span><span class="result-value highlight">${data.tracked.reports || 0} laporan</span></div>`;
        html += `<div class="result-row"><span class="result-label">Catatan</span><span class="result-value">${escapeHtml(data.tracked.notes || '-')}</span></div>`;
        html += '</div>';
    }

    html += '<button class="copy-btn" onclick="copyResult()">Copy Hasil</button>';
    html += '</div>';
    result.innerHTML = html;
    result.classList.remove("hidden");

    if (data.type === "phone") {
        document.getElementById("reportName").value = data.tracked?.name || "";
        document.getElementById("reportLabels").value = data.tracked?.labels?.join(", ") || "";
        document.getElementById("reportLocation").value = data.tracked?.location || "";
        document.getElementById("reportNotes").value = data.tracked?.notes || "";
        document.getElementById("reportRisk").value = data.tracked?.risk_level || "TINGGI";
        reportForm.classList.remove("hidden");
    }
}

function apiCard(name, apiData) {
    if (apiData) return `<div class="api-card active"><div class="api-card-name">${name}</div><div class="api-card-status success">Aktif</div></div>`;
    return `<div class="api-card error"><div class="api-card-name">${name}</div><div class="api-card-status fail">Tidak tersedia</div></div>`;
}

function displayError(msg) {
    result.innerHTML = `<div class="result-header"><h2>Error</h2></div><div class="result-body"><p style="color:#c0392b;">${escapeHtml(msg)}</p></div>`;
    result.classList.remove("hidden");
}

async function copyResult() {
    const text = Array.from(result.querySelectorAll(".result-row"))
        .map(r => r.querySelector(".result-label").textContent + ": " + r.querySelector(".result-value").textContent)
        .join("\n");
    try {
        await navigator.clipboard.writeText(text);
        alert("Hasil disalin!");
    } catch {
        alert("Gagal menyalin");
    }
}

async function submitReport() {
    const res = await fetch("/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phone: currentPhone,
            name: document.getElementById("reportName").value,
            labels: document.getElementById("reportLabels").value,
            location: document.getElementById("reportLocation").value,
            notes: document.getElementById("reportNotes").value,
            risk_level: document.getElementById("reportRisk").value,
            reporter_name: user.name,
            reporter_city: user.city
        })
    });
    const data = await res.json();
    if (data.success) { alert("Laporan berhasil!"); reportForm.classList.add("hidden"); loadHistory(); loadStats(); }
    else { alert("Gagal mengirim laporan"); }
}

async function loadHistory() {
    try {
        const res = await fetch("/api/recent");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
            history.classList.remove("hidden");
            historyList.innerHTML = json.data.map(item => `
                <div class="history-item" onclick="searchInput.value='${escapeHtml(item.phone || item.email)}'; startTracking();">
                    <span class="history-input">${escapeHtml(item.phone || item.email)}</span>
                    <span class="history-time">${item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : ''}</span>
                </div>
            `).join("");
        }
    } catch {}
}

function exportCSV() {
    fetch("/api/recent").then(r => r.json()).then(json => {
        if (!json.success || !json.data?.length) return alert("Tidak ada data");
        let csv = "Phone,Email,Nama,Label,Lokasi,Laporan,Risk Level,Catatan\n";
        json.data.forEach(d => {
            csv += `${d.phone || ""},${d.email || ""},"${d.name || ""}","${(d.labels || []).join("; ")}","${d.location || ""}",${d.reports || 0},${d.risk_level || ""},"${d.notes || ""}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `wasabi-export-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    });
}

function escapeHtml(str) { if (!str) return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") startTracking(); });
