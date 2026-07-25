const THEME_KEY = "mathGameTheme";

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
        return stored;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
    document.body.classList.toggle("dark-theme", theme === "dark");

    const button = document.getElementById("themeToggleSite");
    if (!button) {
        return;
    }

    const isDark = theme === "dark";
    button.textContent = isDark ? "Modo claro" : "Modo oscuro";
    button.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
}

document.addEventListener("DOMContentLoaded", () => {
    let theme = getPreferredTheme();
    applyTheme(theme);

    const button = document.getElementById("themeToggleSite");
    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        theme = theme === "dark" ? "light" : "dark";
        localStorage.setItem(THEME_KEY, theme);
        applyTheme(theme);
    });
});
