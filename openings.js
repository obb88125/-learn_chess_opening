const moveInput = document.getElementById('moveInput')
const addMoveBtn = document.getElementById('addMoveBtn')
const resetBtn = document.getElementById('resetBtn')
const saveGameBtn = document.getElementById('saveGameBtn')
const movesDisplay = document.getElementById('movesDisplay')
const matchedOpening = document.getElementById('matchedOpening')
const openingInfo = document.getElementById('openingInfo')
const serverMessage = document.getElementById('serverMessage')

let moves = []
let currentOpening = {eco: '', name: '아직 기보가 없습니다.', matched_moves: ''}

function renderMoves() {
  if (!moves.length) {
    movesDisplay.textContent = '아직 수가 입력되지 않았습니다.'
    openingInfo.innerHTML = '현재 오프닝: <strong>아직 기보가 없습니다.</strong>'
    matchedOpening.textContent = '-'
    return
  }
  movesDisplay.textContent = moves.join(' ')
  openingInfo.innerHTML = `현재 오프닝: <strong>${currentOpening.name}</strong> ${currentOpening.eco ? `(${currentOpening.eco})` : ''}`
  matchedOpening.textContent = currentOpening.matched_moves ? `매치된 수열: ${currentOpening.matched_moves}` : '해당 수열과 일치하는 오프닝이 없습니다.'
}

function normalizeMove(move) {
  return move.trim().replace(/\s+/g, '')
}

async function refreshOpening() {
  const query = encodeURIComponent(moves.join(' '))
  try {
    const response = await fetch(`/api/opening?moves=${query}`)
    if (response.ok) {
      const data = await response.json()
      currentOpening = data
      renderMoves()
      serverMessage.textContent = ''
    } else {
      serverMessage.textContent = '오프닝 검색 서버에 연결할 수 없습니다.'
    }
  } catch (error) {
    serverMessage.textContent = '서버가 실행 중인지 확인하세요. 현재는 로컬 파일로 열렸거나 API를 찾을 수 없습니다.'
  }
}

function addMove() {
  const raw = normalizeMove(moveInput.value)
  if (!raw) return
  moves.push(raw)
  moveInput.value = ''
  refreshOpening()
}

function resetMoves() {
  moves = []
  currentOpening = {eco: '', name: '아직 기보가 없습니다.', matched_moves: ''}
  renderMoves()
}

async function saveGame() {
  if (!moves.length) {
    serverMessage.textContent = '먼저 수를 입력한 뒤에 저장하세요.'
    return
  }
  const payload = {
    moves: moves.join(' '),
    opening_name: currentOpening.name,
    eco: currentOpening.eco,
    played_at: new Date().toISOString()
  }
  try {
    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (response.ok) {
      const data = await response.json()
      serverMessage.textContent = `저장 완료: game_id=${data.game_id}`
    } else {
      serverMessage.textContent = '게임을 저장하지 못했습니다. 서버 응답을 확인하세요.'
    }
  } catch (error) {
    serverMessage.textContent = '서버에 연결할 수 없습니다. `python server.py`로 실행한 뒤 다시 시도하세요.'
  }
}

addMoveBtn?.addEventListener('click', addMove)
moveInput?.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    addMove()
  }
})
resetBtn?.addEventListener('click', resetMoves)
saveGameBtn?.addEventListener('click', saveGame)

renderMoves()
