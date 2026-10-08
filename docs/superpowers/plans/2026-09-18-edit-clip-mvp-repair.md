# Edit Clip: วิเคราะห์ปัญหาและแผนซ่อมฟังก์ชันหลัก

วันที่ตรวจ: 2026-09-18
หน้าเป้าหมาย: `/dashboard/programs/edit-clip`
อาการที่ผู้ใช้ยืนยัน: ปุ่มตัดต่อ/ฟังก์ชันอื่นทำงานไม่ตรง
ขอบเขตรอบนี้: วิเคราะห์และวางแผนเท่านั้น ยังไม่แก้โค้ดแอป

## ข้อสรุป

หน้านี้มี upload และ FFmpeg export จริง แต่ state ของ editor, สิ่งที่พรีวิว และ payload ที่ export ยังไม่สอดคล้องกัน รวมทั้งมีฟังก์ชันตัวอย่างปนอยู่ จึงไม่ใช่ปัญหาที่แก้ได้ด้วยการต่อ onClick เพียงจุดเดียว

แนะนำให้ทำรุ่นแรกเป็น **วิดีโอหนึ่งไฟล์ → เลือกหนึ่งช่วง → พรีวิวช่วงนั้น → export MP4 → ดาวน์โหลด** ให้ผ่านก่อน แล้วค่อยเปิดคำบรรยายที่กรอกเองและ draft ส่วน multi-segment, AI, เพลง และเอฟเฟกต์ขั้นสูงพักไว้ก่อน

ไม่ควรเขียนหน้าใหม่ทั้งหมด: เก็บ API upload/export/stream และ UI ที่ใช้ได้ ปรับเฉพาะเส้นทางหลักและ state ที่เกี่ยวข้อง

## หลักฐานและข้อจำกัดของการตรวจ

- ตรวจ source ปัจจุบัน รวมการเปลี่ยนแปลงที่ยังไม่ commit ใน `page.tsx`; repository มีงานอื่นค้างอยู่ ห้าม reset หรือทับงานเหล่านั้น
- `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` ผ่าน
- เครื่องนี้เรียก `ffmpeg -version` และ `ffprobe -version` ได้จาก PATH แต่ยังไม่ยืนยัน environment ของเว็บที่ผู้ใช้เปิดจริง
- นำ `handleExport` จาก source ปัจจุบันมา transpile และเรียกกับ response จำลอง: 401 JSON, 500 HTML และ SSE ที่จบโดยไม่มี terminal event ทั้งสามกรณีลงท้ายด้วย `progress=100`, `result=null`, ไม่มี error toast
- ยังไม่ได้ทดสอบหน้าเว็บผ่าน session ที่ login และยังไม่ได้ยืนยันการลาก timeline ในเบราว์เซอร์
- การเตรียมคลิปสังเคราะห์เพื่อทดสอบ FFmpeg route ติด `EPERM` ขณะสร้าง `tmp/edit-clip-audit-20260918` ใน execution context นี้ จึงไม่มีผลทดสอบ export จริงจากรอบนี้ ข้อจำกัดนี้ไม่ใช่หลักฐานว่าโปรเซสเว็บของผู้ใช้เขียนไฟล์ไม่ได้
- detector ของ impeccable สำหรับไฟล์หน้าเป้าหมายคืน `[]`; ไม่ถือเป็นหลักฐานว่าฟังก์ชันถูกต้อง เพราะ detector ไม่ตรวจ contract ของ editor/export
- เอกสารเก่า `docs/superpowers/specs/2026-08-02-edit-clip-design.md` เป็นข้อมูลประกอบ ไม่ใช้แทนการตรวจโค้ดปัจจุบัน โดยเฉพาะข้อความที่ระบุว่าแก้แล้ว

## ปัญหาที่พบ เรียงตามความเกี่ยวข้องกับอาการ

### 1. ที่จับ timeline มีชั้นข้อความวางทับพื้นที่รับเมาส์ [P1]

