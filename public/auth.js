const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginCard = document.querySelector(".auth-card");
const registerCard = document.getElementById("registerCard");

function toggleForm() {
    loginCard.classList.toggle("hidden");
    registerCard.classList.toggle("hidden");
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
        localStorage.setItem("wasabi_user", JSON.stringify(data.user));
        window.location.href = "/index.html";
    } else {
        alert(data.error);
    }
});

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value;
    const city = document.getElementById("regCity").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    const res = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, city })
    });
    const data = await res.json();
    if (data.success) {
        alert("Pendaftaran berhasil! Silakan login.");
        toggleForm();
    } else {
        alert(data.error);
    }
});
