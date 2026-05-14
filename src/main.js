import './style.css'
import { initializeApp } from 'firebase/app'

// firebase/database is dynamically imported on first use (chat/auth/profile).
// These bindings are populated by _ensureFb(); calling them before that throws.
let getDatabase, ref, push, set, remove, get, onValue, onChildAdded, onDisconnect, serverTimestamp

// ═══════════════════════════════════════════════════════════════════════════
// DATA — add/remove entries here; UI updates automatically
// ═══════════════════════════════════════════════════════════════════════════

const BRAND       = 'Orbit'
const TAGLINE     = 'your portal'
const APP_VERSION = '1.1.0'
const CHANGELOG   = [
  'Real accounts — username & password, no email required',
  'Direct messages — DM any user by their username',
  'Live online count & presence tracking',
  'Game overlay dock with fullscreen & save',
  'All 8 game providers with badges & search',
]

const APPS_DATA = [
  { id: 'youtube', name: 'YouTube', icon: 'youtube', url: 'https://youtube.com',         color: '#FF0000' },
  { id: 'discord', name: 'Discord', icon: 'discord', url: 'https://discord.com',         color: '#5865F2' },
  { id: 'github',  name: 'GitHub',  icon: 'github',  url: 'https://github.com',          color: '#ffffff' },
  { id: 'twitch',  name: 'Twitch',  icon: 'twitch',  url: 'https://twitch.tv',           color: '#9146FF' },
  { id: 'gfnow',   name: 'GF Now',  icon: 'nvidia',  url: 'https://play.geforcenow.com', color: '#76B900' },
]

const DOCK_ITEMS = [
  { iconFn: icoHome,        label: 'Home',     view: 'home'     },
  { iconFn: icoGlobe,       label: 'Browser',  view: 'browser'  },
  { iconFn: icoGamepad,     label: 'Games',    view: 'games'    },
  { iconFn: icoTv,          label: 'TV',       view: 'tv'       },
  { iconFn: icoMsgSquare,   label: 'Chat',     view: 'chat'     },
  { iconFn: icoMusic,       label: 'Music',    view: 'music'    },
  { iconFn: icoSparkles,    label: 'AI',       view: 'ai'       },
  { iconFn: icoUser,        label: 'Profile',  view: 'profile'  },
  { iconFn: icoSettings,    label: 'Settings', view: 'settings' },
]

const BROWSER_HOME    = 'https://duckduckgo.com'
const BROWSER_SEARCH  = q => `https://duckduckgo.com/lite/?q=${encodeURIComponent(q)}`
// ↓ YOUR INTERSTELLAR URL — swap to update
const PROXY_HOST      = 'https://interstellar-production-c463.up.railway.app'

const TMDB_KEY        = 'fb7bb23f03b6994dafc674c074d01761'
const WATCH_SOURCES   = [
  { id: 'vidlink',   name: 'VidLink',    urls: { movie: 'https://vidlink.pro/movie/{id}',                              tv: 'https://vidlink.pro/tv/{id}/{season}/{episode}'                      } },
  { id: 'vidsrcxyz', name: 'VidSrc',     urls: { movie: 'https://vidsrc.xyz/embed/movie/{id}',                         tv: 'https://vidsrc.xyz/embed/tv/{id}/{season}/{episode}'                 } },
  { id: 'vidsrcrip', name: 'VidSrc.rip', urls: { movie: 'https://vidsrc.rip/embed/movie/{id}',                         tv: 'https://vidsrc.rip/embed/tv/{id}/{season}/{episode}'                 } },
  { id: 'videasy',   name: 'Videasy',    urls: { movie: 'https://player.videasy.net/movie/{id}?color=8834ec',           tv: 'https://player.videasy.net/tv/{id}/{season}/{episode}?color=8834ec' } },
]

// Named theme presets — background always pure black
const THEMES = {
  cherry: { label: 'CHERRY', rgb: '255,  60, 145', hex: '#ff3c91'                }, // Neon Pink   — high-energy soft pink bloom
  blood:  { label: 'BLOOD',  rgb: '255,   0,   0', hex: '#ff0000' }, // Pure red — same render pipeline as all themes
  pulse:  { label: 'PULSE',  rgb: '20,  140, 255', hex: '#148cff'                }, // Elec. Blue  — sharp neon like a live wire
  toxic:  { label: 'TOXIC',  rgb: '80,  255,  60', hex: '#50ff3c'                }, // Acid Green  — bright radioactive glow
  abyss:  { label: 'ABYSS',  rgb: '110,  35, 205', hex: '#6e23cd'                }, // Deep Purple — dark moody violet
  nova:   { label: 'NOVA',   rgb: '255, 255, 255', hex: '#ffffff'                }, // Pure White  — blinding white/silver aura
  ember:  { label: 'EMBER',  rgb: '255, 105,  10', hex: '#ff690a'                }, // Hot Orange  — fiery like a dying sun
  crown:  { label: 'CROWN',  rgb: '255, 190,   0', hex: '#ffbe00'                }, // Gold        — rich metallic glow
}
// Flat array used wherever iteration is needed (settings swatches, etc.)
const ACCENT_COLORS = Object.values(THEMES)

// ── Firebase / Auth / Chat ────────────────────────────────────────────────

// Firebase web config — these values are PUBLIC by design (they identify
// the project, not authenticate). Real protection lives in security rules.
// Env vars override at build time for forks/staging environments.
const FIREBASE_CONFIG_FALLBACK = {
  apiKey:            'AIzaSyAu_7Cl7y692z8WRVCM59gSRrHcfLUw3GA',
  authDomain:        'nu-chat-92feb.firebaseapp.com',
  databaseURL:       'https://nu-chat-92feb-default-rtdb.firebaseio.com',
  projectId:         'nu-chat-92feb',
  storageBucket:     'nu-chat-92feb.firebasestorage.app',
  messagingSenderId: '401431459371',
  appId:             '1:401431459371:web:ecab8ef0a819b28a865c6e',
}
const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FB_API_KEY            || FIREBASE_CONFIG_FALLBACK.apiKey,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN        || FIREBASE_CONFIG_FALLBACK.authDomain,
  databaseURL:       import.meta.env.VITE_FB_DATABASE_URL       || FIREBASE_CONFIG_FALLBACK.databaseURL,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID         || FIREBASE_CONFIG_FALLBACK.projectId,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET     || FIREBASE_CONFIG_FALLBACK.storageBucket,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || FIREBASE_CONFIG_FALLBACK.messagingSenderId,
  appId:             import.meta.env.VITE_FB_APP_ID             || FIREBASE_CONFIG_FALLBACK.appId,
}
// Fail loud if config still incomplete — better than cryptic Firebase error
if (!FIREBASE_CONFIG.databaseURL || !FIREBASE_CONFIG.projectId) {
  console.error('[Firebase] missing databaseURL or projectId — chat/auth will not work', FIREBASE_CONFIG)
}
const CHAT_NICK_KEY = 'orbit_chat_nickname'

// Guest fallback nick used when not logged in
const _guestNick = (() => {
  let n = localStorage.getItem(CHAT_NICK_KEY)
  if (!n) { n = 'Guest_' + Math.floor(1000 + Math.random() * 9000); localStorage.setItem(CHAT_NICK_KEY, n) }
  return n
})()

let _authUser    = null   // Firebase Auth user object
let _accountName = null   // username string from users node

function _currentNick() { return _accountName || _guestNick }

const _fbApp = initializeApp(FIREBASE_CONFIG)
let _fbDb = null
let _fbStorage = null
let _fbStorageRef, _fbStorageUploadBytes, _fbStorageGetDownloadURL
let _fbStorageReady = null
function _ensureFbStorage() {
  if (_fbStorageReady) return _fbStorageReady
  _fbStorageReady = import('firebase/storage').then(mod => {
    _fbStorage              = mod.getStorage(_fbApp)
    _fbStorageRef           = mod.ref
    _fbStorageUploadBytes   = mod.uploadBytes
    _fbStorageGetDownloadURL= mod.getDownloadURL
    return mod
  })
  return _fbStorageReady
}

// Lazy-loads firebase/database on first use. Subsequent calls are a no-op.
let _fbReady = null
function _ensureFb() {
  if (_fbReady) return _fbReady
  _fbReady = import('firebase/database').then(mod => {
    getDatabase     = mod.getDatabase
    ref             = mod.ref
    push            = mod.push
    set             = mod.set
    remove          = mod.remove
    get             = mod.get
    onValue         = mod.onValue
    onChildAdded    = mod.onChildAdded
    onDisconnect    = mod.onDisconnect
    serverTimestamp = mod.serverTimestamp
    _fbDb = getDatabase(_fbApp)
    // Subscriptions that previously ran at module top-level
    onValue(ref(_fbDb, '.info/connected'), snap => { if (snap.val()) _setPresence() })
    onValue(ref(_fbDb, 'presence'),        snap => {
      const val = (snap && typeof snap.val === 'function') ? (snap.val() || {}) : (snap || {})
      const keys = Object.keys(val)
      const el = document.getElementById('online-count')
      if (el) el.textContent = keys.length
      _updatePresenceSidebar(val)
    })
    return mod
  })
  return _fbReady
}

// ── Presence ──────────────────────────────────────────────────────────────

let _presenceKey = null

function _setPresence() {
  if (!_fbDb) return  // not bootstrapped yet — no-op
  if (_presenceKey && _presenceKey !== _currentNick()) {
    remove(ref(_fbDb, `presence/${_presenceKey}`)).catch(() => {})
  }
  _presenceKey = _currentNick()
  const pRef = ref(_fbDb, `presence/${_presenceKey}`)
  set(pRef, { username: _presenceKey, uid: _authUser?.uid ?? null, since: serverTimestamp() })
  onDisconnect(pRef).remove()
}

function _updatePresenceSidebar(val) {
  const box = document.getElementById('chat-sidebar-users')
  if (!box) return
  box.innerHTML = ''
  // Accept either a DataSnapshot (legacy callers) or a plain object
  const obj = (val && typeof val.val === 'function') ? (val.val() || {}) : (val || {})
  for (const key of Object.keys(obj)) {
    const data     = obj[key] || {}
    const username = data.username || key
    const isSelf   = username === _currentNick()
    const div      = document.createElement('div')
    div.className   = 'chat-sidebar-user' + (isSelf ? ' self' : '')
    div.dataset.username = username
    div.innerHTML = `
      <span class="chat-sb-dot"></span>
      <span class="chat-sb-name">${_escHtml(username)}</span>
      ${isSelf ? '<span class="chat-sb-you">you</span>' : ''}
    `
    box.appendChild(div)
  }
}

// ── Auth helpers (RTDB + Web Crypto — no Firebase Auth / no email) ─────────

const _SESSION_KEY = 'orbit_session'

async function _dbGet(path) {
  const TIMEOUT_MS = 10_000
  const fetchOp = get(ref(_fbDb, path)).then(s => s.val())
  const timeoutOp = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`RTDB read timeout (${TIMEOUT_MS}ms): ${path}`)), TIMEOUT_MS)
  )
  return Promise.race([fetchOp, timeoutOp])
}

// Returns a countdown target timestamp that is globally consistent.
// Reads from RTDB first; if absent/expired, writes a fresh 100-hour target.
// Falls back to localStorage on any Firebase error.
async function _resolveCountdownTarget(rtdbPath, lsKey) {
  const DURATION = 100 * 60 * 60 * 1000   // 100 hours in ms
  try {
    const existing = await _dbGet(rtdbPath)
    if (existing && existing > Date.now()) return existing
    // Not set yet (or expired) — we are the first client; write the target
    const target = Date.now() + DURATION
    await set(ref(_fbDb, rtdbPath), target)
    return target
  } catch {
    // Firebase unavailable — use localStorage so at least this device is consistent
    const stored = localStorage.getItem(lsKey)
    if (stored && +stored > Date.now()) return +stored
    const target = Date.now() + DURATION
    localStorage.setItem(lsKey, target)
    return target
  }
}

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// PBKDF2 password hashing — 120k iterations, 256-bit output
const _PBKDF2_ITER = 120_000
async function _pbkdf2(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: _PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function _genId() {
  return (crypto.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2)))
}

// Restore session from localStorage on page load
;(function _loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(_SESSION_KEY) || 'null')
    if (s?.uid && s?.username) {
      _authUser    = { uid: s.uid }
      _accountName = s.username
    }
  } catch { /* ignore corrupt data */ }
})()

async function _registerAccount(username, password) {
  const lc = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(lc))
    throw new Error('Username: 3–20 chars, letters/numbers/underscore only')
  if (password.length < 6)
    throw new Error('Password must be at least 6 characters')
  const existing = await _dbGet(`usernames/${lc}`)
  if (existing) throw new Error('Username already taken')
  const uid  = _genId()
  const salt = _genId()
  const hash = await _pbkdf2(password, salt)
  const displayName = username.trim()
  await set(ref(_fbDb, `users/${uid}`), {
    username: displayName, uid, salt, hash, algo: 'pbkdf2',
    createdAt: serverTimestamp(), bio: '',
  })
  await set(ref(_fbDb, `usernames/${lc}`), uid)
  _authUser    = { uid }
  _accountName = displayName
  localStorage.setItem(_SESSION_KEY, JSON.stringify({ uid, username: displayName }))
  _setPresence()
}

async function _loginAccount(username, password) {
  const lc  = username.trim().toLowerCase()
  const uid = await _dbGet(`usernames/${lc}`)
  if (!uid) throw new Error('User not found')
  const data = await _dbGet(`users/${uid}`)
  if (!data?.hash) throw new Error('User not found')

  // Verify against the algorithm stored with the user record.
  // Legacy users (no `algo` field) use SHA-256; auto-upgrade to PBKDF2 on success.
  let verified = false
  let needsUpgrade = false
  if (data.algo === 'pbkdf2') {
    verified = (await _pbkdf2(password, data.salt)) === data.hash
  } else {
    verified = (await _sha256(data.salt + password)) === data.hash
    needsUpgrade = verified
  }
  if (!verified) throw new Error('Incorrect password')

  if (needsUpgrade) {
    const newSalt = _genId()
    const newHash = await _pbkdf2(password, newSalt)
    try {
      await set(ref(_fbDb, `users/${uid}`), {
        ...data, salt: newSalt, hash: newHash, algo: 'pbkdf2',
      })
    } catch { /* upgrade is best-effort; login still succeeds */ }
  }

  _authUser    = { uid }
  _accountName = data.username
  localStorage.setItem(_SESSION_KEY, JSON.stringify({ uid, username: data.username }))
  _setPresence()
}

async function _logoutAccount() {
  if (_presenceKey) remove(ref(_fbDb, `presence/${_presenceKey}`)).catch(() => {})
  _authUser    = null
  _accountName = null
  localStorage.removeItem(_SESSION_KEY)
  _setPresence()
}

async function _dmKey(otherUsername) {
  if (!_authUser) return null
  const theirUid = await _dbGet(`usernames/${otherUsername.trim().toLowerCase()}`)
  if (!theirUid) return null
  return [_authUser.uid, theirUid].sort().join('_')
}

// ── Chat state ────────────────────────────────────────────────────────────

let _chatMode       = 'global'
let _chatRoom       = ''
let _chatDmPartner  = ''   // display name of DM partner
let _chatActiveRef  = null
let _chatUnsub      = null
let _chatLastSender = ''   // for message grouping
let _chatLastTs     = 0    // timestamp of last rendered message (ms)
const _CHAT_GROUP_WINDOW = 5 * 60 * 1000  // 5 minutes

function _chatMessagesRef() {
  return _chatMode === 'dm'
    ? ref(_fbDb, `dms/${_chatRoom}/messages`)
    : ref(_fbDb, 'messages')
}

