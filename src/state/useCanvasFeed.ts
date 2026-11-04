import { useCallback, useEffect, useMemo, useState } from 'react'
import { sampleAssignments } from '../data/sampleAssignments'
import { looksLikeFeed, parseFeed, type ParsedFeed } from '../lib/feed'
import { checkFeedLink } from '../lib/feedLink'
import { useStoredState } from '../lib/useStoredState'

const noClasses: ParsedFeed['classes'] = [] // one shared empty list, so it doesn't count as "changed" every render

export type ConnectResult = { ok: true; count: number } | { ok: false; reason: string }

// Loads the student's Canvas feed through /api/feed (the dev server's
// middleman in vite.config.ts) and keeps the last good copy in this browser,
// so the list still shows when offline. With no feed (like the live website
// until Step 7), the app keeps showing the sample assignments.
//
// The link a student pastes in onboarding is kept in this browser
// ("feed-link"), like a saved password, until accounts move it to the
// database (Step 7). Without one, the dev server uses the link in .env.
export function useCanvasFeed() {
  const [feedText, setFeedText] = useStoredState<string | null>('feed', null)
  const [updatedAt, setUpdatedAt] = useStoredState<number | null>('feed-updated', null)
  const [feedLink, setFeedLink] = useStoredState<string | null>('feed-link', null)
  const [refreshing, setRefreshing] = useState(true) // it starts loading as soon as the app opens

  // Downloads the feed: the pasted link if there is one, else .env's.
  const download = useCallback(async (link: string | null): Promise<string | null> => {
    const response = link
      ? await fetch('/api/feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link }) })
      : await fetch('/api/feed')
    const text = await response.text()
    return response.ok && looksLikeFeed(text) ? text : null
  }, [])

  const load = useCallback(async () => {
    try {
      const text = await download(feedLink)
      if (text) {
        setFeedText(text)
        setUpdatedAt(Date.now())
      }
    } catch {
      // Offline or the server is down: keep the last saved copy.
    } finally {
      setRefreshing(false)
    }
  }, [download, feedLink, setFeedText, setUpdatedAt])

  useEffect(() => {
    void load() // once when the app opens
  }, [load])

  // Apple: "Perform automatic content updates." When you come back to the
  // app after a while (switching apps, unlocking the phone), check again.
  useEffect(() => {
    function onReturn() {
      const stale = !updatedAt || Date.now() - updatedAt > 5 * 60 * 1000
      if (document.visibilityState === 'visible' && stale) void load()
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => document.removeEventListener('visibilitychange', onReturn)
  }, [load, updatedAt])

  // Tapping "Updated …" downloads it again.
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  // Onboarding: try a pasted link. Saved only if Canvas really sends a feed.
  const connect = useCallback(async (input: string): Promise<ConnectResult> => {
    const check = checkFeedLink(input)
    if (!check.ok) return check
    try {
      const text = await download(check.url)
      if (!text) return { ok: false, reason: "Canvas didn't send a calendar for that link. Copy it again from Calendar Feed." }
      setFeedLink(check.url)
      setFeedText(text)
      setUpdatedAt(Date.now())
      return { ok: true, count: parseFeed(text).assignments.length }
    } catch {
      return { ok: false, reason: "Couldn't reach Canvas. Check your connection and try again." }
    }
  }, [download, setFeedLink, setFeedText, setUpdatedAt])

  const parsed = useMemo<ParsedFeed | null>(() => {
    if (!feedText) return null
    try {
      return parseFeed(feedText)
    } catch {
      return null // a broken saved copy: fall back to the samples
    }
  }, [feedText])

  return {
    live: parsed !== null,
    assignments: parsed?.assignments ?? sampleAssignments,
    feedClasses: parsed?.classes ?? noClasses,
    updatedAt,
    refreshing,
    refresh,
    connect,
  }
}
