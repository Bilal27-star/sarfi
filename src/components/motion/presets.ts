/** Centralized motion system — every animated component pulls from here. */
import type { TargetAndTransition, Transition, Variants } from 'framer-motion'

export const springSnappy: Transition = { type: 'spring', stiffness: 500, damping: 32, mass: 0.8 }
export const springSoft: Transition = { type: 'spring', stiffness: 300, damping: 30 }
export const springSheet: Transition = { type: 'spring', stiffness: 380, damping: 36 }

export const pageEnter: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

export const cardReveal: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: springSoft },
}

export const staggerList: Variants = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: springSnappy },
}

export const sheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: springSheet },
  exit: { y: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const successPop: Variants = {
  initial: { scale: 0.4, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 18 } },
}

export const pressTap = { scale: 0.97 }

/** Error feedback — horizontal shake for a rejected action (e.g. failed
 * save). Meant for `useAnimationControls().start(shakeX)`, not a Variants
 * initial/animate pair, since it should replay on demand. */
export const shakeX: TargetAndTransition = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.36, ease: 'easeInOut' },
}
