'use client'

import { motion } from 'framer-motion'
import { pageEnter } from '@/components/motion/presets'

/** Re-mounts per navigation (App Router template convention) — gives every
 * route a quick, consistent enter transition without a heavy page-transition library. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageEnter} initial="initial" animate="animate">
      {children}
    </motion.div>
  )
}
