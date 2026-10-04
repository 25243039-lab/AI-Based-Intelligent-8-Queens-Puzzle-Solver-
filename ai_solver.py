"""
=============================================================================
AI-Based Intelligent 8-Queens Puzzle Solver
Module: ai_solver.py
-----------------------------------------------------------------------------
Implements the Constraint Satisfaction Problem (CSP) formulation and
Backtracking Search Algorithm for solving the 8-Queens puzzle.

Key AI Concepts Demonstrated:
1. CSP Formulation:
   - Variables: X = {Q_0, Q_1, ..., Q_7} representing Queen on Row i
   - Domain: D_i = {0, 1, ..., 7} representing Column indices for Row i
   - Constraints:
     * C_row: Implicitly satisfied by assigning exactly one Queen per row
     * C_col: Q_i != Q_j for all i != j (No two queens in same column)
     * C_diag: |Q_i - Q_j| != |i - j| (No two queens on same diagonal)
2. Backtracking Search:
   - Depth-First Search with constraint pruning
   - Early failure detection (dead-end pruning)
3. Step-by-Step State Space Tree Trace:
   - Records every TRY, CONFLICT, PLACE, and BACKTRACK event
4. Intelligent Partial-Board Solver and Hint Generator:
   - Solves from partial user configurations
   - Detects unwinnable board states even before direct conflicts occur
=============================================================================
"""

import time
from typing import List, Tuple, Dict, Any, Optional

BOARD_SIZE = 8

