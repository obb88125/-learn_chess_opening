const boardEl = document.getElementById('board')
const turnEl = document.getElementById('turn')
const restartBtn = document.getElementById('restart')
const modeSelect = document.getElementById('mode')
const depthSelect = document.getElementById('depth')
const promoModal = document.getElementById('promoModal')
const legendEl = document.querySelector('.legend')

const UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
}

let game = null
let selected = null
let legalMoves = []
let pendingPromotion = null
let mode = 'ai'
let aiDepth = 3

function initBoard(){
  game = new Chess()
  selected = null
  legalMoves = []
  pendingPromotion = null
  mode = modeSelect?.value || 'ai'
  aiDepth = parseInt(depthSelect?.value || '3')
  renderBoard()
  updateStatus()
}

function renderBoard(){
  if(!boardEl) return
  boardEl.innerHTML = ''
  const squares = game.board()
  const checkSquare = getCheckSquare(game)

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement('div')
      sq.className = 'square ' + (((r+c)%2) ? 'dark' : 'light')
      if(checkSquare && checkSquare.r===r && checkSquare.c===c) sq.classList.add('check')
      sq.dataset.r = r
      sq.dataset.c = c
      const piece = squares[r][c]
      if(piece){ const key = piece.color + piece.type.toUpperCase(); sq.textContent = UNICODE[key] }
      if(selected && selected.r==r && selected.c==c) sq.classList.add('selected')
      if(legalMoves.some(m=>m.to.r==r && m.to.c==c)) sq.classList.add('move')
      sq.addEventListener('click', onSquareClick)
      boardEl.appendChild(sq)
    }
  }
}

function onSquareClick(e){
  const r = +e.currentTarget.dataset.r
  const c = +e.currentTarget.dataset.c
  const square = toCoords(r,c)
  const piece = game.get(square)

  if(selected){
    const move = legalMoves.find(m=>m.to.r==r && m.to.c==c)
    if(move){
      const moveObj = {
        from: toCoords(selected.r, selected.c),
        to: square,
        promotion: 'q'
      }
      if(move.promotion && mode==='local'){
        pendingPromotion = moveObj
        showPromotionModal()
      }else{
        makeMove(moveObj)
      }
      return
    }
  }

  if(piece && piece.color===game.turn() && (mode==='local' || game.turn()!=='b')){
    selected = {r,c}
    legalMoves = getLegalMoves(square)
  } else {
    selected = null
    legalMoves = []
  }
  renderBoard()
}

function getLegalMoves(square){
  const moves = game.moves({square, verbose:true})
  return moves.map(m => ({from: fromCoords(m.from), to: fromCoords(m.to), promotion: m.promotion}))
}

function getCheckSquare(gameInstance){
  if(!gameInstance.in_check()) return null
  const boardState = gameInstance.board()
  const kingColor = gameInstance.turn()
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const piece = boardState[r][c]
      if(piece && piece.type==='k' && piece.color===kingColor){
        return {r, c}
      }
    }
  }
  return null
}

function toCoords(r,c){
  const file = String.fromCharCode('a'.charCodeAt(0) + c)
  const rank = 8 - r
  return `${file}${rank}`
}

function fromCoords(square){
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank = 8 - parseInt(square[1],10)
  return {r: rank, c: file}
}

function makeMove(move){
  const result = game.move(move)
  if(!result) return
  selected = null
  legalMoves = []
  renderBoard()
  updateStatus()
  if(game.game_over()) return
  if(mode==='ai' && game.turn()==='b'){
    setTimeout(()=>aiPlay(), 150)
  }
}

function showPromotionModal(){ promoModal?.classList.remove('hidden') }
function hidePromotionModal(){ promoModal?.classList.add('hidden') }

promoModal?.addEventListener('click',(event)=>{
  const piece = event.target.dataset?.piece
  if(!piece) return
  if(!pendingPromotion) return
  pendingPromotion.promotion = piece
  makeMove(pendingPromotion)
  pendingPromotion = null
  hidePromotionModal()
})

function updateStatus(){
  const turn = game.turn() === 'w' ? '흰색' : '검정'
  const state = game.game_over() ? (game.in_checkmate() ? '체크메이트' : '무승부') : (game.in_check() ? '체크' : '진행중')
  if(turnEl) turnEl.textContent = `턴: ${turn}`
  if(legendEl) legendEl.textContent = `상태: ${state} · ${mode==='ai' ? 'AI 상대' : '로컬 대국'} · 깊이 ${aiDepth}`
}

