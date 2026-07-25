const USER_KEY = "mathSprintUser";

function getUsername() {
    return localStorage.getItem(USER_KEY) || "";
}

function setStatus(message, isError = false) {
    const status = document.getElementById("profileStatus");
    status.textContent = message;
    status.style.color = isError ? "#b91c1c" : "#475569";
}

function setProfileData(data) {
    document.getElementById("pBest").textContent = data.bestScore ?? 0;
    document.getElementById("pCorrect").textContent = data.totalCorrect ?? 0;
    document.getElementById("pIncorrect").textContent = data.totalIncorrect ?? 0;
    document.getElementById("pStreak").textContent = data.highestStreak ?? 0;
    document.getElementById("pMedals").textContent = Array.isArray(data.medals) ? data.medals.length : 0;
    document.getElementById("pLevel").textContent = data.level || "Rookie";
}

async function loadProfile(username) {
    if (!username) {
        setStatus("Escribe un nombre de usuario para ver tu progreso.");
        return;
    }

    try {
        const response = await fetch(`/api/progress/${encodeURIComponent(username)}`);
        if (!response.ok) {
            throw new Error("No se pudo cargar el perfil");
        }

        const data = await response.json();
        setProfileData(data);
        setStatus(`Perfil cargado para ${username}`);
    } catch (error) {
        setStatus("Error cargando datos. Asegurate de correr el servidor con npm start.", true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("usernameInput");
    const saveButton = document.getElementById("saveUserBtn");
    const refreshButton = document.getElementById("refreshBtn");

    const current = getUsername();
    if (current) {
        input.value = current;
        loadProfile(current);
    } else {
        setStatus("No hay usuario guardado aun.");
    }

    saveButton.addEventListener("click", () => {
        const username = input.value.trim().slice(0, 24);
        if (!username) {
            setStatus("Escribe un nombre valido.", true);
            return;
        }

        localStorage.setItem(USER_KEY, username);
        setStatus(`Usuario guardado: ${username}`);
        loadProfile(username);
    });

    refreshButton.addEventListener("click", () => {
        const username = input.value.trim();
        loadProfile(username);
    });
});
