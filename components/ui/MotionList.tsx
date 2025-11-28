'use client'

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type MotionListProps<T> = {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  variants?: Variants
}

const defaultVariants: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
}

export function MotionList<T>({ items, getKey, renderItem, variants = defaultVariants }: MotionListProps<T>) {
  return (
    <AnimatePresence initial={false}>
      {items.map((item) => (
        <motion.div
          key={getKey(item)}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {renderItem(item)}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