หลักฐาน: `app/dashboard/programs/edit-clip/page.tsx:1214`–`:1236`

ที่จับเริ่ม/จบใช้ `onMouseDown` แต่มี `<div className="absolute inset-0 ...">` ของข้อความ “ลากที่จับเพื่อกำหนดช่วง” วางตามหลังโดยไม่มี `pointer-events-none` หรือการจัด z-index ให้ที่จับอยู่ข้างบน โครงสร้างนี้เปิดโอกาสให้ชั้นข้อความรับเมาส์แทนที่จับ ต้องยืนยัน hit testing ในเบราว์เซอร์เป็นขั้นแรก

นอกจากนี้ที่จับไม่มี pointer/touch handlers และแม้มี `role="slider"`/`tabIndex` ก็ไม่มีการจัดการคีย์สำหรับที่จับโดยตรง ส่วนช่องเวลาเป็น `readOnly` จึงพิมพ์เวลาแก้ไม่ได้ (`:1169`–`:1179`)

แก้: ชั้นตกแต่งไม่รับ pointer events, ที่จับใช้ Pointer Events + pointer capture, มี keyboard controls และช่องเริ่ม/จบที่พิมพ์ได้พร้อม validation

### 2. Split/Delete/Add segment ไม่ใช่ timeline ที่ประกอบคลิปหลายช่วง [P1: ขอบเขตฟังก์ชัน]

หลักฐาน: `page.tsx:444`–`:487`, `:207`–`:244`; `app/api/export/route.ts:7`–`:38`, `:170`–`:178`

Split สร้าง segment ใน state แล้วเลือกช่วงด้านขวา, Delete เปลี่ยนไปช่วงแรกที่เหลือ และ export รับเพียง `trimStart/trimEnd` ไม่มี segments/concat การลบช่วงกลางจึงไม่ได้สร้างผลลัพธ์จากช่วงที่เหลือทั้งหมด UI มีข้อความบอกว่าเลือกช่วงที่จะ export อยู่แล้ว (`:1243`) แต่รูปแบบเครื่องมือตัดต่อทำให้คาดหวังได้ว่าจะตัดต่อหลายช่วง

อีกปัญหาจริง: เปลี่ยน trim ผ่าน slider ไม่อัปเดต segment เดิม คลิก segment อีกครั้งจึงคืนช่วงเก่า Split ก็ยังอิง segment เก่า ไม่ใช่ช่วง trim ที่เพิ่งปรับ

แก้ใน MVP: ซ่อนเครื่องมือหลายช่วงและคีย์ลัด S เหลือช่วงเดียว พร้อมข้อความ “ส่งออกเฉพาะช่วงที่เลือก” ไม่เพิ่ม concat ในรอบนี้

### 3. Undo บันทึกหลังแก้ และไม่ครอบคลุมการแก้ไขทุกช่อง [P1]

หลักฐาน: `page.tsx:149`–`:186`, `:1189`–`:1209`, `:1341`–`:1353`, `:523`–`:524`; `components/video-editor/edit-clip.types.ts:35`

slider เปลี่ยน state ผ่าน `onValueChange` แล้วค่อยเรียก `snapshotState` ใน `onValueCommit` จึงไม่ได้เก็บจุดเริ่มการลากอย่างแน่นอน Undo อาจคืนค่าเดียวกับปัจจุบันหรือย้อนข้ามขั้น `[ ]` ไม่ snapshot; snapshot ยังไม่รวม format, background, audio และ watermark การย้ายไปอีกไฟล์ไม่ clear history

แก้: ทุกการแก้ project ใช้ transaction เดียว เก็บ before-state ก่อนเริ่ม gesture และ commit หนึ่งครั้งเมื่อจบ; undo/redo ย้อนหนึ่ง gesture ได้หนึ่งขั้น; ไม่บันทึก currentTime/playback ลง history; reset history เมื่อเปลี่ยน source

