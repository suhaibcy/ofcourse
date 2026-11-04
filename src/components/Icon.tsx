// Simple line icons drawn in the current text color (1.5px strokes,
// per the design system). Add new ones to the `paths` list.

const paths = {
  today: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  planner: 'M4 5h16M4 12h16M4 19h10M8 3v4M16 3v4',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8 3v4M16 3v4',
  grades: 'M5 20V12M12 20V5M19 20v-6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  ask: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  notes: 'M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 15.5h5',
  classes: 'M4 6.5l8-3.5 8 3.5-8 3.5zM7 8v5c0 1.5 2.2 3 5 3s5-1.5 5-3V8',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7 7 0 0 1-1.8 1l-.3 2H10.8l-.3-2a7 7 0 0 1-1.8-1l-1.9.7L5 14.7l1.6-1.2a7 7 0 0 1 0-3L5 9.3l1.8-3.1 1.9.7a7 7 0 0 1 1.8-1l.3-2h3.4l.3 2a7 7 0 0 1 1.8 1l1.9-.7L21 9.3l-1.6 1.2a7 7 0 0 1 0 3z',
  compose: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  profile: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.5 20a7.5 7.5 0 0 1 15 0',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
