import express from 'express'
import sqlite3 from 'sqlite3'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, 'chess_openings.db')
const PORT = process.env.PORT || 8000

const OPENING_DATA = [
  { eco: 'A10', name: 'English Opening', move_sequence: 'c4', description: '흔히 백이 c4를 두어 시작하는 오프닝으로, 중앙과 장기적인 대각선 지배를 노립니다.' },
  { eco: 'B00', name: 'King\'s Pawn Opening', move_sequence: 'e4', description: '가장 기본적인 오프닝으로, 중앙을 빠르게 점령하고 말을 전개합니다.' },
  { eco: 'B01', name: 'Scandinavian Defense', move_sequence: 'e4 d5', description: '흑이 즉시 d5로 중앙을 반격하는 오프닝입니다. 전개가 비교적 직선적입니다.' },
  { eco: 'B02', name: 'Alekhine Defense', move_sequence: 'e4 nf6', description: '흑이 백의 중앙 폰을 유도하여 공격한 뒤, 후에 반격하는 비대칭적 오프닝입니다.' },
  { eco: 'B06', name: 'Modern Defense', move_sequence: 'e4 g6', description: '흑이 fianchetto로 비숍을 전개하고 중앙을 지연시키는 유연한 방어법입니다.' },
  { eco: 'B07', name: 'Pirc Defense', move_sequence: 'e4 d6 d4 nf6 nc3 g6', description: '흑이 방어적으로 대기한 뒤 말들을 전개하여 중앙을 반박하는 체계입니다.' },
  { eco: 'B10', name: 'Caro-Kann Defense', move_sequence: 'e4 c6', description: '흑이 d5를 지지하며 중앙을 견고하게 유지하는 안정적인 방어 오프닝입니다.' },
  { eco: 'B20', name: 'Sicilian Defense', move_sequence: 'e4 c5', description: '가장 인기 있는 반격형 오프닝으로, 백의 1.e4에 대한 적극적 대응입니다.' },
  { eco: 'B21', name: 'Sicilian, Smith-Morra Gambit', move_sequence: 'e4 c5 d4 cxd4 c3' },
  { eco: 'B21', name: 'Sicilian Defense, Closed', move_sequence: 'e4 c5 nc3' },
  { eco: 'B30', name: 'Sicilian Defense, Nimzowitsch', move_sequence: 'e4 c5 nf3 d6 d4 cxd4 nf4' },
  { eco: 'B40', name: 'Sicilian Defense, Classical', move_sequence: 'e4 c5 nf3 d6 d4 cxd4 nf3 nc6' },
  { eco: 'B50', name: 'Sicilian Defense, Rossolimo', move_sequence: 'e4 c5 nf3 nc6 bb5' },
  { eco: 'B90', name: 'Sicilian Defense, Najdorf', move_sequence: 'e4 c5 nf3 d6 d4 cxd4 nf3 a6' },
  { eco: 'C00', name: 'French Defense', move_sequence: 'e4 e6', description: '흑이 중앙을 견고하게 지키며 백의 확장을 제한하는 수비형 오프닝입니다.' },
  { eco: 'C20', name: 'King\'s Pawn Game', move_sequence: 'e4 e5', description: '가장 일반적인 오프닝 시작으로, 중앙 점령과 말 전개가 중심입니다.' },
  { eco: 'C40', name: 'King\'s Knight Opening', move_sequence: 'e4 e5 nf3 nc6', description: '백이 나이트를 전개하여 중앙 통제를 강화하고 빠른 게임을 준비합니다.' },
  { eco: 'C50', name: 'Italian Game', move_sequence: 'e4 e5 nf3 nc6 bc4', description: '백이 이탈리안 비숍으로 빠르게 전개하며 f7를 압박하는 고전적 오프닝입니다.' },
  { eco: 'C55', name: 'Two Knights Defense', move_sequence: 'e4 e5 nf3 nc6 bc4 nf6', description: '흑이 두 나이트로 공격적으로 대응하며 중앙과 백진을 도전합니다.' },
  { eco: 'C60', name: 'Ruy Lopez', move_sequence: 'e4 e5 nf3 nc6 bb5', description: '백의 대표적인 오프닝으로, 흑의 c6 나이트를 교란시키며 중앙을 확장합니다.' },
  { eco: 'C65', name: 'Ruy Lopez, Berlin Defense', move_sequence: 'e4 e5 nf3 nc6 bb5 nf6', description: '흑이 안정적으로 대응하는 베를린 방어로, 종종 말 없는 말발이 나옵니다.' },
  { eco: 'C67', name: 'Ruy Lopez, Berlin Defense Deferred', move_sequence: 'e4 e5 nf3 nc6 bb5 nf6 o-o ne4', description: '베를린 변형에서 백이 빠르게 중앙 공격을 시도하는 수순입니다.' },
  { eco: 'C80', name: 'Ruy Lopez, Open', move_sequence: 'e4 e5 nf3 nc6 bb5 a6 ba4 nf6 o-o nxe4', description: '오픈 변형에서는 흑이 즉시 중앙에서 교환하며 복잡한 포지션이 전개됩니다.' },
  { eco: 'D00', name: 'Queen\'s Pawn Game', move_sequence: 'd4 d5', description: '백이 d4로 시작하는 기보로, 중앙을 견고하게 구축하는 시작입니다.' },
  { eco: 'D02', name: 'Queen\'s Pawn Game, Zukertort', move_sequence: 'd4 d5 nf3 nf6 e3' },
  { eco: 'D06', name: 'Queen\'s Gambit Declined', move_sequence: 'd4 d5 c4 e6' },
  { eco: 'D20', name: 'Queen\'s Gambit Accepted', move_sequence: 'd4 d5 c4 dxc4' },
  { eco: 'D30', name: 'Queen\'s Gambit Declined, Ragozin', move_sequence: 'd4 d5 c4 e6 nf3 nf6 nc3 bb4' },
  { eco: 'D37', name: 'Queen\'s Gambit Declined, Exchange', move_sequence: 'd4 d5 c4 e6 nc3 nf6 cxd5 exd5' },
  { eco: 'D40', name: 'Queen\'s Gambit Declined, Semi-Slav', move_sequence: 'd4 d5 c4 c6 nf3 nf6 nc3 e6' },
  { eco: 'D70', name: 'Neo-Gruenfeld Defense', move_sequence: 'd4 nf6 c4 g6 nc3 d5' },
  { eco: 'D80', name: 'Grunfeld Defense', move_sequence: 'd4 nf6 c4 g6 nc3 d5' },
  { eco: 'E00', name: 'Queen\'s Pawn Game, Indian Defense', move_sequence: 'd4 nf6 c4 e6 nc3 b4' },
  { eco: 'E10', name: 'Nimzo-Indian Defense', move_sequence: 'd4 nf6 c4 e6 nc3 bb4' },
  { eco: 'E20', name: 'Nimzo-Indian, Classical', move_sequence: 'd4 nf6 c4 e6 nc3 bb4 e3' },
  { eco: 'E60', name: 'King\'s Indian Defense', move_sequence: 'd4 nf6 c4 g6 nc3 bg7' },
  { eco: 'E70', name: 'King\'s Indian Defense, Fianchetto', move_sequence: 'd4 nf6 c4 g6 g3 bg7' },
  { eco: 'A40', name: 'Queen\'s Pawn Game, London System', move_sequence: 'd4 d5 nf3 nf6 bf4' },
  { eco: 'A45', name: 'Reti Opening', move_sequence: 'nf3 d5 c4' },
  { eco: 'A47', name: 'English Opening, Symmetrical', move_sequence: 'c4 c5' }
]

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

