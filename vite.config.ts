import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { checkFeedLink } from './src/lib/feedLink.ts'

// Canvas blocks web pages from downloading the calendar feed directly (a
// browser rule called CORS), so the dev server fetches it for the app.
// - GET /api/feed: uses the link in .env (handy while building).
// - POST /api/feed with {"url": "..."}: uses a link the student pasted in
//   onboarding. Sent in the body, never in the address, and checked first so
//   this only ever fetches Canvas calendar links.
// The link never goes into the app's code and is never logged.
function canvasFeed(envUrl: string | undefined): Plugin {
  return {
    name: 'canvas-feed',
    configureServer(server) {
      server.middlewares.use('/api/feed', async (req, res) => {
        let feedUrl = envUrl
        if (req.method === 'POST') {
          let body = ''
          for await (const chunk of req) body += chunk
          let pasted = ''
          try {
            pasted = String(JSON.parse(body).url ?? '')
          } catch {
            pasted = ''
          }
          const check = checkFeedLink(pasted)
          if (!check.ok) {
            res.statusCode = 400
            res.end(check.reason)
            return
          }
          feedUrl = check.url
        }
        if (!feedUrl) {
          res.statusCode = 500
          res.end('No CANVAS_FEED_URL in .env')
          return
        }
        try {
          const canvas = await fetch(feedUrl)
          res.statusCode = canvas.status
          res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
          res.end(await canvas.text())
        } catch {
          res.statusCode = 502
          res.end('Could not reach Canvas')
        }
      })
    },
  }
}

// The same course routes Vercel runs in production (api/), for the dev server.
// The code loads on each request, so server changes apply without a restart.
function courseApi(env: Record<string, string>): Plugin {
  return {
    name: 'course-api',
    configureServer(server) {
      process.env.AI_ENABLED = env.AI_ENABLED
      process.env.MODEL_API_KEY = env.MODEL_API_KEY
      process.env.AI_MODEL = env.AI_MODEL
      for (const route of ['status', 'course', 'explain', 'say']) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          let body = ''
          for await (const chunk of req) body += chunk
          const { handleRoute } = await server.ssrLoadModule('/server/handlers.ts')
          const result = await handleRoute(route, req.method, body ? JSON.parse(body) : {}, req.socket.remoteAddress ?? 'local')
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.json))
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every variable in .env, not just ones starting with VITE_.
  // Only VITE_ variables are ever put into the app itself, which is why the
  // feed link deliberately doesn't start with VITE_.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), canvasFeed(env.CANVAS_FEED_URL), courseApi(env)],
  }
})
