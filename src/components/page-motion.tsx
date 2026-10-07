"use client";

import { motion, useReducedMotion } from "motion/react";

export function PageMotion({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.18 }}>{children}</motion.div>;
}
