const USER_KEY = "mathSprintUser";

class MathGame {
    constructor() {
        this.score = 0;
        this.correct = 0;
        this.incorrect = 0;
        this.streak = 0;
        this.attempts = 0;

        this.difficulty = "easy";
        this.currentQuestion = "";
        this.correctAnswer = null;

        this.totalQuestionsTarget = 20;
        this.timePerQuestion = 12;
        this.timeLeft = this.timePerQuestion;
        this.timerId = null;
        this.isQuestionActive = false;

        this.bestScore = this.getStoredBestScore();
        this.soundEnabled = this.getStoredSoundEnabled();
        this.audioContext = null;

        this.medalDefinitions = [
            { id: "first-correct", title: "Primer acierto", hint: "Responde bien 1 vez", icon: "M1" },
            { id: "streak-5", title: "Racha 5", hint: "Consigue 5 aciertos seguidos", icon: "R5" },
            { id: "speedster", title: "Velocista", hint: "Responde con mas del 70% del tiempo", icon: "SPD" },
            { id: "perfect-round", title: "Perfecto", hint: "Termina una ronda con 100%", icon: "MAX" }
        ];
        this.unlockedMedals = new Set(this.getStoredMedals());
        this.username = this.getStoredUsername();
        this.gamesPlayed = 0;

        this.theme = this.getStoredTheme();

        this.applyTheme();
        this.initEventListeners();
        this.renderMedals();
        this.updatePlayerLevel();
        this.updateBestScoreUI();
        this.updateCurrentUserUI();
        this.updateMascot(":)", "Vamos, tu puedes con esto.", "");
        this.loadServerProgress();
        this.generateQuestion();
    }

    initEventListeners() {
        document.getElementById("submitBtn").addEventListener("click", () => this.submitAnswer());
        document.getElementById("skipBtn").addEventListener("click", () => this.skipQuestion());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetGame());
        document.getElementById("themeToggle").addEventListener("click", () => this.toggleTheme());
        document.getElementById("soundToggle").addEventListener("click", () => this.toggleSound());

