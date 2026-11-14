import { LOGO_A, LOGO_MOON } from './logoPath'

/** Argo mark: a filled "A", its arch a horizon with the Moon rising in it. currentColor, crisp from 16 px. */
export function Logo({ size = 22, title, className }: { size?: number; title?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={LOGO_A} fill="currentColor" />
      <path d={LOGO_MOON} fill="currentColor" />
    </svg>
  )
}
