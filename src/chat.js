// chat.js — Firebase v9+ Modular SDK chat + presence for OrbitV2
// DB: https://nu-chat-92feb-default-rtdb.firebaseio.com/
// Paths: messages/ | dms/[roomCode]/ | presence/[nickname]

import { initializeApp }              from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  off,
  onDisconnect,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'

// ─── Firebase init ────────────────────────────────────────────────────────────
const app = initializeApp({
  databaseURL: 'https://nu-chat-92feb-default-rtdb.firebaseio.com/',
})
const db = getDatabase(app)

// ─── Nickname ─────────────────────────────────────────────────────────────────
const NICK_KEY = 'orbit_nickname'
let nickname = localStorage.getItem(NICK_KEY)
if (!nickname) {
  nickname = 'Guest_' + Math.floor(1000 + Math.random() * 9000)
  localStorage.setItem(NICK_KEY, nickname)
}

// ─── DOM refs (resolved lazily so this module can import before DOM ready) ───
const el = id => document.getElementById(id)

// ─── Presence ─────────────────────────────────────────────────────────────────
const connectedRef    = ref(db, '.info/connected')
const myPresenceRef   = ref(db, `presence/${nickname}`)

onValue(connectedRef, snap => {
  if (!snap.val()) return
  set(myPresenceRef, { nickname, status: 'online', since: serverTimestamp() })
  onDisconnect(myPresenceRef).remove()
})

// ─── Online count ─────────────────────────────────────────────────────────────
onValue(ref(db, 'presence'), snap => {
  const countEl = el('online-count')
  if (countEl) countEl.textContent = snap.numChildren()
})

// ─── Chat state ───────────────────────────────────────────────────────────────
let currentMode     = 'global'  // 'global' | 'dm'
let currentRoomCode = ''
let activeRef       = null      // ref currently being listened to
let activeUnsub     = null      // unsubscribe fn returned by onChildAdded

function getMessagesRef() {
  return currentMode === 'dm'
    ? ref(db, `dms/${currentRoomCode}`)
    : ref(db, 'messages')
}

// ─── XSS protection ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Render one message ───────────────────────────────────────────────────────
function renderMessage(snap) {
  const messagesEl = el('chat-messages')
  if (!messagesEl) return

  const data = snap.val()
  if (!data || !data.text) return

  const isSelf = data.nickname === nickname

  const div = document.createElement('div')
  div.className = [
    'flex flex-col gap-0.5 max-w-[80%]',
    isSelf ? 'self-end items-end' : 'self-start items-start',
  ].join(' ')

  div.innerHTML = `
    <span class="text-xs text-white/30 px-1">${escapeHtml(data.nickname)}</span>
    <div class="px-3 py-2 rounded-2xl text-sm break-words
      ${isSelf
        ? 'bg-white/10 text-white rounded-br-sm'
        : 'bg-white/5  text-white/80 rounded-bl-sm'}">
      ${escapeHtml(data.text)}
    </div>
  `

  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

// ─── Load / switch message path ───────────────────────────────────────────────
function loadMessages() {
  // Tear down previous listener
  if (activeRef && activeUnsub) {
    off(activeRef, 'child_added', activeUnsub)
    activeUnsub = null
    activeRef   = null
  }

  const messagesEl = el('chat-messages')
  if (messagesEl) messagesEl.innerHTML = ''

  activeRef   = getMessagesRef()
  activeUnsub = onChildAdded(activeRef, renderMessage)
}

// ─── Public: switch between global and DM ────────────────────────────────────
export function switchChat(mode, roomCode = '') {
  if (mode === 'dm') {
    const code = roomCode.trim()
    if (!code) {
      console.warn('[OrbitV2 chat] DM mode requires a room code.')
      return
    }
    currentMode     = 'dm'
    currentRoomCode = code
  } else {
    currentMode     = 'global'
    currentRoomCode = ''
  }
  loadMessages()
}

// ─── Public: send a message ───────────────────────────────────────────────────
export function sendMessage() {
  const chatInput = el('chat-input')
  if (!chatInput) return

  const text = chatInput.value.trim()
  if (!text) return

  push(getMessagesRef(), {
    nickname,
    text,
    timestamp: serverTimestamp(),
  })

  chatInput.value = ''
  chatInput.focus()
}

// ─── Wire form submit ─────────────────────────────────────────────────────────
function bindForm() {
  const form = el('chat-form')
  if (!form) return
  form.addEventListener('submit', e => {
    e.preventDefault()
    sendMessage()
  })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { bindForm(); loadMessages() })
} else {
  bindForm()
  loadMessages()
}