function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Whitelist image URIs to block javascript:/data:text/html/etc. XSS vectors.
// Allowed: data:image/{jpeg,png,webp,gif}; https URLs to Firebase Storage or our own assets.
function _safeImageUri(s) {
  if (typeof s !== 'string') return ''
  const trimmed = s.trim()
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return trimmed
  if (/^https:\/\/(firebasestorage\.googleapis\.com|[a-z0-9-]+\.firebasestorage\.app)\/[^"<>\s]*$/i.test(trimmed)) return trimmed
  return ''
}

function _renderChatMsg(snap) {
  const box = document.getElementById('chat-messages')
  if (!box) return
  const d = snap.val()
  if (!d?.text && !d?.image) return
  // Hide empty-state placeholder on first message
  const empty = box.querySelector('#chat-empty-state')
  if (empty) empty.remove()
  const sender    = d.username || d.nickname || 'Unknown'
  const isSelf    = sender === _currentNick()
  // Server-stamped epoch ms; fall back to client clock if absent
  const tsMs      = typeof d.timestamp === 'number' ? d.timestamp : Date.now()
  // Group when same author AND within 5-minute window of previous message
  const isGrouped = sender === _chatLastSender
                 && (tsMs - _chatLastTs) <= _CHAT_GROUP_WINDOW
  _chatLastSender = sender
  _chatLastTs     = tsMs

  // Formatted clock time for hover-revealed timestamp (e.g. "10:03 PM")
  const tsLabel = new Date(tsMs).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit',
  })

  let bubbleContent
  if (d.type === 'image') {
    const safe = _safeImageUri(d.image)
    bubbleContent = safe
      ? `<img src="${_escHtml(safe)}" class="chat-img-bubble" alt="image" loading="lazy">`
      : '<span class="text-white/30 text-xs italic">[image blocked]</span>'
  } else {
    bubbleContent = _escHtml(d.text)
  }

  const wrap = document.createElement('div')
  wrap.className = `chat-msg-wrap ${isSelf ? 'chat-msg-self' : 'chat-msg-other'} ${isGrouped ? 'chat-msg-grouped' : ''}`
  wrap.innerHTML = `
    ${!isGrouped ? `<span class="chat-msg-sender">${_escHtml(sender)}</span>` : ''}
    <div class="chat-bubble-row">
      <div class="chat-bubble ${isSelf ? 'chat-bubble-self' : 'chat-bubble-other'} ${d.type === 'image' ? 'chat-bubble-img' : ''}">
        ${bubbleContent}
      </div>
      <span class="chat-msg-time" aria-hidden="true">${_escHtml(tsLabel)}</span>
    </div>`
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50
  box.appendChild(wrap)
  if (nearBottom) box.scrollTop = box.scrollHeight
}

function _teardownChatMessages() {
  if (_chatUnsub) {
    _chatUnsub()        // onChildAdded returns an unsubscribe fn — just call it
    _chatUnsub     = null
    _chatActiveRef = null
  }
}

function _loadChatMessages() {
  _teardownChatMessages()
  _chatLastSender = ''
  _chatLastTs     = 0
  const box = document.getElementById('chat-messages')
  if (box) box.innerHTML = ''
  _chatActiveRef = _chatMessagesRef()
  _chatUnsub     = onChildAdded(_chatActiveRef, _renderChatMsg)
}

function _switchChat(mode, roomCode = '', partner = '') {
  _chatMode      = mode
  _chatRoom      = roomCode
  _chatDmPartner = partner
  // Re-render the whole view so the DM search / conversation panels swap correctly
  if (state.view === 'chat') swapView()
}

// ── Chat rate limiter (10 msgs / 60 s, per device) ────────────────────────
const _RATE_KEY      = 'orbit_chat_rate'
const _RATE_LAST_KEY = 'orbit_chat_last'
const _RATE_MAX      = 8           // messages per window
const _RATE_WINDOW   = 30_000      // ms — sliding window
const _RATE_COOLDOWN = 1200        // ms — minimum gap between sends (burst guard)

// In-memory mirror — defeats trivial localStorage edits during a session
let _rateMemStamps = null
let _rateMemLast   = 0

function _chatRateCheck() {
  const now = Date.now()
  if (_rateMemStamps === null) {
    try { _rateMemStamps = JSON.parse(localStorage.getItem(_RATE_KEY) || '[]') }
    catch { _rateMemStamps = [] }
    _rateMemLast = parseInt(localStorage.getItem(_RATE_LAST_KEY) || '0', 10) || 0
  }
  // Burst guard
  if (now - _rateMemLast < _RATE_COOLDOWN) return false
  // Sliding window — prune expired stamps
  const stamps = _rateMemStamps.filter(t => now - t < _RATE_WINDOW)
  if (stamps.length >= _RATE_MAX) {
    _rateMemStamps = stamps
    localStorage.setItem(_RATE_KEY, JSON.stringify(stamps))
    return false
  }
  stamps.push(now)
  _rateMemStamps = stamps
  _rateMemLast   = now
  localStorage.setItem(_RATE_KEY, JSON.stringify(stamps))
  localStorage.setItem(_RATE_LAST_KEY, String(now))
  return true
}

// Reset memory mirror if user clears the key from settings
function _chatRateReset() {
  _rateMemStamps = []
  _rateMemLast   = 0
}

// ── Image upload — 3 / calendar day ───────────────────────────────────────
const _IMG_KEY     = 'orbit_chat_img'
const _IMG_DAY_MAX = 3

function _imgUsedToday() {
  try {
    const s = JSON.parse(localStorage.getItem(_IMG_KEY) || 'null')
    return (s?.date === new Date().toDateString()) ? (s.count ?? 0) : 0
  } catch { return 0 }
}
function _imgIncToday() {
  const date  = new Date().toDateString()
  const count = _imgUsedToday() + 1
  localStorage.setItem(_IMG_KEY, JSON.stringify({ date, count }))
}

// Compress to a JPEG Blob (was: data URL). Smaller payload, plays nicely with Storage uploads.
async function _compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX = 640
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = reject
    img.onload  = () => {
      let w = img.width, h = img.height
      if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX }
      else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode failed')), 'image/jpeg', 0.72)
    }
    img.src = url
  })
}

async function _sendChatImage(file) {
  if (_imgUsedToday() >= _IMG_DAY_MAX) {
    _chatShowNotice(`Image limit reached (${_IMG_DAY_MAX}/day)`)
    return
  }
  if (!file.type.startsWith('image/')) { _chatShowNotice('Not an image'); return }
  if (file.size > 8 * 1024 * 1024)    { _chatShowNotice('Image too large (max 8 MB)'); return }
  _chatShowNotice('Uploading…')
  try {
    await _ensureFb()
    await _ensureFbStorage()
    const blob = await _compressImage(file)
    if (!_chatRateCheck()) { _chatShowNotice('Slow down — too many messages'); return }
    const uid = _authUser?.uid ?? null
    if (uid && _fbDb) {
      try { await set(ref(_fbDb, `rateLimit/${uid}`), Date.now()) } catch {}
    }
    // Upload to Firebase Storage, then store the download URL in RTDB
    const path  = `chat-images/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
    const sref  = _fbStorageRef(_fbStorage, path)
    await _fbStorageUploadBytes(sref, blob, { contentType: 'image/jpeg' })
    const url   = await _fbStorageGetDownloadURL(sref)
    await push(_chatMessagesRef(), {
      username: _currentNick(), uid,
      type: 'image', image: url, timestamp: serverTimestamp()
    })
    _imgIncToday()
    _chatShowNotice(`Images today: ${_imgUsedToday()}/${_IMG_DAY_MAX}`)
  } catch (e) {
    _chatShowNotice('Upload failed')
  }
}

let _toastSlot = null
let _toastTimer = null
function _chatShowNotice(msg) {
  if (!_toastSlot || !document.body.contains(_toastSlot)) {
    _toastSlot = document.createElement('div')
    _toastSlot.id = 'global-toast'
    _toastSlot.style.cssText =
      'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);' +
      'padding:.6rem 1rem;border-radius:9999px;font-size:.78rem;' +
      'background:rgba(20,20,28,.92);color:rgba(255,255,255,.9);' +
      'border:1px solid rgba(var(--accent-rgb),.4);' +
      'box-shadow:0 8px 32px rgba(0,0,0,.5);backdrop-filter:blur(12px);' +
      '-webkit-backdrop-filter:blur(12px);z-index:9999;pointer-events:none;' +
      'opacity:0;transition:opacity .2s ease;max-width:80vw;text-align:center'
    document.body.appendChild(_toastSlot)
  }
  _toastSlot.textContent = msg
  // Force reflow so opacity transition restarts even on repeat toasts
  void _toastSlot.offsetWidth
  _toastSlot.style.opacity = '1'
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => {
    if (_toastSlot) _toastSlot.style.opacity = '0'
  }, 2500)
}

let _sendInFlight = false
async function _sendChatMessage() {
  const input = document.getElementById('chat-input')
  if (!input) return
  const text = input.value.trim()
  if (!text) return
  if (text.length > 2000) { _chatShowNotice('Message too long (max 2000)'); return }
  if (_chatMode === 'dm' && !_chatRoom.trim()) return
  if (_sendInFlight) return
  if (!_chatRateCheck()) { _chatShowNotice('Slow down — too many messages'); return }
  _sendInFlight = true
  try {
    const uid = _authUser?.uid ?? null
    // Write rateLimit timestamp first so server rules can enforce 1s cooldown
    if (uid && _fbDb) {
      try { await set(ref(_fbDb, `rateLimit/${uid}`), Date.now()) } catch {}
    }
    await push(_chatMessagesRef(), {
      username: _currentNick(), uid, text, timestamp: serverTimestamp(),
    })
    input.value = ''
    input.focus()
  } catch (e) {
    _chatShowNotice('Send failed')
  } finally {
    _sendInFlight = false
  }
}

// ── AI Chat ───────────────────────────────────────────────────────────────

let _aiMessages  = []    // { role: 'user'|'assistant', content: string }
let _aiStreaming       = false
let _aiAbortCtrl      = null
let _pendingGameSearch = null
let _signinTeardown    = null  // explicit listener cleanup for sign-in card

function _appendAiMsgBubble(role, text) {
  const box = document.getElementById('ai-messages')
  if (!box) return null

  // Remove welcome screen on first real message
  document.getElementById('ai-welcome')?.remove()

  const isSelf = role === 'user'
  const wrap   = document.createElement('div')
  wrap.className = 'flex flex-col gap-1 ' + (isSelf ? 'items-end' : 'items-start')

  const label = document.createElement('span')
  label.className = 'text-[10px] text-white/25 px-1'
  label.textContent = isSelf ? _currentNick() : 'AI'

  const bubble = document.createElement('div')
  bubble.className =
    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[80%] break-words whitespace-pre-wrap ' +
    (isSelf
      ? 'bg-white/[0.12] text-white rounded-br-sm'
      : 'bg-white/[0.05] text-white/80 rounded-bl-sm')
  bubble.textContent = text

  wrap.appendChild(label)
  wrap.appendChild(bubble)
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50
  box.appendChild(wrap)
  if (nearBottom) box.scrollTop = box.scrollHeight

  return bubble
}

function _renderAiHistory() {
  const box = document.getElementById('ai-messages')
  if (!box) return
  if (_aiMessages.length === 0) return
  document.getElementById('ai-welcome')?.remove()
  box.innerHTML = ''
  for (const msg of _aiMessages) _appendAiMsgBubble(msg.role, msg.content)
}

async function _aiSend(text) {
  text = (text || '').trim()
  if (!text || _aiStreaming) return

  const inputEl = document.getElementById('ai-input')
  if (inputEl) { inputEl.value = ''; inputEl.style.height = '60px' }

  _aiMessages.push({ role: 'user', content: text })
  _appendAiMsgBubble('user', text)

  const key = import.meta.env.VITE_AI_KEY
  if (!key) {
    const msg = '⚠ No API key — create a .env file in your project root and add:\nVITE_AI_KEY=sk-…\nThen restart the dev server.'
    _aiMessages.push({ role: 'assistant', content: msg })
    _appendAiMsgBubble('assistant', msg)
    return
  }

  const assistantBubble = _appendAiMsgBubble('assistant', '…')
  _aiStreaming  = true
  _aiAbortCtrl  = new AbortController()

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: _aiAbortCtrl.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:    'llama-3.3-70b-versatile',
        messages: _aiMessages,
        stream:   true,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`${res.status} — ${body.slice(0, 160)}`)
    }

    const reader = res.body.getReader()
    const dec    = new TextDecoder()
    let full     = ''

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') break outer
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content || ''
          full += delta
          if (assistantBubble) {
            assistantBubble.textContent = full
            const box = document.getElementById('ai-messages')
            if (box) {
              const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50
              if (nearBottom) box.scrollTop = box.scrollHeight
            }
          }
        } catch { /* partial chunk — skip */ }
      }
    }

    _aiMessages.push({ role: 'assistant', content: full })
    if (assistantBubble) assistantBubble.textContent = full

  } catch (err) {
    if (err.name === 'AbortError') {
      if (assistantBubble) assistantBubble.textContent += ' [stopped]'
      _aiMessages.push({ role: 'assistant', content: assistantBubble?.textContent ?? '' })
    } else {
      const msg = '⚠ ' + err.message
      if (assistantBubble) assistantBubble.textContent = msg
      _aiMessages.push({ role: 'assistant', content: msg })
    }
  } finally {
    _aiStreaming = false
    _aiAbortCtrl = null
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Tracks which skeleton views have already revealed their content this session
const loadedViews = new Set()

// Resolves once BareMux is configured and the UV service worker is primed
let _uvReadyPromise = null

// Countdown view state
let _cdInterval    = null
let _cdTarget      = null   // browser countdown — 100h from first visit
let _chatCdTarget  = null   // chat countdown   — 100h from first visit

// Icon lookup — const, must live before first render call
const ICON_MAP = {
  youtube: brandYoutube,
  discord: brandDiscord,
  github:  brandGithub,
  twitch:  brandTwitch,
  nvidia:  brandNvidia,
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let state = {
  view:            'home',
  query:           '',
  activeApp:       null,
  settingsSection: null,
  accentRgb:       ACCENT_COLORS[0].rgb,
  browserUrl:      BROWSER_HOME,
  browserHistory:  [],
  browserForward:  [],
  // Performance
  perfNoStars:      false,
  perfReduceMotion: false,
  perfNoBlur:       false,
  perfNoGlow:       false,
}

// Load saved perf prefs before first render
;(function _loadPerfSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('orbit_perf') || '{}')
    if (s.perfNoStars)      state.perfNoStars      = true
    if (s.perfReduceMotion) state.perfReduceMotion = true
    if (s.perfNoBlur)       state.perfNoBlur       = true
    if (s.perfNoGlow)       state.perfNoGlow       = true
  } catch {}
})()

function _applyPerfClasses() {
  const r = document.documentElement
  r.classList.toggle('perf-no-stars',       state.perfNoStars)
  r.classList.toggle('perf-reduce-motion',  state.perfReduceMotion)
  r.classList.toggle('perf-no-blur',        state.perfNoBlur)
  r.classList.toggle('perf-no-glow',        state.perfNoGlow)
  localStorage.setItem('orbit_perf', JSON.stringify({
    perfNoStars:      state.perfNoStars,
    perfReduceMotion: state.perfReduceMotion,
    perfNoBlur:       state.perfNoBlur,
    perfNoGlow:       state.perfNoGlow,
  }))
}

function setState(patch) {
  const prev = { ...state }
  state = { ...state, ...patch }

  if ('activeApp' in patch) {
    state.activeApp ? showAppOverlay(state.activeApp) : removeAppOverlay()
    return
  }

  if ('accentRgb' in patch) {
    applyAccent(state.accentRgb)
    // Re-render settings to update swatch active states
    const body = document.getElementById('settings-body')
    if (body) body.innerHTML = settingsBodyHTML()
    return
  }

  if ('settingsSection' in patch) {
    const body = document.getElementById('settings-body')
    if (body) body.innerHTML = settingsBodyHTML()
    return
  }

  if ('perfNoStars' in patch || 'perfReduceMotion' in patch || 'perfNoBlur' in patch || 'perfNoGlow' in patch) {
    _applyPerfClasses()
    const body = document.getElementById('settings-body')
    if (body) body.innerHTML = settingsBodyHTML()
    return
  }

  if (patch.view !== undefined && patch.view !== prev.view) {
    state.query = ''
    if (prev.view === 'chat') _teardownChatMessages()
    if (prev.view === 'ai' && _aiAbortCtrl) { _aiAbortCtrl.abort(); _aiAbortCtrl = null }
    if (prev.view === 'profile' && typeof _signinTeardown === 'function') _signinTeardown()
    swapView()
    syncDockActive()
    return
  }

  if (patch.query !== undefined) {
    updateGrid()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════

function setTheme(name) {
  const theme = THEMES[name] ?? THEMES.nova
  document.documentElement.dataset.theme = name   // CSS [data-theme="x"] overrides hook here
  document.documentElement.style.setProperty('--accent-rgb',           theme.rgb)
  document.documentElement.style.setProperty('--accent-color',         theme.hex)
  document.documentElement.style.setProperty('--glow-color',           `rgba(${theme.rgb}, 0.4)`)
  // Title background — custom gradient > noGradient flat > default milky-overlay
  const titleBg = theme.gradient
    ? theme.gradient
    : theme.noGradient
      ? theme.hex
      : `linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), ${theme.hex}`
  document.documentElement.style.setProperty('--title-bg',          titleBg)
  document.documentElement.style.setProperty('--title-text-shadow', theme.textShadow ?? 'none')

  // Build filter string — noFilter themes (e.g. BLOOD) use text-shadow instead
  if (theme.noFilter) {
    document.documentElement.style.setProperty('--title-filter', 'none')
  } else {
    const g   = theme.glow ?? {}
    const sm  = g.sm           ?? '8px'
    const lg  = g.lg           ?? '20px'
    const op  = g.outerOpacity ?? '0.45'
    document.documentElement.style.setProperty('--title-filter',
      `drop-shadow(0 0 ${sm} var(--accent-color)) drop-shadow(0 0 ${lg} rgba(var(--accent-rgb), ${op}))`)
  }
  localStorage.setItem('orbit_theme', name)
  state.accentRgb = theme.rgb
  regenerateStars(theme.starRgb ?? theme.rgb)
  // Refresh settings swatches if visible
  const body = document.getElementById('settings-body')
  if (body) body.innerHTML = settingsBodyHTML()

  // Sync onboarding theme cards (live preview during setup)
  document.querySelectorAll('.ob-theme-card').forEach(c => {
    c.classList.toggle('active', c.dataset.themeName === name)
  })
}

// Legacy helper — resolve rgb to nearest named theme then delegate
function applyAccent(rgb) {
  const entry = Object.entries(THEMES).find(([, t]) => t.rgb === rgb)
  if (entry) {
    setTheme(entry[0])
  } else {
    // Custom rgb not in THEMES — apply directly without saving a name
    document.documentElement.style.setProperty('--accent-rgb',   rgb)
    document.documentElement.style.setProperty('--accent-color', `rgb(${rgb})`)
    document.documentElement.style.setProperty('--glow-color',   `rgba(${rgb}, 0.4)`)
    regenerateStars(rgb)
  }
}

function _drawStarLayer(canvas, count, size, alpha) {
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight * 2  // canvas is 200% tall for seamless loop
  canvas.width  = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width  = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  // Draw stars in top half; the bottom half is a mirrored copy for seamless wrap
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * (h / 2)
    const a = alpha * (0.55 + Math.random() * 0.45)
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`
    ctx.fillRect(x, y, size, size)
    // Mirror into bottom half so translateY(-50%) wraps seamlessly
    ctx.fillRect(x, y + h / 2, size, size)
  }
}

