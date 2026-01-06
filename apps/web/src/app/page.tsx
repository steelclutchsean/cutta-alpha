'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { Trophy, Zap, TrendingUp, Users, Play, Shield } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Live Auctions',
    description: 'Real-time bidding with built-in streaming. Feel the energy of a live draft room.',
  },
  {
    icon: Trophy,
    title: 'Instant Payouts',
    description: 'Watch your balance update in real-time as your teams win.',
  },
  {
    icon: TrendingUp,
    title: 'Secondary Market',
    description: 'Trade team ownership anytime. Buy low, sell high.',
  },
  {
    icon: Users,
    title: 'Social Experience',
    description: 'Chat, react, and compete with friends in your pool.',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Card on file with automatic processing. No chasing money.',
  },
  {
    icon: Play,
    title: 'Built-in Streaming',
    description: 'Commissioners can stream directly from the app.',
  },
];

const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-xl font-bold">Cutta</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-500/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="badge-gold text-sm">
                <span className="live-indicator">LIVE</span>
                March Madness 2025
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="gradient-text">Calcutta Auctions</span>
              <br />
              <span className="text-white">Reimagined</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-dark-200 max-w-2xl mx-auto mb-10"
            >
              The ultimate platform for March Madness pools. Live auctions with streaming,
              automatic payments, secondary market trading, and real-time payouts.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/signup" className="btn-primary text-lg px-8 py-3">
                Create Your Pool
              </Link>
              <Link href="/pools" className="btn-outline text-lg px-8 py-3">
                Join a Pool
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { value: '$2.4M+', label: 'Auction Volume' },
              { value: '15K+', label: 'Active Users' },
              { value: '850+', label: 'Pools Created' },
              { value: '99.9%', label: 'Payout Rate' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="card text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="stat-value text-primary-400">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-dark-200 text-lg max-w-2xl mx-auto">
              Built by pool commissioners, for pool commissioners. Every feature you wish
              you had in your last Calcutta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-hover group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-dark-800 to-dark-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Run Your Pool?
            </h2>
            <p className="text-dark-200 text-lg mb-8">
              Join thousands of commissioners who&apos;ve upgraded their Calcutta experience.
              Set up takes minutes.
            </p>
            <Link href="/signup" className="btn-gold text-lg px-8 py-3">
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-dark-900 border-t border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-dark-900" />
              </div>
              <span className="font-bold">Cutta</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-dark-400">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/support" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>
            <div className="text-sm text-dark-400">
              © 2024 Cutta. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

