import http.server
import json
import os
import sqlite3
import urllib.parse
from datetime import datetime

DB_FILE = 'chess_data.db'
PORT = 8000

OPENINGS = [
    ('C60', 'Ruy Lopez', 'e4 e5 nf3 nc6 bb5'),
    ('B20', 'Sicilian Defense', 'e4 c5'),
    ('C00', 'French Defense', 'e4 e6'),
    ('B10', 'Caro-Kann Defense', 'e4 c6'),
    ('D00', 'Queen\'s Pawn Game', 'd4 d5'),
    ('D06', 'Queen\'s Gambit Declined', 'd4 d5 c4 e6'),
    ('D20', 'Queen\'s Gambit Accepted', 'd4 d5 c4 dxc4'),
    ('E60', 'King\'s Indian Defense', 'd4 nf6 c4 g6 nc3 bg7'),
    ('E10', 'Nimzo-Indian Defense', 'd4 nf6 c4 e6 nc3 bb4'),
    ('A10', 'English Opening', 'c4'),
    ('B00', 'King\'s Pawn Opening', 'e4'),
]

CREATE_TABLES_SQL = [
    '''CREATE TABLE IF NOT EXISTS openings (
        eco TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        moves TEXT NOT NULL
    )''',
    '''CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        played_at TEXT NOT NULL,
        moves TEXT NOT NULL,
        opening_name TEXT,
        eco TEXT
    )''',
    '''CREATE TABLE IF NOT EXISTS game_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        move_number INTEGER NOT NULL,
        san TEXT NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
    )''',
]


def normalize_moves(move_string):
    if not move_string:
        return ''
    text = move_string.strip().lower()
    text = ' '.join(text.replace('.', ' ').split())
    return text


def init_db():
    created = not os.path.exists(DB_FILE)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    for sql in CREATE_TABLES_SQL:
        cursor.execute(sql)
    if created:
        for eco, name, moves in OPENINGS:
            cursor.execute(
                'INSERT OR IGNORE INTO openings (eco, name, moves) VALUES (?, ?, ?)',
                (eco, name, normalize_moves(moves))
            )
    conn.commit()
    return conn


def find_opening(moves_text):
    normalized = normalize_moves(moves_text)
    if not normalized:
        return {'eco': '', 'name': 'No moves yet', 'matched_moves': ''}
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT eco, name, moves FROM openings')
    rows = cursor.fetchall()
    conn.close()

    best = {'eco': '', 'name': 'Unknown Opening', 'matched_moves': '', 'prefix_length': 0}
    for eco, name, moves in rows:
        if not moves:
            continue
        if normalized == moves or normalized.startswith(moves + ' '):
            length = len(moves.split())
            if length > best['prefix_length']:
                best = {'eco': eco, 'name': name, 'matched_moves': moves, 'prefix_length': length}
    if best['prefix_length'] > 0:
        return {'eco': best['eco'], 'name': best['name'], 'matched_moves': best['matched_moves']}
    return {'eco': '', 'name': 'Unknown Opening', 'matched_moves': ''}


def save_game_record(data):
    moves = normalize_moves(data.get('moves', ''))
    opening_name = data.get('opening_name', '')
    eco = data.get('eco', '')
    played_at = data.get('played_at') or datetime.utcnow().isoformat()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO games (played_at, moves, opening_name, eco) VALUES (?, ?, ?, ?)',
        (played_at, moves, opening_name, eco)
    )
    game_id = cursor.lastrowid
    for idx, san in enumerate(moves.split(), start=1):
        cursor.execute(
            'INSERT INTO game_moves (game_id, move_number, san) VALUES (?, ?, ?)',
            (game_id, idx, san)
        )
    conn.commit()
    conn.close()
    return game_id


class ChessHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/opening':
            query = urllib.parse.parse_qs(parsed.query)
            moves = query.get('moves', [''])[0]
            result = find_opening(moves)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            return
        if parsed.path == '/api/openings':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT eco, name, moves FROM openings ORDER BY eco')
            openings = [{'eco': eco, 'name': name, 'moves': moves} for eco, name, moves in cursor.fetchall()]
            conn.close()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'openings': openings}, ensure_ascii=False).encode('utf-8'))
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/log':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body or '{}')
            game_id = save_game_record(data)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'game_id': game_id}, ensure_ascii=False).encode('utf-8'))
            return
        super().do_POST()

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    conn = init_db()
    conn.close()
    server_address = ('', PORT)
    handler = ChessHTTPRequestHandler
    print(f'Serving on http://localhost:{PORT} ...')
    http.server.ThreadingHTTPServer(server_address, handler).serve_forever()
