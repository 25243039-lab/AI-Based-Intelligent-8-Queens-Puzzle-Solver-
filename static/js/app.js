/**
 * ============================================================================
 * AI-Based Intelligent 8-Queens Puzzle Solver
 * Module: app.js
 * ----------------------------------------------------------------------------
 * Main orchestrator: handles tab navigation, interactive game state, timer,
 * real-time validation, hints, API integration, performance dashboard,
 * and game completion modals.
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // --------------------------------------------------------------------------
  // 1. STATE & VARIABLES
  // --------------------------------------------------------------------------
  let gameStartTime = null;
  let gameTimerInterval = null;
  let elapsedSeconds = 0;
  let moveCount = 0;
  let isGameActive = false;

  // --------------------------------------------------------------------------
  // 2. DOM REFERENCES
  // --------------------------------------------------------------------------
  // Tabs
  const navButtons = document.querySelectorAll(".nav-btn");
  const tabSections = document.querySelectorAll(".tab-section");

  // Game UI elements
  const gameTimerEl = document.getElementById("gameTimer");
  const queensCountEl = document.getElementById("queensCount");
  const movesCountEl = document.getElementById("movesCount");
  const gameStatusBanner = document.getElementById("gameStatusBanner");
  const queensProgressBar = document.getElementById("queensProgressBar");
  const checkSolutionBtn = document.getElementById("checkSolutionBtn");
  const getHintBtn = document.getElementById("getHintBtn");
  const aiAutoCompleteBtn = document.getElementById("aiAutoCompleteBtn");
  const resetGameBtn = document.getElementById("resetGameBtn");

  // Visualizer UI elements
  const visPlayBtn = document.getElementById("visPlayBtn");
  const visNextBtn = document.getElementById("visNextBtn");
  const visPrevBtn = document.getElementById("visPrevBtn");
  const visResetBtn = document.getElementById("visResetBtn");
  const visSpeedSlider = document.getElementById("visSpeedSlider");
  const visSpeedLabel = document.getElementById("visSpeedLabel");
  const visSolutionsSelect = document.getElementById("visSolutionsSelect");
  const visStepCount = document.getElementById("visStepCount");
  const visNodesCount = document.getElementById("visNodesCount");
  const visBacktracksCount = document.getElementById("visBacktracksCount");
  const visDepthCount = document.getElementById("visDepthCount");
  const visStatusBanner = document.getElementById("visStatusBanner");
  const visLogConsole = document.getElementById("visLogConsole");
  const instantSolveBtn = document.getElementById("instantSolveBtn");

  // Modal elements
  const winModal = document.getElementById("winModal");
  const winTitle = document.getElementById("winTitle");
  const winMessage = document.getElementById("winMessage");
  const winTimeStat = document.getElementById("winTimeStat");
  const winMovesStat = document.getElementById("winMovesStat");
  const modalPlayAgainBtn = document.getElementById("modalPlayAgainBtn");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  // Stats elements
  const refreshStatsBtn = document.getElementById("refreshStatsBtn");
  const clearStatsBtn = document.getElementById("clearStatsBtn");

  // --------------------------------------------------------------------------
  // 3. CHESSBOARD INITIALIZATION
  // --------------------------------------------------------------------------
  // Interactive Player Board
  const playerBoard = new InteractiveChessboard("playerChessboard", "playerConflictOverlay", {
    onQueenChange: (queens) => handlePlayerQueenChange(queens)
  });

  // AI Visualizer Board (read-only clicks)
  const visualizerBoard = new InteractiveChessboard("visChessboard", "visConflictOverlay", {
    readOnly: true
  });

  // AI Visualizer Controller
  const visualizer = new AIVisualizer(visualizerBoard, {
    playBtn: visPlayBtn,
    nextBtn: visNextBtn,
    prevBtn: visPrevBtn,
    resetBtn: visResetBtn,
    speedSlider: visSpeedSlider,
    speedLabel: visSpeedLabel,
    solutionsSelect: visSolutionsSelect,
    stepCount: visStepCount,
    nodesCount: visNodesCount,
    backtracksCount: visBacktracksCount,
    depthCount: visDepthCount,
    statusBanner: visStatusBanner,
    logConsole: visLogConsole
  });

  // --------------------------------------------------------------------------
  // 3.1 CUTE MASCOT COMPANION CONTROLLER
  // --------------------------------------------------------------------------
  class CuteMascotController {
    constructor() {
      this.widget = document.getElementById("mascotCompanion");
      this.textEl = document.getElementById("mascotDialogueText");
      this.particlesEl = document.getElementById("mascotParticles");
      this.state = "neutral";
      this.hadConflict = false;
    }

    setState(state, message) {
      if (!this.widget) return;
      this.state = state;
      this.widget.className = `mascot-widget state-${state}`;

      if (this.textEl && message) {
        this.textEl.textContent = message;
      }

      if (state === "happy") {
        this.spawnParticles(["❤️", "💖", "✨"], 5);
      } else if (state === "celebrate") {
        this.spawnParticles(["👑", "⭐", "❤️", "✨", "🎉"], 8);
      } else if (state === "sad") {
        this.spawnParticles(["💧"], 2);
      }
    }

    spawnParticles(symbols, count) {
      if (!this.particlesEl) return;
      for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        p.className = "mascot-particle";
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        const tx = (Math.random() * 40 - 20) + "px";
        const left = (18 + Math.random() * 20) + "px";
        const delay = (i * 0.08) + "s";
        p.style.setProperty("--tx", tx);
        p.style.left = left;
        p.style.animationDelay = delay;
        this.particlesEl.appendChild(p);

        setTimeout(() => {
          if (p.parentNode) p.parentNode.removeChild(p);
        }, 1500);
      }
    }
  }

  const mascot = new CuteMascotController();

  // --------------------------------------------------------------------------
  // 4. TAB NAVIGATION
  // --------------------------------------------------------------------------
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Quick Action buttons on Home page
  document.querySelectorAll("[data-navigate]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.navigate;
      switchTab(tab);
    });
  });

  function switchTab(tabId) {
    navButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    tabSections.forEach(sec => sec.classList.toggle("active", sec.id === `tab-${tabId}`));

    if (tabId === "visualizer") {
      visualizer.loadAllSolutions();
    } else if (tabId === "results") {
      loadPerformanceStats();
    }
  }

  // --------------------------------------------------------------------------
  // 5. INTERACTIVE GAME LOGIC
  // --------------------------------------------------------------------------
  function startTimerIfNeeded() {
    if (!isGameActive) {
      isGameActive = true;
      gameStartTime = Date.now();
      gameTimerInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
        const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
        const secs = String(elapsedSeconds % 60).padStart(2, "0");
        if (gameTimerEl) gameTimerEl.textContent = `${mins}:${secs}`;
      }, 1000);
    }
  }

  function stopTimer() {
    if (gameTimerInterval) {
      clearInterval(gameTimerInterval);
      gameTimerInterval = null;
    }
    isGameActive = false;
  }

  function resetGame() {
    stopTimer();
    elapsedSeconds = 0;
    moveCount = 0;
    if (gameTimerEl) gameTimerEl.textContent = "00:00";
    if (movesCountEl) movesCountEl.textContent = "0";
    if (queensCountEl) queensCountEl.textContent = "0 / 8";
    if (queensProgressBar) {
      queensProgressBar.style.width = "0%";
      queensProgressBar.classList.remove("has-conflict");
    }

    playerBoard.clearBoard();
    mascot.hadConflict = false;
    mascot.setState("neutral", "Board reset! Click any square to place your first queen. ✨");
    updateGameStatus("info", "Click on any square to place your first queen.");
  }

  async function handlePlayerQueenChange(queens) {
    startTimerIfNeeded();
    moveCount++;
    if (movesCountEl) movesCountEl.textContent = moveCount;

    const count = queens.length;
    if (queensCountEl) queensCountEl.textContent = `${count} / 8`;
    if (queensProgressBar) {
      const pct = Math.min((count / 8) * 100, 100);
      queensProgressBar.style.width = `${pct}%`;
    }

    // Call real-time validation API
    try {
      const resp = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queens })
      });
      const data = await resp.json();

      if (data.conflicts && data.conflicts.length > 0) {
        playerBoard.highlightConflicts(data.conflicts);
        if (queensProgressBar) queensProgressBar.classList.add("has-conflict");
        const c = data.conflicts[0];
        updateGameStatus("conflict", `Conflict! Queens at (${c.q1[0]+1},${c.q1[1]+1}) and (${c.q2[0]+1},${c.q2[1]+1}) attack along same ${c.type}.`);

        // Mascot: Sad/crying with speech bubble
        mascot.hadConflict = true;
        mascot.setState("sad", "Oops! Try another square! 🥺");
      } else {
        playerBoard.clearConflictOverlay();
        if (queensProgressBar) queensProgressBar.classList.remove("has-conflict");

        if (data.is_complete) {
          updateGameStatus("success", "Excellent! 8 queens placed with ZERO conflicts.");
          // Mascot: Celebrate 8 queens
          mascot.setState("celebrate", "Perfect! 8 Queens placed safely! 👑❤️");
          handleVictory("USER");
        } else if (mascot.hadConflict) {
          // Mascot: Fixed conflict -> happy with floating hearts
          mascot.hadConflict = false;
          mascot.setState("happy", "Yay! That's a good move! ❤️");
          updateGameStatus("success", `Conflict resolved! ${count} queen(s) safely placed.`);
        } else if (count > 0) {
          // Placed another valid queen
          mascot.setState("happy", "Yay! That's a good move! ❤️");
          updateGameStatus("info", `Safe placement! ${count} queen(s) placed without any conflicts.`);
        } else {
          // 0 queens left on board
          mascot.hadConflict = false;
          mascot.setState("neutral", "Hi! Place 8 queens safely on the board! ♛");
          updateGameStatus("info", "Click on any square to place your first queen.");
        }
      }
    } catch (err) {
      console.error("Validation error:", err);
    }
  }

  function updateGameStatus(type, message) {
    if (!gameStatusBanner) return;
    gameStatusBanner.className = `status-banner status-${type}`;
    gameStatusBanner.innerHTML = `<span>${message}</span>`;
  }

  // Check Solution button
  if (checkSolutionBtn) {
    checkSolutionBtn.addEventListener("click", async () => {
      const queens = playerBoard.getQueensList();
      const resp = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queens })
      });
      const data = await resp.json();

      if (data.is_complete) {
        mascot.setState("celebrate", "Perfect! 8 Queens placed safely! 👑❤️");
        handleVictory("USER");
      } else if (data.conflicts.length > 0) {
        mascot.setState("sad", "Oops! Fix conflicting queens first! 🥺");
        updateGameStatus("conflict", `Solution Invalid! ${data.conflicts.length} conflict(s) detected on the board.`);
      } else {
        mascot.setState("neutral", `Valid so far, but need ${8 - queens.length} more queens!`);
        updateGameStatus("warning", `Board is currently valid, but only ${queens.length}/8 queens have been placed.`);
      }
    });
  }

  // AI Hint button
  if (getHintBtn) {
    getHintBtn.addEventListener("click", async () => {
      const queens = playerBoard.getQueensList();
      updateGameStatus("info", "AI is analyzing state space with CSP forward checking...");

      try {
        const resp = await fetch("/api/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queens })
        });
        const hint = await resp.json();

        if (hint.status === "suggest_move" && hint.hint_square) {
          playerBoard.highlightHint(hint.hint_square[0], hint.hint_square[1]);
          updateGameStatus("success", hint.message);
          mascot.setState("happy", `AI Hint: Try ${hint.algebraic}! This leads to a solution. 💡`);
        } else if (hint.status === "dead_end") {
          updateGameStatus("warning", hint.message);
          mascot.setState("sad", "Warning: Current board cannot be solved! Backtrack.");
        } else if (hint.status === "conflict") {
          updateGameStatus("conflict", hint.message);
          mascot.setState("sad", "Resolve existing conflict first! 🥺");
        } else {
          updateGameStatus("info", hint.message);
        }
      } catch (err) {
        console.error("Hint error:", err);
      }
    });
  }

  // AI Complete button: fills in remaining queens using Backtracking CSP
  if (aiAutoCompleteBtn) {
    aiAutoCompleteBtn.addEventListener("click", async () => {
      const queens = playerBoard.getQueensList();
      updateGameStatus("info", "AI Backtracking is finding a completion for your queens...");

      try {
        const resp = await fetch("/api/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixed_queens: queens, record: false })
        });
        const result = await resp.json();

        if (result.success) {
          playerBoard.setQueens(result.solution);
          updateGameStatus("success", `AI completed the board in ${result.time_ms} ms! (${result.nodes_visited} nodes explored, ${result.backtracks} backtracks).`);
          mascot.setState("celebrate", "Perfect! 8 Queens placed safely! 👑❤️");
          handleVictory("AI_ASSISTED");
        } else {
          updateGameStatus("warning", "AI could not find any solution starting from your current queens. Please remove conflicting queens first.");
          mascot.setState("sad", "AI cannot solve from conflicting queens. Backtrack first!");
        }
      } catch (err) {
        console.error("AI Complete error:", err);
      }
    });
  }

  // Reset Game button
  if (resetGameBtn) {
    resetGameBtn.addEventListener("click", resetGame);
  }

  // --------------------------------------------------------------------------
  // 6. INSTANT SOLVER (in Visualizer tab)
  // --------------------------------------------------------------------------
  if (instantSolveBtn) {
    instantSolveBtn.addEventListener("click", async () => {
      visualizer.pause();
      visualizerBoard.clearBoard();
      visualizer.updateStatusBanner("info", "Executing Backtracking Search in Python...");

      try {
        const resp = await fetch("/api/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record: true })
        });
        const data = await resp.json();

        if (data.success) {
          visualizerBoard.setQueens(data.solution);
          visualizer.updateMetrics(
            "—",
            data.nodes_visited,
            data.backtracks,
            8
          );
          visualizer.updateStatusBanner("success", `AI found solution in ${data.time_ms} ms! Explored ${data.nodes_visited} nodes with ${data.backtracks} backtracks.`);
        }
      } catch (err) {
        console.error("Instant solve error:", err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 7. VICTORY & RESULTS RECORDING
  // --------------------------------------------------------------------------
  async function handleVictory(winner) {
    stopTimer();
    const timeSec = elapsedSeconds;

    if (winTitle) {
      winTitle.textContent = winner === "USER" ? "🎉 Puzzle Solved!" : "🤖 AI Solved the Puzzle!";
    }
    if (winMessage) {
      winMessage.textContent = winner === "USER"
        ? "Congratulations! You successfully placed all 8 queens with zero attacking constraints."
        : "The AI Backtracking Search algorithm completed the valid placement.";
    }
    if (winTimeStat) winTimeStat.textContent = `${timeSec}s`;
    if (winMovesStat) winMovesStat.textContent = moveCount;

    if (winModal) {
      winModal.classList.add("open");
    }

    // Save result to SQLite
    try {
      await fetch("/api/record_result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_type: winner === "USER" ? "USER" : "AI",
          mode: "interactive_play",
          queens_placed: 8,
          is_solved: true,
          time_taken_seconds: timeSec,
          steps_count: moveCount,
          backtracks_count: 0,
          notes: winner === "USER" ? "Player solved independently" : "Solved with AI assistance"
        })
      });
    } catch (e) {
      console.warn("Failed to save result to DB:", e);
    }
  }

  if (modalPlayAgainBtn) {
    modalPlayAgainBtn.addEventListener("click", () => {
      if (winModal) winModal.classList.remove("open");
      resetGame();
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      if (winModal) winModal.classList.remove("open");
    });
  }

  // --------------------------------------------------------------------------
  // 8. HOW AI WORKS: VIVA ACCORDION TOGGLE
  // --------------------------------------------------------------------------
  const vivaItems = document.querySelectorAll(".viva-item");
  vivaItems.forEach(item => {
    const qBtn = item.querySelector(".viva-question");
    if (qBtn) {
      qBtn.addEventListener("click", () => {
        item.classList.toggle("open");
      });
    }
  });

  // --------------------------------------------------------------------------
  // 9. PERFORMANCE & DATABASE DASHBOARD
  // --------------------------------------------------------------------------
  async function loadPerformanceStats() {
    try {
      const resp = await fetch("/api/stats");
      const data = await resp.json();
      const stats = data.stats || {};
      const recent = data.recent_sessions || [];

      // Update KPI cards
      const totalRunsEl = document.getElementById("statTotalRuns");
      const userSolvedEl = document.getElementById("statUserSolved");
      const aiSolvedEl = document.getElementById("statAiSolved");
      const userWinRateEl = document.getElementById("statUserWinRate");
      const avgUserTimeEl = document.getElementById("statAvgUserTime");
      const avgAiTimeEl = document.getElementById("statAvgAiTime");

      if (totalRunsEl) totalRunsEl.textContent = stats.total_runs || 0;
      if (userSolvedEl) userSolvedEl.textContent = stats.user_stats?.solved || 0;
      if (aiSolvedEl) aiSolvedEl.textContent = stats.ai_stats?.solved || 0;
      if (userWinRateEl) userWinRateEl.textContent = `${stats.user_stats?.win_rate_percent || 0}%`;
      if (avgUserTimeEl) avgUserTimeEl.textContent = `${stats.user_stats?.avg_time_seconds || 0}s`;
      if (avgAiTimeEl) avgAiTimeEl.textContent = `${stats.ai_stats?.avg_time_seconds || 0}s`;

      // Render recent sessions table
      const tbody = document.getElementById("recentSessionsTbody");
      if (tbody) {
        tbody.innerHTML = "";
        if (recent.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No games recorded yet. Play a game or run AI Solve!</td></tr>`;
          return;
        }

        recent.forEach(row => {
          const tr = document.createElement("tr");
          const isUser = row.player_type === "USER";
          const badgeClass = isUser ? "badge-info" : "badge-warn";
          const statusBadge = row.is_solved ? `<span class="badge-tag badge-success">SOLVED</span>` : `<span class="badge-tag badge-danger">INCOMPLETE</span>`;

          tr.innerHTML = `
            <td>#${row.id}</td>
            <td><span class="badge-tag ${badgeClass}">${row.player_type}</span></td>
            <td>${row.mode}</td>
            <td>${row.queens_placed}/8</td>
            <td>${statusBadge}</td>
            <td style="font-family: var(--font-mono);">${row.time_taken_seconds}s</td>
            <td>${row.created_at}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (err) {
      console.error("Error loading performance stats:", err);
    }
  }

  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener("click", loadPerformanceStats);
  }

  if (clearStatsBtn) {
    clearStatsBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear all recorded game sessions from SQLite?")) {
        await fetch("/api/reset_stats", { method: "POST" });
        loadPerformanceStats();
      }
    });
  }
});
