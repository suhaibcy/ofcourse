// What every lesson block gets from the player.
export type BlockProps<T> = {
  block: T
  onMiss: () => void // a wrong try: Hoot reacts, and the student can try again
  onFinish: (firstTry: boolean) => void // the block is done
}

// A new order for a list, never the one it started in (so there's always something to do).
export function shuffled<T>(items: T[]): T[] {
  if (items.length < 2) return items
  const copy = [...items]
  do {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
  } while (copy.every((item, i) => item === items[i]))
  return copy
}
