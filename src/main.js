import './style.css'
import { initializeApp }   from 'firebase/app'
import {
  getDatabase, ref, push, set,
  onValue, onChildAdded,
  onDisconnect, serverTimestamp,
} from 'firebase/database'

// ═══════════════════════════════════════════════════════════════════════════
// DATA — add/remove entries here; UI updates automatically
// ═══════════════════════════════════════════════════════════════════════════

const BRAND   = 'ORBIT'
const TAGLINE = 'YOUR PORTAL'

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
const PROXY_HOST      = 'https://yousifcantleakthis.bostoncareercounselor.com'

const GAME_ZONES_URL  = 'https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json'
const GAME_COVER_BASE = 'https://cdn.jsdelivr.net/gh/freebuisness/covers@latest'
const GAME_HTML_BASE  = 'https://cdn.jsdelivr.net/gh/freebuisness/html@latest'
const TMDB_KEY        = 'fb7bb23f03b6994dafc674c074d01761'
const WATCH_SOURCES   = [
  { id: 'vidlink',   name: 'VidLink',    urls: { movie: 'https://vidlink.pro/movie/{id}',                              tv: 'https://vidlink.pro/tv/{id}/{season}/{episode}'                      } },
  { id: 'vidsrcxyz', name: 'VidSrc',     urls: { movie: 'https://vidsrc.xyz/embed/movie/{id}',                         tv: 'https://vidsrc.xyz/embed/tv/{id}/{season}/{episode}'                 } },
  { id: 'vidsrcrip', name: 'VidSrc.rip', urls: { movie: 'https://vidsrc.rip/embed/movie/{id}',                         tv: 'https://vidsrc.rip/embed/tv/{id}/{season}/{episode}'                 } },
  { id: 'videasy',   name: 'Videasy',    urls: { movie: 'https://player.videasy.net/movie/{id}?color=8834ec',           tv: 'https://player.videasy.net/tv/{id}/{season}/{episode}?color=8834ec' } },
]

// Named theme presets — background always pure black
const THEMES = {
  white:   { label: 'White',   rgb: '255, 255, 255', hex: '#ffffff' },
  cyan:    { label: 'Cyan',    rgb: '100, 220, 255', hex: '#64dcff' },
  purple:  { label: 'Purple',  rgb: '180, 100, 255', hex: '#b464ff' },
  rose:    { label: 'Rose',    rgb: '255, 100, 140', hex: '#ff648c' },
  emerald: { label: 'Emerald', rgb: '80,  220, 160', hex: '#50dcA0' },
  amber:   { label: 'Amber',   rgb: '255, 185,  70', hex: '#ffb946' },
}
// Flat array used wherever iteration is needed (settings swatches, etc.)
const ACCENT_COLORS = Object.values(THEMES)

// ── Firebase / Chat ───────────────────────────────────────────────────────

const FIREBASE_DB_URL = 'https://nu-chat-92feb-default-rtdb.firebaseio.com/'
const CHAT_NICK_KEY   = 'orbit_chat_nickname'

const _chatNick = (() => {
  let n = localStorage.getItem(CHAT_NICK_KEY)
  if (!n) {
    n = 'Guest_' + Math.floor(1000 + Math.random() * 9000)
    localStorage.setItem(CHAT_NICK_KEY, n)
  }
  return n
})()

const _fbApp = initializeApp({ databaseURL: FIREBASE_DB_URL })
const _fbDb  = getDatabase(_fbApp)

// Presence — set on connect, auto-remove on disconnect
onValue(ref(_fbDb, '.info/connected'), snap => {
  if (!snap.val()) return
  const presenceRef = ref(_fbDb, `presence/${_chatNick}`)
  set(presenceRef, { nickname: _chatNick, since: serverTimestamp() })
  onDisconnect(presenceRef).remove()
})

// Online count — keep updating #online-count whenever it's in DOM
onValue(ref(_fbDb, 'presence'), snap => {
  const el = document.getElementById('online-count')
  if (el) el.textContent = snap.numChildren()
})

// Chat view state
let _chatMode      = 'global'
let _chatRoom      = ''
let _chatActiveRef = null
let _chatUnsub     = null

