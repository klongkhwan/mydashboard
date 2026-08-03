# Edit Clip Program Design

บันทึกสภาพจริงของหน้า `/dashboard/programs/edit-clip` (TikTok Clip Editor) — โครงสร้าง สัญญาระหว่าง UI กับ API ปัญหาที่เจอตอนตรวจ และสิ่งที่แก้ไปแล้วเมื่อ 2026-08-02

## Goal

ตัดคลิปสั้นสำหรับ TikTok/Reels ให้จบในหน้าเดียว — อัปโหลด → ตัดช่วง → ใส่เอฟเฟกต์/คำบรรยาย/เสียง → export เป็นไฟล์ 9:16 พร้อมโพสต์ โดยงานประมวลผลจริงทำด้วย FFmpeg บนเครื่อง server ไม่ต้องพึ่งบริการภายนอก

## สถาปัตยกรรม

```text
page.tsx (client, all state)
   │  POST /api/video/upload   (multipart, kind=video|audio)  → tmp/videos, tmp/audio
   │  POST /api/transcribe     (ยัง placeholder — คืน subtitle ตัวอย่าง)
   │  POST /api/export         (SSE stream: progress → done/error)
   │  GET  /api/video/stream   (ดู/ดาวน์โหลดไฟล์ใน tmp/)
   ▼
FFmpeg (resolve จาก FFMPEG_PATH → winget → PATH)
```

ทุกไฟล์อยู่ใต้ `tmp/` เท่านั้น: `tmp/videos` (ต้นฉบับ) · `tmp/audio` (เพลง/เสียงพากย์) · `tmp/exports` (ผลลัพธ์ + .srt ชั่วคราว) · `tmp/fonts` (ฟอนต์ลายน้ำ)

## หน้าจอ — 3 คอลัมน์

```text
┌──────────────────────────────────────────────────────────────────┐
│ TikTok Clip Editor                        สถานะ autosave · Job # │
├──────────────┬─────────────────────────────────┬─────────────────┤
│ Upload       │  พรีวิว (กรอบตามสัดส่วนที่เลือก)  │ Inspector       │
│ (drag&drop)  │  ▶ ⏪ ⏩ วนช่วง พรีวิว 1x  🔊     │ Effects/Text/   │
│              │  ───────●──────────────────      │ Audio/Format    │
│ Project      │  Trim start / end / duration     │                 │
│ Drafts       │  [====ช่วงที่เลือก====]           │ Export          │
│              │  ช่วงคลิป: ▭▭▭ (คลิกเลือก)        │ + ดาวน์โหลด     │
└──────────────┴─────────────────────────────────┴─────────────────┘
```

คีย์ลัด: `Space` เล่น/หยุด · `[` `]` ตั้งจุดเข้า/ออก · `←` `→` เลื่อน 1 วิ · `S` แบ่งช่วง · `Del` ลบคำบรรยายที่เลือก · `Ctrl+Z` / `Ctrl+Y` undo/redo — ทั้งหมดถูกปิดอัตโนมัติขณะโฟกัสอยู่ในช่องกรอกข้อความ

## Data model

```ts
type Subtitle = { id: string; startTime: number; endTime: number; text: string }
type ClipSegment = { id: string; start: number; end: number }

// สิ่งที่ undo/redo ย้อนได้ — ต้องตรงกับปุ่มที่เรียก snapshotState()
type EditorSnapshot = {
  trimStart: number; trimEnd: number
  filter: string; brightness: number; contrast: number; saturation: number; transition: string
  subtitles: Subtitle[]; segments: ClipSegment[]; outputName: string
}
```

payload ที่ส่งเข้า `/api/export` คือ object เดียวกับที่โชว์ในกล่อง Payload preview และเก็บลง localStorage เป็น draft (`edit-clip-draft`, รายการ `edit-clip-drafts` เก็บ 10 รายการล่าสุด) — โครงสร้างเดียวใช้ทั้ง export / draft / share link

## สิ่งที่เจอตอนตรวจ (ก่อนแก้)

