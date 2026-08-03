export type PageRotation = 0 | 90 | 180 | 270

export type PdfSource = {
    id: string
    name: string
    size: number
    pageCount: number
}

/**
 * ของที่ผู้ใช้วางทับลงบนหน้า — เก็บพิกัดเป็นสัดส่วนของหน้า (0..1 นับจากมุมบนซ้าย)
 * จึงไม่ผูกกับ zoom หรือขนาดจอ ส่วน fontSize เป็น pt บนหน้าจริงเพราะเป็นหน่วยสัมบูรณ์อยู่แล้ว
 */
export type Placement =
    | { id: string; kind: 'text'; x: number; y: number; text: string; fontSize: number; color: string }
    | { id: string; kind: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }

/** อ้างถึงหน้าหนึ่งหน้าในไฟล์ต้นทาง — เอกสารที่กำลังแก้คือ array ของ PdfPageRef */
export type PdfPageRef = {
    id: string
    sourceId: string
    sourceIndex: number
    rotation: PageRotation
    /** ของที่วางอยู่บนหน้านี้ ติดไปกับหน้าเมื่อสลับลำดับหรือทำสำเนา */
    placements: Placement[]
}

/** ทุกการแก้ไขในหน้าจอผ่าน operation ชุดนี้ชุดเดียว เพื่อให้ undo/redo ครอบคลุมครบ */
export type PdfOperation =
    | { kind: 'append'; pages: PdfPageRef[] }
    | { kind: 'reorder'; order: string[] }
    | { kind: 'delete'; pageIds: string[] }
    | { kind: 'duplicate'; pageIds: string[] }
    | { kind: 'rotate'; pageIds: string[]; degrees: 90 | 180 | 270 }
    | { kind: 'addPlacement'; pageId: string; placement: Placement }
    | { kind: 'updatePlacement'; pageId: string; placementId: string; patch: Partial<Placement> }
    | { kind: 'removePlacement'; pageId: string; placementId: string }

export type PageThumb = { url: string; width: number; height: number }

/** ภาพหน้าความละเอียดสูงสำหรับหน้าจอวางของ — baseRotation คือค่าหมุนที่ติดมากับไฟล์ต้นฉบับ */
export type PageRender = PageThumb & { baseRotation: number; pointWidth: number; pointHeight: number }

export type PdfTool = 'merge' | 'organize' | 'split' | 'edit' | 'convert'

export type SplitMode = 'ranges' | 'every' | 'each' | 'selection'

export type ImageFormat = 'png' | 'jpeg'