### 4. เปลี่ยนไฟล์แล้วค่าเดิมค้าง และอัปโหลดแข่งกันได้ [P1]

หลักฐาน: `page.tsx:273`–`:310`, `:379`–`:391`

เลือกไฟล์ใหม่ไม่ได้ reset trim, segments, subtitles, currentTime หรือ history; metadata handler ตั้งใจรักษาค่า draft แต่ใช้กับการเลือกไฟล์ใหม่ด้วย เช่น ไฟล์ A trim 10–20 วินาที แล้วเลือก B ยาว 60 วินาที จะยังได้ 10–20 โดยไม่ใช่การ restore draft

เมื่อเลือก A แล้วเลือก B ก่อน A อัปโหลดเสร็จ ไม่มี request identity/abort; response ของ A ที่ช้ากว่าอาจเขียน `uploadedPath` ทับ B ทำให้ preview B แต่ export A

แก้: แยก `replaceSource` และ `restoreProject`; abort request เดิมหรือ ignore response ที่ source token ไม่ตรง; clear state/history ตามนโยบาย source ใหม่อย่างชัดเจน และพร้อม export หลัง metadata/upload ของ source ปัจจุบันผ่านทั้งคู่

### 5. Preview ไม่ตรงกับค่าที่แก้ [P1]

หลักฐาน: `page.tsx:58`–`:70`, `:189`–`:193`, `:1049`–`:1107`; `app/api/export/route.ts:76`–`:89`, `:231`–`:272`

- Filter None ถูกประกอบเป็น `none brightness(...) contrast(...) saturate(...)` ซึ่งเป็น CSS filter value ที่ไม่ถูกต้อง (`none` ใช้รวมกับ filter-function list ไม่ได้) การปรับสาม slider ขณะเลือก None จึงมีปัญหาตั้งแต่ค่าที่ส่งให้ browser
- JSX ของ video preview ไม่มี subtitle overlay ที่เลือกจาก currentTime; ข้อความถูกแสดงใน inspector และ burn ตอน export แต่ไม่ปรากฏในภาพ preview
- Blur preview ใช้ backdrop blur บนชั้นที่ไม่มีภาพสำเนาวิดีโอ ขณะที่ export ใช้ภาพสำเนาที่ขยายและเบลอจริง
- CSS preset กับ FFmpeg preset ใช้ค่าคนละชุด เช่น Vivid saturation 1.8 เทียบกับ 1.25; การแปลง brightness ก็คนละความหมาย จึงคาดหวังความเหมือนเป๊ะไม่ได้
- Fade/Zoom preview เป็น CSS transform/opacity คงที่ ไม่ใช่เอฟเฟกต์ตามเวลาที่ FFmpeg เรนเดอร์

แก้: MVP ปิด preset/transition/background blur ที่ยังไม่ตรงกัน ใช้พื้นดำกับ contain ก่อน ถ้ายังคง brightness/filter ต้องแก้การประกอบ CSS และตรวจผลเทียบ export; subtitle manual เพิ่มหลังแกนหลักผ่าน โดยเวลาและข้อความต้องตรงทั้งสองทาง

### 6. Export จบแบบผิดพลาดแต่แสดง 100% [P1; ทดสอบซ้ำได้แล้ว]

หลักฐาน: `page.tsx:807`–`:843`; `utils/supabase/middleware.ts:49`

client ไม่ตรวจ `res.ok` และ Content-Type, อ่านทุก response เป็น SSE แล้วกำหนด 100% เมื่อ reader จบ ถ้า session หมดอายุ API ตอบ 401 JSON จะไม่มี event ถูกอ่านและไม่มี error แสดง 500 HTML และสตรีมที่จบก่อน done ก็เหมือนกัน

