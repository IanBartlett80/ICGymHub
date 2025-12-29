'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Navigation */}
      <nav className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="text-2xl font-bold text-primary">IC GymHub</div>
          <div className="flex gap-4">
            <Link href="/sign-in" className="text-neutral-300 hover:text-white transition">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          Complete Management Platform for Australian Gymnastics Clubs
        </h1>
        <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
          Streamline class rostering, safety management, incident tracking, and competition scores. All in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Register Your Club
          </Link>
          <Link href="#features" className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Learn More
          </Link>
        </div>
      </section>

      {/* Services Preview */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
          Our Core Solutions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              title: 'Class Rostering',
              description: 'Manage classes, instructors, schedules, and student enrollment',
              icon: '📅',
            },
            {
              title: 'Injury / Incident Management',
              description: 'Track incidents, create reports, and ensure compliance',
              icon: '🏥',
            },
            {
              title: 'Equipment Safety',
              description: 'Schedule inspections, manage maintenance logs, ensure safety standards',
              icon: '🔧',
            },
            {
              title: 'ICScore Competition',
              description: 'Manage competitions, scores, and athlete tracking',
              icon: '🏆',
            },
            {
              title: 'Maintenance',
              description: 'Track facility and equipment maintenance tasks',
              icon: '🛠️',
            },
          ].map((service, idx) => (
            <div
              key={idx}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 hover:border-primary transition"
            >
              <div className="text-4xl mb-3">{service.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{service.title}</h3>
              <p className="text-neutral-300 text-sm">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why IC GymHub */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
          Why Choose IC GymHub?
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
              description: 'Flexible pricing designed for clubs of all sizes. Start with what you need and scale as you grow.',
            },
          ].map((benefit, idx) => (
            <div key={idx} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
              <p className="text-neutral-300">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to Simplify Club Management?
        </h2>
        <p className="text-primary-light mb-8 text-lg max-w-2xl mx-auto">
          Join Australian gymnastics clubs already using IC GymHub to streamline their operations.
        </p>
        <Link href="/register" className="bg-white text-primary hover:bg-neutral-100 px-8 py-4 rounded-lg text-lg font-semibold transition inline-block">
          Get Started Free
        </Link>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
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
              a: 'Pricing details coming soon. We are designing flexible plans for clubs of all sizes. Early adopters will receive special rates.',
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
              a: 'We offer email support and a comprehensive help center. Premium plans include priority support.',
            },
            {
              q: 'Can I import existing data?',
              a: 'Yes. Contact our support team for assistance with data migration from your existing systems.',
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-3">{item.q}</h3>
              <p className="text-neutral-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-700 bg-neutral-900 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">IC GymHub</h3>
              <p className="text-neutral-400">Complete management platform for Australian gymnastics clubs.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition">Terms</Link></li>
                <li><Link href="#" className="hover:text-white transition">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-700 pt-8 text-center text-neutral-400">
            <p>&copy; 2025 IC GymHub. All rights reserved. Built for Australian gymnastics clubs.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
