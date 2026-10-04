/**
 * ============================================================================
 * AI-Based Intelligent 8-Queens Puzzle Solver
 * Module: ai_visualizer.js
 * ----------------------------------------------------------------------------
 * Powers the step-by-step Backtracking Search visualizer, playback controls,
 * state machine, live search tree log, and the 92 solutions explorer.
 * ============================================================================
 */

class AIVisualizer {
  constructor(chessboardInstance, domElements) {
    this.board = chessboardInstance;
    this.dom = domElements;

    this.steps = [];
    this.currentStepIdx = -1;
    this.isPlaying = false;
    this.timer = null;
    this.stepSpeedMs = 250; // default delay

    this.allSolutions = [];
    this.currentSolutionIndex = 0;

    this.initControls();
  }

  initControls() {
    if (this.dom.playBtn) {
      this.dom.playBtn.addEventListener("click", () => this.togglePlay());
    }
    if (this.dom.nextBtn) {
      this.dom.nextBtn.addEventListener("click", () => this.stepForward());
    }
    if (this.dom.prevBtn) {
      this.dom.prevBtn.addEventListener("click", () => this.stepBackward());
    }
    if (this.dom.resetBtn) {
      this.dom.resetBtn.addEventListener("click", () => this.resetVisualizer());
    }
    if (this.dom.speedSlider) {
      this.dom.speedSlider.addEventListener("input", (e) => {
        // Slider value 1 (fast) to 10 (slow)
        const val = parseInt(e.target.value, 10);
        this.stepSpeedMs = 1050 - (val * 100); // 50ms to 950ms
        if (this.dom.speedLabel) {
          this.dom.speedLabel.textContent = `${this.stepSpeedMs}ms`;
        }
      });
    }

    if (this.dom.solutionsSelect) {
      this.dom.solutionsSelect.addEventListener("change", (e) => {
        const idx = parseInt(e.target.value, 10);
        this.showSolution(idx);
      });
    }
  }

