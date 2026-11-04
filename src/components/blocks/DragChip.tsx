import { motion } from 'motion/react'
import type { ReactNode } from 'react'

// The drop zone under a point on screen. Any element marked data-drop="id" counts.
function dropZoneAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const zone = (el as HTMLElement).closest?.('[data-drop]') as HTMLElement | null
    if (zone?.dataset.drop) return zone.dataset.drop
  }
  return null
}

type DragChipProps = {
  children: ReactNode
  onDrop: (zone: string) => void
  onTap?: () => void // tapping works too, so nobody has to drag
  selected?: boolean
  className?: string
}

// Something you can pick up and drop on a zone. It springs home unless the
// drop was right, in which case the game removes it.
export function DragChip({ children, onDrop, onTap, selected, className = '' }: DragChipProps) {
  return (
    <motion.div
      className={`drag-chip ${selected ? 'drag-chip--selected' : ''} ${className}`}
      drag dragSnapToOrigin dragElastic={0.9} dragMomentum={false}
      whileDrag={{ scale: 1.06, zIndex: 20, boxShadow: '0 8px 20px rgba(35, 32, 28, 0.25)' }}
      onTap={onTap}
      onDragEnd={(_, info) => {
        const zone = dropZoneAt(info.point.x - window.scrollX, info.point.y - window.scrollY)
        if (zone !== null) onDrop(zone)
      }}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.() } }}
    >
      {children}
    </motion.div>
  )
}
