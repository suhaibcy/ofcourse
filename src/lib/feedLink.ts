// Checks a pasted Canvas calendar link before we try to use it.
// A real one looks like https://canvas.uic.edu/feeds/calendars/user_AbC123.ics
// Used by onboarding (to show a friendly error) and by the dev server's
// middleman (so it only ever fetches Canvas calendar links, nothing else).

export type FeedLinkCheck = { ok: true; url: string } | { ok: false; reason: string }

export function checkFeedLink(input: string): FeedLinkCheck {
  const text = input.trim()
  if (!text) return { ok: false, reason: 'Paste your calendar link first.' }

  let url: URL
  try {
    url = new URL(text)
  } catch {
    return { ok: false, reason: "That doesn't look like a link. Copy the whole thing from Canvas." }
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'The link should start with https://' }
  if (!url.pathname.includes('/feeds/calendars/') || !url.pathname.endsWith('.ics')) {
    return { ok: false, reason: "That's not the calendar link. In Canvas, open Calendar, then Calendar Feed." }
  }
  return { ok: true, url: url.toString() }
}
