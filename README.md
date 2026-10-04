# AI-Based Intelligent 8-Queens Puzzle Solver
**College Mini Project in Artificial Intelligence**

An interactive, web-based demonstration and solving engine for the classic **8-Queens Problem** powered by **Constraint Satisfaction Problem (CSP)** formulation and the **Backtracking Search Algorithm**.

---

## 🌟 Key Features

1. **Interactive 8×8 Chessboard**:
   - Clean, responsive chessboard with standard algebraic rank (1–8) and file (a–h) labels.
   - Click to place or remove queens with royal gold SVG pieces and smooth animations.
2. **Real-Time Dynamic Conflict Detection**:
   - Instantly highlights conflicting queens with crimson red glow and animated attack lines whenever two queens share the same row, column, or diagonal.
3. **Real Backtracking Search Algorithm**:
   - Zero hardcoding or fake solutions. Actual recursive depth-first search with constraint-based dead-end pruning implemented in Python.
4. **Step-by-Step AI Visualizer**:
   - Chronologically visualizes every step of the AI search tree:
     - 🟡 **TRY (Testing)**: Column candidate being evaluated
     - 🔴 **CONFLICT**: Threat detected against already placed queen
     - 🟢 **PLACE**: Safe square approved, proceeds to next depth
     - 🟠 **BACKTRACK**: Dead end encountered, prunes branch
   - Features Play/Pause, Step Forward/Backward, and adjustable speed control (50ms to 950ms).
5. **Intelligent Hint & Dead-End Engine**:
   - Employs forward checking to suggest the optimal next move.
   - **Dead-End Warning**: Warns the player if their current partial board configuration can never lead to a valid solution, even if no direct conflicts exist yet!
6. **All 92 Solutions Explorer**:
   - Browse and display all 92 distinct mathematical solutions on the 8×8 board.
7. **Performance Dashboard with SQLite**:
   - Records session metrics (Player vs AI, solving time in seconds/milliseconds, moves, search nodes, backtracks).
8. **Academic Viva Voce Preparation Section**:
   - In-depth theoretical breakdown of CSP variables, domains, constraints, mathematical diagonal equations, time/space complexity, and frequently asked viva questions with answers.

---

## 🏗️ Project Architecture

```
ai_8queens_solver/
│
├── app.py                   # Main Flask application and REST API endpoints
├── ai_solver.py             # Core AI engine: CSP Backtracking, Step Tracing, Hint Engine
├── database.py              # SQLite database management for game runs and performance stats
├── requirements.txt         # Minimal Python dependencies (flask)
├── run.bat                  # One-click Windows launch batch script
├── README.md                # Complete project documentation and Viva guide
│
├── static/
│   ├── css/
│   │   └── style.css        # Modern academic dark theme, responsive grid, animations
│   └── js/
│       ├── chessboard.js    # Interactive chessboard rendering, SVG pieces, conflict overlay
│       ├── ai_visualizer.js # Backtracking visualizer, playback loop, live decision log
│       └── app.js           # Main UI orchestrator, tabs, timer, game logic, API bridge
│
└── templates/
    └── index.html           # Single-page web application with 5 sections
```

---

## 🚀 How to Run the Application

### Prerequisites:
- Python 3.8 or higher installed on your system.

### Step 1: Install Dependencies
Open terminal or PowerShell in the project directory:
```bash
pip install -r requirements.txt
```

### Step 2: Start the Flask Server
Run:
```bash
python app.py
```
*(Or simply double-click `run.bat` on Windows)*

### Step 3: Open in Browser
Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧠 Core AI Concepts (For Viva & Presentation)

### 1. Constraint Satisfaction Problem (CSP) Formulation
The 8-Queens problem is represented as a formal CSP triplet \((X, D, C)\):
- **Variables (\(X\))**:
  $$X = \{Q_0, Q_1, Q_2, Q_3, Q_4, Q_5, Q_6, Q_7\}$$
  Where $Q_i$ represents the queen placed on row $i$.
- **Domains (\(D\))**:
  $$D_i = \{0, 1, 2, 3, 4, 5, 6, 7\} \quad \forall i \in \{0, \dots, 7\}$$
  The column indices where $Q_i$ can be placed.
- **Constraints (\(C\))**:
  - **Row Constraint**: Satisfied implicitly by assigning exactly one variable per row.
  - **Column Constraint**: $Q_i \neq Q_j$ for all $i \neq j$.
  - **Diagonal Constraint**: $|Q_i - Q_j| \neq |i - j|$ for all $i \neq j$.

### 2. Backtracking Search Algorithm
- Uses **Depth-First Search (DFS)** to assign columns row-by-row.
- At row $i$, tests column $c \in \{0, \dots, 7\}$.
- Evaluates `is_safe(board, row, col)` against all previously placed queens $r < i$.
- If a constraint violation occurs, the algorithm **prunes** that branch immediately (does not explore rows $i+1 \dots 7$).
- If no column is valid for row $i$, the algorithm **backtracks** to row $i-1$, removes queen $Q_{i-1}$, and tries the next column.

### 3. Complexity
- **Time Complexity**: $O(N!)$ worst-case, but constraint pruning reduces the search to only **876 nodes** and **105 backtracks** for the first solution on an 8×8 board ($< 5\text{ ms}$).
- **Space Complexity**: $O(N)$ auxiliary stack space corresponding to the recursion tree depth of 8 rows.

---

## 🎓 Sample Viva Voce Q&A

**Q1: Why is Backtracking preferred over Brute Force for 8-Queens?**  
*Answer:* A naive brute-force search over an $8 \times 8$ board tests $\binom{64}{8} = 4,426,165,368$ combinations. Backtracking prunes invalid branches at the earliest possible level, reducing the search space to a tiny fraction (876 states to find the first solution).

**Q2: How is the diagonal constraint verified programmatically?**  
*Answer:* Two coordinates $(r_1, c_1)$ and $(r_2, c_2)$ lie on the same diagonal if their horizontal and vertical distances are equal:
$$|r_1 - r_2| = |c_1 - c_2|$$

**Q3: How many total solutions exist for 8-Queens?**  
*Answer:* There are exactly **92 distinct solutions**. When rotational and reflective symmetries are eliminated, there are **12 fundamental solutions**.