class EightQueensCSP:
    """
    Constraint Satisfaction Problem (CSP) representation and solver
    for the classic N-Queens (8x8) puzzle.
    """

    def __init__(self, size: int = BOARD_SIZE):
        self.size = size
        # Cached list of all 92 distinct solutions (represented as list of column indices per row)
        self._all_solutions: Optional[List[List[int]]] = None

    # -------------------------------------------------------------------------
    # 1. CORE CONSTRAINT CHECKING
    # -------------------------------------------------------------------------
    @staticmethod
    def is_safe(board: List[int], row: int, col: int) -> Tuple[bool, Optional[Tuple[int, int, str]]]:
        """
        Checks if placing a queen at (row, col) violates any CSP constraint
        against queens already placed in rows 0 to row - 1.

        board[r] = c represents a queen placed at (r, c).

        Returns:
            (is_safe, conflict_info)
            where conflict_info is (conflicting_row, conflicting_col, conflict_type) or None.
        """
        for r in range(row):
            c = board[r]
            if c is None:
                continue

            # Constraint 1: Same column check
            if c == col:
                return False, (r, c, "column")

            # Constraint 2: Diagonal check (|r - row| == |c - col|)
            if abs(r - row) == abs(c - col):
                return False, (r, c, "diagonal")

        return True, None

    # -------------------------------------------------------------------------
    # 2. GENERAL BOARD VALIDATION (Arbitrary User Placements)
    # -------------------------------------------------------------------------
    @staticmethod
    def validate_user_board(placed_queens: List[Tuple[int, int]]) -> Dict[str, Any]:
        """
        Validates an arbitrary set of placed queens (e.g. from user clicks).
        Detects row, column, and diagonal conflicts between all pairs.

        placed_queens: list of (row, col) tuples.
        """
        conflicts = []
        conflicting_queens_set = set()

        n = len(placed_queens)
        for i in range(n):
            r1, c1 = placed_queens[i]
            for j in range(i + 1, n):
                r2, c2 = placed_queens[j]

                conflict_type = None
                if r1 == r2:
                    conflict_type = "row"
                elif c1 == c2:
                    conflict_type = "column"
                elif abs(r1 - r2) == abs(c1 - c2):
                    conflict_type = "diagonal"

                if conflict_type:
                    conflicts.append({
                        "q1": [r1, c1],
                        "q2": [r2, c2],
                        "type": conflict_type
                    })
                    conflicting_queens_set.add((r1, c1))
                    conflicting_queens_set.add((r2, c2))

        is_valid = len(conflicts) == 0
        is_complete = is_valid and (n == BOARD_SIZE)

        return {
            "is_valid": is_valid,
            "is_complete": is_complete,
            "queens_count": n,
            "conflicts": conflicts,
            "conflicting_queens": list(conflicting_queens_set),
            "message": (
                "Puzzle Solved! All 8 queens placed without conflicts." if is_complete
                else f"Valid configuration ({n}/8 queens placed)." if is_valid
                else f"Conflict detected! {len(conflicts)} attack pair(s) found."
            )
        }

    # -------------------------------------------------------------------------
    # 3. BACKTRACKING SOLVER (Instant Solve with Metrics)
    # -------------------------------------------------------------------------
    def solve(self, fixed_queens: Optional[List[Tuple[int, int]]] = None) -> Dict[str, Any]:
        """
        Solves the 8-Queens puzzle using the Backtracking Search Algorithm.
        Optionally respects fixed queen positions provided by the user.

        Returns solution board, solve time (ms), nodes visited, and backtrack count.
        """
        start_time = time.perf_counter()
        nodes_visited = 0
        backtracks = 0

        # Initialize board: board[row] = col
        board: List[Optional[int]] = [None] * self.size
        fixed_rows = {}

        if fixed_queens:
            for r, c in fixed_queens:
                if 0 <= r < self.size and 0 <= c < self.size:
                    fixed_rows[r] = c

        def backtrack(row: int) -> bool:
            nonlocal nodes_visited, backtracks

            # Base condition: all 8 rows successfully populated
            if row == self.size:
                return True

            # If this row is fixed by user input
            if row in fixed_rows:
                col = fixed_rows[row]
                nodes_visited += 1
                safe, _ = self.is_safe(board, row, col)
                if not safe:
                    return False
                board[row] = col
                if backtrack(row + 1):
                    return True
                board[row] = None
                backtracks += 1
                return False

            # Try each column candidate in domain {0, 1, ..., 7}
            for col in range(self.size):
                nodes_visited += 1
                safe, _ = self.is_safe(board, row, col)
                if safe:
                    # Variable assignment
                    board[row] = col

                    # Recursive exploration of next variable (row + 1)
                    if backtrack(row + 1):
                        return True

                    # Prune / Backtrack step
                    board[row] = None
                    backtracks += 1

            return False

        found = backtrack(0)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        solution_coords = []
        if found:
            for r, c in enumerate(board):
                if c is not None:
                    solution_coords.append([r, c])

        return {
            "success": found,
            "solution": solution_coords,
            "raw_board": board if found else [],
            "nodes_visited": nodes_visited,
            "backtracks": backtracks,
            "time_ms": round(elapsed_ms, 3)
        }

    # -------------------------------------------------------------------------
    # 4. STEP-BY-STEP TRACE GENERATOR FOR VISUALIZATION
    # -------------------------------------------------------------------------
    def generate_solution_steps(self, max_steps: int = 1500) -> Dict[str, Any]:
        """
        Executes the Backtracking Algorithm while recording detailed telemetry
        for each action (TRY, CONFLICT, PLACE, BACKTRACK, SUCCESS).
        This trace powers the interactive step-by-step visualizer in the UI.
        """
        steps = []
        board: List[Optional[int]] = [None] * self.size
        nodes_visited = 0
        backtracks = 0
        step_id = 0

        def current_board_coords() -> List[List[int]]:
            coords = []
            for r in range(self.size):
                if board[r] is not None:
                    coords.append([r, board[r]])
            return coords

        def backtrack(row: int) -> bool:
            nonlocal nodes_visited, backtracks, step_id

            if step_id >= max_steps:
                return False

            # Base condition: all 8 rows assigned
            if row == self.size:
                step_id += 1
                steps.append({
                    "step_id": step_id,
                    "action": "SUCCESS",
                    "row": row - 1,
                    "col": board[row - 1],
                    "board": current_board_coords(),
                    "conflicts": [],
                    "message": "Goal state reached! All 8 queens successfully placed with zero constraint violations.",
                    "stats": {
                        "depth": row,
                        "nodes_visited": nodes_visited,
                        "backtracks": backtracks
                    }
                })
                return True

            for col in range(self.size):
                if step_id >= max_steps:
                    return False

                nodes_visited += 1
                step_id += 1

                # Record TRY step
                steps.append({
                    "step_id": step_id,
                    "action": "TRY",
                    "row": row,
                    "col": col,
                    "board": current_board_coords(),
                    "conflicts": [],
                    "message": f"Row {row + 1}: Testing Queen placement at column {col + 1} (algebraic: {chr(97 + col)}{8 - row}).",
                    "stats": {
                        "depth": row,
                        "nodes_visited": nodes_visited,
                        "backtracks": backtracks
                    }
                })

                safe, conflict_info = self.is_safe(board, row, col)

                if not safe:
                    step_id += 1
                    cr, cc, ctype = conflict_info
                    steps.append({
                        "step_id": step_id,
                        "action": "CONFLICT",
                        "row": row,
                        "col": col,
                        "board": current_board_coords(),
                        "conflicts": [{"q1": [row, col], "q2": [cr, cc], "type": ctype}],
                        "message": f"Constraint violation: Queen at Row {row + 1}, Col {col + 1} attacks Queen at Row {cr + 1}, Col {cc + 1} via {ctype} constraint.",
                        "stats": {
                            "depth": row,
                            "nodes_visited": nodes_visited,
                            "backtracks": backtracks
                        }
                    })
                    continue

                # Constraint check passed: Place queen
                board[row] = col
                step_id += 1
                steps.append({
                    "step_id": step_id,
                    "action": "PLACE",
                    "row": row,
                    "col": col,
                    "board": current_board_coords(),
                    "conflicts": [],
                    "message": f"Safe square! Placed Queen at Row {row + 1}, Col {col + 1}. Advancing to Row {row + 2}.",
                    "stats": {
                        "depth": row + 1,
                        "nodes_visited": nodes_visited,
                        "backtracks": backtracks
                    }
                })

                # Recursive call
                if backtrack(row + 1):
                    return True

                # Backtrack step: Dead end reached down this branch
                board[row] = None
                backtracks += 1
                step_id += 1
                steps.append({
                    "step_id": step_id,
                    "action": "BACKTRACK",
                    "row": row,
                    "col": col,
                    "board": current_board_coords(),
                    "conflicts": [],
                    "message": f"Dead end reached! Pruning branch. Removing Queen from Row {row + 1}, Col {col + 1} and backtracking.",
                    "stats": {
                        "depth": row,
                        "nodes_visited": nodes_visited,
                        "backtracks": backtracks
                    }
                })

            return False

        backtrack(0)
        return {
            "total_steps": len(steps),
            "steps": steps,
            "nodes_visited": nodes_visited,
            "backtracks": backtracks
        }

    # -------------------------------------------------------------------------
    # 5. ALL 92 SOLUTIONS DISCOVERY
    # -------------------------------------------------------------------------
    def get_all_solutions(self) -> List[List[List[int]]]:
        """
        Finds all 92 distinct mathematical solutions to the 8-Queens problem.
        Returns a list of solutions, where each solution is a list of [row, col] pairs.
        """
        if self._all_solutions is not None:
            return self._all_solutions

        solutions = []
        board = [None] * self.size

        def find_all(row: int):
            if row == self.size:
                sol = [[r, board[r]] for r in range(self.size)]
                solutions.append(sol)
                return

            for col in range(self.size):
                safe, _ = self.is_safe(board, row, col)
                if safe:
                    board[row] = col
                    find_all(row + 1)
                    board[row] = None

        find_all(0)
        self._all_solutions = solutions
        return self._all_solutions

    # -------------------------------------------------------------------------
    # 6. INTELLIGENT HINT & DEAD-END DETECTOR
    # -------------------------------------------------------------------------
    def get_intelligent_hint(self, placed_queens: List[Tuple[int, int]]) -> Dict[str, Any]:
        """
        Analyzes the current board configuration and provides an AI hint.
        Uses CSP Forward Checking & Backtracking to determine:
        1. If user has active conflicts, pinpoint them.
        2. If user already solved the puzzle, celebrate.
        3. If board is currently valid, check whether this partial board can be solved.
           - If solvable: suggest the optimal next row and column.
           - If NOT solvable: warn user that current partial placement leads to a dead end
             (unwinnable state) and recommend which queen to backtrack!
        """
        # Validate current placements
        val = self.validate_user_board(placed_queens)
        if not val["is_valid"]:
            c = val["conflicts"][0]
            return {
                "status": "conflict",
                "message": f"Resolve existing conflict first! Queens at ({c['q1'][0]+1}, {c['q1'][1]+1}) and ({c['q2'][0]+1}, {c['q2'][1]+1}) attack each other along the same {c['type']}.",
                "conflict": c,
                "hint_square": None
            }

        if len(placed_queens) >= self.size:
            return {
                "status": "already_solved",
                "message": "All 8 queens are already placed safely! Check your solution.",
                "hint_square": None
            }

        # Check if current partial placement is solvable
        solve_result = self.solve(fixed_queens=placed_queens)

        if solve_result["success"]:
            # Solvable: find a queen from the solution that isn't placed yet
            placed_rows = {r for r, c in placed_queens}
            for r, c in solve_result["solution"]:
                if r not in placed_rows:
                    alg = f"{chr(97 + c)}{8 - r}"
                    return {
                        "status": "suggest_move",
                        "hint_square": [r, c],
                        "algebraic": alg,
                        "message": f"AI Hint: Try placing a queen at Row {r + 1}, Column {c + 1} ({alg}). This choice leads to a valid complete solution.",
                        "remaining_to_place": self.size - len(placed_queens)
                    }

        # If not solvable, the partial board is an unsolvable trap!
        # Classical CSP concept: dead end before leaf node
        return {
            "status": "dead_end",
            "hint_square": None,
            "message": "Warning: Although no two queens are directly attacking each other yet, this board state CANNOT lead to any valid solution. Backtrack and adjust your last queen placement.",
            "recommendation": "backtrack"
        }
