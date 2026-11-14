import { useId } from 'react'
import s from './Segmented.module.css'

interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

/** Radio-group segmented control (arrow keys move between options natively). */
export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: Props<T>) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className={`${s.group} ${s[size]}`}>
      {options.map((o) => (
        <label key={o.value} className={`${s.opt} ${o.value === value ? s.on : ''}`}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className={s.input} />
          {o.label}
        </label>
      ))}
    </div>
  )
}