function regenerateStars(_rgb) {
  _drawStarLayer(document.getElementById('stars1'), 1200, 1, 0.65)
  _drawStarLayer(document.getElementById('stars2'), 400,  2, 0.85)
  _drawStarLayer(document.getElementById('stars3'), 80,   3, 1.0)
}

// Redraw stars on resize (canvas size depends on viewport)
let _starsResizeTimer
window.addEventListener('resize', () => {
  clearTimeout(_starsResizeTimer)
  _starsResizeTimer = setTimeout(() => regenerateStars(null), 200)
})

// ═══════════════════════════════════════════════════════════════════════════
// APP OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

function proxyUrl(url) {
  return `/proxy?url=${encodeURIComponent(url)}`
}

function showAppOverlay(app) {
  removeAppOverlay()

  const el = document.createElement('div')
  el.id = 'app-overlay'
  el.className = 'app-overlay'
  el.innerHTML = `
    <div class="app-frame-bar">
      <button id="close-app-btn" class="app-frame-close">
        ${icoArrowLeft(14)} Home
      </button>
      <span class="app-frame-urlbar" title="${app.url}">${app.url}</span>
      <a href="${app.url}" target="_blank" rel="noopener noreferrer"
         class="app-frame-close" title="Open in new tab">
        ${icoExternalLink(14)}
      </a>
    </div>
    <div class="ghost404-wrap">
      <div class="ghost404-numbers">
        <span class="ghost404-num ghost404-num-l">4</span>
        <img src="https://xubohuah.github.io/xubohua.top/Group.png"
             alt="Ghost" class="ghost404-ghost" draggable="false">
        <span class="ghost404-num ghost404-num-r">4</span>
      </div>
      <h1 class="ghost404-title">Boo! Page missing!</h1>
      <p class="ghost404-sub">Whoops! This page must be a ghost — it&apos;s not here!</p>
      <button id="ghost404-shelter" class="ghost404-btn">Find shelter</button>
      <a href="${app.url}" target="_blank" rel="noopener noreferrer"
         class="ghost404-link">Open ${_escHtml(app.name)} directly ↗</a>
    </div>`

  document.getElementById('orbit-root').appendChild(el)
  document.getElementById('close-app-btn').addEventListener('click', closeApp)
  document.getElementById('ghost404-shelter')?.addEventListener('click', closeApp)
}

function removeAppOverlay() {
  document.getElementById('app-overlay')?.remove()
}

function closeApp() {
  setState({ activeApp: null })
}

// ── Games / Movies / Watch overlays ───────────────────────────────────────

function showGameOverlay(game) {
  removeGameOverlay()
  if (!game?.url) return
  const el = document.createElement('div')
  el.id = 'game-overlay'
  el.className = 'app-overlay'
  el.style.cssText = 'position:fixed;inset:0;z-index:200'
  el.innerHTML = `
    <iframe id="game-iframe" class="app-iframe" style="position:absolute;inset:0;width:100%;height:100%;flex:unset"
      sandbox="allow-scripts allow-popups allow-forms allow-modals allow-pointer-lock"
      allowfullscreen></iframe>
    <div class="game-pill-dock" id="game-pill-dock">
      <button id="close-game-btn" class="app-frame-close">${icoArrowLeft(14)} Games</button>
      <div class="game-pill-sep"></div>
      <span class="game-pill-title">${_escHtml(game.name)}</span>
      <div class="game-pill-sep"></div>
      <button id="download-game-btn" class="app-frame-close" style="opacity:0.35;pointer-events:none" title="Save game">${icoDownload(14)} Save</button>
      <button id="fullscreen-game-btn" class="app-frame-close" style="opacity:0.35;pointer-events:none" title="Open fullscreen">${icoExternalLink(14)} Fullscreen</button>
    </div>`
  document.getElementById('orbit-root').appendChild(el)
  // Auto-hide dock after 3s, reveal on mouse move
  const pill = document.getElementById('game-pill-dock')
  let hideTimer
  function showPill() {
    pill.style.opacity = '1'
    pill.style.pointerEvents = 'auto'
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      pill.style.opacity = '0'
      pill.style.pointerEvents = 'none'
    }, 3000)
  }
  el.addEventListener('mousemove', showPill)
  el.addEventListener('touchstart', showPill)
  showPill()
  document.getElementById('close-game-btn').addEventListener('click', removeGameOverlay)
  let cachedHTML = null
  function enableOverlayBtns() {
    const fs = document.getElementById('fullscreen-game-btn')
    const dl = document.getElementById('download-game-btn')
    if (fs) { fs.style.opacity = '1'; fs.style.pointerEvents = 'auto' }
    if (dl) { dl.style.opacity = '1'; dl.style.pointerEvents = 'auto' }
  }
  document.getElementById('fullscreen-game-btn').addEventListener('click', () => {
    if (!cachedHTML) return
    const win = window.open('about:blank', '_blank')
    win.document.open()
    win.document.write(cachedHTML)
    win.document.close()
  })
  document.getElementById('download-game-btn').addEventListener('click', () => {
    if (!cachedHTML) return
    const safeName = game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const blob = new Blob([cachedHTML], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = safeName + '.html'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  })
  const iframe = document.getElementById('game-iframe')
  const proxied = u => `/OrbitV2/proxy?url=${encodeURIComponent(u)}`
  // Try direct fetch → srcdoc. If blocked by CORS/CSP or returns non-OK, route through the Vite proxy.
  function loadViaProxy() {
    return fetch(proxied(game.url))
      .then(r => { if (!r.ok) throw new Error('proxy HTTP ' + r.status); return r.text() })
      .then(html => {
        cachedHTML = html
        enableOverlayBtns()
        if (iframe.isConnected) iframe.srcdoc = html
      })
      .catch(() => {
        // Last resort: load the proxied URL directly. Proxy rewrites Content-Type to text/html.
        if (iframe.isConnected) iframe.src = proxied(game.url)
      })
  }
  fetch(game.url)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
    .then(html => {
      cachedHTML = html
      enableOverlayBtns()
      if (iframe.isConnected) iframe.srcdoc = html
    })
    .catch(loadViaProxy)
}

const _WN_SEEN_KEY = 'orbit_whatsnew_seen'

function showWhatsNew(prevVer) {
  // Skip entirely if this exact version has already been viewed
  const seen = localStorage.getItem(_WN_SEEN_KEY)
  if (seen === APP_VERSION) return
  document.getElementById('whats-new-overlay')?.remove()
  const isFirstVisit = !prevVer
  const el = document.createElement('div')
  el.id = 'whats-new-overlay'
  el.style.cssText = 'position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(12px);animation:fadeUp .2s ease forwards'
  el.innerHTML = `
    <div style="width:100%;max-width:420px;margin:0 16px;background:rgba(12,12,18,.9);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px;display:flex;flex-direction:column;gap:20px;box-shadow:0 24px 64px rgba(0,0,0,.6)">
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent-color);opacity:.8">
          ${isFirstVisit ? 'Welcome to' : 'Updated to'} v${APP_VERSION}
        </div>
        <div style="font-size:1.6rem;font-weight:900;color:#fff;letter-spacing:-.03em;line-height:1">
          ${isFirstVisit ? 'Welcome to ORBIT' : "What's New"}
        </div>
      </div>
      <ul style="display:flex;flex-direction:column;gap:10px;list-style:none;margin:0;padding:0">
        ${CHANGELOG.map(item => `
          <li style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:rgba(255,255,255,.65);line-height:1.4">
            <span style="color:var(--accent-color);margin-top:1px;flex-shrink:0">✦</span>
            ${_escHtml(item)}
          </li>`).join('')}
      </ul>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px;border-top:1px solid rgba(255,255,255,.07)">
        ${!_authUser ? `
        <div style="font-size:12px;color:rgba(255,255,255,.35);text-align:center">
          Sign in to save your data across devices
        </div>
        <button id="wnSignIn" style="width:100%;padding:12px;border-radius:14px;border:none;font-weight:700;font-size:14px;cursor:pointer;color:#000;background:var(--accent-color);box-shadow:0 0 16px rgba(var(--accent-rgb),.35);transition:.15s">
          Create Account / Sign In
        </button>` : `
        <div style="font-size:12px;color:rgba(255,255,255,.35);text-align:center">
          Signed in as <strong style="color:rgba(255,255,255,.7)">${_escHtml(_currentNick())}</strong>
        </div>`}
        <button id="wnDismiss" style="width:100%;padding:11px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;transition:.15s">
          ${_authUser ? 'Continue' : 'Continue as Guest'}
        </button>
      </div>
    </div>`

  document.body.appendChild(el)

  document.getElementById('wnSignIn')?.addEventListener('click', () => {
    localStorage.setItem('orbit_version', APP_VERSION)
    localStorage.setItem(_WN_SEEN_KEY, APP_VERSION)
    el.remove()
    setState({ view: 'profile' })
  })
  document.getElementById('wnDismiss')?.addEventListener('click', () => {
    localStorage.setItem('orbit_version', APP_VERSION)
    localStorage.setItem(_WN_SEEN_KEY, APP_VERSION)
    el.remove()
  })
}

function removeGameOverlay() {
  document.getElementById('game-overlay')?.remove()
}

function showWatchOverlay(contentId, contentType) {
  removeWatchOverlay()
  const el = document.createElement('div')
  el.id = 'watch-overlay'
  el.className = 'app-overlay'
  el.innerHTML = `
    <div class="app-frame-bar">
      <button id="close-watch-btn" class="app-frame-close">${icoArrowLeft(14)} TV</button>
      <span class="app-frame-title">Watch</span>
      <div></div>
    </div>
    <iframe id="watch-iframe" class="app-iframe" allowfullscreen></iframe>`
  document.getElementById('orbit-root').appendChild(el)
  document.getElementById('close-watch-btn').addEventListener('click', removeWatchOverlay)
  document.getElementById('watch-iframe').srcdoc = buildWatchSrcdoc(contentId, contentType)
}

function removeWatchOverlay() {
  document.getElementById('watch-overlay')?.remove()
}

// ── srcdoc builders ───────────────────────────────────────────────────────

