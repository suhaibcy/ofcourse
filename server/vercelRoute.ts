import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRoute } from './handlers.ts'

// Adapts a route to Vercel's function format. Vercel has already parsed the JSON body.
export function vercelRoute(route: string) {
  return async function handler(req: IncomingMessage & { body?: Record<string, unknown> }, res: ServerResponse) {
    const forwarded = req.headers['x-forwarded-for']
    const visitor = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0] ?? 'unknown'
    const result = await handleRoute(route, req.method, req.body ?? {}, visitor)
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.json))
  }
}
