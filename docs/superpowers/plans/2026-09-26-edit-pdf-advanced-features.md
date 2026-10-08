# แผนเพิ่มความสามารถขั้นสูงให้ Edit PDF

วันที่: 2026-09-26
สถานะ: ดำเนินการเฟส 0 และฟอร์ม AcroForm รุ่นแรกแล้ว; ความสามารถที่ต้องใช้ engine เพิ่มยังปิดไว้

เอกสารนี้ขยายขอบเขตจาก `2026-09-26-edit-pdf-improvements.md` เฉพาะ 5 ฟีเจอร์ที่ผู้ใช้ร้องขอ: แก้ข้อความต้นฉบับ, redaction, รหัสผ่าน, ฟอร์ม และ PDF↔Word/Excel ไม่เปลี่ยนสถานะงานเดิมที่ยังค้างเป็นเสร็จแล้ว

บันทึกการส่งมอบรอบนี้: แก้ geometry/layout และ draft flush ตามเฟส 0, เพิ่มโหมดกรอก AcroForm แบบเอกสารเดียว, รองรับ text/checkbox/dropdown/radio/option list, ฝังฟอนต์ไทยเมื่อมีค่าไทย และเลือก Flatten ได้ โหมดฟอร์มล็อกการจัดหน้าเพื่อรักษา field/widget tree เดิม การแก้ข้อความต้นฉบับ, redaction, รหัสผ่าน และ PDF↔Office ยังไม่เปิดจนกว่าจะผ่านการทดลอง engine และเกณฑ์ตรวจรับของแผนนี้

## 1. ข้อเสนอหลัก

- คงเครื่องมือเดิม แต่ใช้ชื่อ “เพิ่มข้อความ / เซ็นชื่อ” และคำอธิบาย “เพิ่มข้อความบนหน้าเอกสาร ยังไม่แก้ข้อความต้นฉบับ” จนกว่าเครื่องมือใหม่จะผ่านการตรวจรับ
- ส่งมอบฟอร์ม AcroForm ก่อน เพราะใช้ไลบรารีเดิมต่อยอดได้ แล้วเปิดความสามารถรหัสผ่าน, redaction และแก้ข้อความตามผลทดลอง engine
- ทดลอง engine ที่ทำงานใน browser/worker ก่อน เพื่อรักษาพฤติกรรมประมวลผลในเครื่อง การใช้เซิร์ฟเวอร์หรือบริการภายนอกต้องเป็นโหมดที่ผู้ใช้เลือกและเห็นก่อนส่งไฟล์
- แยก PDF↔Office เป็นงานประเมินคุณภาพ 4 ทิศทาง ไม่ถือว่าการแปลงกลับจะกู้รูปแบบหรือสูตรเดิมได้สมบูรณ์
- ใช้ feature flags: ฟีเจอร์ที่ engine หรือชนิดเอกสารไม่รองรับแสดงเหตุผล ไม่เปิดปุ่มที่ส่งออกผิดหรือใช้การวางข้อความทับแทนโดยเงียบ ๆ

## 2. ฐานระบบและข้อจำกัดที่ตรวจแล้ว

| ส่วน | ปัจจุบัน | ผลต่อแผน |
|---|---|---|
| PDF.js | โหลด/แสดงหน้า; types ที่ติดตั้งมี password และ onPassword | เพิ่มหน้ารับรหัสได้ แต่ต้องมีเส้นทางแก้และส่งออกเอกสารเข้ารหัสด้วย |
| pdf-lib 1.17.1 | สร้าง PDF และวาด placements; รองรับ AcroForm | ใช้กรอกฟอร์มได้ แต่ไม่ใช้เป็น engine แก้ข้อความเดิมหรือถอดรหัส |
| buildPdf | สร้างเอกสารใหม่ด้วย copyPages แล้ววาด placements | ต้องตรวจรักษา AcroForm และข้อมูลระดับ document; ห้ามถือว่า copyPages ย้าย field tree ครบ |
| document state | หน้าอ้าง sourceId/sourceIndex; history เก็บ pages/sources | การแก้ต้นฉบับต้องมี source revision และ commit ทั้งเอกสาร ไม่แก้ buffer ที่ history ใช้อยู่ |
| draft | IndexedDB เก็บ source bytes กับข้อมูลหน้า | ต้องเพิ่มนโยบายข้อมูลอ่อนไหวและ migration ก่อนรับรหัสผ่าน/redaction |
| UI | ระบุว่าไฟล์ประมวลผลใน browser | ต้องเปลี่ยนข้อความตามโหมดจริงหากมี Office converter บน server |