function buildGamesSrcdoc(accentRgb = '255,255,255') {
  const A = accentRgb
  // CSS lives in public/games.css — fetched + browser-cached, removed from JS bundle.
  // Accent color flows via CSS custom property set on <html>.
  const headStyles = `<link rel="stylesheet" href="${import.meta.env.BASE_URL}games.css"><style>html{--accent-rgb:${A}}</style>`

  const provMeta = {
    'gn-math':  { label: 'GN-Math',   color: '#00bfff' },
    'elite':    { label: 'Elite',      color: '#ff6b35' },
    'petezah':  { label: 'PeteZah',   color: '#a855f7' },
    'sea-bean': { label: 'Sea Bean',   color: '#10b981' },
    'seraph':   { label: 'Seraph',     color: '#22c55e' },
    'blox':     { label: 'Bloxcraft', color: '#f59e0b' },
    'truffled': { label: 'Truffled',  color: '#ec4899' },
    'ugs':      { label: 'UGS',       color: '#94a3b8' },
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${headStyles}</head><body>
<div class="controls">
  <div class="search-row">
    <input id="search" class="search-input" placeholder="Search games...">
  </div>
  <div class="filter-row">
    <select id="provSel" class="ctrl">
      <option value="gn-math">GN-Math</option>
      <option value="truffled">Truffled.lol</option>
      <option value="petezah">PeteZah</option>
      <option value="elite">Elite Gamez</option>
      <option value="sea-bean">Sea Bean</option>
      <option value="ugs">UGS</option>
      <option value="blox">Bloxcraft UBG</option>
      <option value="seraph">Seraph</option>
    </select>
    <select id="sortSel" class="ctrl">
      <option value="a-z">A–Z</option>
      <option value="z-a">Z–A</option>
      <option value="latest">Latest</option>
      <option value="oldest">Oldest</option>
    </select>
    <select id="catSel" class="ctrl" style="display:none">
      <option value="">All Categories</option>
      <option value="action">Action</option>
      <option value="racing">Racing</option>
      <option value="strategy">Strategy</option>
      <option value="sports">Sports</option>
      <option value="skill">Skill</option>
      <option value="shooting">Shooting</option>
      <option value="2 player">2 Player</option>
      <option value="io">IO</option>
    </select>
  </div>
</div>
<div class="grid" id="grid"></div>
<div class="status" id="status"></div>
<script>
var PM=${JSON.stringify(provMeta)};
var PROV_HUE={'gn-math':200,'elite':20,'petezah':280,'sea-bean':160,'seraph':140,'blox':38,'truffled':330,'ugs':215};
var allGames=[], provSel=document.getElementById('provSel'), sortSel=document.getElementById('sortSel'),
    catSel=document.getElementById('catSel'), search=document.getElementById('search'),
    grid=document.getElementById('grid'), status=document.getElementById('status');

function fallback(n){return 'https://ui-avatars.com/api/?name='+encodeURIComponent(n)+'&background=111827&color=6b7280&size=256&bold=true';}

function resolveGnMath(u){
  if(!u)return '';
  if(u.startsWith('http'))return u;
  u=u.replace('{HTML_URL}','');
  while(u.length&&u[0]==='/')u=u.slice(1);
  return 'https://cdn.jsdelivr.net/gh/freebuisness/html@main/'+u;
}

async function loadGames(){
  var prov=provSel.value;
  grid.innerHTML=''; status.textContent='loading...'; allGames=[];
  catSel.style.display=prov==='petezah'?'block':'none';
  if(prov!=='petezah')catSel.value='';
  // Try sessionStorage cache first — 30 min TTL
  try{
    var cacheKey='orbit_games_'+prov;
    var cached=sessionStorage.getItem(cacheKey);
    if(cached){
      var parsed=JSON.parse(cached);
      if(parsed&&parsed.t&&Date.now()-parsed.t<1800000&&Array.isArray(parsed.games)){
        allGames=parsed.games;
        status.textContent='';
        applyFilters();
        return;
      }
    }
  }catch(e){}
  try{
    if(prov==='gn-math'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json').then(r=>r.json());
      allGames=d.filter(function(g){return g.id!==-1&&!g.name.startsWith('[!]');}).map(function(z,i){
        var cv=(z.cover||'').replace('{COVER_URL}','');while(cv.length&&cv[0]==='/')cv=cv.slice(1);
        return{name:z.name,cover:cv?'https://cdn.jsdelivr.net/gh/freebuisness/covers@main/'+cv:fallback(z.name),url:resolveGnMath(z.url),provider:'gn-math',order:i};
      });
    }else if(prov==='elite'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json').then(r=>r.json());
      var base='https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/';
      allGames=d.map(function(g,i){
        var url=g.url?(g.url.startsWith('http')?g.url:base+g.url):'';
        var cover=g.image?(g.image.startsWith('http')?g.image:base+g.image):fallback(g.title||g.name||'?');
        return{name:g.title||g.name||'Unknown',cover:cover,url:url,provider:'elite',order:i};
      });
    }else if(prov==='petezah'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/PeteZah-G/singlefile-json@main/search.json').then(r=>r.json());
      allGames=(d.games||[]).map(function(g,i){
        var url=g.url||'';
        if(url&&!url.endsWith('index.html')&&url.split('/').pop().lastIndexOf('.')<0)url=url.endsWith('/')?url+'index.html':url+'/index.html';
        return{name:g.label||'Unknown',cover:g.imageUrl||fallback(g.label||'?'),url:url,provider:'petezah',order:i,categories:g.categories||[]};
      });
    }else if(prov==='sea-bean'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/sea-bean-unblocked/sde@main/zzz.json').then(r=>r.json());
      var smBase='https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/';
      allGames=d.map(function(g,i){
        var html=g.html||g.url||'';
        if(html.includes('{HTML_URL}'))html=html.replace('{HTML_URL}',smBase+'games/');
        else if(!html.startsWith('http')){while(html.length&&html[0]==='/')html=html.slice(1);html=smBase+'games/'+html;}
        var cv=(g.cover||g.img||'').replace('{COVER_URL}/','');
        var cover=cv.startsWith('http')?cv:(cv?smBase+'Icon/'+cv:fallback(g.name||'?'));
        return{name:g.name||g.id||'Unknown',cover:cover,url:html,provider:'sea-bean',order:i};
      });
    }else if(prov==='seraph'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json').then(r=>r.json());
      var srBase='https://cdn.jsdelivr.net/gh/a456pur/seraph@main/';
      allGames=d.map(function(g,i){
        var p=g.url.endsWith('index.html')?g.url:(g.url.endsWith('/')?g.url+'index.html':g.url+'/index.html');
        while(p.length&&p[0]==='/')p=p.slice(1);var url=p.startsWith('http')?p:srBase+p;
        return{name:g.name,cover:g.img||fallback(g.name),url:url,provider:'seraph',order:i};
      });
    }else if(prov==='blox'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/tharun9772/tharun9772.github.io/games/games.json').then(r=>r.json());
      var blBase='https://cdn.jsdelivr.net/gh/tharun9772/tharun9772.github.io@main/';
      allGames=d.map(function(g,i){
        var u=(g.url||'').replace('/app-viewer/?view=/','');
        if(!u.endsWith('index.html'))u=(u.endsWith('/')?u:u+'/')+'index.html';
        while(u.length&&u[0]==='/')u=u.slice(1);var url=u.startsWith('http')?u:blBase+u;
        return{name:g.name,cover:g.img||fallback(g.name),url:url,provider:'blox',order:i};
      });
    }else if(prov==='truffled'){
      var d=await fetch('https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json').then(r=>r.json());
      var proxy='https://truffled.lol';
      allGames=(d.games||[]).map(function(g,i){
        var url=g.url.startsWith('http')?g.url:proxy+(g.url.startsWith('/')?'':'/')+g.url;
        var thumb=(g.thumbnail||'').startsWith('http')?g.thumbnail:proxy+((g.thumbnail||'').startsWith('/')?'':'/')+(g.thumbnail||'');
        return{name:g.name,cover:thumb,url:url,provider:'truffled',order:i};
      });
    }else if(prov==='ugs'){
      var repos=['tharun9772/ugs-1','tharun9772/ugs-2','tharun9772/ugs-3'],idx=0;
      for(var ri=0;ri<repos.length;ri++){
        try{
          var files=await fetch('https://api.github.com/repos/'+repos[ri]+'/contents/').then(r=>r.json());
          files.forEach(function(f){
            if(f.type==='file'&&f.name.startsWith('cl')&&f.name.endsWith('.html')){
              var n=f.name.replace(/^cl/,'').replace('.html','');
              n=n.charAt(0).toUpperCase()+n.slice(1);
              allGames.push({name:n,cover:'https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png',
                url:'https://cdn.jsdelivr.net/gh/'+repos[ri]+'@main/'+f.name,provider:'ugs',order:idx++});
            }
          });
        }catch(e){}
      }
    }
    // Save fetched games to sessionStorage cache
    try{sessionStorage.setItem('orbit_games_'+prov,JSON.stringify({t:Date.now(),games:allGames}));}catch(e){}
    status.textContent='';
    applyFilters();
  }catch(e){
    status.textContent='failed to load: '+e.message;
    grid.innerHTML='';
  }
}

function applyFilters(){
  var q=search.value.toLowerCase(),sort=sortSel.value,cat=catSel.value.toLowerCase();
  var list=allGames.filter(function(g){
    return g.name.toLowerCase().indexOf(q)!==-1&&(!cat||(g.categories&&g.categories.indexOf(cat)!==-1));
  });
  list.sort(function(a,b){
    if(sort==='a-z')return a.name.localeCompare(b.name);
    if(sort==='z-a')return b.name.localeCompare(a.name);
    if(sort==='latest')return b.order-a.order;
    if(sort==='oldest')return a.order-b.order;
    return 0;
  });
  render(list);
  try{parent.postMessage({type:'orbit-games-ready',count:list.length},'*');}catch(e){}
}

function render(list){
  grid.innerHTML='';
  if(!list.length){status.textContent='no games found';return;}
  status.textContent='';
  list.forEach(function(g){
    var m=PM[g.provider]||{label:g.provider,color:'#888'};
    var card=document.createElement('div');card.className='card';
    var wrap=document.createElement('div');wrap.className='img-wrap';
    var img=document.createElement('img');
    img.src=g.cover;
    img.alt=g.name;
    img.loading='lazy';
    img.onerror=function(){this.style.opacity='.15';};
    wrap.appendChild(img);
    var overlay=document.createElement('div');overlay.className='card-overlay';
    var nameDiv=document.createElement('div');nameDiv.className='card-name';nameDiv.textContent=g.name;
    overlay.appendChild(nameDiv);
    var badge=document.createElement('span');badge.className='badge';badge.textContent=m.label;
    badge.style.cssText='background:'+m.color+'22;color:'+m.color+';border:1px solid '+m.color+'55';
    card.style.setProperty('--base', PROV_HUE[g.provider]||220);
    card.style.setProperty('--spread', 160);
    card.appendChild(wrap);card.appendChild(overlay);card.appendChild(badge);
    card.onclick=function(){window.parent.postMessage({type:'orbit-launch-game',game:g},'*');};
    grid.appendChild(card);
  });
}

provSel.onchange=loadGames;
sortSel.onchange=applyFilters;
catSel.onchange=applyFilters;
search.addEventListener('input',applyFilters);
// Single delegated mousemove on grid — covers all cards (current and future)
grid.addEventListener('mousemove',function(e){
  var card=e.target.closest('.card');
  if(!card)return;
  var r=card.getBoundingClientRect();
  card.style.setProperty('--mx',(e.clientX-r.left).toFixed(2));
  card.style.setProperty('--my',(e.clientY-r.top).toFixed(2));
  card.style.setProperty('--mxp',((e.clientX-r.left)/r.width).toFixed(2));
});
grid.addEventListener('mouseout',function(e){
  var card=e.target.closest('.card');
  if(!card)return;
  // Only reset when leaving the card (not entering child)
  if(card.contains(e.relatedTarget))return;
  card.style.setProperty('--mx','-9999');
  card.style.setProperty('--my','-9999');
});
window.addEventListener('message',function(e){if(e.data&&e.data.type==='orbit-search'){search.value=e.data.query;if(allGames.length)applyFilters();}});
loadGames();
<\/script></body></html>`
}

function buildMoviesSrcdoc() {
  const css = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:100%;min-height:100%;background:#000;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif}body{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}button,input{font:inherit}.search{width:100%;padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#e0e0e0;outline:none}.search::placeholder{color:rgba(255,255,255,.25)}.tabs{display:flex;gap:8px}.tab{padding:7px 14px;border-radius:9999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.45);cursor:pointer;transition:.15s;font-size:12px}.tab.active{border-color:rgba(255,255,255,.35);color:#fff;background:rgba(255,255,255,.09)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px}.card{overflow:hidden;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);cursor:pointer;transition:.15s;display:block;text-decoration:none;color:inherit}.card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.25)}.card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:rgba(255,255,255,.05)}.copy{padding:9px}.copy h3{font-size:12px;font-weight:600;line-height:1.3;margin-bottom:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.copy p{color:rgba(255,255,255,.35);font-size:11px}.status{color:rgba(255,255,255,.25);font-size:12px;min-height:16px}.pager{display:flex;align-items:center;gap:10px;padding-bottom:4px}.pbtn{padding:7px 14px;border-radius:9999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.45);cursor:pointer;font-size:12px;transition:.15s}.pbtn:hover{background:rgba(255,255,255,.08);color:#fff}.plabel{color:rgba(255,255,255,.25);font-size:12px}`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<input class="search" id="q" placeholder="search movies and shows...">
<div class="tabs"><button class="tab" id="mt">movies</button><button class="tab" id="st">tv shows</button></div>
<div class="grid" id="r"></div>
<div class="status" id="s"></div>
<div class="pager"><button class="pbtn" id="pp">← prev</button><span class="plabel" id="pl">page 1</span><button class="pbtn" id="np">next →</button></div>
<script>
var KEY=${JSON.stringify(TMDB_KEY)};
var res=document.getElementById('r'),status=document.getElementById('s'),search=document.getElementById('q'),pageLabel=document.getElementById('pl');
var moviesTab=document.getElementById('mt'),showsTab=document.getElementById('st');
var tab='movies',page=1,query='';
function updateTabs(){moviesTab.classList.toggle('active',tab==='movies');showsTab.classList.toggle('active',tab==='shows');}
function renderItems(items){
  res.innerHTML='';
  if(!items.length){status.textContent='nothing found';return;}
  items.forEach(function(item){
    var type=tab==='movies'?'movie':'tv';
    var title=item.title||item.name||'untitled';
    var poster=item.poster_path?'https://image.tmdb.org/t/p/w500'+item.poster_path:'';
    var yr=item.release_date||item.first_air_date;
    var card=document.createElement('a');card.className='card';card.href='#';
    card.addEventListener('click',function(e){e.preventDefault();window.parent.postMessage({type:'orbit-launch-watch',id:item.id,kind:type},'*');});
    var img=document.createElement('img');img.src=poster;img.alt=title;img.onerror=function(){img.style.display='none';};
    var copy=document.createElement('div');copy.className='copy';
    copy.innerHTML='<h3>'+title.replace(/</g,'&lt;')+'</h3><p>'+(yr?String(new Date(yr).getFullYear()):'')+'</p>';
    card.appendChild(img);card.appendChild(copy);res.appendChild(card);
  });
  status.textContent=items.length+' results';
}
function load(){
  status.textContent='loading...';
  pageLabel.textContent='page '+page;
  var endpoint=query.trim()
    ?'search/'+(tab==='movies'?'movie':'tv')+'?api_key='+KEY+'&query='+encodeURIComponent(query)+'&page='+page
    :(tab==='movies'?'movie':'tv')+'/popular?api_key='+KEY+'&page='+page;
  fetch('https://api.tmdb.org/3/'+endpoint,{headers:{Accept:'application/json'}})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(data){renderItems(data.results||[]);})
    .catch(function(e){status.textContent='failed: '+e.message;});
}
search.addEventListener('input',function(){query=search.value;page=1;load();});
moviesTab.addEventListener('click',function(){tab='movies';page=1;query='';search.value='';updateTabs();load();});
showsTab.addEventListener('click',function(){tab='shows';page=1;query='';search.value='';updateTabs();load();});
document.getElementById('pp').addEventListener('click',function(){if(page>1){page--;load();}});
document.getElementById('np').addEventListener('click',function(){page++;load();});
updateTabs();load();
<\/script></body></html>`
}

function buildWatchSrcdoc(contentId, contentType) {
  const css = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:100%;min-height:100%;background:#000;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif}body{padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}button,select{font:inherit}.title h2{font-size:22px;font-weight:700;color:#fff;line-height:1.2}.title p{color:rgba(255,255,255,.35);font-size:13px;margin-top:4px}.player{border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#111;aspect-ratio:16/9;width:100%}.player iframe{width:100%;height:100%;border:0;display:block}.row{display:flex;flex-wrap:wrap;gap:8px}.pill{padding:7px 13px;border-radius:9999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);cursor:pointer;font-size:12px;transition:.15s}.pill.active{border-color:rgba(255,255,255,.4);color:#fff;background:rgba(255,255,255,.1)}.pill:hover{background:rgba(255,255,255,.09);color:#fff}select{width:100%;padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e0e0e0;outline:none}.overview{padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)}.overview h3{font-size:14px;font-weight:600;margin-bottom:8px;color:#fff}.overview p{color:rgba(255,255,255,.45);font-size:13px;line-height:1.55}`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<div class="title"><h2 id="wt">loading...</h2><p id="wm"></p></div>
<div class="player"><iframe id="vf" allowfullscreen allow="autoplay; fullscreen; encrypted-media"></iframe></div>
<div class="row" id="sr"></div>
<div class="row" id="eg"></div>
<select id="ss"></select>
<div class="overview"><h3>overview</h3><p id="wo"></p></div>
<script>
var KEY=${JSON.stringify(TMDB_KEY)};
var cid=${JSON.stringify(String(contentId))},ctype=${JSON.stringify(contentType)};
var sources=${JSON.stringify(WATCH_SOURCES)};
var frame=document.getElementById('vf'),srcSelect=document.getElementById('ss');
var seasonRow=document.getElementById('sr'),epGrid=document.getElementById('eg');
var src=sources[0]&&sources[0].id||'vidlink',season=1,ep=1,seasonData=null;
function buildUrl(sid){
  var s=sources.find(function(x){return x.id===sid;})||sources[0];
  var url=s.urls[ctype];
  if(ctype==='tv'){url=url.replace('{id}',cid).replace('{season}',season).replace('{episode}',ep);}
  else{url=url.replace('{id}',cid);}
  return url;
}
function updateVideo(){frame.src=buildUrl(src);}
function renderEps(){
  epGrid.innerHTML='';
  (seasonData&&seasonData.episodes||[]).forEach(function(e){
    var btn=document.createElement('button');btn.className='pill'+(e.episode_number===ep?' active':'');
    btn.textContent='ep '+e.episode_number+(e.name?' \u2013 '+e.name:'');
    btn.onclick=function(){ep=e.episode_number;renderEps();updateVideo();};
    epGrid.appendChild(btn);
  });
  epGrid.style.display='flex';epGrid.style.flexWrap='wrap';
}
function fetchSeason(){
  return fetch('https://api.themoviedb.org/3/tv/'+cid+'/season/'+season+'?api_key='+KEY)
    .then(function(r){return r.json();})
    .then(function(data){seasonData=data;ep=1;renderEps();updateVideo();});
}
sources.forEach(function(s){var opt=document.createElement('option');opt.value=s.id;opt.textContent=s.name;srcSelect.appendChild(opt);});
srcSelect.value=src;
srcSelect.onchange=function(){src=srcSelect.value;updateVideo();};
fetch('https://api.themoviedb.org/3/'+ctype+'/'+cid+'?api_key='+KEY)
  .then(function(r){return r.json();})
  .then(function(c){
    document.getElementById('wt').textContent=c.title||c.name||'unknown';
    var yr=c.release_date||c.first_air_date;
    document.getElementById('wm').textContent=yr?String(new Date(yr).getFullYear()):'';
    document.getElementById('wo').textContent=c.overview||'';
    if(ctype==='tv'){
      seasonRow.style.display='flex';seasonRow.style.flexWrap='wrap';
      for(var i=1;i<=(c.number_of_seasons||0);i++){(function(n){
        var btn=document.createElement('button');btn.className='pill'+(n===1?' active':'');btn.textContent='season '+n;
        btn.onclick=function(){season=n;Array.from(seasonRow.children).forEach(function(b,idx){b.classList.toggle('active',idx===n-1);});fetchSeason();};
        seasonRow.appendChild(btn);
      })(i);}
      fetchSeason();
    }else{updateVideo();}
  })
  .catch(function(){document.getElementById('wt').textContent='failed to load';});
<\/script></body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

function cardHTML({ id, name, icon, color = '#ffffff' }) {
  const iconSVG = ICON_MAP[icon]?.(26) ?? ''
  const bg  = color + '22'
  const bdr = color + '44'
  return `
    <button data-app-id="${id}"
            class="app-card flex flex-col items-center gap-3 px-5 py-5
                   rounded-2xl bg-white/[0.04] backdrop-blur-lg
                   select-none cursor-pointer border-0 outline-none"
            style="color:${color}">
      <div class="w-12 h-12 flex items-center justify-center rounded-xl transition-colors duration-200"
           style="background:${bg};border:1px solid ${bdr}">
        ${iconSVG}
      </div>
      <span class="text-[11px] font-medium tracking-wide text-white/70">${name}</span>
    </button>`
}

function gridHTML() {
  const q = state.query.trim().toLowerCase()
  const hits = APPS_DATA.filter(a => a.name.toLowerCase().includes(q))
  return hits.length ? hits.map(cardHTML).join('') : `
    <p class="text-white/25 text-sm tracking-wide col-span-full text-center py-8">
      No results for "${state.query}"
    </p>`
}

// ── Views ──────────────────────────────────────────────────────────────────

function homeViewHTML() {
  return `
    <div class="flex flex-col items-center gap-9 w-full">
      <div class="flex flex-col items-center gap-3 select-none">
        <h1 class="brand-title text-[7rem] sm:text-[9.5rem] leading-none">
          ${BRAND}
        </h1>
        <p id="site-tagline" class="brand-tagline font-light">${TAGLINE}</p>
      </div>

      <div class="w-full max-w-md">
        <label class="search-bar flex items-center gap-3 px-5 py-3.5
                      rounded-full bg-white/[0.04] backdrop-blur-lg cursor-text">
          ${icoSearch(15)}
          <input id="search-input" type="text" placeholder="Search apps..."
                 autocomplete="off" value="${state.query}"
                 class="bg-transparent flex-1 text-white/85 placeholder-white/25
                        text-sm outline-none caret-white/50 min-w-0" />
        </label>
      </div>

      <div id="app-grid" class="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
        ${gridHTML()}
      </div>
    </div>`
}

function settingsBodyHTML() {
  const isAppearance  = state.settingsSection === 'appearance'
  const isPerformance = state.settingsSection === 'performance'
  const isPrivacy     = state.settingsSection === 'privacy'
  const isAbout       = state.settingsSection === 'about'

  const appearanceExpanded = isAppearance ? `
    <div class="px-5 pb-5 flex flex-col gap-3">
      <p class="text-white/30 text-[10px] uppercase tracking-widest">Color Theme</p>
      <div class="grid grid-cols-4 gap-2">
        ${Object.entries(THEMES).map(([name, { label, rgb, hex }]) => `
          <button
            class="theme-card${state.accentRgb === rgb ? ' active' : ''}"
            data-theme-name="${name}">
            <div class="theme-card-preview"
                 style="background:rgba(${rgb},0.12);border-color:rgba(${rgb},0.3)">
              <span style="color:${hex};filter:drop-shadow(0 0 6px rgba(${rgb},0.85))">Aa</span>
            </div>
            <span class="theme-card-name">${label}</span>
          </button>`).join('')}
      </div>
    </div>` : ''

  const perfToggleHTML = (key, title, desc) => `
    <div class="flex items-center justify-between px-4 py-3 rounded-xl
                bg-white/[0.03] border border-white/[0.06]">
      <div>
        <p class="text-white/70 text-sm font-medium">${title}</p>
        <p class="text-white/25 text-xs mt-0.5">${desc}</p>
      </div>
      <button data-perf-toggle="${key}" type="button"
              class="perf-tog${state[key] ? ' perf-tog-on' : ''}">
        <span class="perf-tog-thumb"></span>
      </button>
    </div>`

  const performanceExpanded = isPerformance ? `
    <div class="px-5 pb-5 flex flex-col gap-2">
      ${perfToggleHTML('perfNoStars',      'Disable Stars',         'Stops starfield — biggest GPU saving')}
      ${perfToggleHTML('perfReduceMotion', 'Reduce Motion',         'Disables all transitions & animations')}
      ${perfToggleHTML('perfNoBlur',       'Disable Blur Effects',  'Removes backdrop-filter (GPU heavy)')}
      ${perfToggleHTML('perfNoGlow',       'Disable Glow',          'Removes box-shadow glow effects')}
    </div>` : ''

  const privacyExpanded = isPrivacy ? `
    <div class="px-5 pb-5 flex flex-col gap-2">
      <button data-clear-key="orbit_chat_rate"
              class="settings-action-btn">Clear chat rate limit</button>
      <button data-clear-key="orbit_chat_img"
              class="settings-action-btn">Clear image upload counter</button>
      <button data-clear-key="orbit_session"
              class="settings-action-btn">Sign out / clear session</button>
      <button data-clear-all
              class="settings-action-btn settings-action-danger">Clear all Orbit data</button>
    </div>` : ''

  const aboutExpanded = isAbout ? `
    <div class="px-5 pb-5 flex flex-col gap-3">
      <div class="flex flex-col gap-1.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <p class="text-white/70 text-sm font-semibold">OrbitV2 <span class="text-white/30 font-normal">v${APP_VERSION}</span></p>
        <p class="text-white/30 text-xs">Vite · Tailwind v4 · Firebase RTDB</p>
      </div>
      <p class="text-white/25 text-[10px] uppercase tracking-widest px-1">Changelog</p>
      <ul class="flex flex-col gap-1.5">
        ${CHANGELOG.map(c => `<li class="text-white/50 text-xs px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">· ${c}</li>`).join('')}
      </ul>
    </div>` : ''

  return `
    ${settingsRowHTML('Appearance',  'Theme & colors',               'appearance',  isAppearance)}
    ${appearanceExpanded}
    ${settingsRowHTML('Performance', 'Stars, blur, motion, glow',    'performance', isPerformance)}
    ${performanceExpanded}
    ${settingsRowHTML('Privacy',     'Clear data & session',         'privacy',     isPrivacy)}
    ${privacyExpanded}
    ${settingsRowHTML('About',       `v${APP_VERSION} · OrbitV2`,    'about',       isAbout)}
    ${aboutExpanded}`
}

function settingsRowHTML(title, desc, section = null, isOpen = false) {
  const clickAttr = section ? `data-settings-section="${section}"` : ''
  const a11yAttrs = section
    ? `tabindex="0" role="button" aria-expanded="${isOpen}" aria-label="${title}: ${desc}"`
    : ''
  const chevronCls = isOpen ? 'rotate-90' : ''
  return `
    <div ${clickAttr} ${a11yAttrs}
         class="flex items-center justify-between px-5 py-4
                rounded-2xl bg-white/[0.04] backdrop-blur-lg
                border border-white/[0.08]
                ${section ? 'cursor-pointer hover:bg-white/[0.08] hover:border-white/20 focus:outline-none focus:border-white/40 focus:bg-white/[0.08]' : ''}
                transition-colors duration-200 select-none">
      <div>
        <p class="text-white/80 text-sm font-medium">${title}</p>
        <p class="text-white/30 text-xs mt-0.5">${desc}</p>
      </div>
      ${section ? `<span class="text-white/30 transition-transform duration-200 ${chevronCls}">${icoChevronRight(16)}</span>` : ''}
    </div>`
}

function settingsViewHTML() {
  return `
    <div class="flex flex-col items-center gap-6 w-full max-w-lg">
      <div class="flex flex-col items-center gap-2 select-none">
        <h2 class="text-2xl font-bold text-white/90 tracking-tight">Settings</h2>
        <p class="text-[11px] uppercase tracking-[0.4em] text-white/30">Configure OrbitV2</p>
      </div>
      <div id="settings-body" class="w-full flex flex-col gap-2">
        ${settingsBodyHTML()}
      </div>
    </div>`
}

function placeholderViewHTML(label) {
  return `
    <div class="flex flex-col items-center gap-3 text-center select-none">
      <p class="text-white/20 text-4xl">✦</p>
      <p class="text-white/40 text-sm tracking-widest uppercase">${label}</p>
      <p class="text-white/20 text-xs">Coming soon</p>
    </div>`
}

// ── Skeleton components ────────────────────────────────────────────────────

function skeletonGameCard() {
  return `
    <div class="rounded-2xl bg-white/[0.04] border border-white/[0.06]
                flex flex-col items-center gap-3 px-5 py-5 w-[104px]">
      <div class="skeleton-inner w-12 h-12"></div>
      <div class="skeleton-inner h-2.5 w-14 rounded-full"></div>
    </div>`
}

function skeletonTvCard() {
  return `
    <div class="rounded-2xl bg-white/[0.04] border border-white/[0.06]
                overflow-hidden w-56">
      <div class="skeleton-inner w-full rounded-none" style="aspect-ratio:16/9"></div>
      <div class="flex flex-col gap-2 p-3">
        <div class="skeleton-inner h-2.5 w-3/4 rounded-full"></div>
        <div class="skeleton-inner h-2 w-1/2 rounded-full"></div>
      </div>
    </div>`
}

function skeletonViewHTML({ title, subtitle, cards, layout }) {
  const grid = Array(cards).fill(null).map(layout).join('')
  return `
    <div class="flex flex-col items-center gap-6 w-full">
      <div class="flex flex-col items-center gap-2 select-none">
        <h2 class="text-2xl font-bold text-white/90 tracking-tight">${title}</h2>
        <p class="text-[11px] uppercase tracking-[0.4em] text-white/30">${subtitle}</p>
      </div>
      <div id="skeleton-container"
           class="flex flex-wrap justify-center gap-3 max-w-4xl w-full">
        ${grid}
      </div>
    </div>`
}

function musicViewHTML() {
  return `<div class="content-view"><iframe src="https://monochrome.tf" class="content-frame" allowfullscreen></iframe></div>`
}

function gamesViewHTML() {
  // Iframe lives persistently at the orbit-root level; this is just a placeholder
  return `<div class="content-view"></div>`
}

function tvViewHTML() {
  return `<div class="content-view"><iframe id="tv-frame" class="content-frame" sandbox="allow-scripts allow-popups"></iframe></div>`
}

function chatViewHTML() {
  const nick       = _currentNick()
  const isLoggedIn = !!_authUser
  const isGlobal   = _chatMode === 'global'
  const isDM       = _chatMode === 'dm'
  const hasDmPeer  = isDM && !!_chatDmPartner
  const chanLabel  = hasDmPeer ? `@ ${_escHtml(_chatDmPartner)}` : '# global'
  const inputPH    = hasDmPeer ? `Message ${_escHtml(_chatDmPartner)}…` : 'Send a message…'

  // ── DM search screen ──
  const dmSearchPanel = `
    <div class="chat-dm-search">
      <div class="chat-dm-search-icon" style="color:var(--accent-color)">${icoMsgSquare(30)}</div>
      <h3 class="chat-dm-search-title">New Direct Message</h3>
      <p class="chat-dm-search-sub">Type a username below, or click someone in the sidebar</p>
      <div class="chat-dm-find-wrap">
        <input id="chat-dm-find" type="text" placeholder="Find a user…"
               autocomplete="off" spellcheck="false" class="chat-dm-find-input" />
        <button id="chat-dm-go" class="chat-dm-go-btn">
          Open DM ${icoArrowRight(14)}
        </button>
      </div>
      <div id="chat-dm-status" class="chat-dm-status-msg" style="display:none"></div>
    </div>`

  // ── Message area + input ──
  const imgLeft = _IMG_DAY_MAX - _imgUsedToday()
  const chatPanel = `
    <div id="chat-messages" class="chat-feed">
      <div id="chat-empty-state" class="chat-empty-state">
        <div class="chat-empty-icon">${icoMsgSquare(40)}</div>
        <div class="chat-empty-title">No messages yet</div>
        <div class="chat-empty-sub">Send your first message to start the conversation.</div>
      </div>
    </div>
    <div class="chat-input-row">
      <form id="chat-form" class="chat-input-wrap">
        <input id="chat-img-file" type="file" accept="image/*" style="display:none">
        <button type="button" id="chat-img-btn" class="chat-img-btn" title="Upload image (${imgLeft} left today)">
          ${icoImage(16)}
        </button>
        <input id="chat-input" type="text" placeholder="${inputPH}"
               autocomplete="off" maxlength="500" class="chat-input-field">
        <button type="submit" class="chat-send-btn" title="Send">${icoArrowRight(16)}</button>
      </form>
    </div>`

  return `
    <div class="chat-shell">

      <!-- ══ LEFT: main chat ══ -->
      <div class="chat-main">

        <!-- Top bar -->
        <div class="chat-topbar">
          <div class="flex items-center gap-3">
            ${hasDmPeer
              ? `<button id="chat-back-btn" class="chat-back-btn">${icoArrowLeft(14)}</button>`
              : `<div class="chat-chan-icon" style="color:var(--accent-color)">${icoMsgSquare(16)}</div>`
            }
            <span class="chat-chan-label">${chanLabel}</span>
          </div>

          <div class="flex items-center gap-3">
            ${!hasDmPeer ? `
              <div class="chat-tabs-wrap">
                <button id="chat-tab-global" class="chat-tab-pill${isGlobal ? ' active' : ''}">
                  ${icoGlobe(12)} Global
                </button>
                <button id="chat-tab-dm" class="chat-tab-pill${isDM ? ' active' : ''}">
                  ${icoMsgSquare(12)} DM
                </button>
              </div>` : ''}
            <div class="chat-online-pill">
              <span class="chat-online-dot"></span>
              <span id="online-count" class="text-white/80 text-xs font-bold tabular-nums">0</span>
              <span class="text-white/35 text-xs">online</span>
            </div>
            ${!isLoggedIn ? `<button id="chat-login-btn" class="chat-signin-btn">Sign in</button>` : ''}
          </div>
        </div>

        <!-- Main panel -->
        ${isDM && !hasDmPeer ? dmSearchPanel : chatPanel}

      </div>

      <!-- ── Vertical glass divider ── -->
      <div class="chat-divider" aria-hidden="true"></div>

      <!-- ══ RIGHT: sidebar (merged into same glass shell) ══ -->
      <aside class="chat-sidebar">

        <div class="chat-sb-section">
          <div class="chat-sb-section-label">${icoUser(10)} Online Now</div>
          <div id="chat-sidebar-users" class="chat-sidebar-users"></div>
        </div>

        <div class="chat-sb-section chat-sb-you-section">
          <div class="chat-sb-section-label">${icoUser(10)} You</div>
          <div class="chat-sb-self-row">
            <span class="chat-sb-dot"></span>
            <span class="chat-sb-name" style="color:var(--accent-color)">${_escHtml(nick)}</span>
            ${isLoggedIn ? '' : '<span class="chat-sb-you">guest</span>'}
          </div>
        </div>

      </aside>

    </div>`
}

function aiViewHTML() {
  const suggestions = [
    ['Explain quantum computing simply', 'sparkles'],
    ['Help me debug some code',          'gamepad' ],
    ['Write a short poem about space',   'user'    ],
    ['Summarise a topic for me',         'search'  ],
  ]
  const iconFor = k => ({ sparkles: icoSparkles, gamepad: icoGamepad, user: icoUser, search: icoSearch }[k]?.(13) ?? '')
  return `
    <div class="flex flex-col w-full" style="height:calc(100dvh - 7.5rem)">

      <!-- Message feed -->
      <div id="ai-messages"
           class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-2 pb-4">
        <div id="ai-welcome"
             class="flex flex-col items-center justify-center h-full gap-7 select-none">
          <div class="flex flex-col items-center gap-2 text-center">
            <h2 class="text-[2rem] font-bold text-white/90 leading-tight">
              What can I help you with?
            </h2>
            <p class="text-white/25 text-xs">Llama 3.3 70B · Groq · streaming</p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 max-w-md">
            ${suggestions.map(([label, icon]) => `
              <button data-ai-suggest="${_escHtml(label)}"
                      class="flex items-center gap-2 px-4 py-2
                             bg-white/[0.04] hover:bg-white/[0.08]
                             rounded-full border border-white/[0.08] hover:border-white/20
                             text-white/40 hover:text-white/75 transition-colors text-xs cursor-pointer">
                ${iconFor(icon)}
                ${_escHtml(label)}
              </button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="flex-shrink-0 rounded-2xl border border-white/[0.08]
                  bg-white/[0.03] backdrop-blur-lg overflow-hidden">
        <textarea id="ai-input" placeholder="Ask anything…"
                  class="w-full px-4 py-4 bg-transparent border-none outline-none resize-none
                         text-white/85 text-sm placeholder-white/20 caret-white/50
                         leading-relaxed block"
                  style="min-height:60px;max-height:200px;overflow:hidden;height:60px"></textarea>
        <div class="flex items-center justify-between px-4 pb-3">
          <span class="text-white/20 text-[11px] select-none">Llama 3.3 · Enter to send · Shift+Enter newline</span>
          <div class="flex items-center gap-2">
            <button id="ai-stop-btn"
                    class="text-white/25 hover:text-white/70 transition-colors text-[11px]
                           hidden cursor-pointer"
                    title="Stop">stop ✕</button>
            <button id="ai-send-btn"
                    class="p-1.5 rounded-lg border border-white/10 text-white/30
                           hover:text-white hover:border-white/30 hover:bg-white/[0.08]
                           transition-colors cursor-pointer"
                    title="Send">
              ${icoArrowRight(15)}
            </button>
          </div>
        </div>
      </div>

    </div>`
}

// ── Content reveal — fades skeletons out, fades real content in ────────────
function scheduleContentReveal(view) {
  if (loadedViews.has(view)) return

  setTimeout(() => {
    if (state.view !== view) return   // user navigated away
    const container = document.getElementById('skeleton-container')
    if (!container) return

    // Step 1: fade the skeleton grid out
    container.classList.add('skeleton-exit')

    // Step 2: after 300 ms swap content and fade it in
    setTimeout(() => {
      if (state.view !== view) return
      loadedViews.add(view)
      container.classList.remove('skeleton-exit')
      container.innerHTML = comingSoonContentHTML(view)
      container.classList.add('view-enter')
      container.addEventListener('animationend',
        () => container.classList.remove('view-enter'), { once: true })
    }, 300)
  }, 2200)
}

function comingSoonContentHTML(view) {
  return `
    <div class="flex flex-col items-center gap-3 text-center py-12 select-none">
      <p class="text-white/20 text-4xl">✦</p>
      <p class="text-white/40 text-sm tracking-widest uppercase">${view} library</p>
      <p class="text-white/20 text-xs">Content coming soon — add your data to APPS_DATA</p>
    </div>`
}

// ── Countdown (Browser Coming Soon) ────────────────────────────────────────

function countdownViewHTML() {
  return `
    <div class="countdown-wrap">
      <div class="countdown-blob-a"></div>
      <div class="countdown-blob-b"></div>

      <div class="countdown-card">

        <!-- Badge -->
        <div class="countdown-badge">
          <span class="countdown-badge-icon" style="color:var(--accent-color)">${icoSparkles(13)}</span>
          <span>Early Access Opening Soon</span>
        </div>

        <!-- Text -->
        <div class="countdown-text-block">
          <h1 class="countdown-heading">Orbit <span style="color:var(--accent-color)">Browser</span></h1>
          <p class="countdown-sub">
            Full proxy-powered browsing is on its way. Reserve your spot before the timer runs out.
          </p>
        </div>

        <!-- Timer -->
        <div class="countdown-timer">
          <div class="countdown-unit">
            <div class="countdown-box">
              <span id="cd-h" class="countdown-digit">00</span>
            </div>
            <span class="countdown-label">Hours</span>
          </div>
          <span class="countdown-colon">:</span>
          <div class="countdown-unit">
            <div class="countdown-box">
              <span id="cd-m" class="countdown-digit">00</span>
            </div>
            <span class="countdown-label">Minutes</span>
          </div>
          <span class="countdown-colon">:</span>
          <div class="countdown-unit">
            <div class="countdown-box">
              <span id="cd-s" class="countdown-digit">00</span>
            </div>
            <span class="countdown-label">Seconds</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="countdown-actions">
          <button class="cd-btn-primary" id="cd-notify-btn">
            <span>Get Notified</span>
            ${icoArrowRight(15)}
          </button>
          <button class="cd-btn-secondary" id="cd-cal-btn">
            ${icoClock(15)}
            <span>Add to Calendar</span>
          </button>
        </div>

      </div>
    </div>`
}

// Update a countdown digit element with a flip animation
function _cdSetDigit(id, val) {
  const el = document.getElementById(id)
  if (!el) return
  const padded = String(val).padStart(2, '0')
  if (el.dataset.cdVal === padded) return
  el.dataset.cdVal = padded
  el.textContent = padded
  el.classList.remove('cd-flip')
  void el.offsetWidth   // force reflow to restart animation
  el.classList.add('cd-flip')
}

// Legacy proxy functions kept for future restoration
function browserViewHTML() { return countdownViewHTML() }

// Ultraviolet XOR encoding — odd-indexed chars XORed with 2, result URI-encoded
function xorEncode(str) {
  return encodeURIComponent(
    [...str].map((c, i) => i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ 2) : c).join('')
  )
}


// Prime the Interstellar service worker.
// Loads the proxy host root once → registers + activates the SW at that origin.
// SW lifecycle: registered → installing → installed → activating → activated.
// We wait 2.5s after page load to cover the full activation cycle.
// _uvReadyPromise is reset to null on failure so the next nav retries.
async function initUV(iframe) {
  iframe.dataset.priming = 'true'
  try {
    await new Promise((resolve, reject) => {
      const fallback = setTimeout(resolve, 10000) // hard cap 10s
      const onLoad = () => {
        clearTimeout(fallback)
        iframe.removeEventListener('load', onLoad)
        setTimeout(resolve, 2500) // wait for SW install + activate
      }
      iframe.addEventListener('load', onLoad)
      iframe.src = PROXY_HOST
    })
  } catch {
    _uvReadyPromise = null // allow retry on next navigate
  } finally {
    delete iframe.dataset.priming
  }
}

async function browserNavigate(input, { pushHistory = true, clearForward = true } = {}) {
  const val = input.trim()
  if (!val) return
  const url = looksLikeUrl(val)
    ? (/^https?:\/\//i.test(val) ? val : `https://${val}`)
    : BROWSER_SEARCH(val)

  const loading   = document.getElementById('browser-loading')
  const iframe    = document.getElementById('browser-iframe')
  const urlInput  = document.getElementById('browser-url-input')
  const newTabBtn = document.getElementById('browser-newtab-btn')

  if (loading)   loading.style.opacity = '1'
  if (iframe)    iframe.style.opacity  = '0'
  if (urlInput)  urlInput.value = url
  if (newTabBtn) newTabBtn.href = url

  if (pushHistory) {
    state.browserHistory = [...state.browserHistory, state.browserUrl].slice(-50)
  }
  if (clearForward) state.browserForward = []
  state.browserUrl = url

  _syncBrowserNavBtns()

  if (!iframe) return
  const finalSrc = `${PROXY_HOST}/a/${xorEncode(url)}`
  if (!_uvReadyPromise) _uvReadyPromise = initUV(iframe)
  await _uvReadyPromise
  iframe.src = finalSrc
}

function _syncBrowserNavBtns() {
  const backBtn    = document.getElementById('browser-back-btn')
  const forwardBtn = document.getElementById('browser-forward-btn')
  const canBack    = state.browserHistory.length > 0
  const canForward = state.browserForward.length > 0
  if (backBtn)    { backBtn.style.opacity    = canBack    ? '1' : '0.25'; backBtn.style.pointerEvents    = canBack    ? 'auto' : 'none' }
  if (forwardBtn) { forwardBtn.style.opacity = canForward ? '1' : '0.25'; forwardBtn.style.pointerEvents = canForward ? 'auto' : 'none' }
}

function profileViewHTML() {
  if (_authUser && _accountName) {
    // Logged-in state
    const initial = _accountName.charAt(0).toUpperCase()
    return `
    <div class="flex flex-col gap-5 w-full max-w-sm mx-auto pt-4">

      <!-- Avatar + name -->
      <div class="flex flex-col items-center gap-3 py-6
                  bg-white/[0.03] border border-white/[0.07] rounded-3xl">
        <div class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black select-none"
             style="background:rgba(var(--accent-rgb),.15);color:var(--accent-color);
                    box-shadow:0 0 0 2px rgba(var(--accent-rgb),.3),0 0 24px rgba(var(--accent-rgb),.15)">
          ${_escHtml(initial)}
        </div>
        <div class="text-center">
          <div class="text-white font-bold text-xl tracking-wide">${_escHtml(_accountName)}</div>
          <div class="text-white/25 text-xs mt-0.5">Signed in</div>
        </div>
      </div>

      <!-- Developer Info (collapsible) -->
      <details id="dev-info" class="bg-white/[0.03] border border-white/[0.07] rounded-2xl">
        <summary class="px-4 py-3 cursor-pointer select-none text-white/50 text-xs uppercase tracking-widest flex items-center justify-between list-none">
          <span>Developer Info</span>
          <span class="dev-info-chevron text-white/30 transition-transform duration-200">${icoChevronRight(14)}</span>
        </summary>
        <div class="px-4 pb-3 pt-1 flex flex-col gap-2">
          <div>
            <div class="text-white/25 text-[10px] uppercase tracking-widest">UID</div>
            <div class="flex items-center gap-2 mt-1">
              <code class="text-white/60 text-[11px] font-mono break-all flex-1">${_escHtml(_authUser.uid)}</code>
              <button id="dev-uid-copy" type="button"
                      class="text-white/40 hover:text-white/80 text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-colors">
                Copy
              </button>
            </div>
          </div>
          <div>
            <div class="text-white/25 text-[10px] uppercase tracking-widest">App version</div>
            <div class="text-white/60 text-[11px] font-mono mt-1">v${_escHtml(APP_VERSION)}</div>
          </div>
        </div>
      </details>

      <!-- Bio -->
      <div class="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-3">
        <label class="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Bio</label>
        <textarea id="profile-bio" rows="2" maxlength="160" placeholder="Write something about yourself…"
                  class="w-full bg-transparent outline-none text-white/70 text-sm placeholder-white/20
                         resize-none caret-white/40 leading-relaxed"></textarea>
      </div>

      <!-- Actions -->
      <button id="profile-signout"
              class="w-full py-3 rounded-2xl border border-white/10 text-white/40 text-sm
                     hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer">
        Sign out
      </button>
    </div>`
  }

  // Not logged in — fancy sign-in card
  return `
    <div class="signin-wrap" id="signin-wrap">

      <!-- ── 3D tilt wrapper ── -->
      <div id="signin-3d" class="signin-3d">
        <div class="signin-card" id="signin-card">

          <!-- traveling light beams -->
          <div class="signin-beams" aria-hidden="true">
            <span class="sbeam sbeam-top"></span>
            <span class="sbeam sbeam-right"></span>
            <span class="sbeam sbeam-bottom"></span>
            <span class="sbeam sbeam-left"></span>
          </div>

          <!-- Logo -->
          <div class="signin-logo-wrap">
            <div class="signin-logo">O</div>
          </div>
          <h1 class="signin-title">Welcome Back</h1>
          <p class="signin-sub">Sign in to continue to Orbit</p>

          <!-- Tabs -->
          <div class="signin-tabs-wrap">
            <button id="auth-tab-login"    class="signin-tab signin-tab-active">Sign In</button>
            <button id="auth-tab-register" class="signin-tab">Register</button>
          </div>

          <!-- Fields -->
          <div class="signin-fields">
            <div class="signin-field">
              <span class="sfield-ico">${icoUser(15)}</span>
              <input id="auth-username" type="text" placeholder="Username"
                     autocomplete="username" autocorrect="off" autocapitalize="off"
                     spellcheck="false" maxlength="20" class="sfield-input" />
            </div>
            <div class="signin-field">
              <span class="sfield-ico">${icoLock(15)}</span>
              <input id="auth-password" type="password" placeholder="Password"
                     autocomplete="current-password" maxlength="128" class="sfield-input signin-input-pw" />
              <button id="auth-pw-toggle" class="sfield-eye" type="button" tabindex="-1">
                ${icoEyeOff(15)}
              </button>
            </div>
          </div>

          <div id="auth-error" class="signin-error hidden"></div>

          <button id="auth-submit" class="signin-submit" type="button">Sign In</button>

        </div>
      </div>
    </div>`
}

function viewHTML() {
  switch (state.view) {
    case 'home':     return homeViewHTML()
    case 'settings': return settingsViewHTML()
    case 'music':    return musicViewHTML()
    case 'games':    return gamesViewHTML()
    case 'tv':       return tvViewHTML()
    case 'chat':     return chatViewHTML()
    case 'ai':       return aiViewHTML()
    case 'browser':  return browserViewHTML()
    case 'profile':  return profileViewHTML()
    default:         return placeholderViewHTML(state.view)
  }
}

function dockHTML() {
  const items = DOCK_ITEMS.map(({ iconFn, label, view }) => `
    <button data-view="${view}" title="${label}"
            class="dock-item${state.view === view ? ' active' : ''}
                   flex items-center justify-center w-10 h-10 rounded-full
                   border-0 outline-none cursor-pointer">
      ${iconFn(18)}
    </button>`).join('')

  return `
    <nav id="main-dock" aria-label="Main navigation"
         class="dock fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-1 px-3 py-2.5 rounded-full shadow-2xl">
      ${items}
    </nav>`
}

// ═══════════════════════════════════════════════════════════════════════════
// TARGETED DOM UPDATES
// ═══════════════════════════════════════════════════════════════════════════

let $viewContent
let $dock

function updateGrid() {
  const grid = document.getElementById('app-grid')
  if (grid) grid.innerHTML = gridHTML()
}

function swapView() {
  if (!$viewContent) return

  // Stop countdown timer when navigating away
  clearInterval(_cdInterval)
  _cdInterval = null

  // Browser view needs a different main layout (top-aligned, full height)
  const mainEl = document.querySelector('main')
  const fullHeightViews = ['browser', 'games', 'tv', 'chat', 'ai', 'music']
  if (mainEl) mainEl.classList.toggle('browser-mode', fullHeightViews.includes(state.view))

  $viewContent.style.transition = 'opacity 0.12s ease, transform 0.12s ease'
  $viewContent.style.opacity    = '0'
  $viewContent.style.transform  = 'translateY(6px)'
  setTimeout(() => {
    $viewContent.innerHTML = viewHTML()
    $viewContent.style.transition = ''
    $viewContent.style.opacity    = ''
    $viewContent.style.transform  = ''
    $viewContent.classList.add('view-enter')
    $viewContent.addEventListener('animationend',
      () => $viewContent.classList.remove('view-enter'), { once: true })
    bindViewEvents()
  }, 130)
}

function syncDockActive() {
  $dock?.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === state.view)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════════════════════════

function bindViewEvents() {
  // Toggle persistent games iframe visibility
  const gamesFrame = document.getElementById('games-frame')
  const gamesSkel  = document.getElementById('games-skeleton')
  const mainEl = document.querySelector('main')
  if (gamesFrame) {
    if (state.view === 'games') {
      gamesFrame.classList.add('games-frame-visible')
      mainEl?.classList.add('games-active')
      // Show skeleton until iframe content reports ready (applyFilters complete)
      const showSkel = gamesFrame.dataset.builtAccent !== state.accentRgb
                    || gamesFrame.dataset.gamesReady !== '1'
      if (showSkel && gamesSkel) gamesSkel.classList.add('is-visible')
      // Build srcdoc only once per accent change
      if (gamesFrame.dataset.builtAccent !== state.accentRgb) {
        gamesFrame.dataset.gamesReady = '0'
        gamesFrame.srcdoc = buildGamesSrcdoc(state.accentRgb)
        gamesFrame.dataset.builtAccent = state.accentRgb
        gamesFrame.addEventListener('load', () => {
          if (_pendingGameSearch) {
            const q = _pendingGameSearch
            _pendingGameSearch = null
            gamesFrame.contentWindow?.postMessage({ type: 'orbit-search', query: q }, '*')
          }
          try { gamesFrame.contentWindow?.focus() } catch {}
        }, { once: true })
      } else {
        // Already loaded — push pending query (if any) + restore focus
        if (_pendingGameSearch) {
          const q = _pendingGameSearch
          _pendingGameSearch = null
          gamesFrame.contentWindow?.postMessage({ type: 'orbit-search', query: q }, '*')
        }
        try { gamesFrame.contentWindow?.focus() } catch {}
      }
    } else {
      gamesFrame.classList.remove('games-frame-visible')
      mainEl?.classList.remove('games-active')
      if (gamesSkel) gamesSkel.classList.remove('is-visible')
    }
  }
  if (state.view === 'tv') {
    const frame = document.getElementById('tv-frame')
    if (frame) frame.srcdoc = buildMoviesSrcdoc()
  }

  if (state.view === 'chat') {
    // Lazy-load Firebase before any chat code runs
    _ensureFb().then(() => {
      // Load messages when in a real channel (global or active DM)
      if (_chatMode === 'global' || (_chatMode === 'dm' && _chatDmPartner)) {
        _loadChatMessages()
      }
    })

    // ── Send message ──
    document.getElementById('chat-form')?.addEventListener('submit', e => {
      e.preventDefault()
      _sendChatMessage()
    })

    // ── Image upload ──
    const imgBtn  = document.getElementById('chat-img-btn')
    const imgFile = document.getElementById('chat-img-file')
    imgBtn?.addEventListener('click', () => {
      if (_imgUsedToday() >= _IMG_DAY_MAX) {
        _chatShowNotice(`Image limit reached (${_IMG_DAY_MAX}/day)`)
        return
      }
      imgFile?.click()
    })
    imgFile?.addEventListener('change', () => {
      const file = imgFile?.files?.[0]
      if (file) { _sendChatImage(file); imgFile.value = '' }
    })

    // ── Tab: Global ──
    document.getElementById('chat-tab-global')?.addEventListener('click', () => {
      _switchChat('global', '', '')
    })

    // ── Tab: DM (go to search screen) ──
    document.getElementById('chat-tab-dm')?.addEventListener('click', () => {
      _switchChat('dm', '', '')
    })

    // ── Back button (inside DM conversation → back to DM search) ──
    document.getElementById('chat-back-btn')?.addEventListener('click', () => {
      _teardownChatMessages()
      _switchChat('dm', '', '')
    })

    // ── DM search: start chat button + Enter key ──
    async function _startDm() {
      const input    = document.getElementById('chat-dm-find')
      const statusEl = document.getElementById('chat-dm-status')
      const target   = input?.value.trim() ?? ''
      if (!target) return

      if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = '' }

      if (!_authUser) {
        // Guest: use raw username as room code
        _switchChat('dm', target, target)
        return
      }
      if (target.toLowerCase() === _currentNick().toLowerCase()) {
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = "That's you!" }
        return
      }

      // Disable button while looking up
      const btn = document.getElementById('chat-dm-go')
      if (btn) { btn.disabled = true; btn.textContent = '…' }

      const key = await _dmKey(target)
      if (!key) {
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'User not found' }
        if (btn) { btn.disabled = false; btn.innerHTML = 'Start Chat ' + icoArrowRight(14) }
        return
      }
      _switchChat('dm', key, target)
    }

    document.getElementById('chat-dm-go')?.addEventListener('click', _startDm)
    document.getElementById('chat-dm-find')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') _startDm()
    })

    document.getElementById('chat-login-btn')?.addEventListener('click', () => {
      setState({ view: 'profile' })
    })

    // ── Sidebar: click user → start DM ──
    document.getElementById('chat-sidebar-users')?.addEventListener('click', async e => {
      const userEl = e.target.closest('.chat-sidebar-user')
      if (!userEl) return
      const username = userEl.dataset.username
      if (!username || username === _currentNick()) return
      if (!_authUser) { _switchChat('dm', username, username); return }
      const key = await _dmKey(username)
      if (key) _switchChat('dm', key, username)
    })

    // Focus the right input
    document.getElementById('chat-input')?.focus()
    document.getElementById('chat-dm-find')?.focus()
  }

  if (state.view === 'profile') {
    // ── Auth form ────────────────────────────────────────────────────────────
    let _authMode = 'login'

    const tabLogin    = document.getElementById('auth-tab-login')
    const tabRegister = document.getElementById('auth-tab-register')
    const submitBtn   = document.getElementById('auth-submit')
    const errorEl     = document.getElementById('auth-error')

    function _setAuthMode(mode) {
      _authMode = mode
      tabLogin?.classList.toggle('signin-tab-active', mode === 'login')
      tabRegister?.classList.toggle('signin-tab-active', mode === 'register')
      if (submitBtn)   submitBtn.textContent = mode === 'login' ? 'Sign In' : 'Create Account'
      if (errorEl)     { errorEl.classList.add('hidden'); errorEl.textContent = '' }
    }

    tabLogin?.addEventListener('click',    () => _setAuthMode('login'))
    tabRegister?.addEventListener('click', () => _setAuthMode('register'))

    async function _handleAuthSubmit() {
      const username = document.getElementById('auth-username')?.value || ''
      const password = document.getElementById('auth-password')?.value || ''
      if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = '' }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '…' }
      try {
        // Lazy-load Firebase before any auth call
        await _ensureFb()
        if (_authMode === 'register') {
          await _registerAccount(username, password)
        } else {
          await _loginAccount(username, password)
        }
        swapView()
      } catch (err) {
        let msg = err.message || 'Something went wrong'
        if (msg.includes('email-already-in-use') || msg.includes('already taken')) msg = 'Username already taken'
        else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) msg = 'Incorrect username or password'
        else if (msg.includes('too-many-requests')) msg = 'Too many attempts — try again later'
        if (errorEl) { errorEl.classList.remove('hidden'); errorEl.textContent = msg }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = _authMode === 'login' ? 'Sign In' : 'Create Account' }
      }
    }

    submitBtn?.addEventListener('click', _handleAuthSubmit)
    document.getElementById('auth-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleAuthSubmit()
    })
    document.getElementById('auth-username')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('auth-password')?.focus()
    })

    // ── Password visibility toggle ────────────────────────────────────────
    let _pwVisible = false
    document.getElementById('auth-pw-toggle')?.addEventListener('click', () => {
      _pwVisible = !_pwVisible
      const pw  = document.getElementById('auth-password')
      const btn = document.getElementById('auth-pw-toggle')
      if (pw)  pw.type = _pwVisible ? 'text' : 'password'
      if (btn) btn.innerHTML = _pwVisible ? icoEye(15) : icoEyeOff(15)
    })

    // ── 3D card tilt — listeners tracked so they can be removed on view change
    const tilt3d = document.getElementById('signin-3d')
    const card3d = document.getElementById('signin-card')
    if (tilt3d && card3d) {
      let _tiltPaused = false
      const resetTilt = () => {
        card3d.style.setProperty('--rx', '0deg')
        card3d.style.setProperty('--ry', '0deg')
      }
      const onMove = e => {
        if (_tiltPaused) return
        const r  = tilt3d.getBoundingClientRect()
        const nx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2)
        const ny = (e.clientY - r.top   - r.height / 2) / (r.height / 2)
        card3d.style.setProperty('--rx', `${-ny * 10}deg`)
        card3d.style.setProperty('--ry', `${ nx * 10}deg`)
      }
      const onLeave = resetTilt
      const onFocusIn = e => {
        if (e.target.matches('input, textarea, select, button')) {
          _tiltPaused = true
          resetTilt()
        }
      }
      const onFocusOut = e => {
        if (e.target.matches('input, textarea, select, button')) {
          _tiltPaused = false
        }
      }
      tilt3d.addEventListener('mousemove', onMove)
      tilt3d.addEventListener('mouseleave', onLeave)
      tilt3d.addEventListener('focusin', onFocusIn)
      tilt3d.addEventListener('focusout', onFocusOut)
      // Run any prior teardown, register fresh one
      if (typeof _signinTeardown === 'function') _signinTeardown()
      _signinTeardown = () => {
        tilt3d.removeEventListener('mousemove', onMove)
        tilt3d.removeEventListener('mouseleave', onLeave)
        tilt3d.removeEventListener('focusin', onFocusIn)
        tilt3d.removeEventListener('focusout', onFocusOut)
        _signinTeardown = null
      }
    }

    // ── Signed-in actions ─────────────────────────────────────────────────
    document.getElementById('profile-signout')?.addEventListener('click', async () => {
      await _logoutAccount()
      swapView()
    })

    // Developer Info — chevron rotate + UID copy
    const devInfo = document.getElementById('dev-info')
    devInfo?.addEventListener('toggle', () => {
      const chev = devInfo.querySelector('.dev-info-chevron')
      if (chev) chev.style.transform = devInfo.open ? 'rotate(90deg)' : 'rotate(0deg)'
    })
    document.getElementById('dev-uid-copy')?.addEventListener('click', async (e) => {
      e.preventDefault()
      try {
        await navigator.clipboard.writeText(_authUser?.uid ?? '')
        const btn = e.currentTarget
        const orig = btn.textContent
        btn.textContent = 'Copied'
        setTimeout(() => { btn.textContent = orig }, 1500)
      } catch {
        _chatShowNotice('Copy failed')
      }
    })

    document.getElementById('auth-username')?.focus()
  }

  const searchInput = document.getElementById('search-input')
  searchInput?.addEventListener('input', e => {
    setState({ query: e.target.value })
  })
  searchInput?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return
    const val = e.target.value.trim()
    if (!val) return
    if (looksLikeUrl(val)) {
      const url = /^https?:\/\//i.test(val) ? val : `https://${val}`
      setState({ activeApp: { name: url, url }, query: '' })
      return
    }
    // Non-URL query → switch to games and search there
    _pendingGameSearch = val
    setState({ view: 'games', query: '' })
  })

  // App card clicks — delegated on grid
  document.getElementById('app-grid')?.addEventListener('click', e => {
    const card = e.target.closest('[data-app-id]')
    if (!card) return
    const app = APPS_DATA.find(a => a.id === card.dataset.appId)
    if (app) setState({ activeApp: app })
  })

  // Countdown (browser coming-soon) view events
  if (state.view === 'browser') {
    // Buttons bound immediately (they close over _cdTarget which resolves async)
    document.getElementById('cd-notify-btn')?.addEventListener('click', () => {
      setState({ view: 'profile' })
    })
    document.getElementById('cd-cal-btn')?.addEventListener('click', () => {
      if (!_cdTarget) return
      const fmt = new Date(_cdTarget).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Orbit+Browser+Launch&dates=${fmt}/${fmt}`,
        '_blank', 'noopener,noreferrer'
      )
    })

    // Resolve globally-consistent target from RTDB, then start ticker
    ;(async () => {
      await _ensureFb()
      _cdTarget = await _resolveCountdownTarget('countdown/browser', 'orbit_browser_cd')
      const tick = () => {
        if (!document.getElementById('cd-h')) { clearInterval(_cdInterval); _cdInterval = null; return }
        const diff = Math.max(0, _cdTarget - Date.now())
        _cdSetDigit('cd-h', Math.floor(diff / 3600000))
        _cdSetDigit('cd-m', Math.floor((diff % 3600000) / 60000))
        _cdSetDigit('cd-s', Math.floor((diff % 60000) / 1000))
      }
      tick()
      clearInterval(_cdInterval)
      _cdInterval = setInterval(tick, 1000)
    })()
  }

  if (state.view === 'ai') {
    // Restore previous conversation if user navigated back
    _renderAiHistory()

    const inputEl  = document.getElementById('ai-input')
    const sendBtn  = document.getElementById('ai-send-btn')
    const stopBtn  = document.getElementById('ai-stop-btn')
    const feedEl   = document.getElementById('ai-messages')

    // Auto-resize textarea
    inputEl?.addEventListener('input', () => {
      inputEl.style.height = '60px'
      inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px'
    })

    // Enter sends, Shift+Enter new line
    inputEl?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        _aiSend(inputEl.value)
      }
    })

    sendBtn?.addEventListener('click', () => _aiSend(inputEl?.value ?? ''))

    stopBtn?.addEventListener('click', () => {
      if (_aiAbortCtrl) { _aiAbortCtrl.abort(); _aiAbortCtrl = null }
    })

    // Toggle stop button visibility while streaming
    const _syncStopBtn = () => {
      if (stopBtn) stopBtn.classList.toggle('hidden', !_aiStreaming)
    }
    // Poll lightly — streaming flag flips quickly
    const _poll = setInterval(() => {
      if (state.view !== 'ai') { clearInterval(_poll); return }
      _syncStopBtn()
    }, 300)

    // Suggestion pills (delegated on feed)
    feedEl?.addEventListener('click', e => {
      const btn = e.target.closest('[data-ai-suggest]')
      if (btn) _aiSend(btn.dataset.aiSuggest)
    })

    inputEl?.focus()
  }

  // Settings section toggle — delegated on settings body
  const settingsBody = document.getElementById('settings-body')
  settingsBody?.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const row = e.target.closest('[data-settings-section]')
    if (!row) return
    e.preventDefault()
    row.click()
  })
  settingsBody?.addEventListener('click', e => {
    const row = e.target.closest('[data-settings-section]')
    if (row) {
      const section = row.dataset.settingsSection
      setState({ settingsSection: state.settingsSection === section ? null : section })
    }
    const swatch = e.target.closest('[data-theme-name]')
    if (swatch) {
      setTheme(swatch.dataset.themeName)
    }
    const tog = e.target.closest('[data-perf-toggle]')
    if (tog) {
      const key = tog.dataset.perfToggle
      setState({ [key]: !state[key] })
    }
    const clearBtn = e.target.closest('[data-clear-key]')
    if (clearBtn) {
      localStorage.removeItem(clearBtn.dataset.clearKey)
      if (clearBtn.dataset.clearKey === 'orbit_chat_rate') {
        localStorage.removeItem(_RATE_LAST_KEY)
        _chatRateReset()
      }
      if (clearBtn.dataset.clearKey === 'orbit_session') {
        _logoutAccount().then(() => swapView())
      }
      clearBtn.textContent = '✓ Cleared'
      clearBtn.disabled = true
    }
    if (e.target.closest('[data-clear-all]')) {
      // Only wipe Orbit-owned keys — leave other apps on this origin alone
      Object.keys(localStorage)
        .filter(k => k.startsWith('orbit_'))
        .forEach(k => localStorage.removeItem(k))
      location.reload()
    }
  })
}

function bindDockEvents() {
  $dock.addEventListener('click', e => {
    const btn = e.target.closest('[data-view]')
    if (btn) setState({ view: btn.dataset.view })
  })
}

// Escape key closes overlays
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  if (document.getElementById('game-overlay'))  { removeGameOverlay();  return }
  if (document.getElementById('watch-overlay')) { removeWatchOverlay(); return }
  if (state.activeApp) closeApp()
})

// Receive launch requests from sandboxed srcdoc iframes
window.addEventListener('message', e => {
  const d = e.data
  if (!d || typeof d !== 'object') return
  // Only honor messages that came from one of our own iframes
  const ourFrames = ['games-frame', 'tv-frame'].map(id => document.getElementById(id)?.contentWindow)
  if (!ourFrames.includes(e.source)) return
  if (d.type === 'orbit-launch-game'  && d.game)   showGameOverlay(d.game)
  if (d.type === 'orbit-launch-watch' && d.id)     showWatchOverlay(d.id, d.kind)
  if (d.type === 'orbit-go-back')                  setState({ view: 'home' })
  if (d.type === 'orbit-games-ready') {
    const gf = document.getElementById('games-frame')
    if (gf) gf.dataset.gamesReady = '1'
    const skel = document.getElementById('games-skeleton')
    if (skel) skel.classList.remove('is-visible')
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════

function onboardingHTML() {
  const themeCards = Object.entries(THEMES).map(([name, { label, rgb, hex }]) => `
    <button class="theme-card ob-theme-card" data-theme-name="${name}">
      <div class="theme-card-preview"
           style="background:rgba(${rgb},0.12);border-color:rgba(${rgb},0.3)">
        <span style="color:${hex};filter:drop-shadow(0 0 6px rgba(${rgb},0.85))">Aa</span>
      </div>
      <span class="theme-card-name">${label}</span>
    </button>`).join('')

  return `
    <div id="onboarding-wrap" style="display:none">

      <!-- Own slow starfield — solid black bg needs its own stars -->
      <div class="ob-stars-wrap" aria-hidden="true">
        <canvas id="ob-stars1" class="stars-canvas ob-stars-canvas-1"></canvas>
        <canvas id="ob-stars2" class="stars-canvas ob-stars-canvas-2"></canvas>
      </div>

      <!-- Step 1: Landing — massive logo, click/key anywhere to continue -->
      <div id="ob-step-1" class="ob-step ob-step-active ob-step-landing">
        <div class="ob-hero-wrap">
          <h1 class="brand-title ob-hero-logo">ORBIT</h1>
        </div>
        <p class="ob-hint">— press any key or click to continue —</p>
      </div>

      <!-- Step 2: Theme selector -->
      <div id="ob-step-2" class="ob-step">
        <p class="ob-label">Choose Your Theme</p>
        <div class="ob-theme-grid">${themeCards}</div>
        <button id="ob-continue-btn" class="ob-btn">Continue</button>
      </div>

      <!-- Step 3: Identity -->
      <div id="ob-step-3" class="ob-step">
        <p class="ob-label">System Designation</p>
        <input id="ob-username" class="ob-input" type="text"
               placeholder="Enter username…" maxlength="24"
               autocomplete="off" spellcheck="false">
        <button id="ob-launch-btn" class="ob-btn ob-btn-launch">Launch</button>
      </div>

    </div>`
}

function initOnboarding() {
  if (localStorage.getItem('orbit_setup')) return

  const wrap = document.getElementById('onboarding-wrap')
  if (!wrap) return

  wrap.style.display = 'flex'

  // Slow starfield — 2× longer duration than main app
  requestAnimationFrame(() => {
    _drawStarLayer(document.getElementById('ob-stars1'), 700, 1, 0.55)
    _drawStarLayer(document.getElementById('ob-stars2'), 220, 2, 0.85)
  })

  // Start pulse after reveal finishes
  setTimeout(() => {
    document.querySelector('.ob-hero-wrap')?.classList.add('ob-pulsing')
  }, 1600)

  let step = 1

  function goTo(n) {
    if (step === n) return
    const cur = document.getElementById(`ob-step-${step}`)
    const nxt = document.getElementById(`ob-step-${n}`)
    if (!cur || !nxt) return
    cur.classList.remove('ob-step-active')
    setTimeout(() => {
      nxt.classList.add('ob-step-active')
      step = n
      if (n === 3) document.getElementById('ob-username')?.focus()
    }, 360)
  }

  // Step 1: any click or keypress advances (ignore modifier-only keys + chords)
  const _MODIFIER_KEYS = new Set([
    'Shift', 'Control', 'Alt', 'Meta',
    'CapsLock', 'NumLock', 'ScrollLock',
    'AltGraph', 'Fn', 'FnLock', 'Hyper', 'Super', 'OS', 'ContextMenu',
  ])
  const onAnyKey = e => {
    if (step !== 1) return
    if (_MODIFIER_KEYS.has(e.key)) return
    // Ignore chorded shortcuts like Ctrl+R, Cmd+Tab, Alt+F4, etc.
    if (e.ctrlKey || e.altKey || e.metaKey) return
    // Ignore IME composition events
    if (e.isComposing || e.keyCode === 229) return
    goTo(2)
  }
  document.addEventListener('keydown', onAnyKey)

  wrap.addEventListener('click', e => {
    if (step === 1) { goTo(2); return }
    // Step 2: theme card clicks for live preview
    const card = e.target.closest('.ob-theme-card[data-theme-name]')
    if (card) setTheme(card.dataset.themeName)
  })

  document.getElementById('ob-continue-btn')?.addEventListener('click', () => goTo(3))

  function launch() {
    const username = document.getElementById('ob-username')?.value.trim()
                  || `Guest_${Math.floor(1000 + Math.random() * 9000)}`
    localStorage.setItem(CHAT_NICK_KEY, username)
    localStorage.setItem('orbit_setup', '1')
    document.removeEventListener('keydown', onAnyKey)
    wrap.style.transition = 'opacity 0.8s ease'
    wrap.style.opacity    = '0'
    setTimeout(() => { wrap.style.display = 'none' }, 820)
  }

  document.getElementById('ob-launch-btn')?.addEventListener('click', launch)
  document.getElementById('ob-username')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') launch()
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// STARS
// ═══════════════════════════════════════════════════════════════════════════

async function _loadTagline() {
  try {
    const text = await fetch('/OrbitV2/taglines.txt').then(r => r.text())
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    const pick = lines[Math.floor(Math.random() * lines.length)]
    const el = document.getElementById('site-tagline')
    if (el) el.textContent = pick
  } catch { /* keep default */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOUNT
// ═══════════════════════════════════════════════════════════════════════════

document.querySelector('#app').innerHTML = `
  <div id="orbit-root">
    <div class="stars-wrap" aria-hidden="true">
      <canvas id="stars1" class="stars-canvas stars-canvas-1"></canvas>
      <canvas id="stars2" class="stars-canvas stars-canvas-2"></canvas>
      <canvas id="stars3" class="stars-canvas stars-canvas-3"></canvas>
    </div>

    <main class="relative z-10 flex flex-col items-center justify-center
                 min-h-svh px-4 pb-28">
      <div id="view-content" class="flex flex-col items-center w-full">
        ${viewHTML()}
      </div>
    </main>

    <!-- Persistent games iframe — built once, hidden when not in games view -->
    <iframe id="games-frame" class="games-frame-persistent"
            sandbox="allow-scripts allow-popups"></iframe>

    <!-- Skeleton loader — shown until applyFilters posts ready signal -->
    <div id="games-skeleton" aria-hidden="true">
      <div class="gs-toolbar">
        <div class="gs-pill"></div>
        <div class="gs-pill" style="width:140px"></div>
        <div class="gs-pill" style="width:110px"></div>
      </div>
      <div class="gs-grid">
        ${Array.from({length: 24}, () => '<div class="gs-card"></div>').join('')}
      </div>
    </div>

    ${dockHTML()}
    ${onboardingHTML()}
  </div>
`

$viewContent = document.getElementById('view-content')
$dock        = document.getElementById('main-dock')

bindViewEvents()
bindDockEvents()
initOnboarding()

// On load: restore saved theme + apply perf settings
requestAnimationFrame(() => {
  const saved = localStorage.getItem('orbit_theme') ?? 'cherry'
  setTheme(saved)
  _applyPerfClasses()
  _loadTagline()
  // Show What's New if version changed
  const storedVer = localStorage.getItem('orbit_version')
  if (storedVer !== APP_VERSION) showWhatsNew(storedVer)
})

// ═══════════════════════════════════════════════════════════════════════════
// ICONS — Lucide paths (lucide.dev)
// ═══════════════════════════════════════════════════════════════════════════

function ico(d, s) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${d}</svg>`
}

function icoHome(s)        { return ico('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', s) }
function icoMsgSquare(s)   { return ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', s) }
function icoGamepad(s)     { return ico('<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="16" cy="10" r="0.8" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="0.8" fill="currentColor" stroke="none"/>', s) }
function icoTv(s)          { return ico('<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>', s) }
function icoMusic(s)       { return ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', s) }
function icoSparkles(s)    { return ico('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>', s) }
function icoUser(s)        { return ico('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s) }
function icoSettings(s)    { return ico('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', s) }
function icoSearch(s)      { return ico('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>', s) }
function icoChevronRight(s){ return ico('<path d="m9 18 6-6-6-6"/>', s) }
function icoArrowLeft(s)   { return ico('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', s) }
function icoArrowRight(s)  { return ico('<path d="m12 5 7 7-7 7"/><path d="M5 12h14"/>', s) }
function icoRefresh(s)     { return ico('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>', s) }
function icoGlobe(s)         { return ico('<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>', s) }
function icoExternalLink(s)  { return ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', s) }
function icoMaximize(s)      { return ico('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>', s) }
function icoDownload(s)      { return ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', s) }
function icoClock(s)         { return ico('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', s) }
function icoLock(s)          { return ico('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s) }
function icoImage(s)         { return ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', s) }
function icoEye(s)           { return ico('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', s) }
function icoEyeOff(s)        { return ico('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>', s) }

// Returns true for bare domains ("youtube.com") and full URLs.
// Tightened: must be space-free, must end in a recognized TLD (>=2 letters, no digits),
// rejects pure-numeric labels like "2048.io" being mistaken for files like "game.io".
const _TLD_RE = /^(com|net|org|io|co|app|dev|gg|tv|me|xyz|site|tech|games|game|fun|fr|de|uk|us|edu|info|page|store|so|ai|sh|ly|to)$/i
function looksLikeUrl(str) {
  if (!str || /\s/.test(str)) return false
  const m = /^(https?:\/\/)?([\w-]+(?:\.[\w-]+)+)(\/\S*)?$/.exec(str)
  if (!m) return false
  const host = m[2]
  // Reject IPs — those should hit the proxy via http(s):// explicitly
  if (/^[\d.]+$/.test(host)) return /^https?:\/\//i.test(str)
  // Last label must be a known TLD
  const labels = host.split('.')
  const tld = labels[labels.length - 1]
  return _TLD_RE.test(tld)
}

function brand(d, s) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"
    fill="rgba(255,255,255,0.8)" aria-hidden="true">${d}</svg>`
}
function brandYoutube(s) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="rgba(255,255,255,0.8)" d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon fill="rgba(0,0,0,0.85)" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>`
}
function brandDiscord(s) { return brand('<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>', s) }
function brandGithub(s)  { return brand('<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>', s) }
function brandTwitch(s)  { return brand('<path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>', s) }
function brandNvidia(s)  { return brand('<path d="M8.985 2.596v1.01c-3.713.477-7.671 3.098-8.985 8.87 1.314-1.55 2.836-2.562 4.57-3.048V10.5c-1.2.43-2.355 1.273-3.24 2.608 1.008 4.71 4.49 7.2 7.655 7.695v1.002c-3.967-.51-8.52-3.665-9.476-9.394C.52 6.04 4.64 3.05 8.985 2.596zM9.97 17.94v1.015c.547.06 1.098.09 1.649.09 5.516 0 9.126-3.93 9.126-9.075 0-5.147-3.61-9.075-9.126-9.075-.551 0-1.102.03-1.649.09v1.016c.547-.07 1.098-.11 1.649-.11 4.97 0 8.141 3.668 8.141 8.079 0 4.41-3.171 8.08-8.141 8.08-.551 0-1.102-.04-1.649-.11z"/>', s) }
