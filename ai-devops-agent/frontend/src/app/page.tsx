'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { RepoForm } from '@/components/RepoForm';

export default function LandingPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] lg:items-center">
      <section>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/40 bg-info/10 px-3 py-1 text-xs text-info"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered CI/CD Copilot
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
        >
          AI DevOps Copilot
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 max-w-xl text-base text-muted"
        >
          Enter a GitHub repository, watch pipeline steps execute, see AI-generated fixes, and follow test re-runs with a live timeline.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <Link href="/dashboard" className="rounded-lg bg-info px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Open dashboard
          </Link>
          <Link href="/history" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5">
            View history
          </Link>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <RepoForm />
      </motion.section>
    </div>
  );
}
