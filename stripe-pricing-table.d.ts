import React from 'react'

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'pricing-table-id': string
        'publishable-key': string
        class?: string
      }
    }
  }
}

export {}
