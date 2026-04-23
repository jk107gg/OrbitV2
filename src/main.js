import './style.css'

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
  { iconFn: icoHome,     label: 'Home',     view: 'home'     },
  { iconFn: icoGlobe,    label: 'Browser',  view: 'browser'  },
  { iconFn: icoGamepad,  label: 'Games',    view: 'games'    },
  { iconFn: icoTv,       label: 'TV',       view: 'tv'       },
  { iconFn: icoMusic,    label: 'Music',    view: 'music'    },
  { iconFn: icoSparkles, label: 'AI',       view: 'ai'       },
  { iconFn: icoUser,     label: 'Profile',  view: 'profile'  },
  { iconFn: icoSettings, label: 'Settings', view: 'settings' },
]

const RHEAD_INSTANCE  = 'https://r.joshuab.xyz'   // must match vite.config.js
const BROWSER_HOME    = 'https://www.google.com'
const BROWSER_SEARCH  = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`

// Accent colour palette — rgb values feed into rgba(var(--accent-rgb), alpha)
const ACCENT_COLORS = [
  { label: 'White',    rgb: '255, 255, 255', hex: '#ffffff' },
  { label: 'Cyan',     rgb: '100, 220, 255', hex: '#64dcff' },
  { label: 'Purple',   rgb: '180, 100, 255', hex: '#b464ff' },
  { label: 'Rose',     rgb: '255, 100, 140', hex: '#ff648c' },
  { label: 'Emerald',  rgb: '80,  220, 160', hex: '#50dcA0' },
  { label: 'Amber',    rgb: '255, 185,  70', hex: '#ffb946' },
]

// Tracks which skeleton views have already revealed their content this session
const loadedViews = new Set()

// ── Rammerhead session ─────────────────────────────────────────────────────
let rheadSession = null

async function initRheadSession() {
  if (rheadSession) return
  try {
    const res = await fetch('/rhead-newsession', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    rheadSession = (await res.text()).trim()
  } catch (err) {
    console.warn('[Orbit] Rammerhead session failed:', err.message)
    rheadSession = null
  }
}

// Wrap a full URL for Rammerhead; falls back to direct if session unavailable
function rheadUrl(url) {
  if (!rheadSession) return url
  return `${RHEAD_INSTANCE}/${rheadSession}/${url}`
}

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

function applyAccent(rgb) {
  document.documentElement.style.setProperty('--accent-rgb', rgb)
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
                   tracking-tighter text-white leading-none uppercase">
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
        ${ACCENT_COLORS.map(({ label, rgb, hex }) => `
          <button
            class="accent-swatch${state.accentRgb === rgb ? ' active' : ''}"
            data-accent-rgb="${rgb}"
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
  return skeletonViewHTML({
    title:    'Games',
    subtitle: 'Your Library',
    cards:    12,
    layout:   skeletonGameCard,
  })
}

function tvViewHTML() {
  return skeletonViewHTML({
    title:    'TV',
    subtitle: 'Browse Channels',
    cards:    8,
    layout:   skeletonTvCard,
  })
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
          placeholder="Search Google or enter a URL…"
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
      <iframe
        id="browser-iframe"
        class="browser-iframe"
        src="about:blank"
      ></iframe>
    </div>`
}

// Navigate browser to a URL or search query (routes through Rammerhead)
function browserNavigate(input) {
  const val = input.trim()
  if (!val) return
  const url = looksLikeUrl(val)
    ? (/^https?:\/\//i.test(val) ? val : `https://${val}`)
    : BROWSER_SEARCH(val)

  const newTabBtn = document.getElementById('browser-newtab-btn')
  if (newTabBtn) newTabBtn.href = url

  state.browserHistory = [...state.browserHistory, state.browserUrl].slice(-40)
  state.browserUrl = url

  const iframe   = document.getElementById('browser-iframe')
  const urlInput = document.getElementById('browser-url-input')
  if (iframe)   iframe.src    = rheadUrl(url)
  if (urlInput) urlInput.value = url
}

function viewHTML() {
  switch (state.view) {
    case 'home':     return homeViewHTML()
    case 'settings': return settingsViewHTML()
    case 'games':    return gamesViewHTML()
    case 'tv':       return tvViewHTML()
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
  if (mainEl) mainEl.classList.toggle('browser-mode', state.view === 'browser')

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
  // Kick off skeleton → content reveal for loading views
  if (state.view === 'games' || state.view === 'tv') {
    scheduleContentReveal(state.view)
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

    // Init Rammerhead session then load home page
    ;(async () => {
      await initRheadSession()
      if (iframe) iframe.src = rheadUrl(state.browserUrl)
    })()

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
      if (iframe)   iframe.src    = rheadUrl(prev)
      if (urlInput) urlInput.value = prev
      const newTabBtn = document.getElementById('browser-newtab-btn')
      if (newTabBtn) newTabBtn.href = prev
    })

    document.getElementById('browser-home-btn')?.addEventListener('click', () => {
      browserNavigate(BROWSER_HOME)
    })

    document.getElementById('browser-refresh-btn')?.addEventListener('click', () => {
      if (iframe) iframe.src = iframe.src
    })
  }

  // Settings section toggle — delegated on settings body
  document.getElementById('settings-body')?.addEventListener('click', e => {
    const row = e.target.closest('[data-settings-section]')
    if (row) {
      const section = row.dataset.settingsSection
      setState({ settingsSection: state.settingsSection === section ? null : section })
    }
    const swatch = e.target.closest('[data-accent-rgb]')
    if (swatch) {
      setState({ accentRgb: swatch.dataset.accentRgb })
    }
  })
}

function bindDockEvents() {
  $dock.addEventListener('click', e => {
    const btn = e.target.closest('[data-view]')
    if (btn) setState({ view: btn.dataset.view })
  })
}

// Escape key closes app overlay
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.activeApp) closeApp()
})

// ═══════════════════════════════════════════════════════════════════════════
// STARS
// ═══════════════════════════════════════════════════════════════════════════

function starShadows(count, alpha) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2000)
    const y = Math.floor(Math.random() * 2000)
    const a = (alpha * (0.4 + Math.random() * 0.6)).toFixed(2)
    out.push(`${x}px ${y}px rgba(255,255,255,${a})`)
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

requestAnimationFrame(() => {
  document.getElementById('stars1').style.boxShadow = starShadows(800, 0.55)
  document.getElementById('stars2').style.boxShadow = starShadows(250, 0.85)
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
