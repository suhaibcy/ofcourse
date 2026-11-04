import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  block?: boolean // full width
  small?: boolean
}

// One primary (blue) button per screen; the rest are secondary or ghost.
export function Button({ variant = 'primary', block, small, className, ...rest }: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block', small && 'btn--small', className]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={classes} {...rest} />
}
