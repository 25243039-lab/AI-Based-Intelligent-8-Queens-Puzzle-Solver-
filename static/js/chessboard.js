/**
 * ============================================================================
 * AI-Based Intelligent 8-Queens Puzzle Solver
 * Module: chessboard.js
 * ----------------------------------------------------------------------------
 * Manages the interactive 8x8 chessboard UI, SVG queen pieces, click handling,
 * conflict highlighting, and dynamic attack lines overlay.
 * ============================================================================
 */

class InteractiveChessboard {
  constructor(boardElementId, svgOverlayId, options = {}) {
    this.boardEl = document.getElementById(boardElementId);
    this.svgOverlay = document.getElementById(svgOverlayId);
    this.size = options.size || 8;
    this.readOnly = options.readOnly || false;
    this.onQueenChange = options.onQueenChange || null; // Callback when user modifies queens

    // Set of placed queens as strings "row,col"
    this.queens = new Set();
    this.activeHint = null;

    this.init();
  }

  // Golden Royal Queen SVG markup
  static get QUEEN_SVG() {
    return `
      <svg class="queen-piece" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#f59e0b" stroke="#b45309"/>
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" fill="#fbbf24" stroke="#b45309" stroke-linecap="butt"/>
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5 0-2 1-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#f59e0b" stroke="#92400e" stroke-linecap="butt"/>
          <path d="M11 38.5a35 35 0 0 0 23 0" fill="none" stroke="#78350f" stroke-width="1"/>
          <circle cx="22.5" cy="28.5" r="2.2" fill="#ef4444" stroke="#7f1d1d"/>
          <circle cx="15.5" cy="29" r="1.6" fill="#3b82f6" stroke="#1e3a8a"/>
          <circle cx="29.5" cy="29" r="1.6" fill="#3b82f6" stroke="#1e3a8a"/>
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#d97706"/>
        </g>
      </svg>
    `;
  }

  init() {
    this.boardEl.innerHTML = "";
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement("div");
        const isLight = (r + c) % 2 === 0;
        cell.className = `cell ${isLight ? "light" : "dark"}`;
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.title = `${String.fromCharCode(97 + c)}${8 - r}`;

        if (!this.readOnly) {
          cell.addEventListener("click", () => this.handleCellClick(r, c));
        }

        this.boardEl.appendChild(cell);
      }
    }
  }

  handleCellClick(row, col) {
    if (this.readOnly) return;
    this.clearHint();

    const key = `${row},${col}`;
    if (this.queens.has(key)) {
      this.queens.delete(key);
    } else {
      this.queens.add(key);
    }

    this.renderPieces();
    if (this.onQueenChange) {
      this.onQueenChange(this.getQueensList());
    }
  }

  setQueens(coordsList) {
    this.queens.clear();
    this.clearHint();
    this.clearConflictOverlay();

    coordsList.forEach(([r, c]) => {
      this.queens.add(`${r},${c}`);
    });
    this.renderPieces();
  }

  getQueensList() {
    return Array.from(this.queens).map(k => {
      const [r, c] = k.split(",").map(Number);
      return [r, c];
    });
  }

  clearBoard() {
    this.queens.clear();
    this.clearHint();
    this.clearConflictOverlay();
    this.renderPieces();
  }

  renderPieces() {
    const cells = this.boardEl.querySelectorAll(".cell");
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const key = `${r},${c}`;

      // Reset dynamic state classes
      cell.classList.remove("conflict-queen", "safe-hint", "vis-testing", "vis-placed", "vis-conflict", "vis-backtrack");

      if (this.queens.has(key)) {
        if (!cell.querySelector(".queen-piece")) {
          cell.innerHTML = InteractiveChessboard.QUEEN_SVG;
        }
      } else {
        cell.innerHTML = "";
      }
    });
  }

  getCellElement(row, col) {
    return this.boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  setCellVisualState(row, col, stateClass, showQueen = false) {
    const cell = this.getCellElement(row, col);
    if (!cell) return;

    cell.classList.remove("vis-testing", "vis-placed", "vis-conflict", "vis-backtrack", "conflict-queen", "safe-hint");
    if (stateClass) {
      cell.classList.add(stateClass);
    }

    if (showQueen) {
      if (!cell.querySelector(".queen-piece")) {
        cell.innerHTML = InteractiveChessboard.QUEEN_SVG;
      }
    } else if (!this.queens.has(`${row},${col}`)) {
      cell.innerHTML = "";
    }
  }

  highlightConflicts(conflicts) {
    this.clearConflictOverlay();
    if (!conflicts || conflicts.length === 0) return;

    const boardRect = this.boardEl.getBoundingClientRect();
    if (this.svgOverlay) {
      this.svgOverlay.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
      this.svgOverlay.innerHTML = "";
    }

    conflicts.forEach(item => {
      const [r1, c1] = item.q1;
      const [r2, c2] = item.q2;

      // Highlight conflicting cells
      const cell1 = this.getCellElement(r1, c1);
      const cell2 = this.getCellElement(r2, c2);
      if (cell1) cell1.classList.add("conflict-queen");
      if (cell2) cell2.classList.add("conflict-queen");

      // Draw SVG connecting attack line
      if (this.svgOverlay && cell1 && cell2) {
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();

        const x1 = rect1.left - boardRect.left + rect1.width / 2;
        const y1 = rect1.top - boardRect.top + rect1.height / 2;
        const x2 = rect2.left - boardRect.left + rect2.width / 2;
        const y2 = rect2.top - boardRect.top + rect2.height / 2;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("class", "conflict-line");
        this.svgOverlay.appendChild(line);
      }
    });
  }

  highlightHint(row, col) {
    this.clearHint();
    const cell = this.getCellElement(row, col);
    if (cell) {
      cell.classList.add("safe-hint");
      this.activeHint = [row, col];
    }
  }

  clearHint() {
    if (this.activeHint) {
      const [r, c] = this.activeHint;
      const cell = this.getCellElement(r, c);
      if (cell) cell.classList.remove("safe-hint");
      this.activeHint = null;
    }
  }

  clearConflictOverlay() {
    if (this.svgOverlay) {
      this.svgOverlay.innerHTML = "";
    }
    const cells = this.boardEl.querySelectorAll(".cell");
    cells.forEach(cell => cell.classList.remove("conflict-queen"));
  }
}
