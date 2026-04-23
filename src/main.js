import './style.css'

// ── Config — swap links/labels/icons here ──────────────────────────────────
const NAV_ITEMS = [
  { icon: svgHome(),    label: 'Home',    href: '#',                  active: true  },
  { icon: svgGamepad(), label: 'Games',   href: '#games'                            },
  { icon: svgTv(),      label: 'TV',      href: '#tv'                               },
  { icon: svgVideo(),   label: 'Movies',  href: '#movies'                           },
  { icon: svgMusic(),   label: 'Music',   href: '#music'                            },
  { icon: svgSparkle(), label: 'AI',      href: '#ai'                               },
  { icon: svgChat(),    label: 'Chat',    href: '#chat'                             },
]

const QUICK_LINKS = [
  { label: 'YouTube',  icon: svgYoutube(),  href: 'https://youtube.com',           color: 'rgba(255,0,0,0.15)'     },
  { label: 'Discord',  icon: svgDiscord(),  href: 'https://discord.com',           color: 'rgba(88,101,242,0.15)'  },
  { label: 'GitHub',   icon: svgGithub(),   href: 'https://github.com',            color: 'rgba(255,255,255,0.07)' },
  { label: 'Twitch',   icon: svgTwitch(),   href: 'https://twitch.tv',             color: 'rgba(145,71,255,0.15)'  },
  { label: 'GF Now',   icon: svgNvidia(),   href: 'https://play.geforcenow.com',   color: 'rgba(118,185,0,0.15)'   },
]

// ── Stars ──────────────────────────────────────────────────────────────────
function generateStars(n = 120) {
  return Array.from({ length: n }, () => {
    const size  = Math.random() < 0.7 ? 1 : Math.random() < 0.5 ? 2 : 3
    const dur   = (2.5 + Math.random() * 4).toFixed(1)
    const delay = (Math.random() * 5).toFixed(1)
    return `<div class="star absolute rounded-full bg-white"
      style="
        width:${size}px; height:${size}px;
        top:${(Math.random()*100).toFixed(2)}%;
        left:${(Math.random()*100).toFixed(2)}%;
        --dur:${dur}s;
        animation-delay:${delay}s;
        opacity:0.15;
      "></div>`
  }).join('')
}

// ── Nav ────────────────────────────────────────────────────────────────────
function renderNav() {
  const items = NAV_ITEMS.map(({ icon, label, href, active }) => `
    <a href="${href}" title="${label}"
       class="nav-pill flex items-center justify-center w-10 h-10 rounded-xl
              ${active ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'}">
      ${icon}
    </a>`).join('')

  const bottom = `
    <a href="#profile" title="Profile"
       class="nav-pill flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-white">
      ${svgUser()}
    </a>
    <a href="#settings" title="Settings"
       class="nav-pill flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-white">
      ${svgSettings()}
    </a>
    <a href="#hide" title="Toggle"
       class="nav-pill flex items-center justify-center w-10 h-10 rounded-xl text-white/50 hover:text-white">
      ${svgEye()}
    </a>`

  return `
    <nav class="fixed left-4 top-1/2 -translate-y-1/2 z-50
                flex flex-col gap-2 p-2
                bg-white/5 backdrop-blur-md border border-white/10
                rounded-2xl shadow-xl">
      ${items}
      <div class="w-full h-px bg-white/10 my-1"></div>
      ${bottom}
    </nav>`
}

// ── Quick links ────────────────────────────────────────────────────────────
function renderCards() {
  return QUICK_LINKS.map(({ label, icon, href, color }) => `
    <a href="${href}" target="_blank" rel="noopener noreferrer"
       class="quick-card flex flex-col items-center gap-2 px-5 py-4
              rounded-2xl border border-white/10
              bg-white/5 backdrop-blur-md cursor-pointer no-underline"
       style="background-color:${color}">
      <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10">
        ${icon}
      </div>
      <span class="text-white/80 text-sm font-medium">${label}</span>
    </a>`).join('')
}

// ── Root render ────────────────────────────────────────────────────────────
document.querySelector('#app').innerHTML = `
  <!-- Starfield -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
    ${generateStars(140)}
  </div>

  <!-- Red ambient glow behind title -->
  <div class="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40
              rounded-full pointer-events-none z-0"
       style="background:radial-gradient(ellipse,rgba(220,38,38,0.18) 0%,transparent 70%);
              filter:blur(20px)">
  </div>

  ${renderNav()}

  <!-- Main content -->
  <main class="relative z-10 flex flex-col items-center justify-center min-h-screen gap-8 px-4">

    <!-- Brand -->
    <div class="flex flex-col items-center gap-1 select-none">
      <h1 class="brand-glow text-7xl sm:text-8xl font-black tracking-tight text-white uppercase">
        MYHUB
      </h1>
      <p class="text-white/30 text-sm tracking-[0.3em] uppercase">your portal</p>
    </div>

    <!-- Search -->
    <div class="w-full max-w-lg">
      <div class="flex items-center gap-3 px-5 py-3
                  rounded-full border border-white/10
                  bg-white/5 backdrop-blur-md shadow-lg">
        <svg class="w-4 h-4 text-white/40 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search for anything..."
          class="bg-transparent flex-1 text-white placeholder-white/30 text-sm outline-none"
        />
      </div>
    </div>

    <!-- Quick-link grid -->
    <div class="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
      ${renderCards()}
    </div>

    <!-- Footer hint -->
    <p class="text-white/20 text-xs tracking-widest uppercase mt-4">Ready</p>
  </main>
`

// ── SVG helpers (Lucide-style, 20×20 stroke icons) ─────────────────────────
function icon(path, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}

function svgHome()     { return icon('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>') }
function svgGamepad()  { return icon('<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><rect x="2" y="6" width="20" height="12" rx="2"/>') }
function svgTv()       { return icon('<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>') }
function svgVideo()    { return icon('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>') }
function svgMusic()    { return icon('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>') }
function svgSparkle()  { return icon('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>') }
function svgChat()     { return icon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>') }
function svgUser()     { return icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>') }
function svgSettings() { return icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>') }
function svgEye()      { return icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>') }

function svgYoutube()  {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ff0000">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>`
}
function svgDiscord()  {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="#5865f2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>`
}
function svgGithub()   {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>`
}
function svgTwitch()   {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="#9146ff">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>`
}
function svgNvidia()   {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="#76b900">
    <path d="M8.985 2.596v1.01c-3.713.477-7.671 3.098-8.985 8.87 1.314-1.55 2.836-2.562 4.57-3.048V10.5c-1.2.43-2.355 1.273-3.24 2.608 1.008 4.71 4.49 7.2 7.655 7.695v1.002c-3.967-.51-8.52-3.665-9.476-9.394C.52 6.04 4.64 3.05 8.985 2.596zM9.97 17.94v1.015c.547.06 1.098.09 1.649.09 5.516 0 9.126-3.93 9.126-9.075 0-5.147-3.61-9.075-9.126-9.075-.551 0-1.102.03-1.649.09v1.016c.547-.07 1.098-.11 1.649-.11 4.97 0 8.141 3.668 8.141 8.079 0 4.41-3.171 8.08-8.141 8.08-.551 0-1.102-.04-1.649-.11z"/>
  </svg>`
}
