"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Shader, ChromaFlow, Swirl } from "shaders/react"
import { GrainOverlay } from "@/components/grain-overlay"
import { MagneticButton } from "@/components/magnetic-button"
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RiskItem } from "@/components/risk-item"
import { RiskScoreRing } from "@/components/risk-score-ring"
import { FormattedResponse } from "@/components/formatted-response"
import { Timeline, TimelineEvent } from "@/components/timeline"
import SummaryPanel from "@/components/dashboard/summary-panel"
import EntitiesPanel from "@/components/dashboard/entities-panel"
import ClausesPanel from "@/components/dashboard/clauses-panel"
import RisksPanel, { RisksPanelProps } from "@/components/dashboard/risks-panel"
import CommonQAPanel from "@/components/dashboard/common-questions-panel"
import AnalyzingDocument from "@/components/dashboard/analyzing-document"

type HistoryItem = {
  doc_id: string
  filename?: string
  status?: string
  timestamp?: string
  document_analysis?: any
  risks?: string[]
  highlights?: any
  highlighted_doc_url?: string | null
  qa_response?: { questions?: any[] }
  clause_explanation?: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE ? `${process.env.NEXT_PUBLIC_API_BASE}/api/v1` : "http://localhost:8000/api/v1"

const sections = ["Dashboard", "Insights", "Quick View", "Timeline", "Ask AI"]

export default function UserDashboardPage() {
  const _params = useParams<{ user_id: string }>()
  const [currentSection, setCurrentSection] = useState(sections[0])
  const [isLoaded, setIsLoaded] = useState(false)
  const shaderContainerRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [selectedDoc, setSelectedDoc] = useState<HistoryItem | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<{ percentage: number; message: string } | null>(null)
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [question, setQuestion] = useState("")
  const [activeClause, setActiveClause] = useState<string | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([])
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector("canvas")
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsLoaded(true)
          return true
        }
      }
      return false
    }

    if (checkShaderReady()) return

    const intervalId = setInterval(() => {
      if (checkShaderReady()) {
        clearInterval(intervalId)
      }
    }, 100)

    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true)
    }, 1500)

    return () => {
      clearInterval(intervalId)
      clearTimeout(fallbackTimer)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider).catch((e) => {
      if ((e as any)?.code !== "auth/cancelled-popup-request") console.error(e)
    })
  }

  const authHeaders = async () => {
    const token = await auth.currentUser?.getIdToken()
    const headers = new Headers()
    if (token) {
      headers.append("Authorization", `Bearer ${token}`)
    }
    return headers
  }

  const fetchHistory = async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`${BACKEND_URL}/history`, { headers })
      if (!res.ok) throw new Error("Failed to fetch history")
      const data = await res.json()
      const list: HistoryItem[] = data.history || []
      setHistory(list)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  useEffect(() => {
    const docId = localStorage.getItem("selectedDocId")
    if (docId && history.length > 0) {
      const doc = history.find((h) => h.doc_id === docId)
      if (doc) {
        setSelectedDoc(doc)
        setCurrentSection("Insights") // Switch to insights view
        localStorage.removeItem("selectedDocId") // Clean up
      }
    }
  }, [history])

  useEffect(() => {
    const fetchTimelineData = async () => {
      const docId = selectedDoc?.doc_id
      if (!docId) return
      setIsTimelineLoading(true)
      try {
        const headers = await authHeaders()
        const form = new FormData()
        form.append("doc_id", docId)
        form.append(
          "question",
          "Extract key dates and events from the document. Present them as a JSON array of objects, where each object has 'date', 'title', and 'description' keys. Also, identify potential risks and add an 'isRisk' boolean key to the corresponding objects. The response should be only the JSON array, without any introductory text or markdown formatting."
        )
        const res = await fetch(`${BACKEND_URL}/ask`, { method: "POST", headers, body: form })
        const data = await res.json()

        // AI might wrap the JSON in text. Let's extract it.
        const jsonMatch = data.answer.match(/(\[.*\])/s)
        if (jsonMatch && jsonMatch[0]) {
          try {
            const parsedData = JSON.parse(jsonMatch[0])
            setTimelineData(parsedData)
          } catch (e) {
            console.error("Failed to parse timeline JSON from extracted string:", e)
            setTimelineData([]) // Reset on parsing error
          }
        } else {
          // Fallback for cases where the response might be just the JSON
          try {
            const parsedData = JSON.parse(data.answer)
            setTimelineData(parsedData)
          } catch (e) {
            console.error("Failed to parse timeline JSON directly:", e)
            setTimelineData([]) // Reset on error
          }
        }
      } catch (e) {
        console.error("Error fetching timeline data:", e)
        setTimelineData([]) // Reset on fetch error
      } finally {
        setIsTimelineLoading(false)
      }
    }

    if (selectedDoc) {
      fetchTimelineData()
    }
  }, [selectedDoc])

  const handleUpload = async (file: File) => {
    if (!user) return
    setIsAnalyzing(true)
    setProgress({ percentage: 0, message: "Initializing..." })
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("qa_question", "Summarize the key points of this document.")
      form.append("highlight_criteria", "Identify all clauses related to termination and liability.")
      const headers = await authHeaders()
      const res = await fetch(`${BACKEND_URL}/analyze-stream`, {
        method: "POST",
        headers,
        body: form,
      })
      if (!res.ok || !res.body) throw new Error("Failed to start analysis")
      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buffer = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""
        for (const chunk of parts) {
          const line = chunk.trim()
          if (!line.startsWith("data:")) continue
          const jsonStr = line.replace(/^data:\s*/, "")
          try {
            const evt = JSON.parse(jsonStr)
            if (typeof evt.percentage === "number" && evt.message) {
              setProgress({ percentage: evt.percentage, message: evt.message })
              if (evt.percentage === 100 && evt.data) {
                const finalDoc: HistoryItem = {
                  doc_id: evt.data.doc_id,
                  document_analysis: evt.data.document_analysis,
                  risks: evt.data.risks,
                  highlights: evt.data.highlights,
                  highlighted_doc_url: evt.data.highlighted_doc_url,
                  qa_response: evt.data.qa_response,
                  clause_explanation: evt.data.clause_explanation,
                }
                setSelectedDoc(finalDoc)
                setCurrentSection("Quick View")
              }
            }
          } catch (e) {
            // ignore partial chunks
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const askAI = async () => {
    const docId = selectedDoc?.doc_id
    if (!question.trim() || !docId) return
    const q = question.trim()
    setQuestion("")
    setChat((c) => [...c, { role: "user", content: q }])
    setIsThinking(true)
    try {
      const headers = await authHeaders()
      const form = new FormData()
      form.append("doc_id", docId)
      form.append("question", q)
      const res = await fetch(`${BACKEND_URL}/ask`, { method: "POST", headers, body: form })
      const data = await res.json()
      setChat((c) => [...c, { role: "assistant", content: data.answer || "" }])
    } catch (e) {
      console.error(e)
    } finally {
      setIsThinking(false)
    }
  }

  const displayDoc = useMemo(() => selectedDoc, [selectedDoc])

  const preParsedRisks = useMemo(() => {
    if (!displayDoc?.risks) return []
    return displayDoc.risks.map((risk) => {
      if (typeof risk === "string") {
        try {
          return JSON.parse(risk)
        } catch {
          return { explanation: risk }
        }
      }
      return risk
    })
  }, [displayDoc?.risks])

  const parsedRisks = useMemo((): RisksPanelProps => {
    const defaultRisks: RisksPanelProps = {
      financialRisk: { level: "No risks", description: "No financial risks identified." },
      complianceRisk: { level: "No risks", description: "No compliance risks identified." },
      timelineRisk: { level: "No risks", description: "No timeline risks identified." },
      otherRisk: { level: "No risks", description: "No other risks identified." },
    }

    if (!preParsedRisks || preParsedRisks.length === 0) {
      return defaultRisks
    }

    const categorizedRisks = { ...defaultRisks }
    const otherRisks: { level: "No risks" | "Medium" | "Strong"; description: string }[] = []

    preParsedRisks.forEach((risk) => {
      const riskString = risk.explanation || JSON.stringify(risk)
      const lowerCaseRisk = riskString.toLowerCase()
      let level: "No risks" | "Medium" | "Strong" = "Medium"

      if (lowerCaseRisk.includes("strong") || lowerCaseRisk.includes("high")) {
        level = "Strong"
      } else if (lowerCaseRisk.includes("no risk")) {
        level = "No risks"
      }

      if (lowerCaseRisk.includes("financial")) {
        categorizedRisks.financialRisk = { level, description: riskString }
      } else if (lowerCaseRisk.includes("compliance")) {
        categorizedRisks.complianceRisk = { level, description: riskString }
      } else if (lowerCaseRisk.includes("timeline") || lowerCaseRisk.includes("delay")) {
        categorizedRisks.timelineRisk = { level, description: riskString }
      } else {
        otherRisks.push({ level, description: riskString })
      }
    })

    if (otherRisks.length > 0) {
      categorizedRisks.otherRisk.description = otherRisks.map((r) => r.description).join("\n\n")
      if (otherRisks.some((r) => r.level === "Strong")) {
        categorizedRisks.otherRisk.level = "Strong"
      } else if (otherRisks.some((r) => r.level === "Medium")) {
        categorizedRisks.otherRisk.level = "Medium"
      } else {
        categorizedRisks.otherRisk.level = "No risks"
      }
    }

    return categorizedRisks
  }, [preParsedRisks])

  const entities = useMemo(() => {
    const analysis = displayDoc?.document_analysis
    if (!analysis || !analysis.classification || !analysis.highlights) {
      return []
    }

    const { classification, highlights } = analysis
    let entityKeys: string[] = []

    switch (classification) {
      case "Non-Disclosure Agreements (NDAs)":
        entityKeys = ["disclosing_party", "receiving_party"]
        break
      case "Employment Contracts":
        entityKeys = ["employee_name", "employer_name"]
        break
      case "Rental & Lease Agreements":
        entityKeys = ["landlord_name", "tenant_name"]
        break
      case "Terms of Service":
        entityKeys = ["company_name"]
        break
      case "General Business Contracts":
      case "General Legal Document":
        entityKeys = ["party_a", "party_b"]
        break
      case "Sales Agreements":
        entityKeys = ["seller_name", "buyer_name"]
        break
      case "Service Contracts":
        entityKeys = ["service_provider_name", "client_name"]
        break
      default:
        // Fallback for other types, though less reliable
        return Object.values(highlights).slice(0, 2).filter(Boolean) as string[]
    }

    return entityKeys.map((key) => highlights[key]).filter(Boolean) as string[]
  }, [displayDoc?.document_analysis])

  const clauses = useMemo(() => {
    const explanation = displayDoc?.clause_explanation
    if (!explanation) return []

    try {
      const jsonString = explanation.substring(explanation.indexOf("{"), explanation.lastIndexOf("}") + 1)
      const parsed = JSON.parse(jsonString)
      if (Array.isArray(parsed.clauses)) {
        return parsed.clauses
      }
    } catch (e) {
      console.error("Failed to parse clause_explanation JSON:", e)
      if (typeof explanation === "string") {
        const regex = /\*\s*\*\*(.*?)\*\*:\s*(.*?)(?=\*\s*\*\*|$)/gs
        const parsedClauses = []
        let match
        while ((match = regex.exec(explanation)) !== null) {
          const clause = match[1].trim()
          const explanationText = match[2].trim()
          if (clause && explanationText) {
            parsedClauses.push({ clause, explanation: explanationText })
          }
        }
        return parsedClauses
      }
    }

    return []
  }, [displayDoc?.clause_explanation])

  const parsedQA = useMemo(() => {
    const qaData = displayDoc?.qa_response?.questions
    if (!qaData || !Array.isArray(qaData)) return []

    return qaData
      .map((item) => {
        if (typeof item === "string") {
          const parts = item.split(/:\s*(.*)/s)
          if (parts.length > 1) {
            return {
              question: parts[0],
              answer: parts[1],
            }
          }
        } else if (typeof item === "object" && item !== null && "question" in item && "answer" in item) {
          return item
        }
        return null
      })
      .filter(Boolean)
  }, [displayDoc?.qa_response])

  const renderSection = () => {
    switch (currentSection) {
      case "Dashboard":
        return (
          <div className="mx-auto max-w-6xl h-full">
            <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col h-full">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Your Document Dashboard</h2>
                  <p className="text-white/70">Upload a document to analyze or open an existing one.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-white/15 px-4 py-3 text-white transition hover:bg-white/25">
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,.docx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(f)
                    }}
                  />
                  <span>Upload</span>
                </label>
              </div>

              {displayDoc && (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
                    <div className="text-sm text-white/70">Document</div>
                    <div className="truncate text-lg font-medium">{displayDoc.filename || displayDoc.doc_id}</div>
                    <div className="text-xs text-white/60">{displayDoc.document_analysis?.classification || "completed"}</div>
                  </div>
                  <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/70">Risk Score</div>
                      <div className="text-lg font-medium">{displayDoc.document_analysis?.risk_score ?? "N/A"}</div>
                    </div>
                    <div className="h-16 w-16">
                      <RiskScoreRing score={displayDoc.document_analysis?.risk_score ?? 0} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
                    <div className="text-sm text-white/70">Risks</div>
                    <div className="text-lg font-medium">{displayDoc.risks?.length ?? 0}</div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <h3 className="mb-3 text-sm font-semibold text-white/80">Recent Analyses</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {history.map((h) => (
                    <button
                      key={h.doc_id}
                      onClick={() => setSelectedDoc(h)}
                      className="rounded-xl bg-black/25 p-4 text-left text-white/90 transition hover:bg-white/20 backdrop-blur-xl ring-1 ring-white/10"
                    >
                      <div className="truncate text-sm text-white/70">{h.document_analysis?.classification || "Document"}</div>
                      <div className="truncate text-base font-medium">{h.filename || h.doc_id}</div>
                      <div className="text-xs text-white/60">{h.status}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case "Insights":
        return (
          <div className="mx-auto max-w-6xl h-full">
            <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col h-full">
              <h2 className="mb-4 text-2xl font-semibold text-white">Insights</h2>
              {!displayDoc ? (
                <p className="text-white/70">No document selected.</p>
              ) : (
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <SummaryPanel summary={displayDoc.document_analysis?.summary} />
                    </div>
                    <EntitiesPanel entities={entities} />
                    <div className="lg:col-span-3">
                      <ClausesPanel clauses={clauses} activeClause={activeClause} setActiveClause={setActiveClause} />
                    </div>
                    <div className="lg:col-span-2">
                      <RisksPanel {...parsedRisks} />
                    </div>
                    <CommonQAPanel qa={parsedQA} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case "Quick View":
        return (
          <div className="mx-auto max-w-full h-full">
            {!displayDoc ? (
              <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col h-full">
                <p className="text-white/70">No document selected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
                <div className="lg:col-span-3 rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-white">Document</h2>
                    {displayDoc?.highlighted_doc_url && (
                      <a
                        href={displayDoc.highlighted_doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded-lg bg-white/20 px-3 py-2 text-white hover:bg-white/30"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {displayDoc.highlighted_doc_url ? (
                      <div className="w-full h-full">
                        <iframe src={displayDoc.highlighted_doc_url} className="w-full h-full border-0" title="Highlighted PDF" />
                      </div>
                    ) : (
                      <p className="text-white/70">No highlighted document available.</p>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-2 h-full overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10">
                      <h2 className="text-2xl font-semibold text-white mb-4">Risk Assessment</h2>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-4xl font-bold text-white">{displayDoc.document_analysis?.risk_score ?? "N/A"}</div>
                          <div className="text-sm text-white/70">{displayDoc.risks?.length ?? 0} risks identified</div>
                        </div>
                        <div className="h-24 w-24">
                          <RiskScoreRing score={displayDoc.document_analysis?.risk_score ?? 0} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col">
                      <h2 className="text-2xl font-semibold text-white mb-4">Summary</h2>
                      <div>
                        <p className="whitespace-pre-wrap text-white/80">{displayDoc.document_analysis?.summary || "—"}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10">
                      <h2 className="text-2xl font-semibold text-white mb-4">Key Risks</h2>
                      <div className="space-y-3 text-white/80">
                        {preParsedRisks.slice(0, 3).map((r: any, i: number) => (
                          <RiskItem key={i} risk={r} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10">
                      <h2 className="text-2xl font-semibold text-white mb-4">Key Clauses</h2>
                      <div className="space-y-3">
                        {clauses.slice(0, 3).map((item: { clause: string; explanation: string }, index: number) => (
                          <div key={index}>
                            <h3 className="font-semibold text-white">{item.clause}</h3>
                            <p className="text-white/70 text-sm">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentSection("Insights")}
                        className="mt-4 text-sm font-medium text-white/80 hover:text-white"
                      >
                        View all clauses →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      case "Timeline":
        return (
          <div className="mx-auto max-w-6xl h-full">
            <div className="rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 flex flex-col h-full">
              <h2 className="mb-4 text-2xl font-semibold text-white">Timeline</h2>
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {isTimelineLoading ? <p className="text-white/70">Loading timeline...</p> : <Timeline data={timelineData} />}
              </div>
            </div>
          </div>
        );
      case "Ask AI":
        return (
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex h-full flex-col rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10">
              <h2 className="mb-4 text-2xl font-semibold text-white">Ask AI</h2>
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25">
                <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4">
                  {chat.length === 0 && <p className="text-white/60">Ask questions about this document.</p>}
                  {chat.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-prose rounded-xl p-3 ${m.role === "user" ? "bg-white/20 text-white" : "bg-white/10 text-white/90"}`}
                      >
                        {m.role === "assistant" ? <FormattedResponse content={m.content} /> : m.content}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="max-w-prose rounded-xl p-3 bg-white/10 text-white/90">
                        <p>Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 p-3">
                  <div className="flex items-center gap-3">
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") askAI()
                      }}
                      placeholder="Type your question..."
                      className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none backdrop-blur-xl"
                    />
                    <MagneticButton variant="secondary" onClick={askAI}>
                      Ask
                    </MagneticButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <main className="relative w-full bg-background">
      {isAnalyzing && <AnalyzingDocument progress={progress} />}
      <GrainOverlay />

      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ contain: "strict" }}
      >
        <Shader className="h-full w-full">
          <Swirl colorA="#1275d8" colorB="#e19136" speed={0.8} detail={0.8} blend={50} coarseX={40} coarseY={40} mediumX={40} mediumY={40} fineX={40} fineY={40} />
          <ChromaFlow baseColor="#0066ff" upColor="#0066ff" downColor="#d1d1d1" leftColor="#e19136" rightColor="#e19136" intensity={0.9} radius={1.8} momentum={25} maskType="alpha" opacity={0.97} />
        </Shader>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <header className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 transition-opacity duration-700 md:px-12 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-white">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <button onClick={() => setCurrentSection("Dashboard")} className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/15 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-foreground/25">
              <span className="font-sans text-xl font-bold text-foreground">L</span>
            </div>
            <span className="font-sans text-xl font-semibold tracking-tight text-foreground">LegalMind AI</span>
          </button>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {/* This is now just for show or can be removed */}
        </div>
        {user ? (
          <ProfileDropdown user={user} />
        ) : (
          <MagneticButton variant="secondary" onClick={handleSignIn}>Sign in</MagneticButton>
        )}
      </header>

      <div className="flex h-screen pt-24">
        <nav className={`z-40 flex flex-col p-6 transition-all duration-300 ${isSidebarOpen ? "w-64 shrink-0" : "w-0 overflow-hidden"}`}>
          <div className="space-y-4">
            {sections.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setCurrentSection(item)
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false)
                  }
                }}
                className={`group relative w-full text-left font-sans text-sm font-medium transition-colors ${currentSection === item ? "text-foreground" : "text-foreground/80 hover:text-foreground"}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 h-px bg-foreground transition-all duration-300 ${currentSection === item ? "w-full" : "w-0 group-hover:w-full"}`} />
              </button>
            ))}
          </div>
          <div className="mt-auto">
            <Link href="/" passHref>
              <button className="group relative w-full text-left font-sans text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
                Go Back Home
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
              </button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 md:px-12 h-full" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {renderSection()}
        </div>
      </div>

      <style jsx global>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  )
}