        document.getElementById("answer").addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                this.submitAnswer();
            }
        });

        document.querySelectorAll(".difficulty-btn").forEach((button) => {
            button.addEventListener("click", (event) => {
                document.querySelectorAll(".difficulty-btn").forEach((btn) => {
                    btn.classList.remove("active");
                });

                event.target.classList.add("active");
                this.difficulty = event.target.dataset.difficulty;
                this.syncDifficultySettings();
                this.generateQuestion();
            });
        });

        this.updateThemeButtonText();
        this.updateSoundButtonText();
    }

    getStoredBestScore() {
        const stored = localStorage.getItem("mathGameBestScore");
        const parsed = Number(stored);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    saveBestScore() {
        localStorage.setItem("mathGameBestScore", String(this.bestScore));
    }

    getStoredUsername() {
        const stored = localStorage.getItem(USER_KEY);
        if (stored && stored.trim()) {
            return stored.trim().slice(0, 24);
        }

        const guest = `Invitado-${Math.floor(Math.random() * 9000) + 1000}`;
        localStorage.setItem(USER_KEY, guest);
        return guest;
    }

    updateCurrentUserUI() {
        const chip = document.getElementById("currentUser");
        if (!chip) {
            return;
        }

        chip.textContent = `Jugador: ${this.username}`;
    }

    async loadServerProgress() {
        try {
            const response = await fetch(`/api/progress/${encodeURIComponent(this.username)}`);
            if (!response.ok) {
                return;
            }

            const profile = await response.json();
            this.bestScore = Math.max(this.bestScore, Number(profile.bestScore) || 0);
            this.gamesPlayed = Number(profile.gamesPlayed) || 0;

            if (Array.isArray(profile.medals)) {
                this.unlockedMedals = new Set(profile.medals);
            }

            this.renderMedals();
            this.updatePlayerLevel();
            this.updateBestScoreUI();
        } catch (_error) {
            // Si no hay servidor corriendo, el juego sigue funcionando localmente.
        }
    }

    async saveProgressToServer() {
        const level = this.getCurrentLevelName();

        const payload = {
            username: this.username,
            score: this.score,
            bestScore: this.bestScore,
            correct: this.correct,
            incorrect: this.incorrect,
            streak: this.streak,
            highestStreak: this.streak,
            totalCorrect: this.correct,
            totalIncorrect: this.incorrect,
            gamesPlayed: Math.max(1, this.gamesPlayed),
            medals: Array.from(this.unlockedMedals),
            level
        };

        try {
            await fetch("/api/progress", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch (_error) {
            // Si falla la red, evitamos romper el flujo del juego.
        }
    }

    getStoredSoundEnabled() {
        const soundPreference = localStorage.getItem("mathGameSound");
        if (soundPreference === "off") {
            return false;
        }
        if (soundPreference === "on") {
            return true;
        }
        return true;
    }

    saveSoundPreference() {
        localStorage.setItem("mathGameSound", this.soundEnabled ? "on" : "off");
    }

    getStoredMedals() {
        const raw = localStorage.getItem("mathGameMedals");
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            return [];
        }

        return [];
    }

    saveMedals() {
        localStorage.setItem("mathGameMedals", JSON.stringify(Array.from(this.unlockedMedals)));
    }

    renderMedals() {
        const grid = document.getElementById("medalsGrid");
        if (!grid) {
            return;
        }

        grid.innerHTML = "";
        this.medalDefinitions.forEach((medal) => {
            const isUnlocked = this.unlockedMedals.has(medal.id);
            const item = document.createElement("div");
            item.className = `medal-badge ${isUnlocked ? "unlocked" : "locked"}`;
            item.innerHTML = `
                <div class="medal-icon">${medal.icon}</div>
                <div class="medal-copy">
                    ${medal.title}
                    <span>${medal.hint}</span>
                </div>
            `;
            grid.appendChild(item);
        });
    }

    getCurrentLevelName() {
        const total = this.medalDefinitions.length;
        const unlocked = this.unlockedMedals.size;

        if (unlocked >= total) {
            return "Legend";
        }
        if (unlocked >= 3) {
            return "Pro";
        }
        if (unlocked >= 2) {
            return "Hero";
        }
        if (unlocked >= 1) {
            return "Explorer";
        }
        return "Rookie";
    }

    updatePlayerLevel() {
        const levelEl = document.getElementById("playerLevel");
        if (!levelEl) {
            return;
        }

        const level = this.getCurrentLevelName();

        levelEl.textContent = `Nivel: ${level}`;
    }

    launchConfetti() {
        const layer = document.getElementById("confettiLayer");
        if (!layer) {
            return;
        }

        const colors = ["#ff7a18", "#ffb347", "#5eead4", "#2b6cb0", "#f87171"];
        const pieces = 34;

        for (let index = 0; index < pieces; index += 1) {
            const piece = document.createElement("span");
            piece.className = "confetti-piece";
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 0.35}s`;
            piece.style.transform = `rotate(${Math.floor(Math.random() * 320)}deg)`;
            layer.appendChild(piece);

            setTimeout(() => {
                piece.remove();
            }, 1600);
        }
    }

    unlockMedal(medalId) {
        if (this.unlockedMedals.has(medalId)) {
            return;
        }

        this.unlockedMedals.add(medalId);
        this.saveMedals();
        this.renderMedals();
        this.updatePlayerLevel();
        this.updateMascot("B)", "Nueva medalla desbloqueada!", "cheer");
        this.playMedalSound();
        this.launchConfetti();
        this.saveProgressToServer();
    }

    updateMascot(face, text, moodClass) {
        const panel = document.getElementById("mascotPanel");
        const faceEl = document.getElementById("mascotFace");
        const textEl = document.getElementById("mascotText");
        if (!panel || !faceEl || !textEl) {
            return;
        }

        panel.classList.remove("cheer", "warn");
        if (moodClass) {
            panel.classList.add(moodClass);
            setTimeout(() => panel.classList.remove(moodClass), 520);
        }

        faceEl.textContent = face;
        textEl.textContent = text;
    }

    ensureAudioContext() {
        if (!this.soundEnabled) {
            return null;
        }

        if (!this.audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                return null;
            }
            this.audioContext = new AudioCtx();
        }

        if (this.audioContext.state === "suspended") {
            this.audioContext.resume();
        }

        return this.audioContext;
    }

    playTone(frequency, duration, type, volume, delaySeconds = 0) {
        const context = this.ensureAudioContext();
        if (!context) {
            return;
        }

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.value = volume;

        oscillator.connect(gain);
        gain.connect(context.destination);

        const start = context.currentTime + delaySeconds;
        oscillator.start(start);
        oscillator.stop(start + duration);
    }

    playCorrectSound() {
        this.playTone(620, 0.08, "triangle", 0.06, 0);
        this.playTone(820, 0.1, "triangle", 0.05, 0.09);
    }

    playIncorrectSound() {
        this.playTone(220, 0.12, "sawtooth", 0.05, 0);
        this.playTone(170, 0.12, "sawtooth", 0.04, 0.11);
    }

    playMedalSound() {
        this.playTone(520, 0.08, "sine", 0.06, 0);
        this.playTone(760, 0.1, "sine", 0.05, 0.09);
        this.playTone(980, 0.12, "sine", 0.04, 0.2);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.saveSoundPreference();
        this.updateSoundButtonText();
        if (this.soundEnabled) {
            this.playTone(540, 0.07, "triangle", 0.05, 0);
        }
    }

    updateSoundButtonText() {
        const button = document.getElementById("soundToggle");
        if (!button) {
            return;
        }

        button.textContent = this.soundEnabled ? "Sonido: ON" : "Sonido: OFF";
        button.setAttribute("aria-label", this.soundEnabled ? "Silenciar sonidos" : "Activar sonidos");
    }

    getStoredTheme() {
        const storedTheme = localStorage.getItem("mathGameTheme");
        if (storedTheme === "light" || storedTheme === "dark") {
            return storedTheme;
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
    }

    saveTheme() {
        localStorage.setItem("mathGameTheme", this.theme);
    }

    applyTheme() {
        document.body.classList.toggle("dark-theme", this.theme === "dark");
        this.updateThemeButtonText();
    }

    toggleTheme() {
        this.theme = this.theme === "dark" ? "light" : "dark";
        this.applyTheme();
        this.saveTheme();
    }

    updateThemeButtonText() {
        const button = document.getElementById("themeToggle");
        if (!button) {
            return;
        }

        const isDark = this.theme === "dark";
        button.textContent = isDark ? "Modo claro" : "Modo oscuro";
        button.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    }

    updateBestScoreUI() {
        document.getElementById("bestScore").textContent = this.bestScore;
    }

    syncDifficultySettings() {
        if (this.difficulty === "easy") {
            this.timePerQuestion = 12;
        } else if (this.difficulty === "medium") {
            this.timePerQuestion = 10;
        } else {
            this.timePerQuestion = 8;
        }
    }

    generateQuestion() {
        this.stopTimer();
        this.syncDifficultySettings();

        if (this.attempts >= this.totalQuestionsTarget) {
            this.endRound();
            return;
        }

        const operations = this.difficulty === "hard"
            ? ["suma", "resta", "multiplicacion", "division"]
            : ["suma", "resta", "multiplicacion"];

        const operation = operations[Math.floor(Math.random() * operations.length)];

        let num1;
        let num2;
        let answer;
        let question;

        if (this.difficulty === "easy") {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
        } else if (this.difficulty === "medium") {
            num1 = Math.floor(Math.random() * 20) + 2;
            num2 = Math.floor(Math.random() * 20) + 2;
        } else {
            num1 = Math.floor(Math.random() * 30) + 2;
            num2 = Math.floor(Math.random() * 12) + 2;
        }

        if (operation === "suma") {
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
        } else if (operation === "resta") {
            if (num1 < num2) {
                [num1, num2] = [num2, num1];
            }
            question = `${num1} - ${num2}`;
            answer = num1 - num2;
        } else if (operation === "multiplicacion") {
            question = `${num1} x ${num2}`;
            answer = num1 * num2;
        } else {
            answer = Math.floor(Math.random() * 12) + 2;
            num2 = Math.floor(Math.random() * 10) + 2;
            num1 = answer * num2;
            question = `${num1} / ${num2}`;
        }

        this.currentQuestion = question;
        this.correctAnswer = answer;
        this.timeLeft = this.timePerQuestion;
        this.isQuestionActive = true;

        document.getElementById("question").textContent = question;
        document.getElementById("answer").value = "";
        document.getElementById("answer").focus();

        const feedback = document.getElementById("feedback");
        feedback.textContent = "";
        feedback.className = "feedback empty-feedback";

        this.updateMascot(":)", "A pensar rapido...", "");

        this.updateProgressUI();
        this.startTimer();
    }

    submitAnswer() {
        if (!this.isQuestionActive) {
            return;
        }

        const rawInput = document.getElementById("answer").value;
        const userAnswer = Number(rawInput);

        if (!Number.isFinite(userAnswer)) {
            this.showFeedback("Ingresa un numero valido", "incorrect");
            this.updateMascot(":|", "Necesito un numero para ayudarte.", "warn");
            this.playIncorrectSound();
            return;
        }

        this.stopTimer();
        this.attempts += 1;

        if (userAnswer === this.correctAnswer) {
            this.correct += 1;
            this.streak += 1;
            const points = this.calculatePoints();
            this.score += points;
            this.showFeedback(`Correcto! +${points} puntos`, "correct");
            this.playCorrectSound();

            if (this.correct === 1) {
                this.unlockMedal("first-correct");
            }
            if (this.streak >= 5) {
                this.unlockMedal("streak-5");
            }
            if (this.timeLeft >= this.timePerQuestion * 0.7) {
                this.unlockMedal("speedster");
            }

            if (this.streak >= 6) {
                this.updateMascot("XD", "Increible racha! Sigue asi!", "cheer");
            } else {
                this.updateMascot(":D", "Muy bien! Otra mas!", "cheer");
            }
        } else {
            this.incorrect += 1;
            this.streak = 0;
            this.showFeedback(`Incorrecto. Era ${this.correctAnswer}`, "incorrect");
            this.updateMascot(":(", "No pasa nada, intentalo de nuevo.", "warn");
            this.playIncorrectSound();
        }

        this.isQuestionActive = false;
        this.updateBestScoreIfNeeded();
        this.updateStats();
        this.saveProgressToServer();

        setTimeout(() => {
            this.generateQuestion();
        }, 1000);
    }

    skipQuestion() {
        if (!this.isQuestionActive) {
            return;
        }

        this.stopTimer();
        this.attempts += 1;
        this.incorrect += 1;
        this.streak = 0;
        this.isQuestionActive = false;

        this.showFeedback(`Saltaste. Era ${this.correctAnswer}`, "incorrect");
        this.updateMascot(":/", "Saltar tambien es estrategia.", "warn");
        this.playIncorrectSound();
        this.updateStats();
        this.saveProgressToServer();

        setTimeout(() => {
            this.generateQuestion();
        }, 800);
    }

    calculatePoints() {
        const basePoints = this.difficulty === "easy"
            ? 8
            : this.difficulty === "medium"
                ? 12
                : 16;

        const multiplier = this.getMultiplier();
        const speedBonus = Math.ceil(this.timeLeft);
        return (basePoints * multiplier) + speedBonus;
    }

    getMultiplier() {
        if (this.streak >= 10) {
            return 4;
        }
        if (this.streak >= 6) {
            return 3;
        }
        if (this.streak >= 3) {
            return 2;
        }
        return 1;
    }

    startTimer() {
        this.stopTimer();
        this.timerId = setInterval(() => {
            this.timeLeft = Math.max(0, this.timeLeft - 0.1);
            this.updateProgressUI();

            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    handleTimeout() {
        if (!this.isQuestionActive) {
            return;
        }

        this.stopTimer();
        this.attempts += 1;
        this.incorrect += 1;
        this.streak = 0;
        this.isQuestionActive = false;

        this.showFeedback(`Tiempo agotado. Era ${this.correctAnswer}`, "incorrect");
        this.updateMascot(":O", "Ups, se acabo el tiempo.", "warn");
        this.playIncorrectSound();
        this.updateStats();
        this.saveProgressToServer();

        setTimeout(() => {
            this.generateQuestion();
        }, 1000);
    }

    updateProgressUI() {
        const timerPercent = Math.max(0, (this.timeLeft / this.timePerQuestion) * 100);
        document.getElementById("timerBar").style.width = `${timerPercent}%`;
        document.getElementById("timerLabel").textContent = `Tiempo: ${Math.ceil(this.timeLeft)}s`;

        const shownQuestion = Math.min(this.attempts + 1, this.totalQuestionsTarget);
        document.getElementById("progressLabel").textContent = `Pregunta ${shownQuestion} de ${this.totalQuestionsTarget}`;
    }

    updateBestScoreIfNeeded() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
            this.updateBestScoreUI();
        }
    }

    showFeedback(message, type) {
        const feedback = document.getElementById("feedback");
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
    }

    updateStats() {
        document.getElementById("score").textContent = this.score;
        document.getElementById("correct").textContent = this.correct;
        document.getElementById("incorrect").textContent = this.incorrect;
        document.getElementById("streak").textContent = this.streak;
        document.getElementById("attempts").textContent = this.attempts;
        document.getElementById("multiplier").textContent = `x${this.getMultiplier()}`;
        this.updateProgressUI();
    }

    endRound() {
        this.stopTimer();
        this.isQuestionActive = false;

        const accuracy = this.attempts === 0
            ? 0
            : Math.round((this.correct / this.attempts) * 100);

        this.showFeedback(
            `Ronda terminada. Precision: ${accuracy}% | Puntuacion: ${this.score}`,
            "correct"
        );

        if (accuracy === 100 && this.attempts === this.totalQuestionsTarget) {
            this.unlockMedal("perfect-round");
        }

        if (accuracy >= 80) {
            this.updateMascot("B)", "Gran ronda! Eres muy rapido.", "cheer");
        } else {
            this.updateMascot(":)", "Buena ronda. Vamos por mas.", "");
        }

        this.gamesPlayed += 1;
        this.saveProgressToServer();

        setTimeout(() => {
            const keepPlaying = confirm(
                "Ronda terminada.\n\nQuieres jugar otra ronda manteniendo tu mejor puntuacion?"
            );

            if (keepPlaying) {
                this.softResetRound();
            }
        }, 400);
    }

    softResetRound() {
        this.score = 0;
        this.correct = 0;
        this.incorrect = 0;
        this.streak = 0;
        this.attempts = 0;
        this.updateStats();
        this.generateQuestion();
    }

    resetGame() {
        const confirmed = confirm("Seguro que quieres reiniciar el juego?");
        if (!confirmed) {
            return;
        }

        this.stopTimer();
        this.score = 0;
        this.correct = 0;
        this.incorrect = 0;
        this.streak = 0;
        this.attempts = 0;
        this.updateStats();
        this.updateMascot(":)", "Nuevo juego, nueva oportunidad.", "");
        this.saveProgressToServer();
        this.generateQuestion();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new MathGame();
});