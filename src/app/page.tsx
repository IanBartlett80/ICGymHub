'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-end px-6 py-4">
          <div className="flex gap-4">
            <Link href="/sign-in" className="text-gray-700 hover:text-gray-900 transition">
              Sign In
            </Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Logo */}
      <div className="container mx-auto px-6 pt-6 pb-4 flex justify-center">
        <Image 
          src="/imgs/GymHub_Logo.png" 
          alt="GymHub Logo" 
          width={250} 
          height={125}
          className="object-contain"
          priority
        />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Club Management made easy through AI-Powered Business Intelligence!
        </h1>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Streamline class rostering, safety management, incident tracking, and competition scores. All in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Register Your Club
          </Link>
          <Link href="#features" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Learn More
          </Link>
        </div>
      </section>

      {/* Services Preview */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
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
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">{service.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
              <p className="text-gray-600 text-sm">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why GymHub */}
      <section className="bg-white container mx-auto px-6 py-20">
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
              description: 'Flexible pricing designed for clubs of all sizes. Start with what you need and scale as you grow.',
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
        <Link href="/register" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition inline-block">
          Get Started Free
        </Link>
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
                <li><Link href="#" className="hover:text-gray-900 transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-gray-900 transition">About</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition">Contact</Link></li>
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
            <p>&copy; 2025 GymHub. All rights reserved. Built for Australian gymnastics clubs.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