  async loadSteps() {
    this.updateStatusBanner("info", "Generating AI Backtracking state space search trace...");
    try {
      const resp = await fetch("/api/solve_steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_steps: 1600 })
      });
      const data = await resp.json();
      this.steps = data.steps || [];
      this.currentStepIdx = -1;
      this.renderLogInitial();
      this.updateStatusBanner("info", `Trace loaded: ${this.steps.length} search steps ready. Click Play or Step.`);
      return true;
    } catch (err) {
      console.error("Failed to load AI steps:", err);
      this.updateStatusBanner("conflict", "Error loading AI steps from server.");
      return false;
    }
  }

  async loadAllSolutions() {
    try {
      const resp = await fetch("/api/all_solutions");
      const data = await resp.json();
      this.allSolutions = data.solutions || [];

      if (this.dom.solutionsSelect) {
        this.dom.solutionsSelect.innerHTML = "";
        this.allSolutions.forEach((sol, idx) => {
          const opt = document.createElement("option");
          opt.value = idx;
          // Format as column string e.g. [0, 4, 7, 5, 2, 6, 1, 3]
          const cols = sol.map(pair => pair[1]).join(", ");
          opt.textContent = `Solution #${idx + 1} (${cols})`;
          this.dom.solutionsSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Failed to load all solutions:", err);
    }
  }

  showSolution(index) {
    if (!this.allSolutions || index < 0 || index >= this.allSolutions.length) return;
    this.pause();
    this.currentSolutionIndex = index;
    const sol = this.allSolutions[index];
    this.board.setQueens(sol);
    this.board.clearConflictOverlay();

    if (this.dom.nodesCount) this.dom.nodesCount.textContent = "—";
    if (this.dom.backtracksCount) this.dom.backtracksCount.textContent = "—";
    if (this.dom.depthCount) this.dom.depthCount.textContent = "8 / 8";

    const cols = sol.map(pair => pair[1]).join(", ");
    this.updateStatusBanner("success", `Displaying Solution #${index + 1} of 92: Column vector [${cols}]`);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  async play() {
    if (this.steps.length === 0) {
      const ok = await this.loadSteps();
      if (!ok) return;
    }

    if (this.currentStepIdx >= this.steps.length - 1) {
      this.currentStepIdx = -1;
      this.board.clearBoard();
    }

    this.isPlaying = true;
    if (this.dom.playBtn) {
      this.dom.playBtn.innerHTML = `<span>⏸ Pause</span>`;
      this.dom.playBtn.classList.replace("btn-primary", "btn-accent");
    }

    this.runPlaybackLoop();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.dom.playBtn) {
      this.dom.playBtn.innerHTML = `<span>▶ Play AI</span>`;
      this.dom.playBtn.classList.replace("btn-accent", "btn-primary");
    }
  }

  runPlaybackLoop() {
    if (!this.isPlaying) return;

    const hasNext = this.stepForward();
    if (hasNext && this.isPlaying) {
      this.timer = setTimeout(() => this.runPlaybackLoop(), this.stepSpeedMs);
    } else {
      this.pause();
    }
  }

  stepForward() {
    if (this.steps.length === 0) {
      this.loadSteps();
      return false;
    }

    if (this.currentStepIdx + 1 >= this.steps.length) {
      return false;
    }

    this.currentStepIdx++;
    this.renderCurrentStep();
    return this.currentStepIdx < this.steps.length - 1;
  }

  stepBackward() {
    if (this.currentStepIdx <= 0) return;
    this.pause();
    this.currentStepIdx--;
    this.renderCurrentStep();
  }

  resetVisualizer() {
    this.pause();
    this.currentStepIdx = -1;
    this.board.clearBoard();
    this.updateMetrics(0, 0, 0, 0);
    this.updateStatusBanner("info", "Visualizer reset. Press Play to start search.");
    if (this.dom.logConsole) {
      this.dom.logConsole.innerHTML = `<div class="vis-log-entry">Waiting for search to begin...</div>`;
    }
  }

  renderCurrentStep() {
    if (this.currentStepIdx < 0 || this.currentStepIdx >= this.steps.length) return;
    const step = this.steps[this.currentStepIdx];

    // Set board to state before current action
    this.board.setQueens(step.board);
    this.board.clearConflictOverlay();

    const r = step.row;
    const c = step.col;

    // Apply visual effects depending on action
    switch (step.action) {
      case "TRY":
        this.board.setCellVisualState(r, c, "vis-testing", true);
        break;
      case "CONFLICT":
        this.board.setCellVisualState(r, c, "vis-conflict", true);
        if (step.conflicts && step.conflicts.length > 0) {
          this.board.highlightConflicts(step.conflicts);
        }
        break;
      case "PLACE":
        this.board.setCellVisualState(r, c, "vis-placed", true);
        break;
      case "BACKTRACK":
        this.board.setCellVisualState(r, c, "vis-backtrack", false);
        break;
      case "SUCCESS":
        // All queens placed!
        this.board.setQueens(step.board);
        break;
    }

    // Update metrics
    if (step.stats) {
      this.updateMetrics(
        step.step_id,
        step.stats.nodes_visited,
        step.stats.backtracks,
        step.stats.depth
      );
    }

    // Update status banner
    if (step.action === "SUCCESS") {
      this.updateStatusBanner("success", step.message);
    } else if (step.action === "CONFLICT") {
      this.updateStatusBanner("conflict", step.message);
    } else if (step.action === "BACKTRACK") {
      this.updateStatusBanner("warning", step.message);
    } else {
      this.updateStatusBanner("info", step.message);
    }

    // Append to live log console
    this.appendLogEntry(step);
  }

  updateMetrics(stepNum, nodes, backtracks, depth) {
    if (this.dom.stepCount) this.dom.stepCount.textContent = stepNum;
    if (this.dom.nodesCount) this.dom.nodesCount.textContent = nodes;
    if (this.dom.backtracksCount) this.dom.backtracksCount.textContent = backtracks;
    if (this.dom.depthCount) this.dom.depthCount.textContent = `${depth} / 8`;
  }

  updateStatusBanner(type, message) {
    if (!this.dom.statusBanner) return;
    this.dom.statusBanner.className = `status-banner status-${type}`;
    this.dom.statusBanner.innerHTML = `<span>${message}</span>`;
  }

  renderLogInitial() {
    if (!this.dom.logConsole) return;
    this.dom.logConsole.innerHTML = "";
  }

  appendLogEntry(step) {
    if (!this.dom.logConsole) return;

    const entry = document.createElement("div");
    entry.className = `vis-log-entry action-${step.action} active-step`;
    entry.innerHTML = `<span class="log-num">#${step.step_id}</span> <strong>[${step.action}]</strong> ${step.message}`;

    // Remove active highlight from previous entries
    const prev = this.dom.logConsole.querySelector(".active-step");
    if (prev && prev !== entry) {
      prev.classList.remove("active-step");
    }

    this.dom.logConsole.appendChild(entry);
    this.dom.logConsole.scrollTop = this.dom.logConsole.scrollHeight;
  }
}