| # | ปัญหา | ผลกระทบ |
|---|---|---|
| 1 | `useEffect` ที่อ่าน share link ใส่ `resetShareIndicator` (ฟังก์ชันสร้างใหม่ทุก render) ไว้ใน dependency | effect รันทุก render → set state วนไม่จบ + toast เด้งรัว |
| 2 | ปุ่มลากระดับเสียงไม่เคยถูกต่อเข้ากับ `video.volume` | เลื่อนแล้วเสียงไม่เปลี่ยน |
| 3 | `playing` ไม่ผูกกับ event จริงของ `<video>` | กดเล่นจนจบคลิปแล้วปุ่มยังค้างเป็น Pause |
| 4 | คีย์ลัดทำงานขณะพิมพ์ในช่องข้อความ | เคาะ space ในช่องคำบรรยายไม่ได้ · กด `[` `]` ไปตัดคลิปโดยไม่ตั้งใจ · `Del` ลบคำบรรยายทิ้ง |
| 5 | export ส่ง `videoId` เป็น `blob:` URL เมื่ออัปโหลดยังไม่เสร็จ | FFmpeg อ่านไม่ได้ → export ล้มโดยผู้ใช้ไม่รู้ว่าเพราะอะไร |
| 6 | เพลง/เสียงพากย์ส่งเป็น `blob:` URL เช่นกัน | ใส่เพลงเมื่อไหร่ export พังทันที |
| 7 | ลายน้ำเปิดเป็นค่าเริ่มต้น แต่ `drawtext` ถูกเรียกโดยไม่มี `fontfile` | บน Windows ที่ไม่มี fontconfig → export ล้มตั้งแต่ค่า default |
| 8 | `Vintage` map ไปเป็นฟิลเตอร์ชื่อ `sepia` ซึ่งไม่มีใน FFmpeg | เลือกฟิลเตอร์นี้แล้ว export ล้ม |
| 9 | พื้นหลังแบบ Blur ใส่ `boxblur` ทับทั้งภาพ | วิดีโอเบลอทั้งคลิป ทั้งที่ต้องการเบลอเฉพาะขอบที่เติมเต็มกรอบ |
| 10 | เวลาของ subtitle เขียนลง .srt ตามเวลาต้นฉบับ ไม่ได้ลบด้วย `trimStart` | ตัดคลิปกลางเรื่องแล้วคำบรรยายเลื่อนผิดตำแหน่งทั้งหมด |
| 11 | `quality`, `durationLimit`, `originalVolume`, `originalMuted` ถูกส่งไปแต่ไม่เคยถูกใช้ | ตั้งค่าแล้วไม่มีผลกับไฟล์ที่ได้ |
| 12 | `/api/video/stream?path=` เปิดไฟล์ตาม path ที่ client ส่งมาโดยไม่ตรวจ · `/api/export` ก็รับ path ใดก็ได้และเขียนไฟล์ผลลัพธ์ลงข้าง ๆ ไฟล์ต้นทาง | อ่านไฟล์อะไรก็ได้บนเครื่อง และเขียนไฟล์ลงที่ไหนก็ได้ |
| 13 | path ของ winget ฮาร์ดโค้ดเวอร์ชัน `ffmpeg-8.0.1-full_build` | เครื่องนี้อัปเป็น 8.1.2 แล้ว path ตายทันที (รอดเพราะ fallback ไป PATH) |
| 14 | ปุ่ม "Choose preset track" สร้าง Blob จากข้อความ `'demo music'` ตั้งชื่อเป็น .mp3 | ไม่ใช่ไฟล์เสียงจริง กดแล้วได้ของเสีย |
| 15 | Autosave แค่เปลี่ยนข้อความบนหัวเรื่องทุก 30 วิ ไม่ได้บันทึกอะไร | ผู้ใช้เชื่อว่างานถูกเซฟ ทั้งที่ไม่ได้เซฟ |
| 16 | โหลด draft/share มาแล้ว พอเลือกไฟล์วิดีโอ `onLoadedMetadata` รีเซ็ต trim ทับ | ค่าที่โหลดมาหายทุกครั้ง |
| 17 | Split / Delete segment / Add clip แก้แค่ state ไม่มีผลกับ export · "Speed 1x" ไม่ทำอะไรเลย | ปุ่มที่กดแล้วไม่เกิดอะไรขึ้นจริง |
| 18 | ป้ายเขียน "Drag & drop" แต่ไม่มี handler รับการลากไฟล์ · ไม่ตรวจขนาด 500MB ตามที่ประกาศ · ไม่มี progress ตอนอัปโหลด | ลากไฟล์ไม่ติด และไฟล์ใหญ่ดูเหมือนหน้าค้าง |

## สิ่งที่แก้แล้ว

