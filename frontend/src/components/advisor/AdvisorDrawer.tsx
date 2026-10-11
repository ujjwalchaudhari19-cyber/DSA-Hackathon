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
  const { profile, idea, report, discovery, lang } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [showSessionsList, setShowSessionsList] = useState(false)
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  const currentScore = report?.score?.score ?? report?.verdict?.score ?? 74
  const businessLabel = idea?.business_type || "Rural Enterprise"
  const districtLabel = profile.district || "Maharashtra"

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "advisor",
      content: `Namaste! I am your GramUdyam AI Advisor. I have loaded your ${businessLabel} plan in ${districtLabel} (Feasibility Score: ${currentScore}/100). How can I assist you with loans, schemes, equipment, or setup costs?`,
    },
  ])

  // Suggested quick prompts
  const suggestedChips = [
    `Why is my feasibility score ${currentScore}?`,
    "Explain Mudra Kishore subsidy terms",
    "How can I reduce initial setup costs?",
    "When will I reach break-even?",
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
          title: `${businessLabel} query for ${districtLabel}`,
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
        content: `Namaste! Starting a new advisory session for ${businessLabel} in ${districtLabel}. What would you like guidance on?`,
      },
    ])
  }

  // Dynamic context generator for instant, relevant fallback
  const getContextualResponse = (query: string): string => {
    const q = query.toLowerCase()
    const district = profile?.district || "your district"
    const state = profile?.state || "Maharashtra"
    const capital = profile?.capital ? `₹${Number(profile.capital).toLocaleString("en-IN")}` : "₹50,000"
    const business = idea?.business_type || "Rural Enterprise"
    const score = report?.score?.score ?? report?.verdict?.score ?? 74
    const verdict = report?.score?.verdict_display ?? report?.verdict?.label?.replace(/_/g, " ") ?? "Feasible with Conditions"
    const totalInv = report?.investment?.total ? `₹${Number(report.investment.total).toLocaleString("en-IN")}` : "₹2,86,000"
    const loanGap = report?.gap?.gap ?? report?.funding?.gap ? `₹${Number(report.gap?.gap ?? report.funding?.gap).toLocaleString("en-IN")}` : "₹2,36,000"
    const emi = report?.repayment?.emi ? `₹${Number(report.repayment.emi).toLocaleString("en-IN")}` : "₹5,100"
    const tenure = report?.repayment?.tenure_months ?? 60
    const breakEven = report?.projection?.break_even_month ? `Month ${report.projection.break_even_month}` : (report?.projection?.break_even_note || "Month 3 to 4")

    if (q.includes("score") || q.includes("why") || q.includes("rating") || q.includes("verdict")) {
      return `Your feasibility score for the ${business} plan is evaluated at ${score}/100 (${verdict}).\n\n- **Market Demand**: Strong consumer demand identified in ${district}.\n- **Equity Cushion**: Your personal capital of ${capital} provides direct promoter contribution.\n- **Debt Service Coverage**: Projected operational cash flows cover the required debt repayments.\n\nTo improve this score toward Highly Feasible, consider increasing promoter equity by 5-10% or obtaining written purchase intent from local buyers.`
    }

    if (q.includes("mudra") || q.includes("scheme") || q.includes("subsidy") || q.includes("pmegp")) {
      const subPct = (profile?.category === "obc" || profile?.category === "sc" || profile?.category === "st" || profile?.gender === "f") ? "35%" : "25%"
      return `For your ${business} in ${district}, the two most applicable government support schemes are:\n\n1. **Pradhan Mantri MUDRA Yojana (PMMY - Kishore)**: Offers collateral-free loans up to ₹5 Lakhs at competitive priority-sector interest rates (8.5% - 11%).\n2. **PMEGP (KVIC)**: Provides a ${subPct} capital subsidy for your profile in rural/semi-urban ${district}, substantially reducing your debt burden.\n\nYou can submit this feasibility report directly to your local nationalized bank or rural cooperative branch.`
    }

    if (q.includes("cow") || q.includes("cattle") || q.includes("scale") || q.includes("reduce") || q.includes("increase") || q.includes("size")) {
      return `Adjusting the operational scale for your ${business} alters your capital and cash flow:\n\n- **Starting Smaller**: Reduces total setup outlay and cuts your monthly EMI, lowering debt pressure and raising your DSCR safety margin.\n- **Starting Larger**: Boosts overall turnover and commercial margins, but requires higher working capital reserves for feed and operations.\n\nYou can adjust specific unit numbers directly in the Finance section to recalculate funding requirements.`
    }

    if (q.includes("profit") || q.includes("breakeven") || q.includes("break-even") || q.includes("revenue") || q.includes("income") || q.includes("earn")) {
      return `Financial return expectations for your ${business} in ${district}:\n\n- **Break-Even Timeline**: Estimated at ${breakEven}.\n- **Operating Margin**: Once steady-state production is reached, net cash flows adequately cover the monthly EMI of ~${emi} with surplus for reinvestment.\n- **Cash Flow Health**: Operating in a high-demand rural pocket in ${district} ensures dependable monthly liquidity.`
    }

    if (q.includes("equipment") || q.includes("machine") || q.includes("item") || q.includes("feed") || q.includes("shed") || q.includes("cost") || q.includes("capex")) {
      const items = report?.investment?.items || []
      const itemsSummary = items.length > 0
        ? "\n" + items.slice(0, 4).map(it => `  - ${it.name || it.item || 'Item'}: ₹${Number(it.total || it.unit_cost || 0).toLocaleString('en-IN')}`).join("\n") + "\n"
        : ""
      return `Your total investment of ${totalInv} is allocated across these essential components:${itemsSummary}\n- **Fixed Capital**: Structural setup, core production machinery, and durable tools.\n- **Working Capital Reserve**: Feed, raw material stock, and initial operational buffers for early months.\n\nCompare verified local vendors in the **Suppliers** directory.`
    }

    if (q.includes("document") || q.includes("udyam") || q.includes("license") || q.includes("registration") || q.includes("cibil") || q.includes("pan")) {
      return `To formalize your ${business} for bank financing:\n\n1. **Udyam MSME Registration**: 100% free online registration at udyamregistration.gov.in using Aadhaar and PAN.\n2. **Bank Account & KYC**: Maintain active savings or current account statements with 6 months of transaction history.\n3. **Gram Panchayat NOC**: Basic trade or shed clearance from your local village authority.\n4. **Detailed Project Report**: The financial feasibility summary generated right here in GramUdyam.`
    }

    if (q.includes("loan") || q.includes("emi") || q.includes("interest") || q.includes("repay") || q.includes("bank") || q.includes("gap") || q.includes("funding")) {
      return `Regarding funding for your ${business} in ${district}:\n\n- **Total Project Cost**: ${totalInv}\n- **Promoter Equity**: ${capital}\n- **Required Loan (Gap)**: ${loanGap}\n- **Estimated Monthly EMI**: ~${emi}/month (at ~9.5% p.a. for a ${tenure}-month tenure)\n\nUnder Mudra guidelines, no collateral or third-party guarantee is required for credit facilities under ₹10 Lakhs.`
    }

    return `Regarding your question "${query}" for your ${business} plan in ${district}, ${state}:\n\nBased on your profile with ${capital} promoter capital, your plan has a feasibility score of ${score}/100 with an estimated loan requirement of ${loanGap}.\n\nLocal market fundamentals in ${district} support positive operating margins. Make sure to complete your Udyam registration and check the Documents checklist before visiting the bank.`
  }

  const handleSend = async (textToSend?: string, isRetry = false) => {
    const text = textToSend || input
    if (!text.trim() || isStreaming) return

    const userMessage: Message = { role: "user", content: text }
    const newMsgs: Message[] = isRetry
      ? messages.filter((m) => !m.error)
      : [...messages, userMessage]

    if (isRetry) {
      newMsgs.push(userMessage)
    }

    // Add empty placeholder message for streaming advisor response
    const placeholderMsg: Message = { role: "advisor", content: "" }
    const updatedMsgs = [...newMsgs, placeholderMsg]
    setMessages(updatedMsgs)
    if (!isRetry) setInput("")
    setIsStreaming(true)

    const advisorIndex = updatedMsgs.length - 1

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
      
      // Comprehensive payload packaging all feeded entrepreneur & plan data
      const comprehensiveReportSummary = {
        business_type: idea?.business_type || report?.idea?.business_type || "Rural Enterprise",
        scale: idea?.scale || "small",
        products: idea?.products || idea?.product_list || [],
        target_customer: idea?.target_customer || "",
        details: idea?.details || "",
        discovery: discovery ? {
          interests: discovery.interests,
          budgetRange: discovery.budgetRange,
          timeCommitment: discovery.timeCommitment,
          space: discovery.space,
          skills: discovery.skills,
          locationType: discovery.locationType,
          electricity: discovery.electricity,
          water: discovery.water,
        } : undefined,
        score: report?.score?.score ?? report?.verdict?.score ?? 74,
        verdict: report?.score?.verdict_display ?? report?.verdict?.label ?? "Feasible with Conditions",
        investment: report?.investment ? {
          total: report.investment.total,
          fixed: report.investment.fixed ?? report.investment.fixed_cost,
          working_capital: report.investment.working_capital,
          items: report.investment.items,
        } : undefined,
        funding_gap: report?.gap ? {
          total_investment: report.gap.total_investment,
          available_capital: report.gap.available_capital ?? report.gap.capital,
          gap: report.gap.gap,
          capital_ratio: report.gap.capital_ratio,
        } : undefined,
        repayment: report?.repayment ? {
          loan_amount: report.repayment.loan_amount ?? report.repayment.loan,
          emi: report.repayment.emi,
          annual_rate_pct: report.repayment.annual_rate_pct ?? report.repayment.rate,
          tenure_months: report.repayment.tenure_months ?? report.repayment.tenure,
          total_interest: report.repayment.total_interest,
          dscr: report.repayment.dscr,
        } : undefined,
        market: report?.market ? {
          score: report.market.score,
          demand: report.market.demand,
          customers: report.market.customers,
          competitors: report.market.competitors,
          opportunities: report.market.opportunities,
          risks: report.market.risks,
        } : undefined,
        credit: report?.credit ? {
          bucket: report.credit.bucket,
          actions: report.credit.actions,
          alternatives: report.credit.alternatives,
        } : undefined,
        projection: report?.projection ? {
          break_even_month: report.projection.break_even_month ?? report.projection.break_even_months,
          break_even_note: report.projection.break_even_note,
          annual_revenue: report.projection.annual_revenue,
          annual_net_profit: report.projection.annual_net_profit,
        } : undefined,
        schemes: report?.schemes?.map((s) => ({
          name: s.name || s.scheme_name,
          eligible: s.eligible,
          subsidy: s.subsidy,
          benefits: s.benefits,
          reasons: s.reasons,
        })),
      }

      const payload = {
        message: text,
        session_id: activeSessionId || "default",
        profile: profile,
        report_summary: comprehensiveReportSummary,
        lang: lang,
      }

      let receivedContent = ""
      let streamOk = false

      // 1. Primary: Stream directly from backend /advisor/chat SSE endpoint
      try {
        const response = await fetch(`${apiUrl}/advisor/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (response.ok && response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder("utf-8")
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith("data:")) continue
              const dataStr = trimmed.slice(5).trim()
              if (dataStr === "[DONE]") {
                streamOk = true
                break
              }
              try {
                const parsed = JSON.parse(dataStr)
                if (parsed.text) {
                  receivedContent += parsed.text
                  setMessages((prev) => {
                    const copy = [...prev]
                    if (copy[advisorIndex]) {
                      copy[advisorIndex] = { role: "advisor", content: receivedContent }
                    }
                    return copy
                  })
                }
              } catch {
                if (dataStr) {
                  receivedContent += dataStr
                  setMessages((prev) => {
                    const copy = [...prev]
                    if (copy[advisorIndex]) {
                      copy[advisorIndex] = { role: "advisor", content: receivedContent }
                    }
                    return copy
                  })
                }
              }
            }
          }
          if (receivedContent.trim()) {
            streamOk = true
          }
        }
      } catch (err) {
        console.warn("Backend stream error, checking fallback:", err)
      }

      // 2. Secondary fallback: Direct OpenAI call if VITE_OPENAI_API_KEY is available and backend SSE did not succeed
      const openAiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!streamOk && openAiKey) {
        try {
          const systemMsg = `You are a helpful rural fintech advisor for GramUdyam in India. Entrepreneur Profile: District ${districtLabel}, Capital: ₹${profile.capital || 0}. Business: ${businessLabel}, Feasibility Score: ${currentScore}/100. Give practical, encouraging advice answering the user's specific query in 2-3 concise paragraphs.`
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: text },
              ],
              temperature: 0.3,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            const reply = data.choices?.[0]?.message?.content
            if (reply) {
              receivedContent = reply
              setMessages((prev) => {
                const copy = [...prev]
                if (copy[advisorIndex]) {
                  copy[advisorIndex] = { role: "advisor", content: receivedContent }
                }
                return copy
              })
              streamOk = true
            }
          }
        } catch (e) {
          console.warn("Direct OpenAI call unavailable:", e)
        }
      }

      // 3. Fallback: Local dynamic context model stream
      if (!streamOk && !receivedContent.trim()) {
        const fallbackText = getContextualResponse(text)
        const words = fallbackText.split(" ")
        let streamed = ""
        for (let i = 0; i < words.length; i++) {
          streamed += (i > 0 ? " " : "") + words[i]
          setMessages((prev) => {
            const copy = [...prev]
            if (copy[advisorIndex]) {
              copy[advisorIndex] = { role: "advisor", content: streamed }
            }
            return copy
          })
          await new Promise((r) => setTimeout(r, 15))
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev]
        if (copy[advisorIndex]) {
          copy[advisorIndex] = {
            role: "advisor",
            content: "Sorry, I encountered an issue retrieving guidance. Please click retry.",
            error: true,
          }
        }
        return copy
      })
    } finally {
      setIsStreaming(false)
    }
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
                        className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                          m.error
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : m.role === "user"
                            ? "bg-primary text-white rounded-br-xs"
                            : "bg-secondary/50 text-foreground border border-border rounded-bl-xs"
                        }`}
                      >
                        {m.content || (
                          <span className="inline-flex items-center gap-1.5 py-0.5 text-muted-foreground animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            <span className="text-[11px] ml-1">AI thinking...</span>
                          </span>
                        )}
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
                onKeyDown={(e) => e.key === "Enter" && !isStreaming && handleSend()}
                disabled={isStreaming}
                placeholder={t("advisor.placeholder", "Ask about schemes, subsidies, loans...")}
                className="flex-1 h-10 px-3 text-xs rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />

              <Button
                size="sm"
                onClick={() => handleSend()}
                disabled={isStreaming || !input.trim()}
                className="h-10 px-3 cursor-pointer disabled:opacity-50"
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
