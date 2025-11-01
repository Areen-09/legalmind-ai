"use client"

import { Shader, ChromaFlow, Swirl } from "shaders/react"
import { GrainOverlay } from "@/components/grain-overlay"
import { MagneticButton } from "@/components/magnetic-button"
import { useRef, useEffect, useState } from "react"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const shaderContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [documents, setDocuments] = useState<Array<{
    id: string
    name: string
    sizeMb: number
    uploadedAt: string // For display
    uploadTimestamp: string // For sorting
    summary: string
    riskScore?: number // 0-100
    clauses?: string[]
    type?: string // e.g., NDA, MSA, DPA, Invoice
    lastAnalyzedAt?: string
    lastOpenedAt?: string
  }>>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<"newest" | "name" | "size">("newest")
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [docTypes, setDocTypes] = useState<string[]>([])

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      try {
        setIsLoadingDocs(true)
        if (!auth.currentUser) {
          setDocuments([])
          setSelectedDocId(null)
          setIsLoadingDocs(false)
          return
        }
        const token = await auth.currentUser.getIdToken()
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"
        const res = await fetch(`${base}/api/v1/history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch history: ${res.status}`)
        }
        const data = await res.json()
        const history: any[] = Array.isArray(data?.history) ? data.history : []
        const mapped = history.map((h) => {
          const ts = h.timestamp ? new Date(h.timestamp) : null
          const uploadedAt = ts ? ts.toLocaleString() : "—"
          const uploadTimestamp = ts ? ts.toISOString() : ""
          const analysis = h.document_analysis || {}
          const summary = analysis.summary || ""
          const type = analysis.classification || h.classification || undefined
          const riskScore = analysis.risk_score ? parseInt(analysis.risk_score, 10) : 0
          let clauses = []
          try {
            const explanation = JSON.parse(h.clause_explanation.replace(/```json\n|\n```/g, ''));
            if (Array.isArray(explanation.clauses)) {
              clauses = explanation.clauses.map((c: any) => c.clause);
            }
          } catch (e) {
            // ignore parsing errors
          }
          return {
            id: h.doc_id || h.id || "",
            name: h.filename || "Untitled",
            sizeMb: h.file_size_mb || 0,
            uploadedAt,
            uploadTimestamp,
            summary,
            riskScore,
            clauses,
            type,
            lastAnalyzedAt: uploadedAt,
            lastOpenedAt: undefined,
          }
        })
        if (!cancelled) {
          setDocuments(mapped)
          setSelectedDocId(mapped[0]?.id ?? null)
          const types = [...new Set(mapped.map((d) => d.type).filter(Boolean) as string[])]
          setDocTypes(types)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setDocuments([])
          setSelectedDocId(null)
        }
      } finally {
        if (!cancelled) setIsLoadingDocs(false)
      }
    }
    loadHistory()
    return () => {
      cancelled = true
    }
  }, [user])

  const toggleFilter = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const filteredAndSortedDocs = (() => {
    let list = documents.filter((d) => {
      const matchesQuery = !query || d.name.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = activeFilters.length === 0 || (d.type && activeFilters.includes(d.type))
      return matchesQuery && matchesFilter
    })
    if (sortKey === "newest") {
      list = list.sort((a, b) => b.uploadTimestamp.localeCompare(a.uploadTimestamp))
    } else if (sortKey === "name") {
      list = list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortKey === "size") {
      list = list.sort((a, b) => b.sizeMb - a.sizeMb)
    }
    return list
  })()

  const groupByMonth = (items: typeof filteredAndSortedDocs) => {
    const groups: Record<string, typeof items> = {}
    for (const d of items) {
      if (!d.uploadTimestamp) continue
      const key = new Date(d.uploadTimestamp).toLocaleString(undefined, { month: "long", year: "numeric" })
      groups[key] = groups[key] || []
      groups[key].push(d)
    }
    return groups
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <GrainOverlay />

      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ contain: "strict" }}
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1275d8"
            colorB="#e19136"
            speed={0.8}
            detail={0.8}
            blend={50}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
          <ChromaFlow
            baseColor="#0066ff"
            upColor="#0066ff"
            downColor="#d1d1d1"
            leftColor="#e19136"
            rightColor="#e19136"
            intensity={0.9}
            radius={1.8}
            momentum={25}
            maskType="alpha"
            opacity={0.97}
          />
        </Shader>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <nav
        className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 transition-opacity duration-700 md:px-12 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/15 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-foreground/25">
            <span className="font-sans text-xl font-bold text-foreground">L</span>
          </div>
          <span className="font-sans text-xl font-semibold tracking-tight text-foreground">LegalMind AI</span>
        </Link>

        {user && <ProfileDropdown user={user} />}
      </nav>

      <div
        className={`relative z-10 flex h-screen transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Floating Sidebar */}
        <aside className="fixed left-6 top-24 z-40 hidden h-[calc(100vh-8rem)] w-[20rem] flex-col rounded-2xl bg-black/30 p-4 backdrop-blur-xl ring-1 ring-white/10 md:flex">
          <h2 className="px-1 pb-3 font-sans text-sm font-semibold tracking-wide text-white/80">Your Documents</h2>

          {/* Search + Sort */}
          <div className="mb-3 space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {docTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleFilter(t)}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      activeFilters.includes(t) ? "bg-white/20 text-white" : "bg-orange-500/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <SelectTrigger
                  size="sm"
                  className="bg-white/10 text-white border-white/15 backdrop-blur-md hover:bg-white/15 transition-colors shadow-sm"
                >
                  <SelectValue placeholder="Newest" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/10 text-white border border-white/15 shadow-xl">
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="-mx-1 flex-1 overflow-y-auto pr-1 history-scroll">
            {isLoadingDocs ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                ))}
              </div>
            ) : (
              Object.entries(groupByMonth(filteredAndSortedDocs)).map(([month, docs]) => (
                <div key={month} className="mb-3">
                  <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{month}</div>
                  <div className="space-y-1">
                    {docs.map((doc) => {
                      const isActive = doc.id === selectedDocId
                      return (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all hover:bg-white/10 ${
                            isActive ? "bg-white/10 ring-1 ring-white/10" : "bg-transparent"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-sm ${isActive ? "text-white" : "text-white/90"}`}>{doc.name}</p>
                            <p className="truncate text-xs text-white/60">{doc.uploadedAt} • {doc.sizeMb} MB</p>
                          </div>
                          <div className="ml-2 flex shrink-0 items-center gap-2">
                            {!!doc.type && (
                              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/80">{doc.type}</span>
                            )}
                            <span className="h-2 w-2 rounded-full bg-white/40 group-hover:bg-white/70" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
            {!isLoadingDocs && filteredAndSortedDocs.length === 0 && (
              <div className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/70">No matches. Try clearing filters.</div>
            )}
          </div>
          <div className="pt-3">
            <MagneticButton variant="secondary" onClick={() => router.back()} className="w-full">
              Go Back
            </MagneticButton>
          </div>
        </aside>

        {/* Main Content */}
        <section className="ml-0 mr-0 mt-24 grid h-[calc(100vh-8rem)] flex-1 grid-rows-[auto,1fr] gap-3 overflow-hidden md:ml-[23rem] md:mr-6 md:gap-4">
          {/* Mobile Controls */}
          <div className="mx-6 -mt-2 mb-2 flex items-center justify-between md:hidden">
            <Sheet>
              <SheetTrigger className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md">
                Documents
              </SheetTrigger>
              <SheetContent side="left" className="backdrop-blur-xl bg-black/40 border-white/10">
                <SheetHeader>
                  <SheetTitle className="text-white">Your Documents</SheetTitle>
                </SheetHeader>
                <div className="p-3 pt-0">
                  <div className="mb-3 space-y-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search documents…"
                      className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {docTypes.map((t) => (
                          <button
                            key={t}
                            onClick={() => toggleFilter(t)}
                            className={`rounded-md px-2 py-1 text-xs transition-colors ${
                              activeFilters.includes(t) ? "bg-white/20 text-white" : "bg-orange-500/10 text-white/80 hover:bg-white/15"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                        <SelectTrigger size="sm" className="bg-white/10 text-white border-white/15 backdrop-blur-md hover:bg-white/15 transition-colors shadow-sm">
                          <SelectValue placeholder="Newest" />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/10 text-white border border-white/15 shadow-xl">
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="size">Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="-mx-1 max-h-[65vh] overflow-y-auto pr-1 history-scroll">
                    {Object.entries(groupByMonth(filteredAndSortedDocs)).map(([month, docs]) => (
                      <div key={month} className="mb-3">
                        <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{month}</div>
                        <div className="space-y-1">
                          {docs.map((doc) => {
                            const isActive = doc.id === selectedDocId
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedDocId(doc.id)}
                                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all hover:bg-white/10 ${
                                  isActive ? "bg-white/10 ring-1 ring-white/10" : "bg-transparent"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className={`truncate text-sm ${isActive ? "text-white" : "text-white/90"}`}>{doc.name}</p>
                                  <p className="truncate text-xs text-white/60">{doc.uploadedAt} • {doc.sizeMb} MB</p>
                                </div>
                                <div className="ml-2 flex shrink-0 items-center gap-2">
                                  {!!doc.type && (
                                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/80">{doc.type}</span>
                                  )}
                                  <span className="h-2 w-2 rounded-full bg-white/40 group-hover:bg-white/70" />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {filteredAndSortedDocs.length === 0 && (
                      <div className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/70">No matches. Try clearing filters.</div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div />
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/25 p-3 backdrop-blur-xl ring-1 ring-white/10 md:grid-cols-4 md:gap-4 md:p-4">
            <div className="rounded-xl bg-white/5 p-3 md:p-4">
              <div className="text-[10px] text-white/60 md:text-xs">Total Documents</div>
              <div className="text-lg font-semibold text-white md:text-2xl">{documents.length}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3 md:p-4">
              <div className="text-[10px] text-white/60 md:text-xs">Last Upload</div>
              <div className="text-lg font-semibold text-white md:text-2xl">{documents[0]?.uploadedAt ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3 md:p-4">
              <div className="text-[10px] text-white/60 md:text-xs">Average Size</div>
              <div className="text-lg font-semibold text-white md:text-2xl">{
                documents.length ? Math.round(documents.reduce((s, d) => s + d.sizeMb, 0) / documents.length) : 0
              } MB</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3 md:p-4">
              <div className="text-[10px] text-white/60 md:text-xs">Last Analyzed</div>
              <div className="text-lg font-semibold text-white md:text-2xl">{documents[0]?.lastAnalyzedAt ?? "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mx-3 md:mx-0 md:gap-4 lg:grid-cols-3 h-full overflow-hidden">
            {/* Details Card */}
            <div className="col-span-1 rounded-2xl bg-black/25 p-4 backdrop-blur-xl ring-1 ring-white/10 overflow-y-auto lg:col-span-2 md:p-6 history-scroll">
              {isLoadingDocs ? (
                <div className="flex h-full flex-col gap-3">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 h-28 animate-pulse rounded bg-white/10" />
                </div>
              ) : selectedDocId ? (
                (() => {
                  const doc = documents.find((d) => d.id === selectedDocId)
                  if (!doc) return null
                  return (
                    <div className="flex h-full flex-col">
                      <div className="mb-3 flex items-start justify-between gap-4 md:mb-4">
                        <div>
                          <h3 className="font-sans text-lg font-semibold text-white md:text-xl">{doc.name}</h3>
                          <p className="text-xs text-white/60 md:text-sm">Uploaded {doc.uploadedAt} • {doc.sizeMb} MB</p>
                        </div>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <h4 className="mb-1 text-sm font-semibold text-white/90 md:mb-2 md:text-base">Brief Summary</h4>
                        <p className="text-white/90 line-clamp-3 md:line-clamp-none">{doc.summary}</p>
                      </div>
                      {/* Risk Meter + Clauses */}
                      <div className="mt-4 grid grid-cols-1 gap-3 md:mt-6 md:grid-cols-2 md:gap-4">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-white/80 md:mb-2 md:text-sm">
                            <span>Risk Score</span>
                            <span>{doc.riskScore ?? 0}/100</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 md:h-2">
                            <div
                              className="h-1.5 rounded-full md:h-2"
                              style={{ width: `${doc.riskScore ?? 0}%`, background:
                                (doc.riskScore ?? 0) > 66 ? "#ef4444" : (doc.riskScore ?? 0) > 33 ? "#f59e0b" : "#10b981" }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-white/80 md:mb-2 md:text-sm">Detected Clauses</div>
                          <div className="flex flex-wrap gap-1 md:gap-2">
                            {(doc.clauses ?? []).map((c) => (
                              <span key={c} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/90 md:py-1 md:text-xs">{c}</span>
                            ))}
                            {(!doc.clauses || doc.clauses.length === 0) && (
                              <span className="text-xs text-white/60">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 md:pt-6 pb-4">
                        {user ? (
                          <MagneticButton
                            size="lg"
                            variant="primary"
                            className="w-full md:w-auto"
                            onClick={() => {
                              localStorage.setItem("selectedDocId", doc.id)
                              router.push(`/dashboard/${user.uid}`)
                            }}
                          >
                            Detailed Insights
                          </MagneticButton>
                        ) : (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                            Sign in to view detailed insights.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="flex h-full items-center justify-center text-white/70">Select a document to view its details.</div>
              )}
            </div>

            {/* Preview/Meta Card */}
            <div className="hidden rounded-2xl bg-black/25 p-6 backdrop-blur-xl ring-1 ring-white/10 md:block">
              {isLoadingDocs ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-white/10" />
                  ))}
                </div>
              ) : selectedDocId ? (
                (() => {
                  const doc = documents.find((d) => d.id === selectedDocId)
                  if (!doc) return null
                  return (
                    <div>
                      <h4 className="mb-3 font-sans text-base font-semibold text-white/90">File Details</h4>
                      <dl className="space-y-2 text-sm text-white/80">
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">File name</dt>
                          <dd className="ml-2 truncate">{doc.name}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Size</dt>
                          <dd className="ml-2">{doc.sizeMb} MB</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Uploaded</dt>
                          <dd className="ml-2">{doc.uploadedAt}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Last analyzed</dt>
                          <dd className="ml-2">{doc.lastAnalyzedAt ?? "—"}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Last opened</dt>
                          <dd className="ml-2">{doc.lastOpenedAt ?? "—"}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Doc ID</dt>
                          <dd className="ml-2">{doc.id}</dd>
                        </div>
                      </dl>
                    </div>
                  )
                })()
              ) : (
                <div className="text-white/70">No document selected.</div>
              )}
            </div>
          </div>
        </section>
        {/* Minimal glass scrollbar styling */}
        <style jsx global>{`
          .history-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.35) transparent;
          }
          .history-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .history-scroll::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.06);
            border-radius: 9999px;
          }
          .history-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.25);
            border-radius: 9999px;
            border: 2px solid rgba(255,255,255,0.15);
          }
          .history-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.35);
          }
        `}</style>
      </div>
    </main>
  )
}
