import type { PdfPageRef, PdfSource, PdfTool } from './pdf-editor.types'

const DB_NAME = 'superlboard-pdf-editor'
const STORE_NAME = 'drafts'
const ASSET_STORE_NAME = 'assets'
const DRAFT_KEY = 'current'
const DRAFT_VERSION = 2

export type PdfDraftSource = PdfSource & { bytes: ArrayBuffer }

export type PdfDraft = {
    version: number
    savedAt: number
    tool: PdfTool | null
    outputName: string
    splitMode: string
    rangeText: string
    everySize: string
    imageFormat: string
    exportAsImages: boolean
    compressionQuality?: string
    imageScale?: number
    formFlatten?: boolean
    sources: PdfDraftSource[]
    pages: PdfPageRef[]
}

function openDraftDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('เบราว์เซอร์นี้ไม่รองรับการบันทึกฉบับร่าง'))
            return
        }

        const request = indexedDB.open(DB_NAME, 2)
        request.onerror = () => reject(request.error ?? new Error('เปิดที่เก็บฉบับร่างไม่สำเร็จ'))
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
            if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) db.createObjectStore(ASSET_STORE_NAME)
        }
        request.onsuccess = () => resolve(request.result)
    })
}

export async function savePdfDraft(draft: Omit<PdfDraft, 'version' | 'savedAt'>) {
    const db = await openDraftDb()
    const value = {
        ...draft,
        version: DRAFT_VERSION,
        savedAt: Date.now(),
        // ไบต์ไฟล์เก็บแยก object store เพื่อไม่ต้อง clone ไฟล์ใหญ่ทุกครั้งที่แก้หน้า
        sources: draft.sources.map(({ bytes: _bytes, ...source }) => source),
    }

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME, ASSET_STORE_NAME], 'readwrite')
        const draftStore = transaction.objectStore(STORE_NAME)
        const assetStore = transaction.objectStore(ASSET_STORE_NAME)
        draftStore.put(value, DRAFT_KEY)
        const sourceIds = new Set(draft.sources.map((source) => source.id))
        assetStore.getAllKeys().onsuccess = (event) => {
            const keys = (event.target as IDBRequest).result as IDBValidKey[]
            const storedIds = new Set(keys.map(String))
            keys.forEach((key) => {
                if (!sourceIds.has(String(key))) assetStore.delete(key)
            })
            draft.sources.forEach((source) => { if (!storedIds.has(source.id)) assetStore.put(source.bytes, source.id) })
        }
        transaction.onerror = () => reject(transaction.error ?? new Error('บันทึกฉบับร่างไม่สำเร็จ'))
        transaction.oncomplete = () => resolve()
    }).finally(() => db.close())
}

export async function loadPdfDraft(): Promise<PdfDraft | null> {
    const db = await openDraftDb()
    try {
        const value = await readValue<PdfDraft & { sources: PdfSource[] }>(db, STORE_NAME, DRAFT_KEY)
        if (!value || value.version !== DRAFT_VERSION) return null
        const sources = await Promise.all(
            value.sources.map(async (source) => ({
                ...source,
                bytes: await readValue<ArrayBuffer>(db, ASSET_STORE_NAME, source.id),
            }))
        )
        if (sources.some((source) => !source.bytes)) return null
        return { ...value, sources: sources as PdfDraftSource[] }
    } finally {
        db.close()
    }
}

export async function clearPdfDraft() {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME, ASSET_STORE_NAME], 'readwrite')
        transaction.objectStore(STORE_NAME).delete(DRAFT_KEY)
        transaction.objectStore(ASSET_STORE_NAME).clear()
        transaction.onerror = () => reject(transaction.error ?? new Error('ลบฉบับร่างไม่สำเร็จ'))
        transaction.oncomplete = () => resolve()
    }).finally(() => db.close())
}

function readValue<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
        request.onerror = () => reject(request.error ?? new Error('อ่านฉบับร่างไม่สำเร็จ'))
        request.onsuccess = () => resolve(request.result as T | undefined)
    })
}

export function hasPdfDraftContent(draft: PdfDraft | null): draft is PdfDraft {
    return Boolean(draft && draft.pages.length > 0 && draft.sources.length > 0)
}
