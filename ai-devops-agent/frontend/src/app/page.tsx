'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Cloud,
  CopyPlus,
  Github,
  GitBranch,
  GitCommitHorizontal,
  Linkedin,
  Rocket,
  Search,
  Sparkles,
  Target,
  Twitter,
  WandSparkles,
} from 'lucide-react';

const workflow = [
  {
    id: 1,
    title: 'Clone',
    desc: 'Secure read-only access to your repository and pipeline config.',
    icon: Cloud,
    tone: 'text-blue-300 bg-blue-500/20',
  },
  {
    id: 2,
    title: 'Discover',
    desc: 'Maps architecture, dependencies, and CI workflows automatically.',
    icon: Search,
    tone: 'text-indigo-300 bg-indigo-500/20',
  },
  {
    id: 3,
    title: 'Detect',
    desc: 'Identifies build breaks, flaky tests, lint failures, and regressions.',
    icon: Target,
    tone: 'text-red-300 bg-red-500/20',
  },
  {
    id: 4,
    title: 'Fix',
    desc: 'Generates high-confidence AI patches based on root-cause analysis.',
    icon: WandSparkles,
    tone: 'text-emerald-300 bg-emerald-500/20',
  },
  {
    id: 5,
    title: 'Branch',
    desc: 'Creates isolated fix branches without touching your mainline.',
    icon: GitBranch,
    tone: 'text-sky-300 bg-sky-500/20',
  },
  {
    id: 6,
    title: 'Commit',
    desc: 'Writes clear commit messages describing what changed and why.',
    icon: GitCommitHorizontal,
    tone: 'text-cyan-300 bg-cyan-500/20',
  },
  {
    id: 7,
    title: 'Trigger',
    desc: 'Re-runs CI to verify that generated fixes pass reliably.',
    icon: Rocket,
    tone: 'text-blue-300 bg-blue-500/20',
  },
  {
    id: 8,
    title: 'Iterate',
    desc: 'Continuously improves patch quality from run history and outcomes.',
    icon: Activity,
    tone: 'text-purple-300 bg-purple-500/20',
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-xl2 border border-border bg-gradient-to-b from-black to-[#08152e] p-6 shadow-soft md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(29,78,216,0.2),transparent_45%)]" />
        <div className="relative grid items-start gap-8 lg:grid-cols-[1.1fr,1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-3 py-1 text-xs font-semibold text-info"
            >
              <CircleDot className="h-3.5 w-3.5" />
              V2.4 LIVE: NOW SUPPORTING KUBERNETES MANIFESTS
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
            >
              Fix your CI/CD before it breaks your <span className="text-info">sprint.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mt-5 max-w-2xl text-base text-slate-300"
            >
              AI-powered automated healing agent for DevOps. Connect your repository and let AI detect and fix broken
              builds instantly with surgical precision.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link href="/dashboard" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5">
                Open dashboard
              </Link>
              <Link href="/history" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5">
                View history
              </Link>
            </motion.div>
          </div>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="rounded-xl2 border border-blue-500/20 bg-[#0e172a] shadow-soft"
          >
            <header className="border-b border-border/70 px-4 py-3 text-center text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Live healing stream
            </header>
            <div className="space-y-4 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Analyzing Architecture</span>
                  <span className="text-info">84%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    className="h-2 rounded-full bg-info"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-[#0b1323] p-3 font-mono text-xs">
                <p className="text-slate-300">[14:02:11] <span className="text-cyan-300">INFO</span> Scanning workflow files…</p>
                <p className="text-slate-300">[14:02:14] <span className="text-amber-300">WARN</span> Failure detected in step: &quot;Run Tests&quot;</p>
                <p className="text-slate-300">[14:02:15] <span className="text-emerald-300">HEAL</span> Identified missing peer dependency</p>
                <p className="text-slate-300">[14:02:16] <span className="text-blue-300">PATCH</span> Generating pull request…</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-[#0b1323] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Remediating
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-[#0b1323] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Impact score</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">9.8 / 10</p>
                </div>
              </div>
            </div>
          </motion.article>
        </div>
      </section>

      <section id="workflow" className="rounded-xl2 border border-border bg-[#070d1a] px-6 py-10 shadow-soft md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">The Autonomous DevOps Workflow</h2>
          <p className="mt-3 text-slate-300">
            AI monitors your pipeline and remediates issues in real-time, handling everything from discovery to deployment.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="rounded-xl2 border border-border bg-card p-5"
              >
                <div className={`mb-4 inline-flex rounded-xl p-2 ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">{item.id}. {item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section id="features" className="rounded-xl2 border border-border bg-[#070d1a] px-6 py-10 shadow-soft md:px-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-bold text-foreground">AI-Generated Fixes in Seconds</h2>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              Stop wasting developer hours on broken YAMLs and dependency conflicts. The assistant writes high-quality
              patches that follow your team conventions.
            </p>
            <ul className="mt-6 space-y-4">
              {['Typescript Support', 'YAML Validation', 'Dependency Management'].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-semibold text-foreground">{line}</p>
                    <p className="text-sm text-slate-300">Enterprise-safe remediation with explainable patch output.</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl2 border border-blue-500/20 bg-[#0d1630] shadow-soft">
            <div className="border-b border-border/70 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">Diff: workflow.yml</div>
            <div className="space-y-2 p-4 font-mono text-sm">
              <p className="text-slate-400">Broken Pipeline Configuration</p>
              <p className="rounded bg-red-500/10 px-2 py-1 text-red-300">- node-version: 14.x</p>
              <p className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">+ node-version: 20.x</p>
              <p className="rounded bg-red-500/10 px-2 py-1 text-red-300">- run: npm install</p>
              <p className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">+ run: npm ci --legacy-peer-deps</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 bg-blue-500/15 px-4 py-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-info">
                <Sparkles className="h-3.5 w-3.5" />
                AI suggestion ready
              </p>
              <button className="inline-flex items-center gap-1 rounded-lg bg-info px-3 py-1.5 text-xs font-semibold text-white">
                <CopyPlus className="h-3.5 w-3.5" />
                Apply fix
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="stats" className="rounded-xl2 border border-border bg-gradient-to-r from-[#0a1734] to-[#071225] p-6 shadow-soft md:p-10">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { value: '99.4%', label: 'Fix Accuracy', note: 'Trained on CI/CD failure patterns and production-grade code.' },
            { value: '15m', label: 'Average Recovery Time', note: 'Reduce MTTR from hours to minutes automatically.' },
            { value: '2,400+', label: 'Repositories Healed', note: 'Trusted by engineering teams to keep main branch green.' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-5xl font-bold text-info">{stat.value}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stat.label}</p>
              <p className="mt-2 text-sm text-slate-300">{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl2 border border-border bg-[#050b16] px-6 py-16 text-center shadow-soft md:px-10">
        <h2 className="text-4xl font-bold text-foreground md:text-5xl">Heal your first repo for free.</h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-300">
          No credit card required. Connect a single repository and experience autonomous DevOps today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up" className="rounded-lg bg-info px-8 py-3 text-lg font-semibold text-white hover:bg-blue-500">
            Get Started Now
          </Link>
          <button className="rounded-lg border border-border bg-card px-8 py-3 text-lg font-semibold text-foreground hover:bg-white/5">
            Book a Demo
          </button>
        </div>
        <p className="mt-6 text-sm text-slate-400">Trusted by contributors from Google, Meta, and Vercel.</p>
      </section>

      <footer className="rounded-xl2 border border-border bg-[#050b16] px-6 py-5 shadow-soft md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm font-semibold text-foreground">AutoHeal AI</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground">Terms of Service</Link>
            <Link href="#" className="hover:text-foreground">Security</Link>
            <Link href="#" className="hover:text-foreground">Status</Link>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-border p-2 text-slate-300 hover:bg-white/5 hover:text-foreground" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </button>
            <button className="rounded-md border border-border p-2 text-slate-300 hover:bg-white/5 hover:text-foreground" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </button>
            <button className="rounded-md border border-border p-2 text-slate-300 hover:bg-white/5 hover:text-foreground" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
