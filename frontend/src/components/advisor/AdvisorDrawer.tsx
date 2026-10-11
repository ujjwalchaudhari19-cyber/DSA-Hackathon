import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { getChatSessions, getChatSessionMessages, deleteChatSession, type ChatSessionItem } from "@/services/api"
import { MessageSquare, X, Send, Mic, MicOff, Bot, RefreshCw, History, Plus, AlertCircle, ShieldAlert } from "lucide-react"

interface Message {
  role: "user" | "advisor"
  content: string
  error?: boolean
}

export const AdvisorDrawer: React.FC = () => {
  const { t } = useTranslation()
  const { profile, idea, lang } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [showSessionsList, setShowSessionsList] = useState(false)
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "advisor",
      content:
        "Namaste! I am your GramUdyam AI Advisor. I know your location in Nashik and your 4-cow Dairy Unit plan. How can I help you regarding Mudra loans or cattle feeding costs?",
    },
  ])

  // Suggested quick prompts
  const suggestedChips = [
    "Why was my feasibility score 71?",
    "Explain Mudra Kishore subsidy terms",
    "What if I start with 2 cows instead of 4?",
    "How to register for Udyam certificate?",
  ]

  // Load chat sessions when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadSessions()
    }
  }, [isOpen])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const data = await getChatSessions()
      setSessions(data || [])
    } catch {
      // Fallback to local default sessions
      setSessions([
        {
          id: 'session_demo_01',
          title: 'Mudra Kishore loan query for dairy',
          updated_at: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const handleSelectSession = async (session: ChatSessionItem) => {
    setActiveSessionId(session.id)
    setShowSessionsList(false)
    try {
      const msgs = await getChatSessionMessages(session.id)
      if (msgs && msgs.length > 0) {
        setMessages(
          msgs.map((m) => ({
            role: m.role as "user" | "advisor",
            content: m.content,
          }))
        )
      }
    } catch {
      // Keep existing conversation on network error
    }
  }

  const handleNewChat = () => {
    setActiveSessionId(null)
    setShowSessionsList(false)
    setMessages([
      {
        role: "advisor",
        content: `Namaste! Starting a new advisory session for ${idea?.business_type || 'your rural enterprise'} in ${profile.district || 'Maharashtra'}. What would you like guidance on?`,
      },
    ])
  }

  const handleSend = (textToSend?: string, isRetry = false) => {
    const text = textToSend || input
    if (!text.trim()) return

    const newMsgs: Message[] = isRetry
      ? messages.filter((m) => !m.error)
      : [...messages, { role: "user", content: text }]

    if (isRetry) {
      newMsgs.push({ role: "user", content: text })
    }

    setMessages(newMsgs)
    if (!isRetry) setInput("")

    // Simulating context-aware SSE streaming with smart fallback
    setTimeout(() => {
      // Simulate occasional network error test retry if user typed "fail"
      if (text.toLowerCase() === "fail-test") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text, error: true },
        ])
        return
      }

      let reply = "I can guide you on that."
      if (text.includes("score")) {
        reply =
          "Your score is 71/100 because of strong local milk demand (85) and viable DSCR repayment (1.38). However, starting with 17.5% personal savings puts you in the conditional loan category until the bank sanction is complete."
      } else if (text.includes("Mudra")) {
        reply =
          "Mudra Kishore offers up to ₹5 Lakhs for small business activities including dairy. It has zero collateral requirement and is backed by the CGTMSE credit guarantee."
      } else if (text.includes("2 cows")) {
        reply =
          "Starting with 2 cows cuts total investment to approximately ₹1,45,000. Your ₹50,000 savings then covers 34.5% of the capital, reducing the loan burden and making your EMI around ₹3,800/month."
      } else {
        reply =
          "Udyam registration is free on udyamregistration.gov.in using your Aadhaar number. It establishes your formal MSME status and unlocks interest concessions at your public sector bank branch."
      }

      setMessages((prev) => [...prev, { role: "advisor", content: reply }])
    }, 600)
  }

  // Speech Recognition (unchanged)
  const toggleSpeech = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRec) {
      alert("Speech recognition not supported in this browser.")
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const rec = new SpeechRec()
    rec.lang = lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN"
    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.onresult = (e: any) => {
      const trans = e.results[0][0].transcript
      setInput(trans)
    }
    rec.start()
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-lg shadow-lg hover:bg-primary-700 transition-all cursor-pointer font-semibold text-sm border border-primary-800"
        >
          <Bot className="w-5 h-5" />
          <span>{t("landing.advisor_btn") || "Ask AI Advisor"}</span>
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-secondary/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground leading-tight">
                  {t("advisor.title", "AI Rural Advisor")}
                </h3>
                <span className="text-[11px] text-muted-foreground">Context: {profile.district || 'Nashik'} • {idea?.business_type || 'Dairy'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSessionsList(!showSessionsList)}
                className={`p-1.5 rounded-md hover:bg-secondary cursor-pointer transition-colors ${
                  showSessionsList ? "text-primary bg-secondary" : "text-muted-foreground"
                }`}
                title="Previous chats"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sessions List Panel (Previous Chats) */}
          {showSessionsList ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-foreground">Previous Chats</span>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Chat</span>
                </button>
              </div>

              {isLoadingSessions ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Loading past sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-xs text-muted-foreground py-8 text-center">No past chats found.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`p-2.5 rounded-md border text-left text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        activeSessionId === s.id
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <span className="truncate flex-1">{s.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex gap-2.5 max-w-[88%]">
                      {m.role === "advisor" && (
                        <div className="w-6 h-6 rounded bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-lg text-xs leading-relaxed ${
                          m.error
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : m.role === "user"
                            ? "bg-primary text-white rounded-br-xs"
                            : "bg-secondary/50 text-foreground border border-border rounded-bl-xs"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>

                    {/* Retry on failed message */}
                    {m.error && (
                      <button
                        onClick={() => handleSend(m.content, true)}
                        className="text-[11px] text-destructive hover:underline flex items-center gap-1 mt-1 cursor-pointer font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Failed to send. Click to retry</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2 border-t border-border bg-secondary/30 overflow-x-auto flex gap-1.5 flex-nowrap">
                {suggestedChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded bg-card border border-border text-foreground hover:bg-muted cursor-pointer flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Privacy Hint & Input Area */}
          <div className="p-3 border-t border-border bg-card space-y-2">
            {/* Phase 3 Privacy Requirement 4: Short hint */}
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-3 h-3 shrink-0" />
              <span>Don't type Aadhaar, PAN or bank numbers.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeech}
                className={`p-2 rounded-md border cursor-pointer transition-colors ${
                  isListening
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 animate-pulse"
                    : "bg-secondary/50 text-foreground border border-border hover:bg-secondary"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={t("advisor.placeholder", "Ask about schemes, subsidies, loans...")}
                className="flex-1 h-10 px-3 text-xs rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <Button
                size="sm"
                onClick={() => handleSend()}
                className="h-10 px-3 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
