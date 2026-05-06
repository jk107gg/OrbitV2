import './style.css'
import { initializeApp }   from 'firebase/app'
import {
  getDatabase, ref, push, set, remove, get,
  onValue, onChildAdded,
  onDisconnect, serverTimestamp,
} from 'firebase/database'

// ═══════════════════════════════════════════════════════════════════════════
// DATA — add/remove entries here; UI updates automatically
// ═══════════════════════════════════════════════════════════════════════════

const BRAND       = 'ORBIT'
const TAGLINE     = 'YOUR PORTAL'
const APP_VERSION = '1.1.0'
const CHANGELOG   = [
  'Real accounts — username & password, no email required',
  'Direct messages — DM any user by their username',
  'Live online count & presence tracking',
  'Game overlay dock with fullscreen & save',
  'All 8 game providers with badges & search',
]

const APPS_DATA = [
  { id: 'youtube', name: 'YouTube', icon: 'youtube', url: 'https://youtube.com'         },
  { id: 'discord', name: 'Discord', icon: 'discord', url: 'https://discord.com'         },
  { id: 'github',  name: 'GitHub',  icon: 'github',  url: 'https://github.com'          },
  { id: 'twitch',  name: 'Twitch',  icon: 'twitch',  url: 'https://twitch.tv'           },
  { id: 'gfnow',   name: 'GF Now',  icon: 'nvidia',  url: 'https://play.geforcenow.com' },
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

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAu_7Cl7y692z8WRVCM59gSRrHcfLUw3GA',
  authDomain:        'nu-chat-92feb.firebaseapp.com',
  databaseURL:       'https://nu-chat-92feb-default-rtdb.firebaseio.com',
  projectId:         'nu-chat-92feb',
  storageBucket:     'nu-chat-92feb.firebasestorage.app',
  messagingSenderId: '401431459371',
  appId:             '1:401431459371:web:ecab8ef0a819b28a865c6e',
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
const _fbDb  = getDatabase(_fbApp)

// ── Presence ──────────────────────────────────────────────────────────────

let _presenceKey = null

function _setPresence() {
  if (_presenceKey && _presenceKey !== _currentNick()) {
    remove(ref(_fbDb, `presence/${_presenceKey}`)).catch(() => {})
  }
  _presenceKey = _currentNick()
  const pRef = ref(_fbDb, `presence/${_presenceKey}`)
  set(pRef, { username: _presenceKey, uid: _authUser?.uid ?? null, since: serverTimestamp() })
  onDisconnect(pRef).remove()
}

onValue(ref(_fbDb, '.info/connected'), snap => { if (snap.val()) _setPresence() })

onValue(ref(_fbDb, 'presence'), snap => {
  const el = document.getElementById('online-count')
  if (el) el.textContent = snap.numChildren()
})

// ── Auth helpers (RTDB + Web Crypto — no Firebase Auth / no email) ─────────

const _SESSION_KEY = 'orbit_session'

async function _dbGet(path) {
  const snap = await get(ref(_fbDb, path))
  return snap.val()
}

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
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
  const hash = await _sha256(salt + password)
  const displayName = username.trim()
  await set(ref(_fbDb, `users/${uid}`), {
    username: displayName, uid, salt, hash,
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
  const hash = await _sha256(data.salt + password)
  if (hash !== data.hash) throw new Error('Incorrect password')
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

let _chatMode      = 'global'
let _chatRoom      = ''
let _chatDmPartner = ''   // display name of DM partner
let _chatActiveRef = null
let _chatUnsub     = null

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

function _renderChatMsg(snap) {
  const box = document.getElementById('chat-messages')
  if (!box) return
  const d = snap.val()
  if (!d?.text) return
  const sender  = d.username || d.nickname || 'Unknown'
  const isSelf  = sender === _currentNick()
  const wrap    = document.createElement('div')
  wrap.className = 'flex flex-col gap-0.5 max-w-[80%] ' +
    (isSelf ? 'self-end items-end ml-auto' : 'self-start items-start')
  wrap.innerHTML = `
    <span class="text-[10px] text-white/25 px-1">${_escHtml(sender)}</span>
    <div class="px-3 py-2 rounded-2xl text-sm break-words leading-relaxed
      ${isSelf
        ? 'bg-white/[0.12] text-white rounded-br-sm'
        : 'bg-white/[0.05] text-white/75 rounded-bl-sm'}">
      ${_escHtml(d.text)}
    </div>`
  box.appendChild(wrap)
  box.scrollTop = box.scrollHeight
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
  const box = document.getElementById('chat-messages')
  if (box) box.innerHTML = ''
  _chatActiveRef = _chatMessagesRef()
  _chatUnsub     = onChildAdded(_chatActiveRef, _renderChatMsg)
}

function _applyChatTabStyles(mode) {
  const on  = 'px-4 py-1.5 rounded-full text-xs border border-white/35 text-white bg-white/[0.09] transition-colors cursor-pointer'
  const off = 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-white/40 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer'
  const gTab = document.getElementById('chat-tab-global')
  const dTab = document.getElementById('chat-tab-dm')
  const dIn  = document.getElementById('chat-dm-input')
  if (gTab)  gTab.className = mode === 'global' ? on : off
  if (dTab)  dTab.className = mode === 'dm'     ? on : off
  if (dIn) {
    dIn.style.opacity       = mode === 'dm' ? '1' : '0'
    dIn.style.pointerEvents = mode === 'dm' ? ''  : 'none'
  }
}

function _switchChat(mode, roomCode = '') {
  _chatMode = mode
  _chatRoom = roomCode
  _applyChatTabStyles(mode)
  _loadChatMessages()
}

function _sendChatMessage() {
  const input = document.getElementById('chat-input')
  if (!input) return
  const text = input.value.trim()
  if (!text) return
  if (_chatMode === 'dm' && !_chatRoom.trim()) return
  push(_chatMessagesRef(), { username: _currentNick(), uid: _authUser?.uid ?? null, text, timestamp: serverTimestamp() })
  input.value = ''
  input.focus()
}

// ── AI Chat ───────────────────────────────────────────────────────────────

let _aiMessages  = []    // { role: 'user'|'assistant', content: string }
let _aiStreaming  = false
let _aiAbortCtrl = null

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
  box.appendChild(wrap)
  box.scrollTop = box.scrollHeight

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
            if (box) box.scrollTop = box.scrollHeight
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
let _cdInterval = null
let _cdTarget   = null   // computed once per session, persists across nav

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

  if (patch.view !== undefined && patch.view !== prev.view) {
    state.query = ''
    if (prev.view === 'chat') _teardownChatMessages()
    if (prev.view === 'ai' && _aiAbortCtrl) { _aiAbortCtrl.abort(); _aiAbortCtrl = null }
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

function regenerateStars(rgb) {
  const s1 = document.getElementById('stars1')
  const s2 = document.getElementById('stars2')
  if (s1) s1.style.boxShadow = starShadows(800, 0.55, rgb)
  if (s2) s2.style.boxShadow = starShadows(250, 0.85, rgb)
}

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
      <div class="flex items-center gap-1">
        <a href="${app.url}" target="_blank" rel="noopener noreferrer"
           class="app-frame-close" title="Open in new tab">
          ${icoExternalLink(14)}
        </a>
        <button id="reload-app-btn" class="app-frame-close" title="Reload">
          ${icoRefresh(14)}
        </button>
      </div>
    </div>
    <iframe
      id="app-iframe"
      class="app-iframe"
      src="${proxyUrl(app.url)}"
      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      loading="lazy"
    ></iframe>`

  document.getElementById('orbit-root').appendChild(el)
  document.getElementById('close-app-btn').addEventListener('click', closeApp)
  document.getElementById('reload-app-btn').addEventListener('click', () => {
    const iframe = document.getElementById('app-iframe')
    if (iframe) iframe.src = iframe.src
  })
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
      sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
      allowfullscreen></iframe>
    <div class="game-pill-dock" id="game-pill-dock">
      <button id="close-game-btn" class="app-frame-close">${icoArrowLeft(14)} Games</button>
      <div class="game-pill-sep"></div>
      <span class="game-pill-title">${game.name}</span>
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
  fetch(game.url)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
    .then(html => {
      cachedHTML = html
      enableOverlayBtns()
      if (iframe.isConnected) iframe.srcdoc = html
    })
    .catch(() => {
      // CORS fetch failed — fall back to direct src (proxy/truffled-style games)
      if (iframe.isConnected) iframe.src = game.url
    })
}

function showWhatsNew(prevVer) {
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
    el.remove()
    setState({ view: 'profile' })
  })
  document.getElementById('wnDismiss')?.addEventListener('click', () => {
    localStorage.setItem('orbit_version', APP_VERSION)
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

function buildGamesSrcdoc() {
  const css = `*{box-sizing:border-box;margin:0;padding:0}html{width:100%;height:100%}body{width:100%;min-height:100%;background:transparent;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;overflow-y:auto}select,input{font:inherit;color:#e0e0e0;outline:none}.controls{display:flex;gap:8px;padding:12px;flex-shrink:0;flex-wrap:wrap;align-items:center;position:sticky;top:0;z-index:10;background:rgba(0,0,0,.6);backdrop-filter:blur(12px)}.ctrl{padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);font-size:12px;cursor:pointer}#search{flex:1;min-width:140px}#search::placeholder{color:rgba(255,255,255,.25)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;padding:12px}.card{border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);cursor:pointer;transition:.15s;overflow:hidden;display:flex;flex-direction:column;position:relative}.card:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.07);transform:translateY(-2px)}.img-wrap{width:100%;padding-bottom:100%;position:relative;overflow:hidden;background:rgba(255,255,255,.05);flex-shrink:0}.img-wrap img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.card-name{padding:7px 9px;font-size:12px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.badge{position:absolute;top:7px;right:7px;font-size:8px;font-weight:700;letter-spacing:.04em;padding:2px 6px;border-radius:4px;text-transform:uppercase}.status{color:rgba(255,255,255,.25);font-size:12px;padding:0 12px 12px;flex-shrink:0}`

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

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<div class="controls">
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
  <input id="search" class="ctrl" placeholder="search games...">
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
<div class="grid" id="grid"></div>
<div class="status" id="status"></div>
<script>
var PM=${JSON.stringify(provMeta)};
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
    var nameDiv=document.createElement('div');nameDiv.className='card-name';nameDiv.textContent=g.name;
    var badge=document.createElement('span');badge.className='badge';badge.textContent=m.label;
    badge.style.cssText='background:'+m.color+'22;color:'+m.color+';border:1px solid '+m.color+'55';
    card.appendChild(wrap);card.appendChild(nameDiv);card.appendChild(badge);
    card.onclick=function(){window.parent.__cherriLaunchGame&&window.parent.__cherriLaunchGame(g);};
    grid.appendChild(card);
  });
}

provSel.onchange=loadGames;
sortSel.onchange=applyFilters;
catSel.onchange=applyFilters;
search.addEventListener('input',applyFilters);
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
    card.addEventListener('click',function(e){e.preventDefault();window.parent.__cherriLaunchWatch&&window.parent.__cherriLaunchWatch(item.id,type);});
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

function cardHTML({ id, name, icon }) {
  const iconSVG = ICON_MAP[icon]?.(28) ?? ''
  return `
    <button data-app-id="${id}"
            class="app-card flex flex-col items-center gap-3 px-5 py-5
                   rounded-2xl bg-white/[0.04] backdrop-blur-lg
                   text-white/60 hover:text-white/95 select-none cursor-pointer
                   border-0 outline-none">
      <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.06]">
        ${iconSVG}
      </div>
      <span class="text-[11px] font-medium tracking-wide">${name}</span>
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
        <h1 class="brand-title text-[5.5rem] sm:text-[7rem] font-black
                   tracking-tighter leading-none uppercase">
          ${BRAND}
        </h1>
        <p class="brand-tagline text-[10px] uppercase tracking-[0.5em] font-light">${TAGLINE}</p>
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
  const isAppearance = state.settingsSection === 'appearance'

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

  return `
    ${settingsRowHTML('Appearance', 'Theme & colors', 'appearance', isAppearance)}
    ${appearanceExpanded}
    ${settingsRowHTML('Privacy',    'History, cookies, tracking')}
    ${settingsRowHTML('About',      'Version 2.0.0 — OrbitV2')}`
}

function settingsRowHTML(title, desc, section = null, isOpen = false) {
  const clickAttr = section ? `data-settings-section="${section}"` : ''
  const chevronCls = isOpen ? 'rotate-90' : ''
  return `
    <div ${clickAttr}
         class="flex items-center justify-between px-5 py-4
                rounded-2xl bg-white/[0.04] backdrop-blur-lg
                border border-white/[0.08]
                ${section ? 'cursor-pointer hover:bg-white/[0.08] hover:border-white/20' : ''}
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
  return `<div class="content-view"><iframe id="games-frame" class="content-frame"></iframe></div>`
}

function tvViewHTML() {
  return `<div class="content-view"><iframe id="tv-frame" class="content-frame"></iframe></div>`
}

function chatViewHTML() {
  const tabOn  = 'px-4 py-1.5 rounded-full text-xs border border-white/35 text-white bg-white/[0.09] transition-colors cursor-pointer'
  const tabOff = 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-white/40 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer'
  const nick   = _currentNick()
  const isLoggedIn = !!_authUser
  const headerTitle = _chatMode === 'dm' && _chatDmPartner ? `DM · ${_escHtml(_chatDmPartner)}` : 'Global Chat'
  const inputPlaceholder = _chatMode === 'dm' && !_chatDmPartner ? 'Enter username to DM…' : 'Message…'
  return `
    <div class="flex flex-col w-full" style="height:calc(100dvh - 7.5rem)">

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 mb-3 flex-shrink-0
                  bg-white/[0.03] border border-white/[0.08] rounded-2xl">
        <div class="flex items-center gap-2.5">
          <span class="text-white/80 font-semibold text-sm tracking-wide">${headerTitle}</span>
          <span class="text-white/20 text-xs">·</span>
          <span id="chat-nick-display" class="text-white/30 text-xs font-mono">${_escHtml(nick)}</span>
          ${isLoggedIn ? '' : '<span class="text-white/20 text-[10px] font-mono">(guest)</span>'}
        </div>
        <div class="flex items-center gap-2">
          ${!isLoggedIn ? `<button id="chat-login-btn" class="text-[10px] px-3 py-1 rounded-full border border-white/15 text-white/40 hover:text-white/80 hover:border-white/30 transition-colors cursor-pointer">Sign in</button>` : ''}
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                style="box-shadow:0 0 6px rgba(52,211,153,0.7)"></span>
          <span id="online-count" class="text-white/30 text-xs">0</span>
          <span class="text-white/20 text-xs">online</span>
        </div>
      </div>

      <!-- Mode tabs -->
      <div class="flex items-center gap-2 mb-3 flex-shrink-0">
        <button id="chat-tab-global" class="${_chatMode === 'global' ? tabOn : tabOff}">Global</button>
        <button id="chat-tab-dm"     class="${_chatMode === 'dm'     ? tabOn : tabOff}">DM</button>
        <input id="chat-dm-input" type="text" placeholder="Username to DM…"
               value="${_escHtml(_chatDmPartner)}"
               autocomplete="off" spellcheck="false"
               class="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full
                      px-3 py-1.5 text-xs text-white/70 outline-none placeholder-white/20
                      transition-opacity"
               style="opacity:${_chatMode === 'dm' ? '1' : '0'};pointer-events:${_chatMode === 'dm' ? 'auto' : 'none'}">
        <div id="chat-dm-status" class="text-[10px] text-red-400 flex-shrink-0" style="display:none"></div>
      </div>

      <!-- Messages -->
      <div id="chat-messages"
           class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pb-1 px-1">
      </div>

      <!-- Input -->
      <form id="chat-form"
            class="flex items-center gap-2 mt-3 flex-shrink-0
                   bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5">
        <input id="chat-input" type="text" placeholder="${inputPlaceholder}"
               autocomplete="off" maxlength="500"
               class="flex-1 bg-transparent outline-none text-white/80 text-sm
                      placeholder-white/20 caret-white/40 min-w-0">
        <button type="submit"
                class="text-white/30 hover:text-white/80 transition-colors flex-shrink-0">
          ${icoArrowRight(15)}
        </button>
      </form>

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
          <div class="text-white/25 text-xs mt-0.5 font-mono">${_escHtml(_authUser.uid.slice(0,8))}…</div>
        </div>
      </div>

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

  // Not logged in — show auth form
  return `
    <div class="flex flex-col gap-4 w-full max-w-xs mx-auto pt-4">

      <!-- Brand -->
      <div class="text-center mb-2 select-none">
        <div class="text-2xl font-black tracking-tight" style="color:var(--accent-color)">ORBIT</div>
        <div class="text-white/25 text-xs mt-1">Create an account or sign in</div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 p-1 bg-white/[0.03] border border-white/[0.07] rounded-full">
        <button id="auth-tab-login"    class="auth-tab auth-tab-active flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors">Sign In</button>
        <button id="auth-tab-register" class="auth-tab flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors">Register</button>
      </div>

      <!-- Form -->
      <div class="flex flex-col gap-3 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-white/30 text-[10px] uppercase tracking-widest">Username</label>
          <input id="auth-username" type="text" autocomplete="username" autocorrect="off"
                 autocapitalize="off" spellcheck="false" maxlength="20"
                 placeholder="your_username"
                 class="bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5
                        text-white/85 text-sm outline-none placeholder-white/20 font-mono
                        focus:border-white/25 transition-colors caret-white/50">
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-white/30 text-[10px] uppercase tracking-widest">Password</label>
          <input id="auth-password" type="password" autocomplete="current-password" maxlength="128"
                 placeholder="••••••••"
                 class="bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5
                        text-white/85 text-sm outline-none placeholder-white/20
                        focus:border-white/25 transition-colors caret-white/50">
        </div>
        <div id="auth-error" class="text-red-400 text-xs hidden"></div>
        <button id="auth-submit"
                class="w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer
                       text-black"
                style="background:var(--accent-color);box-shadow:0 0 12px rgba(var(--accent-rgb),.3)">
          Sign In
        </button>
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
  if (state.view === 'games') {
    const frame = document.getElementById('games-frame')
    if (frame) frame.srcdoc = buildGamesSrcdoc()
  }
  if (state.view === 'tv') {
    const frame = document.getElementById('tv-frame')
    if (frame) frame.srcdoc = buildMoviesSrcdoc()
  }

  if (state.view === 'chat') {
    _loadChatMessages()

    document.getElementById('chat-form')?.addEventListener('submit', e => {
      e.preventDefault()
      _sendChatMessage()
    })

    document.getElementById('chat-tab-global')?.addEventListener('click', () => {
      _chatDmPartner = ''
      _switchChat('global')
    })

    document.getElementById('chat-tab-dm')?.addEventListener('click', () => {
      const dmInput = document.getElementById('chat-dm-input')
      _applyChatTabStyles('dm')
      _chatMode = 'dm'
      dmInput?.focus()
    })

    document.getElementById('chat-dm-input')?.addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return
      const target = e.target.value.trim()
      if (!target) return
      const statusEl = document.getElementById('chat-dm-status')
      if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = '' }
      if (!_authUser) {
        // Guest fallback: use raw input as room code
        _chatDmPartner = target
        _switchChat('dm', target)
        return
      }
      if (target.toLowerCase() === _currentNick().toLowerCase()) {
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = "That's you!" }
        return
      }
      const key = await _dmKey(target)
      if (!key) {
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'User not found' }
        return
      }
      _chatDmPartner = target
      _switchChat('dm', key)
      // Update header title
      const hdr = document.querySelector('#chat-messages')?.closest('.flex.flex-col')?.querySelector('.font-semibold')
      if (hdr) hdr.textContent = `DM · ${target}`
    })

    document.getElementById('chat-login-btn')?.addEventListener('click', () => {
      setState({ view: 'profile' })
    })

    // Focus input on open
    document.getElementById('chat-input')?.focus()
  }

  if (state.view === 'profile') {
    // Auth form tab switching
    let _authMode = 'login'

    const tabLogin    = document.getElementById('auth-tab-login')
    const tabRegister = document.getElementById('auth-tab-register')
    const submitBtn   = document.getElementById('auth-submit')
    const errorEl     = document.getElementById('auth-error')

    function _setAuthMode(mode) {
      _authMode = mode
      const activeClass = 'bg-white/[0.1] text-white'
      const inactiveClass = 'text-white/35'
      if (tabLogin)    tabLogin.className    = 'auth-tab flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ' + (mode === 'login'    ? activeClass : inactiveClass)
      if (tabRegister) tabRegister.className = 'auth-tab flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ' + (mode === 'register' ? activeClass : inactiveClass)
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
        if (_authMode === 'register') {
          await _registerAccount(username, password)
        } else {
          await _loginAccount(username, password)
        }
        swapView()
      } catch (err) {
        let msg = err.message || 'Something went wrong'
        // Clean up Firebase error messages
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

    // Signed-in actions
    document.getElementById('profile-signout')?.addEventListener('click', async () => {
      await _logoutAccount()
      swapView()
    })

    document.getElementById('auth-username')?.focus()
  }

  const searchInput = document.getElementById('search-input')
  searchInput?.addEventListener('input', e => {
    setState({ query: e.target.value })
  })
  // Enter on a URL-shaped string → open through proxy instead of filtering
  searchInput?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return
    const val = e.target.value.trim()
    if (!looksLikeUrl(val)) return
    const url = /^https?:\/\//i.test(val) ? val : `https://${val}`
    setState({ activeApp: { name: url, url }, query: '' })
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
    // Compute launch target once per session (3 days from first visit to this view)
    if (!_cdTarget) {
      const t = new Date()
      t.setDate(t.getDate() + 3)
      t.setHours(0, 0, 0, 0)
      _cdTarget = t.getTime()
    }

    function _cdTick() {
      const diff = Math.max(0, _cdTarget - Date.now())
      _cdSetDigit('cd-h', Math.floor(diff / 3600000))
      _cdSetDigit('cd-m', Math.floor((diff % 3600000) / 60000))
      _cdSetDigit('cd-s', Math.floor((diff % 60000) / 1000))
    }

    _cdTick()
    _cdInterval = setInterval(_cdTick, 1000)

    // "Get Notified" → take user to profile to sign in / create account
    document.getElementById('cd-notify-btn')?.addEventListener('click', () => {
      setState({ view: 'profile' })
    })

    // "Add to Calendar" → Google Calendar deep-link
    document.getElementById('cd-cal-btn')?.addEventListener('click', () => {
      const d   = new Date(_cdTarget)
      const fmt = d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Orbit+Browser+Launch&dates=${fmt}/${fmt}`,
        '_blank', 'noopener,noreferrer'
      )
    })
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
  document.getElementById('settings-body')?.addEventListener('click', e => {
    const row = e.target.closest('[data-settings-section]')
    if (row) {
      const section = row.dataset.settingsSection
      setState({ settingsSection: state.settingsSection === section ? null : section })
    }
    const swatch = e.target.closest('[data-theme-name]')
    if (swatch) {
      setTheme(swatch.dataset.themeName)
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

// Called by srcdoc iframes via window.parent
window.__cherriLaunchGame  = game       => showGameOverlay(game)
window.__cherriLaunchWatch = (id, type) => showWatchOverlay(id, type)
window.__cherriGoBack      = ()         => setState({ view: 'home' })

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
        <div id="ob-stars1"></div>
        <div id="ob-stars2"></div>
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
    const s1 = document.getElementById('ob-stars1')
    const s2 = document.getElementById('ob-stars2')
    if (s1) s1.style.boxShadow = starShadows(700, 0.55, '255, 255, 255')
    if (s2) s2.style.boxShadow = starShadows(220, 0.85, '255, 255, 255')
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

  // Step 1: any click or keypress advances (ignore modifier-only keys)
  const onAnyKey = e => {
    if (step !== 1) return
    if (['Shift','Control','Alt','Meta'].includes(e.key)) return
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

function starShadows(count, alpha, rgb = '255, 255, 255') {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2000)
    const y = Math.floor(Math.random() * 2000)
    const a = (alpha * (0.4 + Math.random() * 0.6)).toFixed(2)
    out.push(`${x}px ${y}px rgba(${rgb},${a})`)
  }
  return out.join(',')
}

// ═══════════════════════════════════════════════════════════════════════════
// MOUNT
// ═══════════════════════════════════════════════════════════════════════════

document.querySelector('#app').innerHTML = `
  <div id="orbit-root">
    <div class="stars-wrap" aria-hidden="true">
      <div class="stars-layer" id="stars1"></div>
      <div class="stars-layer" id="stars2"></div>
    </div>

    <main class="relative z-10 flex flex-col items-center justify-center
                 min-h-svh px-4 pb-28">
      <div id="view-content" class="flex flex-col items-center w-full">
        ${viewHTML()}
      </div>
    </main>

    ${dockHTML()}
    ${onboardingHTML()}
  </div>
`

$viewContent = document.getElementById('view-content')
$dock        = document.getElementById('main-dock')

bindViewEvents()
bindDockEvents()
initOnboarding()

// On load: restore saved theme (sets CSS vars + generates colored stars)
requestAnimationFrame(() => {
  const saved = localStorage.getItem('orbit_theme') ?? 'cherry'
  setTheme(saved)
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

// Returns true for bare domains ("youtube.com") and full URLs
function looksLikeUrl(str) {
  return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(str)
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