แก้: ตรวจ HTTP status/Content-Type ก่อน, success ต้องมี terminal event `status=done` พร้อม download URL, EOF ก่อน terminal event ต้องเป็น interrupted/error พร้อม retry/recheck job; แสดง error ค้างในหน้าแทน toast อย่างเดียว

### 7. Draft คืนค่าไม่ครบ และ share ไม่รวม source [P1 หากเปิดฟังก์ชันนี้]

หลักฐาน: `page.tsx:207`–`:244`, `:337`–`:344`, `:680`–`:725`, `:749`–`:758`

draft ใช้ export payload ซึ่งไม่มี segments แม้ applyDraft พยายามอ่าน; restore ไม่คืน originalVolume, musicMedia หรือ voiceMedia; ไม่มี reset ค่าเก่าก่อน apply ทำให้การสลับ draft อาจพก audio จากงานก่อนมา ส่วน share payload ไม่มี videoId/audio จึงเป็นเพียงชุดตั้งค่าที่เปิดแล้วไม่มีคลิปต้นฉบับ

autosave เขียน localStorage ทุก 30 วินาที แต่ไม่ครอบ try/catch กรณี quota/storage ถูกปิด และอาจบันทึกสถานะที่ source ยังไม่พร้อม ไฟล์จริงอ้าง path ใน tmp ไม่ใช่ project storage ที่ทนต่อการลบไฟล์/ย้ายเครื่อง

แก้: ซ่อน share ใน MVP; draft รุ่นแรกใช้ schema มี version แยกจาก export DTO และ restore แบบเต็มเฉพาะฟังก์ชันที่เปิดรองรับ ตรวจ source ก่อน ready และแจ้ง local-only/ไฟล์หายให้ชัด ถ้ายังไม่ทำให้ครบให้ปิด draft/autosave พร้อมกันใน milestone แรก

### 8. ฟังก์ชัน AI และค่าเริ่มต้นเป็นข้อมูลตัวอย่าง [P2; ไม่อยู่ใน MVP]

หลักฐาน: `app/api/transcribe/route.ts:12`; `page.tsx:490`–`:497`, `:562`–`:565`; `components/video-editor/edit-clip-store.ts:15`

- transcribe คืนคำบรรยายชุดเดิม ไม่อ่านเสียง (UI มีคำเตือนตัวอย่างแล้ว)
- Find best moments เลือกช่วงต้นแบบคงที่ ไม่วิเคราะห์เนื้อหา
- caption/hashtag เป็นข้อความคงที่
- initial store ใส่ subtitle “Hook the viewer in the first second” ตั้งแต่เริ่ม และ export เปิด burnSubtitles ไว้ ทำให้ข้อความตัวอย่างมีโอกาสติดไฟล์โดยผู้ใช้ไม่ได้เพิ่มเอง

แก้: ปิด AI/highlight suggestions และเริ่ม subtitles เป็น array ว่าง ไม่มี demo content ในไฟล์ output

### 9. ความเสี่ยงใน export ที่ต้องจัดการก่อนใช้จริง [P1/P2]

หลักฐาน: `app/api/export/route.ts:108`–`:130`, `:188`–`:194`, `:304`–`:355`

- ชื่อ output ใช้ชื่อที่ผู้ใช้กรอกโดยตรงและ `-y`; สอง export ชื่อเดียวกันชี้ไฟล์เดียวกัน งานใหม่ทับลิงก์ของงานก่อนหรือชนกันได้ ให้เก็บไฟล์ด้วย job UUID และแยก display filename
- ffprobe ล้มแล้ว fallback เงียบเป็น duration=0/hasAudio=false แทนการหยุดพร้อม error; มีโอกาสส่งออกไม่มีเสียงโดยไม่อธิบาย
- ยังไม่มี runtime schema validation ของ request และตรวจช่วงเทียบ duration จริงอย่างเข้มงวด
- stream ไม่มี disconnect/cancel handling และ jobs อยู่ใน memory ไม่มี TTL; ห้ามถือว่า polling กู้ได้ข้าม restart/หลาย instance
- เพลง/voiceover มี player แยก ไม่ sync กับ video preview และ export readiness ไม่รอ audio upload; ทางแก้ MVP คือพัก audio เพิ่มเติมไว้ เหลือเสียงต้นฉบับเท่านั้น
- หากเปิด audio เพิ่มในอนาคต ต้องทดสอบเพลงสั้นกว่าคลิปเมื่อ mute original เพราะเส้นทาง `-shortest` อาจทำให้วิดีโอสั้นกว่าที่เลือก

