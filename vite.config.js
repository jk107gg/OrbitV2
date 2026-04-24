import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const STRIP_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-type-options',
  'strict-transport-security',
  'transfer-encoding',
  'content-encoding',
])

function rewriteHtmlUrls(html, origin) {
  const wrap = url => `/proxy?url=${encodeURIComponent(url)}`
  html = html.replace(/(href|src|action)="(https?:\/\/[^"#][^"]*)"/gi,  (_, a, u) => `${a}="${wrap(u)}"`)
  html = html.replace(/(href|src|action)="(\/\/[^"#][^"]*)"/gi,         (_, a, u) => `${a}="${wrap('https:' + u)}"`)
  html = html.replace(/(href|src|action)="(\/[^"#][^"]*)"/gi,           (_, a, u) => `${a}="${wrap(origin + u)}"`)
  return html
}

// Read the raw request body as a string (needed for POST form submissions)
function readBody(req) {
  return new Promise(resolve => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', () => resolve(''))
  })
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'web-proxy',
      configureServer(server) {
        server.middlewares.use('/proxy', async (req, res, next) => {
          const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : ''
          const targetUrl = new URLSearchParams(qs).get('url')
          if (!targetUrl) { next(); return }

          let target
          try { target = new URL(targetUrl) }
          catch { res.statusCode = 400; res.end('Bad Request: invalid URL'); return }

          try {
            const method = req.method === 'POST' ? 'POST' : 'GET'
            const body   = method === 'POST' ? await readBody(req) : undefined

            const upstream = await fetch(targetUrl, {
              method,
              headers: {
                // Mimic a real Chrome browser as closely as possible to avoid bot detection
                'User-Agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept':                    req.headers['accept'] ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language':           'en-US,en;q=0.9',
                'Accept-Encoding':           'identity',
                'Cache-Control':             'no-cache',
                'Pragma':                    'no-cache',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest':            'document',
                'Sec-Fetch-Mode':            'navigate',
                'Sec-Fetch-Site':            'none',
                'Sec-Fetch-User':            '?1',
                'sec-ch-ua':                 '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                'sec-ch-ua-mobile':          '?0',
                'sec-ch-ua-platform':        '"Windows"',
                'DNT':                       '1',
                ...(req.headers['cookie']        ? { Cookie:          req.headers['cookie']        } : {}),
                ...(req.headers['content-type']  ? { 'Content-Type':  req.headers['content-type']  } : {}),
                ...(req.headers['referer']       ? { Referer:         req.headers['referer']        } : {}),
              },
              body,
              redirect: 'follow',
            })

            for (const [k, v] of upstream.headers) {
              if (STRIP_HEADERS.has(k.toLowerCase())) continue
              try { res.setHeader(k, v) } catch {}
            }
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.statusCode = upstream.status

            const ct = upstream.headers.get('content-type') ?? ''
            if (ct.includes('text/html')) {
              let html = await upstream.text()
              html = html.replace(/(<head[^>]*>)/i, `$1\n  <base href="${target.origin}/">`)
              html = rewriteHtmlUrls(html, target.origin)
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(html)
            } else {
              res.end(Buffer.from(await upstream.arrayBuffer()))
            }
          } catch (err) {
            res.statusCode = 502
            res.end(`<!-- OrbitV2 proxy error: ${err.message} -->`)
          }
        })
      },
    },
  ],
})
