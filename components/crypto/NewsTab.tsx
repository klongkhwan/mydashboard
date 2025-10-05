"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, ExternalLink, Clock, ChevronLeft, ChevronRight } from "lucide-react"

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
      return <blockquote key={k} className="border-l-4 border-border pl-3 italic text-muted-foreground ml-0">
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT: list + pagination */}
      <Card className="lg:col-span-5">
        <CardHeader
          className="px-4"
          style={{ height: HEADER_H }}
        >
          <div className="h-full flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              ฟีดข่าว (10 ต่อหน้า • สูงสุด 100 รายการ)
            </CardTitle>
            <button
              onClick={() => setRefetchTick((x) => x + 1)}
              className={`px-3 py-1 rounded-md border text-sm flex items-center gap-2 transition ${
                loading
                  ? "border-border text-muted-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary-foreground"
              }`}
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </CardHeader>

        {/* lock ความสูง CardContent + ทำให้ list เลื่อนภายใน */}
        <CardContent
          className="p-0 flex flex-col"
          style={{ height: CONTENT_H_LEFT }}
        >
          <div className="divide-y divide-border flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-foreground">กำลังโหลดรายการ…</div>}
            {error && <div className="p-4 text-destructive">เกิดข้อผิดพลาด: {error}</div>}
            {!loading && !error && pageItems.length === 0 && (
              <div className="p-4 text-muted-foreground">ไม่มีข่าวในหน้านี้</div>
            )}

            {!loading && !error && pageItems.map((n) => {
              const active = selectedId === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => { setSelectedId(n.id) }}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition ${active ? "bg-accent" : ""}`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`inline-block w-2 h-2 rounded-full ${urgencyDot(n.urgency)}`} />
                    <span>{n.provider?.name || n.provider?.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(n.published)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-card-foreground line-clamp-2">{n.title}</div>
                  {Array.isArray(n.relatedSymbols) && n.relatedSymbols.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.relatedSymbols.slice(0, 5).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[11px] px-2 py-0.5">
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
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-border">
            <Pagination total={items.length} page={page} setPage={setPage} pageSize={PAGE_SIZE} />
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: detail */}
      <Card className="lg:col-span-7">
        <CardHeader
          className="px-4"
          style={{ height: HEADER_H }}
        >
          <div className="h-full flex items-center">
            <CardTitle className="text-sm text-muted-foreground">รายละเอียดข่าว</CardTitle>
          </div>
        </CardHeader>

        {/* lock ความสูง CardContent + ทำให้เนื้อหาเลื่อนภายใน */}
        <CardContent
          className="p-6 overflow-y-auto"
          style={{ height: CONTENT_H_RIGHT }}
        >
          {!selectedId && <div className="text-muted-foreground">เลือกข่าวจากด้านซ้ายเพื่อดูรายละเอียด</div>}
          {selectedId && loadingDetail && <div className="text-foreground">กำลังโหลดรายละเอียด…</div>}
          {selectedId && !loadingDetail && !detail && (
            <div className="text-muted-foreground">ไม่พบรายละเอียดข่าว</div>
          )}
          {selectedId && detail && (
            <article className="space-y-4 ml-0 pl-0">
              <header className="space-y-3 ml-0 pl-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-0 pl-0">
                  <span className={`inline-block w-2 h-2 rounded-full ${urgencyDot(detail.urgency ?? 0)}`} />
                  <span>{detail.provider?.name || detail.provider?.id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(detail.published)}</span>
                  {typeof detail.read_time === "number" && <span>• ~{detail.read_time}s read</span>}
                </div>
                <h1 className="text-xl md:text-2xl font-semibold text-card-foreground ml-0 pl-0">{detail.title}</h1>
                {Array.isArray(detail.relatedSymbols) && detail.relatedSymbols.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-0 pl-0">
                    {detail.relatedSymbols.slice(0, 6).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[11px] px-2 py-0.5">
                        {s.symbol}
                      </Badge>
                    ))}
                  </div>
                )}
                {detail.link && (
                  <a
                    href={detail.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    เปิดแหล่งข่าว <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </header>

              {detail.shortDescription && (
                <p className="text-sm text-muted-foreground ml-0 pl-0">{detail.shortDescription}</p>
              )}

              {detail.astDescription && (
                <div className="prose prose-invert max-w-none ml-0 pl-0">
                  {renderAst(detail.astDescription)}
                </div>
              )}

              {Array.isArray(detail.tags) && detail.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2 ml-0 pl-0">
                  {detail.tags.map((t: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[11px] px-2 py-0.5">
                      {t?.title ?? "Tag"}
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
      <div className="text-xs text-muted-foreground">รวม {total} ข่าว • {totalPages} หน้า</div>
      <div className="flex items-center gap-1">
        <button
          className="px-2 py-1 rounded border border-border text-card-foreground hover:border-primary disabled:opacity-40 transition"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-card-foreground px-2">หน้า {page} / {totalPages}</span>
        <button
          className="px-2 py-1 rounded border border-border text-card-foreground hover:border-primary disabled:opacity-40 transition"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}