function _chatMessagesRef() {
  return _chatMode === 'dm'
    ? ref(_fbDb, `dms/${_chatRoom}`)
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
  const isSelf = d.nickname === _chatNick
  const wrap = document.createElement('div')
  wrap.className = 'flex flex-col gap-0.5 max-w-[80%] ' +
    (isSelf ? 'self-end items-end ml-auto' : 'self-start items-start')
  wrap.innerHTML = `
    <span class="text-[10px] text-white/25 px-1">${_escHtml(d.nickname)}</span>
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
  const gTab  = document.getElementById('chat-tab-global')
  const dTab  = document.getElementById('chat-tab-dm')
  const rIn   = document.getElementById('chat-room-input')
  if (gTab)  gTab.className  = mode === 'global' ? on : off
  if (dTab)  dTab.className  = mode === 'dm'     ? on : off
  if (rIn) {
    rIn.style.opacity       = mode === 'dm' ? '1' : '0'
    rIn.style.pointerEvents = mode === 'dm' ? ''  : 'none'
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
  push(_chatMessagesRef(), { nickname: _chatNick, text, timestamp: serverTimestamp() })
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
  label.textContent = isSelf ? _chatNick : 'AI'

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
  const theme = THEMES[name] ?? THEMES.white
  document.documentElement.style.setProperty('--accent-rgb',   theme.rgb)
  document.documentElement.style.setProperty('--accent-color', theme.hex)
  document.documentElement.style.setProperty('--glow-color',   `rgba(${theme.rgb}, 0.4)`)
  localStorage.setItem('orbit_theme', name)
  state.accentRgb = theme.rgb
  regenerateStars(theme.rgb)
  // Refresh settings swatches if visible
  const body = document.getElementById('settings-body')
  if (body) body.innerHTML = settingsBodyHTML()
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
  el.innerHTML = `
    <div class="app-frame-bar">
      <button id="close-game-btn" class="app-frame-close">${icoArrowLeft(14)} Games</button>
      <span class="app-frame-title">${game.name}</span>
      <div></div>
    </div>
    <iframe id="game-iframe" class="app-iframe"
      sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-same-origin"
      allowfullscreen></iframe>`
  document.getElementById('orbit-root').appendChild(el)
  document.getElementById('close-game-btn').addEventListener('click', removeGameOverlay)
  const iframe = document.getElementById('game-iframe')
  fetch(game.url)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
    .then(html => { if (iframe.isConnected) iframe.srcdoc = html })
    .catch(err => { if (iframe.isConnected) iframe.srcdoc = `<body style="background:#000;color:rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><p>Failed to load game<br><small>${err.message}</small></p></body>` })
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
  const css = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:100%;height:100%;background:#000;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}body{display:flex;flex-direction:column;gap:10px;padding:14px}button,input{font:inherit}.search{width:100%;padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#e0e0e0;outline:none;flex-shrink:0}.search::placeholder{color:rgba(255,255,255,.25)}.grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-content:start;gap:10px;overflow-y:auto;padding-right:2px}.card{padding:9px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);cursor:pointer;transition:.15s;color:#e0e0e0;display:block;width:100%;text-align:left}.card:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.07);transform:translateY(-2px)}.card img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border-radius:10px;background:rgba(255,255,255,.05)}.card h3{margin:8px 0 3px;font-size:12px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card p{color:rgba(255,255,255,.35);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status{color:rgba(255,255,255,.25);font-size:12px;flex-shrink:0;min-height:16px}`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<input class="search" id="q" placeholder="search games...">
<div class="grid" id="g"></div>
<div class="status" id="s">loading games...</div>
<script>
var COVERS=${JSON.stringify(GAME_COVER_BASE)},HTML_B=${JSON.stringify(GAME_HTML_BASE)},ZONES=${JSON.stringify(GAME_ZONES_URL)};
var grid=document.getElementById('g'),status=document.getElementById('s'),search=document.getElementById('q');
var games=[],active='';
function resolve(v,base){
  if(!v)return '';
  var r=String(v).split('{COVER_URL}').join(COVERS).split('{HTML_URL}').join(HTML_B).split('{HTML}').join(HTML_B).split('{COVERS}').join(COVERS);
  if(r.indexOf('http://')===0||r.indexOf('https://')===0)return r;
  while(r.charAt(0)==='/')r=r.slice(1);
  return base+'/'+r;
}
function normalize(raw){
  var candidates=[raw,raw&&raw.data,raw&&raw.attributes].filter(Boolean);
  for(var i=0;i<candidates.length;i++){
    var obj=candidates[i];
    var name=obj.name||obj.title||obj.n||'';
    var cover=obj.cover||obj.image||obj.thumbnail||obj.img||obj.coverUrl||'';
    var url=obj.url||obj.src||obj.link||obj.path||obj.gameUrl||'';
    var author=obj.author||obj.creator||obj.by||'';
    var special=Array.isArray(obj.special)?obj.special:[];
    if(name&&(cover||url))return{name:String(name).trim(),cover:resolve(cover,COVERS),url:resolve(url,HTML_B),author:String(author).trim(),special:special};
  }
  return null;
}
function render(items){
  grid.innerHTML='';
  if(!items.length){status.textContent='no games found';return;}
  for(var i=0;i<items.length;i++){(function(game){
    var btn=document.createElement('button');btn.className='card';
    if(game.url===active)btn.style.borderColor='rgba(255,255,255,.4)';
    var img=document.createElement('img');img.src=game.cover;img.alt=game.name;img.onerror=function(){img.style.opacity='.15';};
    var h3=document.createElement('h3');h3.textContent=game.name;
    var p=document.createElement('p');p.textContent=game.author||'unknown';
    btn.appendChild(img);btn.appendChild(h3);btn.appendChild(p);
    btn.addEventListener('click',function(){active=game.url;render(filter(search.value));window.parent.__cherriLaunchGame&&window.parent.__cherriLaunchGame(game);});
    grid.appendChild(btn);
  })(items[i]);}
  status.textContent='';
}
function filter(q){
  if(!q)return games;
  var lq=q.toLowerCase();
  return games.filter(function(g){return(g.name+' '+g.author+' '+g.special.join(' ')).toLowerCase().indexOf(lq)!==-1;});
}
search.addEventListener('input',function(){render(filter(search.value));});
fetch(ZONES).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(data){
  var raw=Array.isArray(data)?data:(data&&(data.games||data.data)||Object.values(data));
  games=raw.map(normalize).filter(Boolean).filter(function(g){var n=g.name.toLowerCase();return n.indexOf('suggest')===-1&&n.indexOf('comment')===-1;});
  render(filter(search.value));
  if(!games.length)status.textContent='no launchable games found';
}).catch(function(err){status.textContent='failed: '+err.message;});
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
        <p class="text-[10px] uppercase tracking-[0.5em] text-white font-light"
           style="opacity:0.4">${TAGLINE}</p>
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
    <div class="px-5 pb-4 flex flex-col gap-3">
      <p class="text-white/30 text-xs uppercase tracking-widest">Accent colour</p>
      <div class="flex gap-3 flex-wrap">
        ${Object.entries(THEMES).map(([name, { label, rgb, hex }]) => `
          <button
            class="accent-swatch${state.accentRgb === rgb ? ' active' : ''}"
            data-theme-name="${name}"
            title="${label}"
            style="background:${hex}"
          ></button>`).join('')}
      </div>
    </div>` : ''

  return `
    ${settingsRowHTML('Appearance', 'Accent colour', 'appearance', isAppearance)}
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

