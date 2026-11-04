import type { ReactNode } from 'react'

type TagProps = {
  children: ReactNode
}

// A small label next to a class code, like "Exam".
export function Tag({ children }: TagProps) {
  return <span className="tag">{children}</span>
}
