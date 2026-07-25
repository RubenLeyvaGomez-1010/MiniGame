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
        this.theme = this.getStoredTheme();

        this.applyTheme();
        this.initEventListeners();
        this.updateBestScoreUI();
        this.generateQuestion();
    }

    initEventListeners() {
        document.getElementById("submitBtn").addEventListener("click", () => this.submitAnswer());
        document.getElementById("skipBtn").addEventListener("click", () => this.skipQuestion());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetGame());
        document.getElementById("themeToggle").addEventListener("click", () => this.toggleTheme());

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
    }

    getStoredBestScore() {
        const stored = localStorage.getItem("mathGameBestScore");
        const parsed = Number(stored);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    saveBestScore() {
        localStorage.setItem("mathGameBestScore", String(this.bestScore));
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
        } else {
            this.incorrect += 1;
            this.streak = 0;
            this.showFeedback(`Incorrecto. Era ${this.correctAnswer}`, "incorrect");
        }

        this.isQuestionActive = false;
        this.updateBestScoreIfNeeded();
        this.updateStats();

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
        this.updateStats();

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
        this.updateStats();

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
        this.generateQuestion();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new MathGame();
});