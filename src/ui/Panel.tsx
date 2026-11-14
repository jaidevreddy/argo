import type { HTMLAttributes } from 'react'
import s from './Panel.module.css'

/** Floating glass panel over the 3D view. */
export function Panel({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${s.panel} ${className}`} {...rest} />
}
