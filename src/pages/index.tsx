import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { FiMessageCircle, FiBook, FiZap, FiArrowRight, FiGithub } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      router.push('/chat');
    }
  }, [session, router]);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FiMessageCircle className="text-white" size={24} />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoryFlow
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold transition">
              Sign In
            </Link>
            <Link href="/register" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI That Remembers
              </span>
              <br />
              <span className="text-gray-900">Your Context, Always</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              An intelligent agent powered by persistent memory. It learns your preferences, understands your goals, and maintains context across conversations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg flex items-center justify-center gap-2">
                Start Free <FiArrowRight />
              </Link>
              <Link href="/login" className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold text-lg">
                Sign In
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 border border-gray-200"
          >
            <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <FiMessageCircle size={64} className="text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  Experience intelligent conversations with persistent memory
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <FiBook className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                Persistent Memory
              </h3>
              <p className="text-gray-700">
                Every conversation is remembered. Your preferences, goals, and context are stored securely.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <FiZap className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                Semantic Search
              </h3>
              <p className="text-gray-700">
                Advanced vector indexing finds relevant memories and context instantly using semantic similarity.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-8 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border border-pink-200"
            >
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <FiMessageCircle className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                Contextual Awareness
              </h3>
              <p className="text-gray-700">
                The AI understands your learning style and preferences, adapting responses to your unique context.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                number: 1,
                title: 'Chat',
                description: 'Start a conversation with MemoryFlow about anything.',
              },
              {
                number: 2,
                title: 'Remember',
                description: 'The AI extracts and stores memories from your messages.',
              },
              {
                number: 3,
                title: 'Retrieve',
                description: 'When you return, memories are retrieved automatically.',
              },
              {
                number: 4,
                title: 'Personalize',
                description: 'Responses are tailored to your stored context and goals.',
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6 text-white">
              Ready to Experience Intelligent Memory?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join now and start a conversation with an AI that truly understands you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold text-lg">
                Create Account
              </Link>
              <Link href="/login" className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition font-semibold text-lg">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <FiMessageCircle className="text-white" size={16} />
                </div>
                <span className="font-bold text-white">MemoryFlow</span>
              </div>
              <p className="text-sm">
                An AI agent that remembers your context, always.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              Copyright 2026 MemoryFlow. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FiGithub size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}