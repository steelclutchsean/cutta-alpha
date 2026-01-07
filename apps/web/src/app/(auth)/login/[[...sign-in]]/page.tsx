'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-dark-900" />
            </div>
            <span className="text-2xl font-bold text-white">Cutta</span>
          </Link>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-dark-800 border border-dark-600 shadow-xl',
              headerTitle: 'text-white text-2xl',
              headerSubtitle: 'text-dark-300',
              socialButtonsBlockButton: 'bg-dark-700 border-dark-600 hover:bg-dark-600 text-white',
              socialButtonsBlockButtonText: 'text-white font-medium',
              dividerLine: 'bg-dark-600',
              dividerText: 'text-dark-400',
              formFieldLabel: 'text-dark-200',
              formFieldInput: 'bg-dark-700 border-dark-600 text-white placeholder:text-dark-400',
              formButtonPrimary: 'bg-primary-500 hover:bg-primary-600 text-dark-900 font-semibold',
              footerActionLink: 'text-primary-400 hover:text-primary-300',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-primary-400',
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/dashboard"
        />
      </motion.div>
    </div>
  );
}

