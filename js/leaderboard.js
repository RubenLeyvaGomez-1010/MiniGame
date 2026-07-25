async function loadLeaderboard() {
    const tbody = document.getElementById("rankingBody");
    tbody.innerHTML = "";

    try {
        const response = await fetch("/api/leaderboard?limit=20");
        if (!response.ok) {
            throw new Error("No se pudo cargar el ranking");
        }

        const data = await response.json();
        const items = data.items || [];

        if (items.length === 0) {
            const row = document.createElement("tr");
            row.innerHTML = "<td colspan='5'>No hay jugadores todavia.</td>";
            tbody.appendChild(row);
            return;
        }

        items.forEach((player) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${player.rank}</td>
                <td>${player.username}</td>
                <td>${player.bestScore}</td>
                <td>${player.level}</td>
                <td>${player.medals}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan='5'>Error: inicia el backend con npm start.</td>";
        tbody.appendChild(row);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reloadRankingBtn").addEventListener("click", loadLeaderboard);
    loadLeaderboard();
});
