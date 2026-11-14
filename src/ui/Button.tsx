import type { ButtonHTMLAttributes } from 'react'
import s from './Button.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'plain' | 'quiet'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'plain', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${s.btn} ${s[variant]} ${s[size]} ${className}`} {...rest} />
}
