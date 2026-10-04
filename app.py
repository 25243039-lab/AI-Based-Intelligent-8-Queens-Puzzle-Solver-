"""
=============================================================================
AI-Based Intelligent 8-Queens Puzzle Solver
Module: app.py
-----------------------------------------------------------------------------
Main Flask application entry point. Serves the web interface and provides
RESTful API endpoints for puzzle validation, Backtracking AI solving,
step-by-step trace generation, intelligent hints, and session metrics.
=============================================================================
"""

import os
from flask import Flask, render_template, request, jsonify
from ai_solver import EightQueensCSP
import database

app = Flask(__name__)
csp_solver = EightQueensCSP()

# Ensure database is initialized at startup
database.init_db()

# -------------------------------------------------------------------------
# VIEW ROUTES
# -------------------------------------------------------------------------
@app.route("/")
def index():
    """Renders the single-page application."""
    return render_template("index.html")

# -------------------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------------------
@app.route("/api/validate", methods=["POST"])
def validate_board():
    """
    Validates a list of placed queens and checks for constraint violations.
    Payload: { "queens": [[row, col], ...] }
    """
    data = request.get_json() or {}
    raw_queens = data.get("queens", [])
    queens = [(int(q[0]), int(q[1])) for q in raw_queens if len(q) == 2]

    result = csp_solver.validate_user_board(queens)
    return jsonify(result)

@app.route("/api/solve", methods=["POST"])
def solve_puzzle():
    """
    Solves the puzzle using CSP Backtracking Search.
    Can optionally accept fixed queens to solve from a partial board state.
    Payload: { "fixed_queens": [[row, col], ...], "record": bool }
    """
    data = request.get_json() or {}
    raw_fixed = data.get("fixed_queens", [])
    fixed_queens = [(int(q[0]), int(q[1])) for q in raw_fixed if len(q) == 2]
    should_record = data.get("record", True)

    result = csp_solver.solve(fixed_queens=fixed_queens if fixed_queens else None)

    if should_record and result["success"]:
        database.record_session(
            player_type="AI",
            mode="ai_instant",
            queens_placed=8,
            is_solved=True,
            time_taken_seconds=result["time_ms"] / 1000.0,
            steps_count=result["nodes_visited"],
            backtracks_count=result["backtracks"],
            notes=f"Solved in {result['nodes_visited']} nodes, {result['backtracks']} backtracks"
        )

    return jsonify(result)

@app.route("/api/solve_steps", methods=["POST"])
def solve_steps():
    """
    Generates the step-by-step search trace for the interactive visualizer.
    Returns complete chronological steps of TRY, CONFLICT, PLACE, and BACKTRACK.
    """
    data = request.get_json() or {}
    max_steps = int(data.get("max_steps", 2000))
    trace = csp_solver.generate_solution_steps(max_steps=max_steps)
    return jsonify(trace)

@app.route("/api/hint", methods=["POST"])
def provide_hint():
    """
    Computes an intelligent hint based on CSP forward search.
    Payload: { "queens": [[row, col], ...] }
    """
    data = request.get_json() or {}
    raw_queens = data.get("queens", [])
    queens = [(int(q[0]), int(q[1])) for q in raw_queens if len(q) == 2]

    hint = csp_solver.get_intelligent_hint(queens)
    return jsonify(hint)

@app.route("/api/all_solutions", methods=["GET"])
def get_all_solutions():
    """
    Returns all 92 distinct mathematical solutions to the 8-Queens puzzle.
    """
    solutions = csp_solver.get_all_solutions()
    return jsonify({
        "total_count": len(solutions),
        "solutions": solutions
    })

@app.route("/api/record_result", methods=["POST"])
def record_result():
    """
    Records a player game session into SQLite.
    Payload: {
        "player_type": "USER" | "AI",
        "mode": "interactive_play",
        "queens_placed": int,
        "is_solved": bool,
        "time_taken_seconds": float,
        "steps_count": int,
        "backtracks_count": int,
        "notes": str
    }
    """
    data = request.get_json() or {}
    player_type = data.get("player_type", "USER")
    mode = data.get("mode", "interactive_play")
    queens_placed = int(data.get("queens_placed", 0))
    is_solved = bool(data.get("is_solved", False))
    time_taken = float(data.get("time_taken_seconds", 0.0))
    steps_count = int(data.get("steps_count", 0))
    backtracks_count = int(data.get("backtracks_count", 0))
    notes = str(data.get("notes", ""))

    session_id = database.record_session(
        player_type=player_type,
        mode=mode,
        queens_placed=queens_placed,
        is_solved=is_solved,
        time_taken_seconds=time_taken,
        steps_count=steps_count,
        backtracks_count=backtracks_count,
        notes=notes
    )

    return jsonify({"success": True, "session_id": session_id})

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Returns recent sessions and summary performance metrics."""
    stats = database.get_performance_stats()
    recent = database.get_recent_sessions(limit=12)
    return jsonify({
        "stats": stats,
        "recent_sessions": recent
    })

@app.route("/api/reset_stats", methods=["POST"])
def reset_stats():
    """Clears history from SQLite."""
    database.clear_all_records()
    return jsonify({"success": True, "message": "Performance history cleared."})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"============================================================")
    print(f" AI-Based Intelligent 8-Queens Puzzle Solver")
    print(f" Starting server at: http://127.0.0.1:{port}")
    print(f"============================================================")
    app.run(host="127.0.0.1", port=port, debug=True)
