'use client'

import { useRef, useState } from 'react'
import axiosInstance from '@/lib/axios'
import DashboardLayout from '@/components/DashboardLayout'

interface Exchange {
  question: string
  answer: string | null
  error?: string
  pending?: boolean
}

const SUGGESTIONS = [
  'Which venue has the most open incidents right now?',
  'Is our compliance completion rate healthy, and what is overdue?',
  'Do we have any equipment out of service or overdue for maintenance?',
  'Are there roster conflicts coming up, and which gymsports are short on coaches?',
  'What are the top 3 risks I should act on today?',
]

export default function AnalyticsInsightsPage() {
  const [question, setQuestion] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(false)
  const [aiDisabled, setAiDisabled] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setQuestion('')
    setLoading(true)
    setExchanges((prev) => [...prev, { question: trimmed, answer: null, pending: true }])

    try {
      const res = await axiosInstance.post('/api/analytics/ask', { question: trimmed })
      const { answer, aiEnabled } = res.data as { answer: string | null; aiEnabled: boolean }
      if (!aiEnabled) setAiDisabled(true)
      setExchanges((prev) =>
        prev.map((e, i) =>
          i === prev.length - 1
            ? {
                ...e,
                pending: false,
                answer: answer ?? null,
                error: answer
                  ? undefined
                  : aiEnabled
                  ? 'The assistant could not answer that right now.'
                  : 'AI insights are not enabled for this workspace.',
              }
            : e
        )
      )
    } catch (err: any) {
      const msg =
        err?.response?.status === 429
          ? 'Too many questions in a short time. Please wait a moment.'
          : 'Something went wrong. Please try again.'
      setExchanges((prev) =>
        prev.map((e, i) => (i === prev.length - 1 ? { ...e, pending: false, error: msg } : e))
      )
    } finally {
      setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }))
    }
  }

  return (
    <DashboardLayout showAnalyticsNav>
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-sm text-gray-500">
            Ask questions about your club&apos;s safety, equipment, compliance and rostering data in plain English.
          </p>
        </div>

        {aiDisabled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            AI insights are not currently enabled for this workspace. The other analytics pages still show live metrics.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg" aria-hidden>
              ✨
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">Ask Your Data</h2>
              <p className="text-[11px] text-white/70">Grounded on your live, club-only aggregates — no personal data is sent.</p>
            </div>
          </div>

          <div ref={listRef} className="max-h-[46vh] space-y-4 overflow-y-auto p-5">
            {exchanges.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Ask a question below, or try one of the suggestions.
              </div>
            ) : (
              exchanges.map((e, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white">
                      {e.question}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-2.5 text-sm text-gray-700 ring-1 ring-gray-100">
                      {e.pending ? (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                        </span>
                      ) : e.error ? (
                        <span className="text-amber-600">{e.error}</span>
                      ) : (
                        <div className="space-y-1.5 leading-relaxed">
                          {(e.answer || '')
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line, j) => (
                              <p key={j}>{line.replace(/^[-•*]\s*/, '• ')}</p>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(question)
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about incidents, equipment, compliance or rosters…"
                maxLength={500}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </form>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          AI-generated answers are grounded on your current aggregate data and may simplify nuance. Verify against the
          detailed analytics pages before acting on material decisions.
        </p>
      </div>
    </DashboardLayout>
  )
}
