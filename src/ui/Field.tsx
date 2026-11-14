import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import s from './Field.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string
  /** Render the label visually hidden (still read by screen readers). */
  hideLabel?: boolean
  icon?: ReactNode
}

export function Field({ label, hint, error, hideLabel, icon, className = '', ...rest }: Props) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={`${s.field} ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : s.label}>
        {label}
      </label>
      <div className={`${s.box} ${error ? s.invalid : ''}`}>
        {icon && <span className={s.icon} aria-hidden="true">{icon}</span>}
        <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={s.input} {...rest} />
      </div>
      {error ? (
        <p id={`${id}-err`} className={s.error} role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className={s.hint}>{hint}</p>
      ) : null}
    </div>
  )
}