**ฝั่งหน้าเว็บ** — แก้ #1–#6, #14–#18 ครบ: ต่อ volume/playbackRate เข้ากับ element จริง, ผูก `playing` กับ `onPlay/onPause/onEnded`, กันคีย์ลัดขณะพิมพ์และเพิ่ม `Ctrl+Z/Y`, เพิ่ม drag & drop + ตรวจขนาด + progress bar ของการอัปโหลด, ปิดปุ่ม Export จนกว่าอัปโหลดจะเสร็จพร้อมบอกเหตุผล, อัปโหลดเพลงและเสียงพากย์ขึ้น server ทันทีที่เลือก/อัดเสร็จแล้วส่ง path จริงตอน export, autosave เขียน draft ลง localStorage จริงพร้อมเวลาที่บันทึก, ตัดปุ่ม preset track ปลอมทิ้ง, ทำ "วนช่วงที่ตัด" ให้พรีวิวเล่นวนเฉพาะช่วงที่เลือก, เพิ่มตัวแก้คำบรรยาย (แก้ข้อความ/เวลาเข้า-ออก/กระโดดไปตำแหน่ง/ลบ), และ undo/redo ครอบคลุมเอฟเฟกต์ด้วยไม่ใช่แค่ trim

segment strip ตอนนี้ผูกกับ export จริง — คลิกช่วงไหน trim จะเปลี่ยนตามช่วงนั้น และ Split/ลบ/เพิ่มช่วงจะอัปเดต trim ให้ทันที ปุ่มความเร็วเปลี่ยนเป็น "พรีวิว Nx" พร้อมกำกับว่ามีผลกับการดูเท่านั้น เช่นเดียวกับ transition แบบ Slide ที่บอกตรง ๆ ว่าเป็นเอฟเฟกต์พรีวิว

**ฝั่ง API** — แก้ #7–#13: กราฟฟิลเตอร์เขียนใหม่เป็น `filter_complex` ชุดเดียว, พื้นหลัง Blur ใช้วิธี split → ขยายเต็มกรอบ+เบลอเป็นฉากหลัง → วางภาพคมทับตรงกลาง, `quality` กำหนดขนาดจริง (720p/1080p/ตามต้นฉบับ) คู่กับสัดส่วนที่เลือก, `durationLimit` ตัดความยาวจริง, ระดับเสียงต้นฉบับและการ mute มีผลกับ mix, subtitle ถูกเลื่อนเวลาให้ตรงกับคลิปที่ตัดแล้วและตัดเฉพาะบรรทัดที่อยู่ในช่วง, ลายน้ำคัดลอกฟอนต์ที่รองรับภาษาไทยมาไว้ใน `tmp/fonts` แล้วอ้างด้วย path สัมพัทธ์ (เลี่ยงปัญหา escape `C:`) ถ้าหาฟอนต์ไม่เจอจะ export ต่อพร้อมส่ง warning กลับมาแทนที่จะล้ม

path ทั้งหมดที่รับจาก client ผ่าน `safeMediaPath()` ใน `lib/media-paths.ts` — ต้องอยู่ใต้ `tmp/` เท่านั้น ไฟล์ผลลัพธ์เขียนลง `tmp/exports` เสมอ และ event `done` ส่ง `downloadUrl` กลับมาให้กดดาวน์โหลดได้จริง (เดิมได้แค่ path ตัวหนังสือใน toast) ตัวหา FFmpeg เลิกฮาร์ดโค้ดเวอร์ชัน เปลี่ยนเป็น `FFMPEG_PATH` → ค้นหาโฟลเดอร์ winget → PATH

**Auth** — `proxy.ts` รัน middleware ทุก path แต่เดิมกันเฉพาะ `/dashboard` ทำให้ `/api/video/*`, `/api/export`, `/api/transcribe` เรียกได้โดยไม่ต้องล็อกอิน (ยืนยันแล้วว่า curl เปล่า ๆ สั่ง FFmpeg ได้จริง) ตอนนี้ `MEDIA_API_PREFIXES` ใน `utils/supabase/middleware.ts` ตอบ **401 JSON** เมื่อไม่มี session — ตอบเป็น 401 ไม่ใช่ redirect เพราะผู้เรียกคือ `fetch()` ไม่ใช่การเปิดหน้า ส่วน API อื่น ๆ ของระบบไม่ถูกแตะ

**Draft กลับมาทำงานต่อได้** — draft เก็บ `videoId` อยู่แล้ว ตอนโหลดจึงดึงคลิปกลับผ่าน `/api/video/stream?path=` มาเล่นในพรีวิวและตั้ง `uploadState = ready` ให้ export ได้ทันทีโดยไม่ต้องเลือกไฟล์ใหม่ ถ้าไฟล์ถูกลบไปจาก `tmp/` แล้ว ตัว `<video>` จะยิง `onError` แล้วแจ้งผู้ใช้พร้อมปิดปุ่ม export แทนที่จะเงียบ

