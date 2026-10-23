'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--popover)',
          '--success-text': 'var(--success)',
          '--success-border': 'var(--success)',
          '--error-bg': 'var(--popover)',
          '--error-text': 'var(--destructive)',
          '--error-border': 'var(--destructive)',
          '--warning-bg': 'var(--popover)',
          '--warning-text': 'var(--warning)',
          '--warning-border': 'var(--warning)',
          '--info-bg': 'var(--popover)',
          '--info-text': 'var(--info)',
          '--info-border': 'var(--info)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
