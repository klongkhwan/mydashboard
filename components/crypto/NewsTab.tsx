"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ExternalLink, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { ModernPageLoading } from "@/components/ui/modern-loader"

type Provider = { id: string; name: string; logo_id?: string; url?: string }
type RelatedSymbol = { symbol: string }
type NewsLite = {
  id: string
  title: string
  published: number
  urgency: number
  link: string
  relatedSymbols?: RelatedSymbol[]
  storyPath?: string
  provider: Provider
}
type StoryDetail = {
  id: string
  title: string
  shortDescription?: string
  astDescription?: any
  language?: string
  tags?: any[]
  published: number
  urgency?: number
  link?: string
  read_time?: number
  relatedSymbols?: RelatedSymbol[]
  provider?: Provider
}

/** ===== FIXED SIZES (ปรับค่าเดียวมีผลทั้งไฟล์) ===== */
const HEADER_H = 20 // px (ความสูง card-header)
const CONTENT_H_LEFT = 500 // px (ความสูง card-content ฝั่งซ้าย)
const CONTENT_H_RIGHT = 500 // px (ความสูง card-content ฝั่งขวา)

const PAGE_SIZE = 10

const timeAgo = (epochSec: number) => {
  const diffMs = Date.now() - epochSec * 1000
  const s = Math.max(1, Math.floor(diffMs / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
const urgencyDot = (u: number) => (u >= 2 ? "bg-red-500" : u === 1 ? "bg-yellow-500" : "bg-slate-500")

function renderAst(node: any, key?: string | number): any {
  if (node == null) return null
  if (typeof node === "string") return node
  const k = key ?? Math.random()
  switch (node.type) {
    case "root":
      return <div key={k} className="text-card-foreground">{node.children?.map((c: any, i: number) => renderAst(c, i))}</div>
    case "p":
      return <p key={k} className="leading-7 text-card-foreground ml-0 pl-0">{node.children?.map((c: any, i: number) => renderAst(c, i))}</p>
    case "b":
      return <strong key={k} className="font-semibold">{node.children?.map((c: any, i: number) => renderAst(c, i))}</strong>
    case "i":
      return <em key={k}>{node.children?.map((c: any, i: number) => renderAst(c, i))}</em>
    case "h2":
      return <h2 key={k} className="mt-4 text-xl font-semibold text-card-foreground ml-0 pl-0">{node.children?.map((c: any, i: number) => renderAst(c, i))}</h2>
    case "h3":
      return <h3 key={k} className="mt-3 text-lg font-semibold text-card-foreground ml-0 pl-0">{node.children?.map((c: any, i: number) => renderAst(c, i))}</h3>
    case "ul":
      return <ul key={k} className="list-disc pl-5 text-card-foreground ml-0">{node.children?.map((c: any, i: number) => <li key={i}>{renderAst(c, i)}</li>)}</ul>
    case "ol":
      return <ol key={k} className="list-decimal pl-5 text-card-foreground ml-0">{node.children?.map((c: any, i: number) => <li key={i}>{renderAst(c, i)}</li>)}</ol>
    case "a":
      return <a key={k} href={node.href || "#"} target="_blank" rel="noreferrer" className="text-primary hover:underline hover:opacity-80">
        {node.children?.map((c: any, i: number) => renderAst(c, i)) ?? node.href}
      </a>
    case "blockquote":
      return <blockquote key={k} className="border-l-2 border-white/20 pl-3 italic text-muted-foreground ml-0">
        {node.children?.map((c: any, i: number) => renderAst(c, i))}
      </blockquote>

    default:
      return node.children?.map((c: any, i: number) => renderAst(c, i)) ?? null
  }
}

export default function NewsFlowPanel() {
  const [items, setItems] = useState<NewsLite[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<StoryDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [refetchTick, setRefetchTick] = useState(0)

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, page])

  const fetchList = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/news-flow`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data?.items) ? (data.items as NewsLite[]) : []
      setItems(arr)
      if (arr.length > 0 && (!selectedId || !arr.find(i => i.id === selectedId))) {
        setSelectedId(arr[0].id)
      }
    } catch (e: any) {
      setError(e?.message || "Fetch list failed")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/news-story?id=${encodeURIComponent(id)}&lang=en`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDetail(data as StoryDetail)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => { fetchList() }, [refetchTick])
  useEffect(() => { if (selectedId) fetchDetail(selectedId) }, [selectedId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: list + pagination */}
      <Card className="lg:col-span-5 card-spotify border-none shadow-none bg-card/40 backdrop-blur-sm">
        <CardHeader
          className="px-6 py-5"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-spotify-label">
              ฟีดข่าว (100 รายการ)
            </CardTitle>
            <button
              onClick={() => setRefetchTick((x) => x + 1)}
              className="text-muted-foreground hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>

        {/* lock ความสูง CardContent + ทำให้ list เลื่อนภายใน */}
        <CardContent
          className="p-0 flex flex-col"
          style={{ height: CONTENT_H_LEFT }}
        >
          <div className="divide-y divide-white/5 flex-1 overflow-y-auto spotify-scrollbar">
            {loading && (
              <div className="p-12 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-spotify-label animate-pulse">Fetching news...</p>
              </div>
            )}
            {error && <div className="p-6 text-destructive text-sm font-bold text-center">{error}</div>}
            {!loading && !error && pageItems.length === 0 && (
              <div className="p-12 text-center text-spotify-muted">ไม่มีข่าวในหน้านี้</div>
            )}

            {!loading && !error && pageItems.map((n) => {
              const active = selectedId === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => { setSelectedId(n.id) }}
                  className={`w-full text-left px-6 py-4 transition-all duration-200 group border-none outline-none ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${urgencyDot(n.urgency)}`} />
                    <span className={active ? "text-primary" : "text-spotify-muted group-hover:text-white"}>{n.provider?.name || n.provider?.id}</span>
                    <span className="text-white/10">•</span>
                    <span className="flex items-center gap-1.5 text-spotify-muted group-hover:text-white transition-colors">
                      <Clock className="w-3 h-3" /> {timeAgo(n.published)}
                    </span>
                  </div>
                  <div className={`text-sm font-bold line-clamp-2 transition-colors ${active ? "text-white" : "text-[#cbcbcb] group-hover:text-white"}`}>{n.title}</div>
                  {Array.isArray(n.relatedSymbols) && n.relatedSymbols.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {n.relatedSymbols.slice(0, 3).map((s, i) => (
                        <Badge key={i} className="bg-surface-hover text-muted-foreground group-hover:text-white border-none text-[10px] px-2 py-0.5 font-bold uppercase tracking-tighter">
                          {s.symbol}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* pagination ติดก้น CardContent */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/20">
            <Pagination total={items.length} page={page} setPage={setPage} pageSize={PAGE_SIZE} />
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: detail */}
      <Card className="lg:col-span-7 card-spotify border-none shadow-none bg-background/60 backdrop-blur-md">
        <CardHeader
          className="px-6 py-5 border-b border-white/5"
        >
          <div className="flex items-center">
            <CardTitle className="text-spotify-label">รายละเอียดข่าว</CardTitle>
          </div>
        </CardHeader>

        {/* lock ความสูง CardContent + ทำให้เนื้อหาเลื่อนภายใน */}
        <CardContent
          className="p-8 overflow-y-auto spotify-scrollbar"
          style={{ height: CONTENT_H_RIGHT }}
        >
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-spotify-muted" />
              </div>
              <p className="text-spotify-muted font-bold">เลือกข่าวจากด้านซ้ายเพื่อดูรายละเอียด</p>
            </div>
          )}
          {selectedId && loadingDetail && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-spotify-label animate-pulse">Loading story...</p>
            </div>
          )}
          {selectedId && !loadingDetail && !detail && (
            <div className="text-center py-20 text-spotify-muted font-bold">ไม่พบรายละเอียดข่าว</div>
          )}
          {selectedId && detail && (
            <article className="space-y-6">
              <header className="space-y-4">
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-spotify-muted">
                  <span className={`inline-block w-2 h-2 rounded-full ${urgencyDot(detail.urgency ?? 0)}`} />
                  <span className="text-white">{detail.provider?.name || detail.provider?.id}</span>
                  <span className="text-white/10">•</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {timeAgo(detail.published)}</span>
                  {typeof detail.read_time === "number" && (
                    <>
                      <span className="text-white/10">•</span>
                      <span>~{detail.read_time}s read</span>
                    </>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">{detail.title}</h1>
                
                <div className="flex items-center justify-between gap-4 pt-2">
                  {Array.isArray(detail.relatedSymbols) && detail.relatedSymbols.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {detail.relatedSymbols.slice(0, 6).map((s, i) => (
                        <Badge key={i} className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[11px] px-3 py-1 font-black uppercase tracking-wider">
                          {s.symbol}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {detail.link && (
                    <Button variant="pill-secondary" asChild className="bg-secondary text-white hover:scale-105 active:scale-95">
                      <a href={detail.link} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                        View Source <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </header>

              <div className="h-px bg-white/5 w-full" />

              {detail.shortDescription && (
                <p className="text-lg text-muted-foreground font-medium leading-relaxed italic border-l-2 border-primary/40 pl-4">{detail.shortDescription}</p>
              )}


              {detail.astDescription && (
                <div className="prose prose-invert max-w-none text-[#cbcbcb] leading-relaxed text-[15px]">
                  {renderAst(detail.astDescription)}
                </div>
              )}

              {Array.isArray(detail.tags) && detail.tags.length > 0 && (
                <div className="pt-8 flex flex-wrap gap-2">
                  {detail.tags.map((t: any, i: number) => (
                    <Badge key={i} className="bg-surface-hover text-muted-foreground hover:text-white border-none text-[10px] px-3 py-1 font-bold uppercase">
                      #{t?.title ?? "Tag"}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Pagination({
  total, page, setPage, pageSize,
}: { total: number; page: number; setPage: (n: number) => void; pageSize: number }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <>
      <div className="text-xs text-spotify-muted font-bold uppercase tracking-widest">
        {total} News • Page {page}/{totalPages}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-white hover:bg-surface-hover disabled:opacity-20 transition-all active:scale-90"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-white hover:bg-surface-hover disabled:opacity-20 transition-all active:scale-90"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  )
}