## ขอบเขตที่เสนอ

### Milestone A: ใช้งานหลักได้ก่อน

1. อัปโหลดวิดีโอหนึ่งไฟล์ มี progress และ retry; กำหนดไฟล์ที่ browser เล่นได้เป็น baseline เช่น MP4 H.264/AAC ส่วนไฟล์ decode ไม่ได้ต้องมีสถานะอธิบายและห้ามอ้างว่า preview พร้อม
2. เล่น/หยุด/seek และวนช่วงที่เลือก โดย UI ผูก event ของ video จริง
3. Trim หนึ่งช่วงด้วยช่องตัวเลขและที่จับ รองรับเมาส์/สัมผัส/คีย์บอร์ด
4. Undo/Redo ของการแก้ project ที่เปิดใช้งานทั้งหมด
5. ปรับเสียงต้นฉบับและ mute
6. อัตราส่วน 9:16, 1:1, 16:9; contain + พื้นดำ; export 720p ก่อนเพื่อลดเวลารอ
7. Export MP4 H.264/AAC มีสถานะจริง/ข้อผิดพลาดจริง และดาวน์โหลดผลลัพธ์ที่ไม่ถูกงานถัดไปทับ

ซ่อน Split/Add/Delete segment, AI, suggestions, transitions, preset filters, เพลง/voiceover, share, watermark และตัวเลือกคุณภาพอื่นใน milestone นี้; ปิด demo subtitle และ duration cap อัตโนมัติ ใช้ความยาวช่วงที่เลือกจริง ค่าเดิมที่ซ่อนไว้ต้องไม่หลุดเข้า payload

### Milestone B: เพิ่มหลัง A ผ่าน

- คำบรรยายกรอกเอง: เพิ่ม/แก้/ลบ เวลา valid, overlay ใน preview, burn ตามเวลาเดียวกัน และรองรับภาษาไทยใน environment จริง
- Save/load draft + autosave แบบมี version, restore ครบเฉพาะขอบเขตที่รองรับ, แจ้งไฟล์หายและ storage error
- 1080p และตัวเลือกภาพอื่นที่ผ่านการตรวจ preview/export แล้ว

### ยังไม่ทำ

multi-clip/concat, AI transcription, AI highlight, subtitle styling ขั้นสูง, music/voiceover sync, effects/transition ขั้นสูง, thumbnail และ cloud share

## ลำดับงานสำหรับ AI ผู้ลงมือ

### งาน 1 — ล็อกขอบเขตและ state ของโปรเจกต์

- แก้ไฟล์ที่หน้า import จริง ไม่เอา `EditClipInspector.tsx` ซึ่งยังไม่มีใคร import มาแก้แล้วถือว่างานสำเร็จ
- ลด UI ตาม milestone A และเอาค่า demo ออกจาก initial store
- นิยาม typed `EditorProject` สำหรับ source/trim/format/audio และแยก playback/upload/export state
- ใช้ reducer หรือ hook กลางสำหรับ edit transaction, undo/redo, new source, restore; ไม่ต้องเพิ่ม state library ใหม่
- นิยาม validation กลาง `0 <= start < end <= duration` และทุกค่าเป็น finite number; ไม่ใช้การ clamp แทน error แบบทำให้ค่ากลับด้าน
- แยก domain project ออกจาก export request; draft v1 ต้องไม่ปน transport state

