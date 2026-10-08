export type PageRotation = 0 | 90 | 180 | 270

export type PageCrop = { top: number; right: number; bottom: number; left: number }

export type PdfSource = {
    id: string
    name: string
    size: number
    pageCount: number
    formValues?: Record<string, PdfFormValue>
}

export type PdfFormValue = string | string[] | boolean

export type PdfFormFieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'optionList' | 'button' | 'signature' | 'unknown'

export type PdfFormField = {
    name: string
    kind: PdfFormFieldKind
    value: PdfFormValue | null
    options?: string[]
    readOnly: boolean
    required: boolean
    multiline?: boolean
    maxLength?: number
    multiple?: boolean
}

/**
 * ของที่ผู้ใช้วางทับลงบนหน้า — เก็บพิกัดเป็นสัดส่วนของหน้า (0..1 นับจากมุมบนซ้าย)
 * จึงไม่ผูกกับ zoom หรือขนาดจอ ส่วน fontSize เป็น pt บนหน้าจริงเพราะเป็นหน่วยสัมบูรณ์อยู่แล้ว
 */
export type Placement =
    | {
          id: string
          kind: 'text'
          x: number
          y: number
          text: string
          fontSize: number
          color: string
          w?: number
          opacity?: number
          align?: 'left' | 'center' | 'right'
          rotate?: number
          lineHeight?: number
          dynamic?: 'pageNumber'
      }
    | { id: string; kind: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }
    | { id: string; kind: 'highlight'; x: number; y: number; w: number; h: number; color: string; opacity: number }
    | { id: string; kind: 'line'; x: number; y: number; w: number; h: number; color: string; opacity: number; strokeWidth: number }
    | { id: string; kind: 'note'; x: number; y: number; w: number; h: number; text: string; fontSize: number; color: string }

/** อ้างถึงหน้าหนึ่งหน้าในไฟล์ต้นทาง — เอกสารที่กำลังแก้คือ array ของ PdfPageRef */
export type PdfPageRef = {
    id: string
    sourceId: string
    sourceIndex: number
    rotation: PageRotation
    crop?: PageCrop
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
    | { kind: 'setCrop'; pageIds: string[]; crop: PageCrop | null }
    | { kind: 'batch'; operations: PdfOperation[] }

export type PageThumb = { url: string; width: number; height: number }

/** ภาพหน้าความละเอียดสูงสำหรับหน้าจอวางของ — baseRotation คือค่าหมุนที่ติดมากับไฟล์ต้นฉบับ */
export type PageRender = PageThumb & { baseRotation: number; pointWidth: number; pointHeight: number }

export type PdfTool = 'merge' | 'organize' | 'split' | 'edit' | 'convert' | 'compress' | 'form'

export type SplitMode = 'ranges' | 'every' | 'each' | 'selection'

export type ImageFormat = 'png' | 'jpeg'

export type ImageScale = 1 | 2 | 4

export type CompressionQuality = 'high' | 'balanced' | 'small'
