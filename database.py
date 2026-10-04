"""
=============================================================================
AI-Based Intelligent 8-Queens Puzzle Solver
Module: database.py
-----------------------------------------------------------------------------
Lightweight SQLite database storage for recording game runs, AI solves,
player performance metrics, and generating comparative statistics
(Human vs AI solving time, steps, success rates).
=============================================================================
"""

import sqlite3
import os
from typing import Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "queens_results.db")

def get_connection():
    """Returns a SQLite database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite schema if not already present."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_type TEXT NOT NULL,         -- 'USER' or 'AI'
            mode TEXT NOT NULL,                -- 'interactive_play', 'ai_instant', 'ai_step'
            queens_placed INTEGER NOT NULL,    -- 0 to 8
            is_solved INTEGER NOT NULL,        -- 1 (True) or 0 (False)
            time_taken_seconds REAL NOT NULL,  -- duration in seconds
            steps_count INTEGER DEFAULT 0,     -- user moves or AI search nodes
            backtracks_count INTEGER DEFAULT 0,-- user undo/backtracks or AI backtracks
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def record_session(
    player_type: str,
    mode: str,
    queens_placed: int,
    is_solved: bool,
    time_taken_seconds: float,
    steps_count: int = 0,
    backtracks_count: int = 0,
    notes: str = ""
) -> int:
    """Inserts a new game session record into the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO game_sessions (
            player_type, mode, queens_placed, is_solved,
            time_taken_seconds, steps_count, backtracks_count, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        player_type,
        mode,
        queens_placed,
        1 if is_solved else 0,
        round(time_taken_seconds, 3),
        steps_count,
        backtracks_count,
        notes
    ))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id

def get_recent_sessions(limit: int = 15) -> List[Dict[str, Any]]:
    """Returns recent session records for the performance dashboard."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, player_type, mode, queens_placed, is_solved,
               time_taken_seconds, steps_count, backtracks_count,
               strftime('%Y-%m-%d %H:%M:%S', created_at) as created_at
        FROM game_sessions
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_performance_stats() -> Dict[str, Any]:
    """
    Computes aggregate metrics for college project presentation:
    - Total Games played
    - User vs AI win/solve count
    - Average time taken (Human vs AI)
    - Average backtracks
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Total games & solved
    cursor.execute("""
        SELECT 
            COUNT(*) as total_runs,
            SUM(CASE WHEN is_solved = 1 THEN 1 ELSE 0 END) as total_solved,
            SUM(CASE WHEN player_type = 'USER' THEN 1 ELSE 0 END) as user_total,
            SUM(CASE WHEN player_type = 'USER' AND is_solved = 1 THEN 1 ELSE 0 END) as user_solved,
            SUM(CASE WHEN player_type = 'AI' THEN 1 ELSE 0 END) as ai_total,
            SUM(CASE WHEN player_type = 'AI' AND is_solved = 1 THEN 1 ELSE 0 END) as ai_solved,
            AVG(CASE WHEN player_type = 'USER' AND is_solved = 1 THEN time_taken_seconds END) as avg_user_time,
            AVG(CASE WHEN player_type = 'AI' AND is_solved = 1 THEN time_taken_seconds END) as avg_ai_time,
            AVG(CASE WHEN player_type = 'AI' THEN backtracks_count END) as avg_ai_backtracks
        FROM game_sessions
    """)
    row = dict(cursor.fetchone())
    conn.close()

    total_runs = row["total_runs"] or 0
    user_total = row["user_total"] or 0
    user_solved = row["user_solved"] or 0
    ai_total = row["ai_total"] or 0
    ai_solved = row["ai_solved"] or 0

    user_win_rate = round((user_solved / user_total) * 100, 1) if user_total > 0 else 0.0
    ai_win_rate = round((ai_solved / ai_total) * 100, 1) if ai_total > 0 else 100.0

    return {
        "total_runs": total_runs,
        "total_solved": row["total_solved"] or 0,
        "user_stats": {
            "total_games": user_total,
            "solved": user_solved,
            "win_rate_percent": user_win_rate,
            "avg_time_seconds": round(row["avg_user_time"] or 0, 2)
        },
        "ai_stats": {
            "total_games": ai_total,
            "solved": ai_solved,
            "win_rate_percent": ai_win_rate,
            "avg_time_seconds": round(row["avg_ai_time"] or 0, 4),
            "avg_backtracks": round(row["avg_ai_backtracks"] or 0, 1)
        }
    }

def clear_all_records() -> bool:
    """Clears history from database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM game_sessions")
    conn.commit()
    conn.close()
    return True