### งาน 2 — ซ่อม upload, preview, trim และ history

- request token/abort สำหรับอัปโหลด, reset state เมื่อเปลี่ยนไฟล์, ตรวจ metadata ของ source ปัจจุบัน
- export disabled จน video ready + upload ready + trim valid; errors มีสาเหตุและ recovery
- แก้ชั้น timeline รับ pointer ทับ, Pointer Events, keyboard handling และช่องเวลาทศนิยม
- snapshot ก่อนเริ่ม gesture หนึ่งครั้ง; Undo/Redo ทุกการแก้ค่าที่เปิดอยู่คืนค่าได้ตรง
- preview แสดงเฉพาะความสามารถที่ output รองรับใน A; หากปิด loop เล่นถึง trimEnd ให้หยุดตามนิยาม “พรีวิวช่วงที่เลือก” และ replay เริ่ม trimStart

### งาน 3 — ทำ export ให้เชื่อถือได้

- ใช้ Zod ที่มีอยู่แล้วตรวจ request และใช้ ffprobe validate source จริง โดยคืน actionable error หาก probe ล้ม/ไม่พบ video stream
- preflight FFmpeg/ffprobe และ write access ใน environment ที่รันจริง; อย่า hardcode path ใหม่และอย่าถือว่าเครื่องพัฒนาคือ production
- ชื่อไฟล์บนดิสก์ไม่ซ้ำด้วย jobId; ชื่อดาวน์โหลดใช้ชื่อผู้ใช้ผ่าน header แยกกัน
- client ตรวจ HTTP/Content-Type และ terminal event; แสดง preparing/processing/done/error/interrupted อย่างชัดเจน
- success ต้องมีไฟล์ที่ตรวจแล้วและ URL ดาวน์โหลด ไม่ใช่เพียงจบ stream
- กำหนด disconnect policy ให้แน่นอนและป้องกัน enqueue ลง stream ที่ปิดแล้ว; เพิ่ม TTL ของงานที่จบ ถ้าใช้ polling ให้จำกัดคำรับรองไว้ที่ single-process และแจ้ง job หายหลัง restart
- คง auth ของ API; ไม่ bypass login เพื่อให้การทดสอบผ่าน

### งาน 4 — ทดสอบ A ให้จบหนึ่งเส้นทาง

ใช้ synthetic fixture ใหม่ใน test directory ที่ได้รับสิทธิ์ ไม่แตะไฟล์ของผู้ใช้ ทดสอบบน environment เดียวกับ deployment ที่ต้องใช้งานจริง และ browser ที่ login แล้ว บันทึกคำสั่ง/ผลจริง ถ้าทดสอบไม่ได้ให้ระบุอย่างตรงไปตรงมา

### งาน 5 — ค่อยทำ B

subtitle overlay + validation + Thai burn test, จากนั้น draft restore/invalid file/storage errors พร้อม regression tests เท่านั้น อย่าเปิดฟังก์ชันที่เลื่อนไว้ก่อน A ผ่าน

## เกณฑ์รับงานและกรณีทดสอบที่จำเป็น

