import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

function normalizeMoves(moves) {
  return (moves || '').toString().trim().replace(/\s+/g, ' ')
}

function getStatus(chess) {
  if (chess.isCheckmate()) return '체크메이트'
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) return '무승부'
  return chess.turn() === 'w' ? '흰색 차례' : '검정 차례'
}

function App() {
  const chess = useMemo(() => new Chess(), [])
  const [position, setPosition] = useState(chess.fen())
  const [history, setHistory] = useState([])
  const [opening, setOpening] = useState({
    name: '오프닝을 선택 중입니다.',
    eco: '',
    move_sequence: '',
    continuation: '',
    description: ''
  })
  const [status, setStatus] = useState('흰색 차례')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const syncOpening = useCallback(async (movesText) => {
    setLoading(true)
    setMessage('오프닝 정보를 불러오는 중...')
    try {
      const response = await fetch('/api/opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: normalizeMoves(movesText) })
      })
      if (!response.ok) throw new Error('응답 실패')
      const data = await response.json()
      setOpening(data)
      setMessage('')
    } catch (error) {
      setOpening({ name: '오프닝 정보를 가져올 수 없습니다.', eco: '', move_sequence: '', continuation: '' })
      setMessage('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    syncOpening('')
    setStatus(getStatus(chess))
  }, [chess, syncOpening])

  const updateGameState = useCallback(
    (nextHistory) => {
      setHistory(nextHistory)
      setPosition(chess.fen())
      setStatus(getStatus(chess))
      syncOpening(nextHistory.join(' '))
    },
    [chess, syncOpening]
  )

  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      if (move) {
        updateGameState(chess.history({ verbose: false }))
        return true
      }
      return false
    },
    [chess, updateGameState]
  )

  const resetGame = () => {
    chess.reset()
    setHistory([])
    setOpening({ name: '오프닝을 선택 중입니다.', eco: '', move_sequence: '', continuation: '' })
    setPosition(chess.fen())
    setStatus(getStatus(chess))
    setMessage('')
    syncOpening('')
  }

  const saveGame = async () => {
    const movesText = normalizeMoves(history.join(' '))
    if (!movesText) {
      setMessage('먼저 수를 두고 저장하세요.')
      return
    }

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: movesText, opening_name: opening.name, eco: opening.eco })
      })
      if (!response.ok) throw new Error('저장 실패')
      const data = await response.json()
      setMessage(`게임이 저장되었습니다. ID: ${data.id}`)
    } catch (error) {
      setMessage('저장에 실패했습니다. 서버 연결을 확인하세요.')
    }
  }

  const undoMove = () => {
    const lastMove = chess.undo()
    if (!lastMove) {
      setMessage('되돌릴 수 있는 수가 없습니다.')
      return
    }
    const nextHistory = chess.history({ verbose: false })
    updateGameState(nextHistory)
    setMessage('한 수 되돌렸습니다.')
  }

  const continuation = opening.continuation || '현재 위치에서 알려진 다음 수가 없습니다.'

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>체스 오프닝 인식</h1>
        <p>이동을 두면 자동으로 오프닝 이름과 ECO 코드를 찾습니다.</p>
      </header>

      <main className="app-main">
        <section className="board-section">
          <Chessboard position={position} onPieceDrop={onPieceDrop} boardWidth={520} />
          <div className="board-controls">
            <button type="button" onClick={resetGame}>초기화</button>
            <button type="button" onClick={undoMove}>뒤로가기</button>
            <button type="button" onClick={saveGame}>DB에 저장</button>
          </div>
        </section>

        <section className="info-section">
          <div className="status-box">
            <div>상태: <strong>{status}</strong></div>
            <div>이동 기록: <strong>{history.join(' ') || '아직 수가 없습니다.'}</strong></div>
          </div>
          <div className="opening-box">
            <div className="opening-row"><span>오프닝 이름</span><strong>{opening.name}</strong></div>
            <div className="opening-row"><span>ECO 코드</span><strong>{opening.eco || '-'}</strong></div>
            <div className="opening-row"><span>메인라인</span><strong>{opening.move_sequence || '-'}</strong></div>
            <div className="opening-row"><span>남은 수</span><strong>{continuation}</strong></div>
            <div className="opening-description"><strong>설명</strong><p>{opening.description || '이 오프닝에 대한 설명이 없습니다.'}</p></div>
          </div>
          {loading && <div className="message">오프닝을 분석 중입니다...</div>}
          {message && <div className="message">{message}</div>}
        </section>
      </main>
    </div>
  )
}

export default App