## Verification

รันจริงกับ FFmpeg 8.1.2 ผ่าน `/api/export` ด้วย payload ชุดเดียวกับที่หน้าเว็บส่ง (trim 1→4s, Vintage, พื้นหลัง Blur, ลายน้ำ, คำบรรยายไทย, เพลงพื้นหลัง, 720p 9:16):

- ได้ไฟล์ h264 **720x1280 ยาว 3.000s** เสียง aac — ตรงกับสัดส่วน/คุณภาพ/ช่วงที่สั่ง
- เฟรมที่ดึงออกมาตรวจ: ฉากหลังเบลอเฉพาะขอบบน-ล่าง ภาพหลักคมชัดอยู่กลางกรอบ · ฟิลเตอร์ซีเปียติด · คำบรรยายภาษาไทยเรนเดอร์ถูกต้องและอยู่ในจังหวะที่ถูกหลังเลื่อนเวลา · ลายน้ำมุมขวาล่าง
- `/api/video/stream` และ `/api/export` ปฏิเสธ path นอก `tmp/` (`C:\Windows\win.ini`, `tmp\..\package.json` → 404 / error) และยังเปิดไฟล์ใน `tmp/` ได้ปกติ
- `tsc --noEmit` ผ่านทั้งโปรเจกต์

**ยังไม่ได้ทดสอบ**: พฤติกรรม UI ในเบราว์เซอร์ เพราะ `/dashboard/*` มี middleware บังคับ login (ตอบ 307 ไปหน้าเข้าสู่ระบบ) — ส่วนนี้ตรวจได้แค่ระดับ type/JSX

## ยังไม่ได้ทำ

| รายการ | เหตุผล |
|---|---|
| **`/api/transcribe` ยังเป็น placeholder** | คืนคำบรรยายตัวอย่างคงที่ ไม่ได้ถอดเสียงจริง — **ตัดสินใจเมื่อ 2026-08-02 ว่าพักไว้ก่อน** เพราะทั้งสองทางต้องขออนุมัติ: OpenAI Whisper API ต้องมี `OPENAI_API_KEY` และเสียงต้องออกจากเครื่อง ส่วน faster-whisper ต้องติดตั้ง venv + โมเดล ~1GB และถอดเสียงบน CPU ช้า ตอนนี้หน้าเว็บกำกับไว้แล้วว่าปุ่มนี้ยังเป็นตัวอย่าง |
| **ภาพปก (thumbnail)** | payload ส่ง `format.thumbnailTime` ทุกครั้งแต่ export route ไม่เคยใช้ ทั้งที่มี `/api/video/thumbnail` อยู่แล้ว — ต่อให้ครบได้ไม่ยาก |
| **job ที่ค้างใน memory** | `jobs` Map ใน export route ไม่เคยถูกลบ และถ้า SSE หลุดกลางทาง client ไม่ได้ poll `GET /api/export?jobId=` ต่อ (endpoint มีอยู่แล้ว) |
| **export หลายช่วงต่อกัน** | ตอนนี้ export ได้ช่วงเดียว (ช่วงที่เลือก) การต่อหลายช่วงต้องใช้ `trim`+`concat` และต้องคิดเรื่องเวลาของ subtitle ที่จะเลื่อนตามช่วงที่ถูกตัดออก |
| **transition แบบ Slide / ความเร็วคลิป** | เป็นพรีวิวเท่านั้น การทำจริงต้องมี timeline หลายคลิปก่อน |
| **`components/video-editor/EditClipInspector.tsx`** | เขียนค้างไว้ ไม่มีใคร import และเนื้อหาไม่ตรงกับ inspector ที่ใช้จริง — ควรลบหรือทำให้เป็นตัวจริงตัวเดียว |
| **routes อื่นที่ยังฮาร์ดโค้ด path ffmpeg** | `video/cut`, `video/merge`, `video/thumbnail`, `video/info` ยังชี้ `ffmpeg-8.0.1-full_build` อยู่ ควรย้ายมาใช้ `resolveFFmpegBinary()` ให้หมด |
| **ล้างไฟล์ใน `tmp/`** | ไฟล์อัปโหลดและไฟล์ export ค้างสะสมไปเรื่อย ๆ ยังไม่มีนโยบายลบ |
