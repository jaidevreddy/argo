import { WORDMARK, WORDMARK_H, WORDMARK_W } from './logoPath'

/** The ARGO wordmark in currentColor. `height` is the cap height in px. */
export function Wordmark({ height = 16, title, className }: { height?: number; title?: string; className?: string }) {
  return (
    <svg
      height={height}
      width={(height * WORDMARK_W) / WORDMARK_H}
      viewBox={`0 0 ${WORDMARK_W} ${WORDMARK_H}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={WORDMARK} fill="currentColor" />
    </svg>
  )
}
