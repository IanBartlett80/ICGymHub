'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

export default function Home() {
  const portalScreenshots = [
    { src: '/imgs/dashboard-1.png', alt: 'GymHub admin dashboard with daily briefing and health score' },
    { src: '/imgs/dashboard-2.png', alt: 'Analytics overview command centre' },
    { src: '/imgs/dashboard-3.png', alt: 'Injuries & incidents analytics' },
    { src: '/imgs/dashboard-4.png', alt: 'Equipment & safety analytics' },
    { src: '/imgs/dashboard-5.png', alt: 'Compliance analytics' },
    { src: '/imgs/dashboard-6.png', alt: 'Rosters & coaching analytics' },
    { src: '/imgs/dashboard-7.png', alt: 'Equipment zone overview with venue QR codes' },
    { src: '/imgs/dashboard-8.png', alt: 'Complete equipment inventory with condition and status tracking' },
    { src: '/imgs/dashboard-9.png', alt: 'Injury report form with public QR code access' },
    { src: '/imgs/dashboard-10.png', alt: 'Injury report automation workflow builder' },
    { src: '/imgs/dashboard-11.png', alt: 'Equipment repair quote requests Kanban board' },
    { src: '/imgs/dashboard-12.png', alt: 'Compliance Manager with deadlines, ownership and reminders' },
    { src: '/imgs/dashboard-13.png', alt: 'GymHub admin portal interface' },
  ]

  const [activeShot, setActiveShot] = useState(0)

  const goToShot = useCallback((index: number) => {
    setActiveShot((index + portalScreenshots.length) % portalScreenshots.length)
  }, [portalScreenshots.length])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveShot((prev) => (prev + 1) % portalScreenshots.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [portalScreenshots.length])

  const coreSolutions = [
    {
      title: 'Roster Management',
      description: 'Build weekly class rosters, assign coaches, and prevent scheduling conflicts.',
      icon: '📅',
    },
    {
      title: 'Injury Management',
      description: 'Capture incidents quickly with structured forms, QR workflows, and analytics.',
      icon: '🏥',
    },
    {
      title: 'Equipment Management',
      description: 'Track equipment lifecycle, maintenance schedules, safety issues, and repair workflows.',
      icon: '🔧',
    },
    {
      title: 'Compliance Management',
      description: 'Manage recurring compliance tasks with reminders, evidence files, and audit history.',
      icon: '✅',
    },
    {
      title: 'Competition Management',
      description: 'Coordinate events, scoring, and athlete performance data in one place.',
      icon: '🏆',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/imgs/GymHub_Logo.png"
              alt="GymHub Logo"
              width={132}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-16 pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              Live Platform for Australian Gymnastics Clubs
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
              Club Management Made Easy with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Business Intelligence
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
              GymHub unifies rostering, injury workflows, equipment operations, compliance, and competition management into one secure platform.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30">
                Register Your Club
              </Link>
              <Link href="#pricing" className="rounded-xl border-2 border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 transition hover:border-blue-600 hover:text-blue-600">
                View Pricing
              </Link>
              <Link href="mailto:gymhub@icb.solutions" className="rounded-xl px-7 py-3.5 text-base font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
                Contact Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Carousel */}
      <section id="showcase" className="container mx-auto px-6 pb-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">Product Tour</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            See GymHub in Action
          </h2>
          <p className="mt-3 text-lg text-gray-600">
            Take a tour of the GymHub admin portal — from the daily briefing dashboard to AI-powered analytics across injuries, equipment, compliance, and coaching.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 ring-1 ring-gray-900/5">
            <div className="relative aspect-[1036/768]">
              {portalScreenshots.map((shot, idx) => (
                <div
                  key={shot.src}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === activeShot ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  aria-hidden={idx !== activeShot}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-contain"
                    priority={idx === 0}
                  />
                </div>
              ))}
            </div>

            {/* Previous / Next arrows */}
            <button
              type="button"
              onClick={() => goToShot(activeShot - 1)}
              aria-label="Previous screenshot"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white hover:text-blue-600 transition"
            >
              <span className="text-xl leading-none">‹</span>
            </button>
            <button
              type="button"
              onClick={() => goToShot(activeShot + 1)}
              aria-label="Next screenshot"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white hover:text-blue-600 transition"
            >
              <span className="text-xl leading-none">›</span>
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {portalScreenshots.map((shot, idx) => (
              <button
                key={shot.src}
                type="button"
                onClick={() => goToShot(idx)}
                aria-label={`Go to screenshot ${idx + 1}`}
                aria-current={idx === activeShot}
                className={`h-2.5 rounded-full transition-all ${
                  idx === activeShot ? 'w-6 bg-blue-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Core Solutions */}
      <section id="features" className="container mx-auto px-6 pb-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">Everything in One Place</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Our Core Solutions
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {coreSolutions.map((service, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl transition group-hover:bg-blue-100">
                {service.icon}
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900">{service.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Updates */}
      <section className="container mx-auto px-6 pb-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">What&apos;s New</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Latest Service Updates</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            'Compliance Manager now supports recurring schedules, completion history, and evidence attachments.',
            'Equipment workflows now include safety issue triage, quote requests, and maintenance scheduling.',
            'Roster tools include improved conflict detection for coaches and zones across venues.',
            'Injury analytics now includes trend insights and better incident follow-up visibility.',
            'Multi-venue support now streamlines operations across clubs, venues, and zones.',
            'Competition workflows are integrated for event operations and athlete score tracking.',
          ].map((update, idx) => (
            <div key={idx} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">✓</span>
              <p className="text-sm leading-relaxed text-gray-700">{update}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-8 text-white shadow-2xl shadow-blue-600/20 md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Simple Pricing for Growing Clubs</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-blue-100">
              One platform. All five core modules. Transparent pricing.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Free Trial</p>
                <p className="mt-1 text-3xl font-bold">30 Days</p>
                <p className="mt-2 text-sm text-blue-100">Full access to all core solutions.</p>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/20 p-6 shadow-lg backdrop-blur-sm ring-1 ring-white/20">
                <p className="text-sm text-blue-100">Ongoing Subscription</p>
                <p className="mt-1 text-3xl font-bold">$25 AUD/week <span className="text-base font-medium text-blue-100">+ GST</span></p>
                <p className="mt-2 text-sm text-blue-100">Less than a coffee a day.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Support</p>
                <p className="mt-1 text-xl font-bold">gymhub@icb.solutions</p>
                <p className="mt-2 text-sm text-blue-100">Contact us for onboarding and migration support.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why GymHub */}
      <section className="container mx-auto px-6 pb-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">The GymHub Advantage</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Why Choose GymHub?
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              icon: '🇦🇺',
              title: 'Built for Australian Clubs',
              description: 'Designed specifically for the needs of Australian gymnastics clubs, with local compliance and standards in mind.',
            },
            {
              icon: '🔒',
              title: 'Secure & Compliant',
              description: 'Enterprise-grade security with strict data separation ensures your club data is always protected.',
            },
            {
              icon: '⚡',
              title: 'Easy to Use',
              description: 'Intuitive interface that requires minimal training. Get your team up and running in minutes.',
            },
            {
              icon: '💰',
              title: 'Affordable',
              description: 'Start with a 30-day free trial, then continue on a flat $25 AUD/week (+GST) subscription.',
            },
          ].map((benefit, idx) => (
            <div key={idx} className="flex gap-5 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">{benefit.icon}</div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{benefit.title}</h3>
                <p className="leading-relaxed text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-blue-900 px-6 py-16 text-center shadow-2xl">
          <div className="pointer-events-none absolute inset-0 -z-0">
            <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to Simplify Club Management?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
              Join Australian gymnastics clubs already using GymHub to streamline their operations.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-700 shadow-lg transition hover:bg-gray-100">
                Get Started Free
              </Link>
              <Link href="mailto:gymhub@icb.solutions" className="inline-block rounded-xl border-2 border-white/40 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white hover:text-blue-700">
                Contact gymhub@icb.solutions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">Got Questions?</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              q: 'How do I register my club?',
              a: 'Simply click "Register Your Club" and fill in your club details, including your ABN and admin account information. We validate your email and domain to ensure legitimacy.',
            },
            {
              q: 'What is the cost?',
              a: 'Every new club gets a 30-day free trial. Ongoing pricing is $25 AUD/week + GST (equivalent to $100 AUD/month + GST invoicing).',
            },
            {
              q: 'Is my club data secure?',
              a: 'Yes. We use enterprise-grade security with strict data separation. Each club has its own isolated data with no cross-access.',
            },
            {
              q: 'Can I invite my staff?',
              a: 'Absolutely. After registering, you can invite instructors and staff with different permission levels.',
            },
            {
              q: 'What if I need help?',
              a: 'Email us at gymhub@icb.solutions for support, onboarding, or data migration help.',
            },
            {
              q: 'Can I import existing data?',
              a: 'Yes. Contact gymhub@icb.solutions and we can assist with migration from your existing systems.',
            },
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{item.q}</h3>
              <p className="leading-relaxed text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-blue-600 mb-4">GymHub</h3>
              <p className="text-gray-600">Complete management platform for Australian gymnastics clubs.</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#features" className="hover:text-gray-900 transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-gray-900 transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-gray-900 transition">About</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Blog</Link></li>
                <li><Link href="mailto:gymhub@icb.solutions" className="hover:text-gray-900 transition">gymhub@icb.solutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-gray-900 transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Terms</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-gray-600">
            <p className="mb-2">Questions? <Link href="mailto:gymhub@icb.solutions" className="text-blue-600 hover:text-blue-700">gymhub@icb.solutions</Link></p>
            <p>
              &copy; 2025 GymHub. All rights reserved. Built for Australian gymnastics clubs. GymHub is a product of{' '}
              <a
                href="https://icb.solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                ICB Solutions Pty Ltd
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