function normalizeMoves(moves) {
  return (moves || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

function initDatabase() {
  const db = new sqlite3.Database(DB_PATH)
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS openings (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      eco TEXT,
      move_sequence TEXT NOT NULL,
      description TEXT
    )`)
    db.all('PRAGMA table_info(openings)', (err, cols) => {
      if (!err && !cols.some(column => column.name === 'description')) {
        db.run('ALTER TABLE openings ADD COLUMN description TEXT')
      }
    })
    db.run(`DELETE FROM openings WHERE rowid NOT IN (SELECT MIN(rowid) FROM openings GROUP BY move_sequence)`)
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_openings_move_sequence ON openings(move_sequence)`)

    db.run(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL,
      moves TEXT NOT NULL,
      opening_name TEXT,
      eco TEXT
    )`)

    const stmt = db.prepare('INSERT OR IGNORE INTO openings (name, eco, move_sequence, description) VALUES (?, ?, ?, ?)')
    for (const opening of OPENING_DATA) {
      stmt.run(opening.name, opening.eco, normalizeMoves(opening.move_sequence), opening.description)
    }
    stmt.finalize()
  })
  return db
}

const db = initDatabase()

app.post('/api/opening', (req, res) => {
  const moves = normalizeMoves(req.body.moves)
  db.all('SELECT name, eco, move_sequence, description FROM openings', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '데이터베이스 조회 중 오류가 발생했습니다.' })
    }

    let bestMatch = { name: 'Unknown Opening', eco: '', move_sequence: '', description: '', prefixLength: 0 }
    const currentMoves = moves ? moves.split(' ') : []

    rows.forEach(row => {
      const sequence = normalizeMoves(row.move_sequence)
      if (!sequence) return
      const sequenceParts = sequence.split(' ')
      const isSameOrPrefix =
        moves === sequence ||
        (moves.startsWith(sequence + ' ') && currentMoves.length >= sequenceParts.length) ||
        sequence.startsWith(moves + ' ')

      if (isSameOrPrefix && sequenceParts.length > bestMatch.prefixLength) {
        bestMatch = {
          name: row.name,
          eco: row.eco,
          move_sequence: sequence,
          description: row.description || '',
          prefixLength: sequenceParts.length
        }
      }
    })

    let continuation = ''
    if (bestMatch.prefixLength > 0) {
      const sequenceParts = bestMatch.move_sequence.split(' ')
      const progress = currentMoves.length
      if (progress < sequenceParts.length) {
        continuation = sequenceParts.slice(progress).join(' ')
      }
    }

    res.json({
      name: bestMatch.name,
      eco: bestMatch.eco,
      move_sequence: bestMatch.move_sequence,
      description: bestMatch.description || '',
      continuation
    })
  })
})

app.post('/api/log', (req, res) => {
  const moves = normalizeMoves(req.body.moves)
  const openingName = req.body.opening_name || ''
  const eco = req.body.eco || ''
  const createdAt = new Date().toISOString()

  db.run(
    'INSERT INTO games (created_at, moves, opening_name, eco) VALUES (?, ?, ?, ?)',
    [createdAt, moves, openingName, eco],
    function (err) {
      if (err) {
        return res.status(500).json({ error: '게임 기록 저장 중 오류가 발생했습니다.' })
      }
      res.json({ success: true, id: this.lastID })
    }
  )
})

app.get('/api/openings', (req, res) => {
  db.all('SELECT name, eco, move_sequence FROM openings ORDER BY eco', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '오프닝 목록을 불러오지 못했습니다.' })
    }
    res.json({ openings: rows })
  })
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`)
})
