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
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/imgs/GymHub_Logo.png"
              alt="GymHub Logo"
              width={170}
              height={85}
              className="object-contain"
              priority
            />
          </Link>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              Sign In
            </Link>
              <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition">
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-8 pb-10">
        <div className="text-center">
          <div className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-4 py-2 text-sm font-semibold mb-4">
            Live Platform for Australian Gymnastics Clubs
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Club Management Made Easy with AI-Powered Business Intelligence
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-6 max-w-xl mx-auto">
            GymHub unifies rostering, injury workflows, equipment operations, compliance, and competition management into one secure platform.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition">
              Register Your Club
            </Link>
            <Link href="#pricing" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg text-base font-semibold transition">
              View Pricing
            </Link>
            <Link href="mailto:gymhub@icb.solutions" className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900 px-6 py-3 rounded-lg text-base font-semibold transition">
              Contact Team
            </Link>
          </div>
        </div>
      </section>

      {/* Product Showcase Carousel */}
      <section id="showcase" className="container mx-auto px-6 pb-12">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            See GymHub in Action
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Take a tour of the GymHub admin portal — from the daily briefing dashboard to AI-powered analytics across injuries, equipment, compliance, and coaching.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
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
      <section id="features" className="container mx-auto px-6 pb-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Our Core Solutions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {coreSolutions.map((service, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition">
                <div className="text-2xl mb-2">{service.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{service.title}</h3>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="container mx-auto px-6 pb-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Latest Service Updates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Compliance Manager now supports recurring schedules, completion history, and evidence attachments.',
              'Equipment workflows now include safety issue triage, quote requests, and maintenance scheduling.',
              'Roster tools include improved conflict detection for coaches and zones across venues.',
              'Injury analytics now includes trend insights and better incident follow-up visibility.',
              'Multi-venue support now streamlines operations across clubs, venues, and zones.',
              'Competition workflows are integrated for event operations and athlete score tracking.',
            ].map((update, idx) => (
              <div key={idx} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-sm text-gray-700">{update}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 pb-14">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-10 text-white">
          <h2 className="text-3xl font-bold text-center mb-2">Simple Pricing for Growing Clubs</h2>
          <p className="text-blue-100 text-center mb-8">
            One platform. All five core modules. Transparent pricing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 border border-white/20 rounded-xl p-5">
              <p className="text-blue-100 text-sm mb-1">Free Trial</p>
              <p className="text-3xl font-bold">30 Days</p>
              <p className="text-blue-100 text-sm mt-2">Full access to all core solutions.</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-5">
              <p className="text-blue-100 text-sm mb-1">Ongoing Subscription</p>
              <p className="text-3xl font-bold">$25 AUD/week + GST</p>
                <p className="text-blue-100 text-sm mt-2">Less then a coffee a day</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-5">
              <p className="text-blue-100 text-sm mb-1">Support</p>
              <p className="text-xl font-bold">gymhub@icb.solutions</p>
              <p className="text-blue-100 text-sm mt-2">Contact us for onboarding and migration support.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why GymHub */}
      <section className="bg-white container mx-auto px-6 py-14 rounded-2xl border border-gray-100">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
          Why Choose GymHub?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: 'Built for Australian Clubs',
              description: 'Designed specifically for the needs of Australian gymnastics clubs, with local compliance and standards in mind.',
            },
            {
              title: 'Secure & Compliant',
              description: 'Enterprise-grade security with strict data separation ensures your club data is always protected.',
            },
            {
              title: 'Easy to Use',
              description: 'Intuitive interface that requires minimal training. Get your team up and running in minutes.',
            },
            {
              title: 'Affordable',
              description: 'Start with a 30-day free trial, then continue on a flat $25 AUD/week (+GST) subscription.',
            },
          ].map((benefit, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-8 hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to Simplify Club Management?
        </h2>
        <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
          Join Australian gymnastics clubs already using GymHub to streamline their operations.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/register" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition inline-block">
            Get Started Free
          </Link>
          <Link href="mailto:gymhub@icb.solutions" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition inline-block">
            Contact gymhub@icb.solutions
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-blue-600 mb-3">{item.q}</h3>
              <p className="text-gray-600">{item.a}</p>
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
