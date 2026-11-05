// Which part of the app an address opens. Learn is the front door for anyone who
// hasn't set up the planner, so a visitor only reaches planner onboarding by asking for it.
export type AppRoute = 'learn' | 'planner'

export const PLANNER_HASH = '#/planner'

export function routeFor(hash: string, onboarded: boolean): AppRoute {
  if (hash.startsWith('#/learn')) return 'learn'
  if (hash.startsWith(PLANNER_HASH)) return 'planner'
  return onboarded ? 'planner' : 'learn'
}
