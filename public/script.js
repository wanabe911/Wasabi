window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("mainApp").style.display = "block";
        document.getElementById("splash").style.display = "none";
    }, 3100);
});

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const progress = document.getElementById("progress");
const progressText = document.querySelector(".progress-text");
const result = document.getElementById("result");
const history = document.getElementById("history");
const historyList = document.getElementById("historyList");

const API_BASE = "";

const STEPS = [
    "Menganalisis format input...",
    "Mencocokkan prefix database...",
    "Menghubungi NumVerify API...",
    "Menghubungi Abstract API...",
    "Menghubungi Veriphone API...",
    "Memeriksa database laporan...",
    "Menyusun hasil analisis..."
];

async function startTracking() {
    const input = searchInput.value.trim();
    if (!input) return;

    result.classList.add("hidden");
    progress.classList.remove("hidden");
    searchBtn.disabled = true;

    let step = 0;
    const stepInterval = setInterval(() => {
        if (step < STEPS.length) {
            progressText.textContent = STEPS[step];
            step++;
        }
    }, 350);

    try {
        const res = await fetch(`${API_BASE}/api/track`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input })
        });

        const json = await res.json();
        clearInterval(stepInterval);

        if (json.success) {
            displayResult(json.data);
        } else {
            displayError(json.error || "Gagal melacak");
        }
    } catch (err) {
        clearInterval(stepInterval);
        displayError("Jaringan error: " + err.message);
    }

    progress.classList.add("hidden");
    searchBtn.disabled = false;
    progressText.textContent = "Menganalisis input...";
    loadHistory();
}

function displayResult(data) {
    let html = '<div class="result-header"><h2>Hasil Pelacakan</h2>';

    if (data.type === "phone") {
        html += '<span class="result-badge badge-phone">Nomor HP</span>';
    } else {
        html += '<span class="result-badge badge-email">Email</span>';
    }
    html += '</div><div class="result-body">';

    html += `<div class="result-row"><span class="result-label">Input</span><span class="result-value">${escapeHtml(data.input)}</span></div>`;
    html += `<div class="result-row"><span class="result-label">Tipe</span><span class="result-value">${data.type === 'phone' ? 'Nomor Telepon' : 'Email'}</span></div>`;

    if (data.type === "phone") {
        html += `<div class="result-row"><span class="result-label">Format</span><span class="result-value">${data.phone_formatted}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Operator</span><span class="result-value highlight">${data.merged?.operator || data.prefix?.operator || '-'}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Wilayah</span><span class="result-value">${data.merged?.region || data.prefix?.wilayah || '-'}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Tipe Jalur</span><span class="result-value">${data.merged?.line_type || data.prefix?.jenis || '-'}</span></div>`;

        html += '<div class="result-section"><h3>Status API</h3><div class="api-grid">';
        html += apiCard("NumVerify", data.apis?.numverify);
        html += apiCard("Abstract API", data.apis?.abstract);
        html += apiCard("Veriphone", data.apis?.veriphone);
        html += '</div></div>';
    }

    if (data.type === "email") {
        html += `<div class="result-row"><span class="result-label">Domain</span><span class="result-value">${data.email_domain}</span></div>`;
        html += `<div class="result-row"><span class="result-label">Provider</span><span class="result-value highlight">${data.email_provider_name}</span></div>`;
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

    html += '</div>';
    result.innerHTML = html;
    result.classList.remove("hidden");
}

function apiCard(name, apiData) {
    if (apiData) {
        return `<div class="api-card active">
            <div class="api-card-name">${name}</div>
            <div class="api-card-status success">Aktif</div>
        </div>`;
    }
    return `<div class="api-card error">
        <div class="api-card-name">${name}</div>
        <div class="api-card-status fail">Tidak tersedia</div>
    </div>`;
}

function displayError(msg) {
    result.innerHTML = `<div class="result-header"><h2>Error</h2></div>
        <div class="result-body"><p style="color:#c0392b;">${escapeHtml(msg)}</p></div>`;
    result.classList.remove("hidden");
}

async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/api/recent`);
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

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") startTracking();
});

loadHistory();