function aiPlay(){
  if(game.game_over()) return
  const depth = aiDepth
  const best = findBestMove(game, depth)
  if(best) makeMove(best)
}

const MATE_SCORE = 100000

const transpositionTable = new Map()

function getMoveScore(move){
  let score = 0
  if(move.captured) score += PIECE_VALUES[move.captured] * 10
  if(move.promotion) score += 8000
  if(move.flags && move.flags.includes('c')) score += 50
  return score
}

function orderMoves(moves){
  return moves.slice().sort((a,b)=>getMoveScore(b) - getMoveScore(a))
}

function terminalScore(gameInstance, color){
  if(gameInstance.in_checkmate()){
    return (gameInstance.turn()==='w' ? -MATE_SCORE : MATE_SCORE) * color
  }
  return 0
}

function quiescence(gameInstance, alpha, beta, color, depth = 1){
  const standPat = color * evaluateBoard(gameInstance)
  if(depth===0) return standPat
  if(standPat >= beta) return beta
  if(alpha < standPat) alpha = standPat

  const captures = orderMoves(gameInstance.moves({verbose:true}).filter(m=>m.captured))
  for(const move of captures){
    gameInstance.move(move)
    const score = -quiescence(gameInstance, -beta, -alpha, -color, depth-1)
    gameInstance.undo()
    if(score >= beta) return beta
    if(score > alpha) alpha = score
  }
  return alpha
}

function negamax(gameInstance, depth, alpha, beta, color){
  const key = gameInstance.fen()
  const cached = transpositionTable.get(key)
  const alphaOrig = alpha
  if(cached && cached.depth >= depth){
    if(cached.flag === 'EXACT') return cached.value
    if(cached.flag === 'ALPHA' && cached.value <= alpha) return alpha
    if(cached.flag === 'BETA' && cached.value >= beta) return beta
  }

  if(gameInstance.game_over()) return terminalScore(gameInstance, color)
  if(depth===0) return quiescence(gameInstance, alpha, beta, color)

  let maxEval = -Infinity
  const moves = orderMoves(gameInstance.moves({verbose:true}))
  for(const move of moves){
    gameInstance.move(move)
    const score = -negamax(gameInstance, depth-1, -beta, -alpha, -color)
    gameInstance.undo()
    if(score > maxEval) maxEval = score
    if(score > alpha) alpha = score
    if(alpha >= beta) break
  }

  let flag = 'EXACT'
  if(maxEval <= alphaOrig) flag = 'BETA'
  else if(maxEval >= beta) flag = 'ALPHA'
  transpositionTable.set(key, {depth, value: maxEval, flag})

  return maxEval
}

function findBestMove(gameInstance, depth){
  const moves = orderMoves(gameInstance.moves({verbose:true}))
  let bestMove = null
  let bestScore = -Infinity
  const color = gameInstance.turn()==='w' ? 1 : -1
  for(const move of moves){
    gameInstance.move(move)
    const score = -negamax(gameInstance, depth-1, -Infinity, Infinity, -color)
    gameInstance.undo()
    if(score > bestScore){ bestScore = score; bestMove = move }
  }
  return bestMove
}

const PIECE_VALUES = {p:100,n:320,b:330,r:500,q:900,k:20000}
const PST = {
  p: [0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,0,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
}

function evaluateBoard(gameInstance){
  let total = 0
  const board = gameInstance.board()
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const square = board[r][c]
      if(!square) continue
      const value = PIECE_VALUES[square.type] || 0
      const sign = square.color==='w' ? 1 : -1
      const index = square.color==='w' ? r*8+c : (7-r)*8+(7-c)
      const pst = PST[square.type] ? PST[square.type][index] : 0
      total += sign * (value + pst)
    }
  }
  return total
}

restartBtn?.addEventListener('click', initBoard)
modeSelect?.addEventListener('change', (e)=>{ mode = e.target.value; initBoard() })
depthSelect?.addEventListener('change', (e)=>{ aiDepth = parseInt(e.target.value,10) || 3 })

initBoard()