pdf-lib ระบุว่าไม่มี API แก้ข้อความนอกช่องฟอร์ม และ `ignoreEncryption` ไม่ได้ถอดรหัส จึงห้ามใช้เป็นทางลัดเพื่อรองรับไฟล์ล็อก ([ข้อจำกัด pdf-lib](https://github.com/Hopding/pdf-lib/blob/master/README.md#limitations), [Encryption handling](https://github.com/Hopding/pdf-lib/blob/master/README.md#encryption-handling))

## 3. เฟส 0 — ปิดข้อผิดพลาดเดิมก่อนต่อยอด

สถานะรอบนี้: ลงมือแก้ครบ 6 รายการในโค้ดที่ใช้วาด/ส่งออกและ draft lifecycle แล้ว มี regression fixture ใน `tests/pdf-editor-utils.test.mjs` ครอบคลุม CropBox, placement geometry, wrapping, AcroForm และ Flatten

ทำ 6 รายการจากผล review ล่าสุดให้มี regression tests:

1. Flush draft เมื่อเปลี่ยน route ภายในแอป รวมการออกก่อน debounce; แสดง “บันทึกแล้ว” หลัง transaction สำเร็จเท่านั้น
2. ให้ alignment ของข้อความซ้าย/กลาง/ขวาตรงกัน และคำนวณแยกแต่ละบรรทัด
3. ใช้ทิศและจุดหมุนเดียวกันสำหรับลายน้ำใน DOM, canvas และ PDF
4. ใช้ text layout ร่วมกันสำหรับ wrapping, line-height, padding และ overflow ของโน้ต
5. กำหนด geometry จาก CropBox/MediaBox และ origin เดียวกันทุกเส้นทาง รวมหน้าหมุน
6. ใช้ตำแหน่งเส้นเดียวกันใน preview และ export

เกณฑ์ผ่าน: workflow เดิมยังใช้งานได้, PDF/ภาพที่ส่งออกตรงกับ fixture, เปลี่ยน route แล้วคืนงานล่าสุดได้ และไม่พบปัญหา P1 ค้างอยู่ในส่วนนี้

## 4. เฟส 1 — ทดลอง engine และจัดโครงสร้างร่วม

### งานทดลองที่ต้องมีผลจริง

| ความสามารถ | ตัวเลือกเริ่มทดลอง | สิ่งที่ต้องพิสูจน์ |
|---|---|---|
| กรอกฟอร์ม | PDF.js + pdf-lib เดิม | ค่าและ appearance อยู่ครบเมื่อเปิดใหม่ โดยเฉพาะไทยและหลาย widgets ต่อ field |
| รหัสผ่าน / redaction | MuPDF JavaScript/WASM หรือ engine ใน commercial SDK | ทำงานใน browser จริง, ยกเลิกได้, export แล้วตรวจโครงสร้างได้, memory อยู่ในงบ |
| แก้ข้อความเดิม | Commercial content-editing SDK เช่น Apryse | แก้ content จริง, ภาษาไทย, subset fonts, layout; ต้องระบุ license/module ที่ใช้ |
| Word/Excel → PDF | LibreOffice ใน worker ฝั่ง server ที่ควบคุมเอง หรือ Office engine ที่ผ่าน benchmark | ฟอนต์, pagination, ตาราง, print area และ deployment รองรับ |
| PDF → Word/Excel | Converter เฉพาะทาง เช่น Adobe PDF Services หรือ SDK ที่ติดตั้งเอง | คุณภาพการ reconstruct เอกสาร/ตาราง, ไทย/OCR, ค่าใช้จ่ายและเส้นทางข้อมูล |

MuPDF มี API applyRedactions แต่การเลือก engine นี้ต้องผ่านการทบทวน license ซึ่งมี AGPL และ commercial; ยังไม่ถือว่าติดตั้งใช้ในผลิตภัณฑ์ได้โดยไม่มีเงื่อนไข ([Redaction API](https://mupdf.readthedocs.io/en/1.28.5/reference/javascript/types/PDFPage.html), [License](https://mupdf.readthedocs.io/en/latest/license.html))

Apryse มี ContentEditManager สำหรับแก้เนื้อหา ให้ใช้เป็นตัวเลือกทดลอง ไม่ถือว่าเอกสารไทยและฟอนต์ทุกชนิดผ่านแล้ว ([ContentEditManager](https://sdk.apryse.com/api/web/Core.ContentEditManager.html))

ผลส่งมอบของเฟส: capability matrix พร้อมเวอร์ชันจริง, fixture outputs, เวลา/memory, license/ราคาเท่าที่มีหลักฐาน, deployment requirements และเอกสารตัดสินใจเลือก engine หากตัวเลือกไม่ผ่าน ให้คงฟีเจอร์นั้นปิดไว้และเสนอทางเลือก ไม่ลดความหมายของฟีเจอร์

### โครงสร้างที่เสนอ

- `usePdfProject`: document revision, pages, form values, placements, history, draft policy และ dirty/export revision
- `PdfEngineAdapter`: inspect capabilities, open/authenticate, text editing, forms, redact, save/encrypt; adapter ที่ไม่รองรับต้องคืนผล unsupported ชัดเจน
- `pdf-geometry` และ `pdf-text-layout`: แปลงพิกัด/จัดข้อความชุดเดียวกันทุกเครื่องมือ
- `pdf-task-worker`: jobId, revision, progress, cancel; ทิ้งผลจากงานเก่า และใช้ worker termination เมื่อ engine หยุดกลางงานไม่ได้
- `pdf-export-pipeline`: ทำงานบน snapshot เดียว; จัดหน้า/แก้เนื้อหา → บันทึกฟอร์ม/placements → redaction + sanitization → full save → ตรวจสอบ → encryption ขั้นสุดท้าย → ตรวจเปิดกลับ
- เพิ่ม source revision หลังแก้ต้นฉบับ, invalidate thumbnail/text cache, remap page/field IDs และ commit แบบ atomic เมื่อสำเร็จเท่านั้น
- History ของการแก้ข้อความ/ฟอร์มย้อนกลับได้ตาม revision; redaction ที่ apply สำเร็จเป็นขอบเขตใหม่และล้าง history ที่มีข้อมูลก่อนปกปิด
- Draft schema ใหม่มี migration ของ v2; ข้อมูลที่ไม่สมบูรณ์ต้องไม่เปิดเป็นเอกสารผิด ๆ; ไม่ serialize engine handles หรือรหัสผ่าน

## 5. ฟีเจอร์ A — แก้ข้อความเดิมใน PDF

### ขอบเขตรุ่นแรก

- เมนูแยก “เพิ่มข้อความ” กับ “แก้ข้อความเดิม” อย่างชัดเจน
- รุ่นแรกแก้คำ/บรรทัดหรือ text block ที่ engine ระบุว่าแก้ได้ โดยเริ่มจาก PDF ที่มีข้อความจริง
- รองรับไทย/อังกฤษ, คงตำแหน่ง ขนาด และสี; ใช้ฟอนต์เดิมเมื่อรองรับ glyph ใหม่ มิฉะนั้นให้เลือกฟอนต์ทดแทนและดู preview
- ไม่รับรองการไหลย่อหน้าข้ามหน้า; ถ้าข้อความล้นกล่องให้แจ้งและปรับขนาด/กรอบได้โดยไม่ตัดทิ้งเงียบ ๆ
- ไฟล์สแกนหรือข้อความที่เป็นเส้นเวกเตอร์แสดงว่า “ไม่พบข้อความที่แก้ได้”; OCR เป็นขั้นตอนแยกในอนาคต ไม่แอบสลับไปเพิ่มข้อความทับ

### งานพัฒนา

1. ตรวจชนิดหน้าและสร้าง text hit-testing ที่ใช้ geometry ร่วมกับ canvas
2. เปิด editor ของ text block พร้อมรักษา reading order และข้อมูลตำแหน่งจาก engine
3. เขียนกลับ content stream ผ่าน engine ไม่ใช้ regex แก้ PDF bytes และไม่ใช้กล่องสีขาวบังข้อความเดิม
4. สร้าง source revision ใหม่พร้อม Undo/Redo; คำนวณผลกระทบต่อ placements เดิมหาก block เปลี่ยนขนาด
5. แจ้งผลต่อ digital signatures ก่อนแก้เอกสารที่ลงลายเซ็นดิจิทัล; ยังไม่รับรองการคงความถูกต้องของลายเซ็น

### เกณฑ์ตรวจรับ

- แก้คำเฉพาะจุดแล้วเปิดไฟล์ใหม่เห็นคำใหม่; text extraction ไม่พบคำเก่าในจุดที่แก้ และไม่มีข้อความซ้อน
- ไทย สระ/วรรณยุกต์, ligatures, subset fonts และข้อความหมุนผ่าน fixture ของชนิดที่ประกาศรองรับ
- ส่วนที่ไม่ได้แก้ไม่เคลื่อนโดยไม่ตั้งใจ; Undo/Redo และ restore revision ทำงาน
- การแก้ข้อความทั่วไปไม่ถูกโฆษณาว่าเป็นการปกปิดข้อมูลถาวร

## 6. ฟีเจอร์ B — ปกปิดข้อมูลถาวร (Redaction)

### ขอบเขตและ UX

- ลากพื้นที่บนหน้า เลือกหลายพื้นที่/หลายหน้า ดูรายการ และลบเครื่องหมายก่อน apply
- ค้นหาคำแล้วเสนอจุดที่พบเป็นระยะถัดไป; รุ่นแรกใช้พื้นที่ที่ผู้ใช้ตรวจเองก่อน
- แยกสถานะ “ทำเครื่องหมายรอปกปิด” กับ “ปกปิดถาวรแล้ว”; ปุ่ม apply อธิบายว่าฉบับผลลัพธ์กู้เนื้อหาที่ลบไม่ได้
- ขอบเขตการลบหลักคือพื้นที่ที่เลือก หากข้อมูลเดียวกันมีอยู่อีกหน้า ต้องเลือกเพิ่ม; ไม่อ้างว่าปิดข้อมูลทั้งเอกสารจากการเลือกจุดเดียว

### งานพัฒนา

1. เก็บ redaction regions แยกจาก highlight และ resolve พิกัดหลัง crop/rotate ให้ตรงกับ content จริง
2. ใช้ engine ลบตัวอักษร ภาพ/พิกเซล และ vector ที่สัมพันธ์กับพื้นที่ รวม OCR text layer, nested Form XObjects และ hidden layers ในขอบเขตนั้น
3. จัดการ annotations, links, field values/default values และ appearance ที่อาจเปิดเผยข้อมูลในพื้นที่; ไม่เหลือฟอร์มที่กดอ่านค่าเดิมได้
4. กำหนด output แบบ sanitized: ล้าง metadata ที่ไม่จำเป็น, comments, attachments, embedded originals, thumbnails และโครงสร้างอื่นที่อาจเก็บสำเนา; แจ้งองค์ประกอบที่จะถูกเอาออกก่อน apply
5. เขียนไฟล์ใหม่แบบ full rewrite พร้อมเก็บกวาด objects ที่ไม่ใช้ ห้ามใช้ incremental save หรือแนบไฟล์ต้นฉบับในผลลัพธ์
6. ตรวจไฟล์ผลลัพธ์ก่อนดาวน์โหลด ถ้า redaction หรือ verification ไม่สำเร็จให้หยุด ไม่ดาวน์โหลดไฟล์ที่แค่ทาสีทับ
7. เมื่อ apply สำเร็จ เปลี่ยน working document เป็น sanitized revision; ล้างประวัติ, draft assets, thumbnail/text caches และคำค้นที่บันทึกไว้ซึ่งอ้างฉบับก่อนปกปิด
8. ต้นฉบับที่ผู้ใช้เลือกจากดิสก์ยังอยู่ตามเดิมและไม่ได้ถูกแก้หรือลบ; ไม่อ้างว่าสามารถ secure erase หน่วยความจำหรือ storage ของ browser ได้

### เกณฑ์ตรวจรับ — ห้ามปล่อยหากไม่ผ่าน

- ข้อมูลลับสังเคราะห์ที่ใส่ใน fixture ไม่ปรากฏใน text extraction, decompressed objects, form data, annotations, metadata หรือ attachments ของผลลัพธ์ในขอบเขตที่ต้องลบ
- ดึง image resources ออกมาตรวจแล้วไม่มีพิกเซลต้นฉบับใต้พื้นที่ปกปิด; การเปิด/ปิด layer หรือย้าย annotation ไม่ทำให้เห็นข้อมูลเดิม
- ตรวจ incremental revisions และ orphan objects; การค้นหา string ใน bytes เพียงอย่างเดียวไม่ถือว่าเพียงพอ
- ตรวจด้วย parser/viewer อิสระจาก engine ที่ใช้ปกปิด รวมไฟล์หมุน, cropped, OCR, reused images และ objects ที่ใช้ร่วมหลายหน้า
- Cancel/failed verification ไม่เปลี่ยนเอกสารปัจจุบัน; หลัง apply สำเร็จ Undo/restore ภายในงานนี้ไม่คืนข้อมูลก่อนปกปิด

## 7. ฟีเจอร์ C — เปิดไฟล์ด้วยรหัสผ่าน / ตั้งรหัสผ่าน

### ขอบเขตรุ่นแรก

- เปิด PDF ที่ใช้รหัสผ่านเอกสารมาตรฐาน: รับรหัส, แจ้งรหัสผิด, ลองใหม่ และยกเลิกเฉพาะไฟล์ได้
- ตั้ง/เปลี่ยนรหัสสำหรับเปิดไฟล์ผลลัพธ์ โดยเริ่มจาก AES-256 เมื่อ engine และ viewer fixtures ผ่าน
- แยก open password ออกจาก owner/permissions password; ตั้งข้อจำกัดพิมพ์/คัดลอกเป็นระยะถัดไปและไม่อ้างว่าเทียบเท่าการปกปิดข้อมูล
- ไม่รองรับ certificate encryption หรือ DRM ภายนอกในรุ่นแรก; รายงานชนิดที่ไม่รองรับอย่างชัดเจน

### งานพัฒนา

1. ใช้ PDF.js onPassword ในขั้นเปิด พร้อม engine authenticate/decrypt สำหรับ working document ไม่ใช่เปิด preview ได้แต่ export ไม่ได้
2. ตรวจสิทธิ์ที่เอกสารอนุญาตและแสดงโหมดอ่านอย่างเดียวเมื่อ engine ไม่อนุญาตแก้ไข
3. เก็บรหัสและ decoded content ในหน่วยความจำระหว่าง session; ไม่เก็บรหัสใน logs, URL, analytics, localStorage หรือ IndexedDB
4. เอกสารที่เข้ารหัสหรือกำลังตั้งรหัสใช้ draft policy แบบ memory-only เป็นค่าเริ่มต้น; ถ้าจะรองรับ draft บนดิสก์ต้องเข้ารหัสทั้ง source/edits/cache และปลดล็อกใหม่เมื่อ restore
5. Encrypt หลังแก้เนื้อหา/ฟอร์ม/redaction เสร็จแล้วเท่านั้น; ทุกไฟล์ PDF ใน split ZIP ใช้ policy ที่เลือก ส่วน PNG/JPG ไม่ได้รับการป้องกันจากรหัส PDF และต้องแจ้งก่อนส่งออก
6. ไม่ส่งออกเอกสารที่เดิมล็อกเป็น plaintext โดยไม่แจ้ง; ถ้ารักษารหัสเดิมไม่ได้ให้ขอรหัสผลลัพธ์หรือให้ผู้ใช้เลือกนำรหัสออกอย่างชัดเจน

### เกณฑ์ตรวจรับ

- รหัสถูก/ผิด/ว่าง/ยกเลิกทำงาน และไม่ค้าง worker; ทดสอบชุดอัลกอริทึม input ที่ประกาศรองรับ รวมรหัสภาษาไทยตามขอบเขต engine
- ไฟล์ใหม่เปิดโดยไม่มีรหัสหรือรหัสผิดไม่ได้; รหัสถูกเปิดได้ใน viewer อย่างน้อยสองตัว และเนื้อหา/ฟอร์มอยู่ครบ
- หลังรีเฟรชไม่มีรหัสหรือ plaintext draft หลงเหลือใน persistent stores ของโหมด memory-only
- workflow unlock → edit/forms → redact → encrypt → reopen ผ่านโดยไม่สูญเสียข้อมูลที่ต้องรักษา

## 8. ฟีเจอร์ D — กรอกฟอร์ม PDF

### ขอบเขตรุ่นแรก

- AcroForm text field แบบบรรทัดเดียว/หลายบรรทัด, checkbox, radio, dropdown และ option list
- ตรวจพบช่องกรอกแล้วให้คลิกบนหน้า หรือเลือกจากรายการชื่อ field; รองรับ Tab และแสดง read-only/required/max length
- ส่งออกได้สองแบบ: “คงช่องกรอกให้แก้ต่อ” และ “รวมค่าลงหน้าเอกสาร (Flatten)” โดยโหมดนี้รับเอกสารเดียวและล็อกการจัดหน้าเพื่อไม่ให้ field/widget tree หลุดจากต้นฉบับ
- XFA และแบบฟอร์มสแกนที่ไม่มี fields แสดงข้อจำกัด; ไม่ถือว่าการวางข้อความบนภาพคือการกรอกฟอร์มจริง

### งานพัฒนา

1. อ่าน field tree, widget rectangles และ values; ใช้ stable ID ที่รวม source/revision เพื่อไม่ชนกันข้ามไฟล์
2. เชื่อมหลาย widgets ของ field เดียวกันให้ค่าเปลี่ยนพร้อมกัน; รักษาค่า custom export ของ checkbox
3. บันทึกค่าใน document state/history/draft ตาม draft policy; ฝังฟอนต์ไทยและสร้าง appearance streams ก่อน export
4. หากแก้ไฟล์เดียว ให้รักษา document catalog/AcroForm เดิม; งาน merge/duplicate/delete ต้อง remap field names, widget refs และ parent tree อย่างถูกต้อง
5. ถ้า engine ยังรักษา fields ระหว่างจัดหน้าไม่ได้ ให้ปิด workflow นั้นหรือเสนอ flatten แบบเลือกเอง ไม่ทำให้ข้อมูลหายโดยเงียบ ๆ
6. ไม่รัน JavaScript actions หรือการเชื่อมต่อภายนอกที่ฝังมากับฟอร์ม; calculation scripts และ digital signing อยู่นอกขอบเขตรุ่นแรก

### เกณฑ์ตรวจรับ

- กรอกไทยและ checkbox แล้วเปิดใหม่ได้ทั้งค่าที่อ่านจาก field และ appearance ที่เห็นบนหน้า
- Undo/Redo, reset field, restore draft และ navigation ด้วย keyboard ผ่าน
- flatten แล้วหน้าแสดงเหมือนเดิม แต่ไม่มีช่องแก้ไข; แบบคงฟอร์มยังกรอกต่อได้
- merge ฟอร์มชื่อซ้ำ, duplicate หน้า, delete หน้า และหมุนหน้าไม่ทำให้ค่าชนหรือ widget orphan ใน workflow ที่รองรับ

pdf-lib มีตัวอย่าง fill form และ flatten อยู่แล้ว แต่ต้องเพิ่มการเชื่อมเข้ากับ export ของแอปและทดสอบภาษาไทยเอง ([Form APIs และตัวอย่าง](https://pdf-lib.js.org/))

## 9. ฟีเจอร์ E — PDF↔Word/Excel

### ประเมินแยก 4 ทิศทาง

| ทิศทาง | รุ่นแรก | ข้อจำกัดที่ต้องแสดง |
|---|---|---|
| DOCX → PDF | ข้อความไทย/อังกฤษ ตาราง รูป header/footer และเลขหน้า | ฟอนต์ที่ไม่มีอาจเปลี่ยนหน้า; ไม่รับ macros/legacy DOC ในรอบแรก |
| XLSX → PDF | เลือก sheet, print area, orientation, scaling และ page breaks | กำหนดว่าจะใช้ cached values หรือคำนวณสูตรใหม่; ไม่อัปเดต external links |
| PDF → DOCX | PDF ที่มี text layer และโครงสร้างไม่ซับซ้อน | ต้อง reconstruct ย่อหน้า/ตาราง อาจไม่เหมือนต้นฉบับ; สแกนต้องผ่าน OCR เพิ่ม |
| PDF → XLSX | ตรวจตาราง → preview แถว/คอลัมน์ → เลือกตารางส่งออก | ได้ข้อมูลตาราง ไม่ได้สูตรหรือ workbook เดิม; ไม่แปลงทั้งหน้าเป็นรูปแล้วเรียกว่า Excel ที่แก้ได้ |

LibreOffice มี command-line conversion เหมาะสำหรับนำมาทดลองเส้นทาง Office → PDF ใน worker ที่จัดการเอง ส่วน Adobe PDF Services มี export เป็น DOCX/XLSX ผ่าน API ซึ่งต้องอัปโหลดไฟล์ จึงเป็นตัวเลือกโหมด server/cloud ไม่ใช่ browser-only ([LibreOffice parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html), [Adobe Export PDF](https://developer.adobe.com/document-services/docs/overview/pdf-services-api/howtos/export-pdf))

### งานพัฒนา

1. Benchmark corpus ก่อนเลือก converter แยกผลไทย/อังกฤษ, native/scanned และ simple/complex layout; OCR ไทยต้องมีผลทดลอง ไม่อนุมานจากการรองรับ OCR ภาษาอื่น
2. ส่งมอบ DOCX/XLSX → PDF ก่อน จากนั้น PDF → XLSX ตาราง และ PDF → DOCX ตามผลคุณภาพ
3. Conversion dialog แสดง engine location, ชนิดไฟล์ที่รองรับ, ข้อจำกัด, ตัวเลือกหน้า/sheet และ preview ผลลัพธ์
4. ถ้าต้องใช้ server ให้แยก API/worker สำหรับเอกสารจาก video export: job queue, authentication, isolated job directory, progress/cancel, time/memory/file-size limits
5. ไม่รัน macros/scripts และ external links; ตรวจชนิดไฟล์จริงและป้องกัน archive/decompression ที่เกินขีดจำกัด
6. ระบุการเก็บ/ลบ input/output และผู้รับข้อมูลก่อนอัปโหลด; cleanup เมื่อสำเร็จ/ยกเลิก/ล้มเหลว พร้อม TTL สำหรับงานตกค้าง ดาวน์โหลดต้องตรวจสิทธิ์เจ้าของงาน
7. PDF → XLSX รักษา leading zeros, วันที่และจำนวนเงินตามชนิดที่ผู้ใช้ตรวจได้; ข้อความที่ขึ้นต้นด้วยเครื่องหมายสูตรต้องเก็บเป็น text ไม่กลายเป็นสูตรโดยอัตโนมัติ
8. ถ้า runtime ปัจจุบันไม่รองรับ Office engine ให้ deploy worker แยกและระบุ resource/cost; ไม่สมมติว่า Next serverless รัน LibreOffice ได้ทันที

### เกณฑ์ตรวจรับและการรายงานคุณภาพ

- เปิด DOCX/XLSX ผลลัพธ์ได้จริงและแก้ข้อความ/เซลล์ได้; PDF ผลลัพธ์เปิด/ค้นหาข้อความได้ตามโหมดที่เลือก
- corpus ที่ประกาศรองรับต้องไม่มีข้อความหรือแถวตารางหายเงียบ ๆ; เซลล์สำคัญ เช่น ยอดเงิน วันที่ และเลขอ้างอิงตรง expected values ทุกช่องใน fixture
- ตรวจ Word: reading order, ย่อหน้า, ตาราง, header/footer, รูป, page breaks; ตรวจ Excel: merged cells, column mapping, number formats, หลายตาราง/หลายหน้า
- เก็บ visual comparison, ความถูกต้องเชิงข้อมูล, เวลา, memory และอัตราไฟล์ไม่รองรับแยกตามกลุ่ม; ล็อกเกณฑ์ตัวเลขหลัง baseline ไม่อ้างความแม่นยำ 100% สำหรับ PDF ทุกชนิด
- เอกสารที่คุณภาพไม่ผ่านแสดงเหตุผล/ผล preview และให้เลือกไฟล์ต้นฉบับ ไม่ดาวน์โหลดผลเสียหายพร้อมข้อความว่าสำเร็จ

## 10. ลำดับส่งมอบและประมาณการ

สมมติผู้พัฒนา 1 คนที่รู้ฐานโค้ด มี fixture และเครื่องมือทดสอบพร้อม ตัวเลขเป็นวันทำงานเพื่อวางขอบเขต ยังไม่ใช่กำหนดส่ง รวมประมาณ 43–76 วัน หรือราว 9–16 สัปดาห์ ต้องปรับหลังทดลอง engine; ไม่รวมรอ license/จัดซื้อ และ OCR เต็มรูปแบบ

| ชุด | งาน | พึ่งพา | ประมาณ |
|---|---|---|---|
| 0 | แก้ 6 regression เดิม + ชื่อเครื่องมือ/ขอบเขต UI | ไม่มี | 2–4 วัน |
| 1 | engine proof of concept, geometry/revision contracts, draft policy | 0 | 3–5 วัน |
| 2 | AcroForm text/checkbox + export สองแบบ | 1 | 5–8 วัน |
| 3 | เปิด/ตั้งรหัสผ่าน + protected draft policy | 1, ทดสอบร่วมกับ 2 | 4–7 วัน |
| 4 | Redaction + sanitization + independent verification | 0, 1, 3 | 7–12 วัน |
| 5 | แก้ข้อความต้นฉบับแบบจำกัดขอบเขต | 1 และ engine/license ผ่าน | 8–15 วัน |
| 6 | Conversion 4 ทิศทางตาม benchmark | 1 และ deployment/data path ชัดเจน | 10–18 วัน |
| 7 | ทดสอบ end-to-end, viewers, ขนาดใหญ่, เอกสารข้อจำกัด | ชุดที่เปิดใช้ทั้งหมด | 4–7 วัน |

แต่ละชุดแยก feature flag และส่งมอบได้เมื่อผ่านเกณฑ์ของตัวเอง ชุดที่ต้องใช้ license หรือ server ไม่ขวางการปิดบั๊กเดิมและฟอร์มพื้นฐาน แต่ห้ามประกาศว่าทั้ง 5 ฟีเจอร์พร้อมจนผ่านครบ

## 11. ไฟล์และชุดทดสอบที่คาดว่าจะเพิ่ม

- ปรับ `app/dashboard/programs/edit-pdf/page.tsx`, `PdfPageEditor.tsx`, `pdf-editor.types.ts`, `pdf-utils.ts`, `pdf-draft-store.ts`
- เพิ่ม `components/pdf-editor/usePdfProject.ts`, `pdf-engine.ts`, `pdf-geometry.ts`, `pdf-text-layout.ts`, `pdf-export-pipeline.ts` และ worker/adapter ตาม engine ที่เลือก
- เพิ่ม UI ของ text editing, redaction, password, forms และ conversion แยก component จากหน้าหลัก
- API/worker ฝั่ง server สำหรับ conversion เพิ่มเฉพาะเมื่อเลือก architecture นั้น พร้อม deployment configuration และ cleanup tests
- fixtures ใช้ข้อมูลสังเคราะห์: ไทย/อังกฤษ, scanned+OCR, fonts subset, CropBox origin ไม่เป็นศูนย์, rotation 0/90/180/270, fields ชื่อซ้ำ, encrypted, signed, malformed และเอกสารยาว
- tests เน้นผลลัพธ์: เปิดกลับด้วย parser อื่น, ตรวจ field values, extraction, pixels/resources หลัง redaction, wrong-password, route-unmount draft และ stale/cancelled jobs
- ใช้ typecheck, production build และ browser E2E; build ที่ติด environment ต้องแยกบันทึกจากผลผ่านด้านพฤติกรรม และไม่ใช้ typecheck แทนการตรวจ PDF จริง

## 12. จุดตัดสินใจก่อนเปิดใช้จริง

- เลือก engine จาก fixture outputs และเงื่อนไข license/ต้นทุนที่ตรวจได้ ไม่เลือกจากรายการ feature บนเว็บไซต์เพียงอย่างเดียว
- ระบุว่าโหมดใด browser-only, self-hosted server หรือ cloud; หน้า UI ต้องอธิบายตรงกับโหมดที่กำลังใช้
- ถ้า engine ใดไม่ผ่านภาษาไทย, redaction verification หรือการรักษา form tree ให้ปิด capability นั้นก่อน แทนการลดเกณฑ์เพื่อส่งมอบ
- แผนนี้ยังไม่ถือเป็นการซื้อ license, สมัครบริการ, อัปโหลดเอกสารผู้ใช้ หรือ deploy ระบบใหม่