function gamesViewHTML() {
  return `<div class="content-view"><iframe id="games-frame" class="content-frame"></iframe></div>`
}

function tvViewHTML() {
  return `<div class="content-view"><iframe id="tv-frame" class="content-frame"></iframe></div>`
}

function chatViewHTML() {
  const tabOn  = 'px-4 py-1.5 rounded-full text-xs border border-white/35 text-white bg-white/[0.09] transition-colors cursor-pointer'
  const tabOff = 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-white/40 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer'
  return `
    <div class="flex flex-col w-full" style="height:calc(100dvh - 7.5rem)">

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 mb-3 flex-shrink-0
                  bg-white/[0.03] border border-white/[0.08] rounded-2xl">
        <div class="flex items-center gap-2.5">
          <span class="text-white/80 font-semibold text-sm tracking-wide">Chat</span>
          <span class="text-white/20 text-xs">·</span>
          <span class="text-white/30 text-xs font-mono">${_escHtml(_chatNick)}</span>
        </div>
        <div class="flex items-center gap-1.5">
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
        <input id="chat-room-input" type="text" placeholder="room code…"
               value="${_escHtml(_chatRoom)}"
               autocomplete="off" spellcheck="false"
               class="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full
                      px-3 py-1.5 text-xs text-white/70 outline-none placeholder-white/20
                      font-mono transition-opacity"
               style="opacity:${_chatMode === 'dm' ? '1' : '0'};pointer-events:${_chatMode === 'dm' ? 'auto' : 'none'}">
      </div>

      <!-- Messages -->
      <div id="chat-messages"
           class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pb-1 px-1">
      </div>

      <!-- Input -->
      <form id="chat-form"
            class="flex items-center gap-2 mt-3 flex-shrink-0
                   bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5">
        <input id="chat-input" type="text" placeholder="Message…"
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

// ── In-app browser ─────────────────────────────────────────────────────────

function browserViewHTML() {
  return `
    <div class="browser-container">
      <div class="browser-toolbar">
        <button id="browser-back-btn" class="browser-btn" title="Back">
          ${icoArrowLeft(15)}
        </button>
        <button id="browser-home-btn" class="browser-btn" title="Home">
          ${icoGlobe(15)}
        </button>
        <input
          id="browser-url-input"
          type="text"
          value="${state.browserUrl}"
          placeholder="Search DuckDuckGo or enter a URL…"
          class="browser-url-input"
          spellcheck="false"
          autocomplete="off"
        />
        <button id="browser-go-btn" class="browser-btn" title="Go">
          ${icoArrowRight(15)}
        </button>
        <button id="browser-refresh-btn" class="browser-btn" title="Refresh">
          ${icoRefresh(15)}
        </button>
        <a id="browser-newtab-btn" href="${state.browserUrl}" target="_blank"
           rel="noopener noreferrer" class="browser-btn" title="Open in new tab">
          ${icoExternalLink(15)}
        </a>
      </div>

      <div class="relative flex-1 min-h-0">
        <!-- Shimmer skeleton shown while iframe is loading, hidden on load -->
        <div id="browser-loading"
             class="absolute inset-0 z-10 flex flex-col gap-3 p-5 rounded-2xl overflow-hidden
                    bg-white/[0.03] border border-white/[0.06] pointer-events-none">
          <div class="flex items-center gap-3">
            <div class="skeleton-inner w-7 h-7 rounded-full flex-shrink-0"></div>
            <div class="skeleton-inner h-2.5 w-48 rounded-full"></div>
          </div>
          <div class="skeleton-inner h-2.5 w-full rounded-full mt-1"></div>
          <div class="skeleton-inner h-2.5 w-5/6 rounded-full"></div>
          <div class="skeleton-inner h-2.5 w-4/5 rounded-full"></div>
          <div class="skeleton-inner w-full rounded-xl" style="height:7rem"></div>
          <div class="skeleton-inner h-2.5 w-full rounded-full"></div>
          <div class="skeleton-inner h-2.5 w-3/4 rounded-full"></div>
          <div class="skeleton-inner h-2.5 w-5/6 rounded-full"></div>
          <div class="skeleton-inner w-full rounded-xl" style="height:5rem"></div>
          <div class="skeleton-inner h-2.5 w-2/3 rounded-full"></div>
          <div class="skeleton-inner h-2.5 w-full rounded-full"></div>
        </div>

        <iframe
          id="browser-iframe"
          class="absolute inset-0 w-full h-full border-none rounded-2xl bg-white z-0
                 opacity-0 transition-opacity duration-300"
          src="about:blank"
        ></iframe>
      </div>
    </div>`
}

// Ultraviolet XOR encoding — odd-indexed chars XORed with 2, result URI-encoded
function xorEncode(str) {
  return encodeURIComponent(
    [...str].map((c, i) => i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ 2) : c).join('')
  )
}

// Load a cross-origin script by injecting a <script> tag (bypasses dynamic import CORS).
function loadScriptOnce(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload  = resolve
    s.onerror = () => reject(new Error('Script load failed: ' + src))
    document.head.appendChild(s)
  })
}

// Configure BareMux transport and prime the UV service worker.
// Marks iframe.dataset.priming during setup so the load handler ignores the primer page.
async function initUV(iframe) {
  const wisp = `wss://${new URL(PROXY_HOST).hostname}/wisp/`
  try {
    // Load BareMux via <script> tag — dynamic import() blocked by CORS cross-origin
    await loadScriptOnce(`${PROXY_HOST}/baremux/index.js`)
    const bm = window.BareMux ?? {}
    if (bm.BareMuxConnection) {
      const conn = new bm.BareMuxConnection(`${PROXY_HOST}/baremux/worker.js`)
      await conn.setTransport('/epoxy/index.mjs', [wisp])
    } else if (bm.SetTransport) {
      await bm.SetTransport(`${PROXY_HOST}/baremux/worker.js`, { wisp })
    }
  } catch (err) {
    console.warn('[OrbitV2] BareMux setup failed, continuing anyway:', err)
  }

  iframe.dataset.priming = 'true'
  await new Promise(resolve => {
    const fallback = setTimeout(resolve, 6000)
    const onLoad = () => {
      clearTimeout(fallback)
      iframe.removeEventListener('load', onLoad)
      setTimeout(resolve, 600)
    }
    iframe.addEventListener('load', onLoad)
    iframe.src = PROXY_HOST
  })
  delete iframe.dataset.priming
}