| กรณี | ผลที่ต้องได้ |
|---|---|
| source ยาว 10 วินาที ตั้ง 2.0–5.0 | preview เริ่ม 2.0; export ประมาณ 3.0 วินาที คลาดเคลื่อนไม่เกิน 0.1 วินาทีสำหรับ fixture คงที่; ไม่ได้ไฟล์เต็ม |
| ลากจับตรงกลางที่จับ/สัมผัส/ใช้คีย์ | ไม่ถูกชั้นข้อความบัง และได้ช่วงเดียวกับที่ช่องเวลาแสดง |
| start >= end, ค่าติดลบ, NaN, เกิน duration | มี error/ปิด export; server ปฏิเสธ payload ผิด ไม่ปรับเป็นช่วงอื่นเงียบ ๆ |
| ลาก trim 1 ครั้ง → Undo → Redo | คืนก่อนลาก/หลังลากอย่างละ 1 ครั้ง; ทดสอบคีย์ลัดและทุกช่องที่เปิดใช้ด้วย |
| A trim 10–20 → เปลี่ยนเป็น B ยาว 60 | ช่วงเริ่มใหม่ตามนโยบาย ไม่ค้าง 10–20; Undo ไม่พากลับ A |
| เลือก A แล้ว B ระหว่างอัปโหลด A | preview/source/path/export เป็น B เสมอ แม้ A ตอบทีหลัง |
| MP4 ไม่มี audio | export สำเร็จ ไม่มีการอ้าง stream เสียงที่ไม่มี |
| source มี audio / mute | output มีเสียงระดับที่กำหนด/เงียบตามเลือก |
| export 720p ทั้ง 3 อัตราส่วน | 720x1280 / 720x720 / 1280x720 ตามลำดับ ภาพ contain ไม่บิดและไม่มีข้อความ demo |
| 401 JSON / 500 HTML | แสดงข้อผิดพลาดและไม่แสดงเสร็จ 100%; 401 อธิบาย session หมดอายุ |
| SSE จบก่อน done / network ขาด | interrupted/error หรือ recheck job; ไม่สำเร็จปลอม |
| FFmpeg/ffprobe ใช้ไม่ได้ หรือ tmp เขียนไม่ได้ | แสดง error ที่บอกสาเหตุ; ไม่เงียบ/ไม่ถือว่าไฟล์พร้อม |
| export ชื่อเดียวกัน 2 งาน | ได้คนละไฟล์และลิงก์เดิมยังชี้ผลเดิม |
| ดาวน์โหลด | HTTP response/ไฟล์เปิดเล่นได้จริง ตรวจ codec, duration, dimensions ด้วย ffprobe |
| B: subtitle ต้นฉบับ 3–4 ใน trim 2–5 | preview ที่ source time ถูกต้อง; output ข้อความอยู่ 1–2 วินาที ไม่มีข้อความนอกช่วง |
| B: save/reload | source/trim/audio/format/subtitles ที่รองรับกลับมาครบ; ไฟล์หายแจ้งให้เลือกใหม่และห้าม export |

ระดับทดสอบ: unit สำหรับ reducer/validation/history; handler/integration สำหรับ HTTP/SSE และ FFmpeg; browser smoke สำหรับ upload → trim → export → download พร้อมการเปลี่ยนไฟล์และ Undo อย่าถือว่า tsc ผ่านแล้วเท่ากับใช้งานได้

## Prompt ส่งต่อ AI

> อ่าน `docs/superpowers/plans/2026-09-18-edit-clip-mvp-repair.md` และตรวจโค้ดปัจจุบันก่อนลงมือ แก้หน้า `/dashboard/programs/edit-clip` ตาม Milestone A ให้ครบเส้นทาง upload → trim หนึ่งช่วง → preview → export → download ก่อน โดยรักษางานอื่นที่ยังไม่ commit ไม่ redesign ทั้งหน้าและไม่เพิ่ม AI/multi-clip/เพลง/เอฟเฟกต์ขั้นสูง แก้ timeline hit area, source/upload race, trim validation, undo transaction, state reset และ export error handling ตามหลักฐานในแผน ใช้ API เดิมที่ใช้ได้และตั้ง output storage key ไม่ซ้ำ ปิดปุ่ม/ค่า default ของฟังก์ชันที่ยังไม่รองรับ จากนั้นทดสอบ acceptance cases ของ A และรายงานผลจริง หาก A ผ่านจึงทำ Milestone B เรื่อง manual subtitles และ draft ต่อ ระบุข้อจำกัดของ environment และสิ่งที่ยังไม่ได้ทดสอบอย่างชัดเจน ห้ามรายงานว่าสำเร็จจาก TypeScript ผ่านเพียงอย่างเดียว