async function browserNavigate(input) {
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

  state.browserHistory = [...state.browserHistory, state.browserUrl].slice(-40)
  state.browserUrl = url

  if (!iframe) return

  const finalSrc = `${PROXY_HOST}/service/${xorEncode(url)}`

  if (!_uvReadyPromise) _uvReadyPromise = initUV(iframe)
  await _uvReadyPromise
  iframe.src = finalSrc
}

function viewHTML() {
  switch (state.view) {
    case 'home':     return homeViewHTML()
    case 'settings': return settingsViewHTML()
    case 'games':    return gamesViewHTML()
    case 'tv':       return tvViewHTML()
    case 'chat':     return chatViewHTML()
    case 'ai':       return aiViewHTML()
    case 'browser':  return browserViewHTML()
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

  // Browser view needs a different main layout (top-aligned, full height)
  const mainEl = document.querySelector('main')
  const fullHeightViews = ['browser', 'games', 'tv', 'chat', 'ai']
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
      _switchChat('global')
    })

    document.getElementById('chat-tab-dm')?.addEventListener('click', () => {
      const roomInput = document.getElementById('chat-room-input')
      const room = roomInput?.value.trim() || ''
      // Toggle DM mode; if no room yet, just reveal the input
      if (!room) {
        _applyChatTabStyles('dm')
        _chatMode = 'dm'
        roomInput?.focus()
      } else {
        _switchChat('dm', room)
      }
    })

    document.getElementById('chat-room-input')?.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return
      const room = e.target.value.trim()
      if (room) _switchChat('dm', room)
    })

    document.getElementById('chat-room-input')?.addEventListener('input', e => {
      // If already in DM mode, live-reload when user changes room
      if (_chatMode === 'dm') {
        _chatRoom = e.target.value.trim()
        if (_chatRoom) _loadChatMessages()
      }
    })

    // Focus input on open
    document.getElementById('chat-input')?.focus()
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

  // Browser view events
  if (state.view === 'browser') {
    const urlInput = document.getElementById('browser-url-input')
    const iframe   = document.getElementById('browser-iframe')

    browserNavigate(state.browserUrl)

    urlInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') browserNavigate(urlInput.value)
    })
    urlInput?.addEventListener('focus', () => urlInput.select())

    document.getElementById('browser-go-btn')?.addEventListener('click', () => {
      browserNavigate(urlInput?.value ?? '')
    })

    document.getElementById('browser-back-btn')?.addEventListener('click', () => {
      if (!state.browserHistory.length) return
      const prev = state.browserHistory[state.browserHistory.length - 1]
      state.browserHistory = state.browserHistory.slice(0, -1)
      state.browserUrl = prev
      browserNavigate(prev)
    })

    document.getElementById('browser-home-btn')?.addEventListener('click', () => {
      browserNavigate(BROWSER_HOME)
    })

    document.getElementById('browser-refresh-btn')?.addEventListener('click', () => {
      if (iframe) iframe.src = iframe.src
    })

    // Hide shimmer and reveal iframe once the proxied page finishes loading.
    // Skip load events fired during BareMux/SW priming phase.
    iframe?.addEventListener('load', () => {
      if (iframe.dataset.priming) return
      if (!iframe.src || iframe.src === 'about:blank') return
      const loading = document.getElementById('browser-loading')
      if (loading) loading.style.opacity = '0'
      iframe.style.opacity = '1'
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
  </div>
`

$viewContent = document.getElementById('view-content')
$dock        = document.getElementById('main-dock')

bindViewEvents()
bindDockEvents()

// On load: restore saved theme (sets CSS vars + generates colored stars)
requestAnimationFrame(() => {
  const saved = localStorage.getItem('orbit_theme') ?? 'white'
  setTheme(saved)
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
