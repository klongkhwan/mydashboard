import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { PDFDocument, StandardFonts, decodePDFRawStream } from 'pdf-lib'
import JSZip from 'jszip'

const require = createRequire(import.meta.url)
const fs = require('node:fs')
const path = require('node:path')
const typescript = require('typescript')
const Module = require('node:module')

function loadTypeScriptModule(file) {
    const source = fs.readFileSync(file, 'utf8')
    const { outputText } = typescript.transpileModule(source, {
        compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022, esModuleInterop: true },
        fileName: file,
    })
    const module = new Module.Module(file, undefined)
    module.filename = file
    module.paths = Module._nodeModulePaths(process.cwd())
    module._compile(outputText, file)
    return module.exports
}

const { buildFormPdf, buildPdf, buildZip, inspectPdfForm, wrapTextLines, parsePageRanges, chunkPages, planPdfSplit, thumbKey, applyOperation, pdfFromImages, movePagesToPosition } = loadTypeScriptModule(
    path.resolve('components/pdf-editor/pdf-utils.ts'),
)

function makeRefs(count, sourceId = 'source') {
    return Array.from({ length: count }, (_, index) => ({ id: `page-${index}`, sourceId, sourceIndex: index, rotation: 0, placements: [] }))
}

test('page ranges reject malformed, fractional, reversed and out-of-bounds input', () => {
    assert.deepEqual(parsePageRanges('1-3, 5-, 2', 6), [0, 1, 2, 4, 5])
    for (const value of ['', '0', '2.5', '-2', '3-1', '7', '1-7', '1,,3', 'hello', '1-2-3']) {
        assert.throws(() => parsePageRanges(value, 6), undefined, value)
    }
    assert.throws(() => chunkPages(makeRefs(3), 1.5))
    assert.throws(() => chunkPages(makeRefs(3), 0))
})

test('split plan previews exactly the groups exported and reports errors', () => {
    const refs = makeRefs(5)
    const plan = planPdfSplit(refs, 'ranges', '1-2, 3-', '2', new Set(), 'report.pdf')
    assert.equal(plan.error, null)
    assert.deepEqual(plan.groups.map((group) => [group.name, group.pages.length]), [['report-part-1.pdf', 2], ['report-part-2.pdf', 3]])
    assert.equal(planPdfSplit(refs, 'ranges', '1-9', '2', new Set(), 'report').groups.length, 0)
    assert.ok(planPdfSplit(refs, 'every', '', '2.5', new Set(), 'report').error)
    assert.ok(planPdfSplit(refs, 'selection', '', '2', new Set(), 'report').error)
    assert.deepEqual(planPdfSplit(refs, 'every', '', '2', new Set(), 'report').groups.map((group) => group.pages.length), [2, 2, 1])
    assert.deepEqual(planPdfSplit(refs, 'selection', '', '2', new Set(['page-3', 'page-0']), 'report').groups[0].pages.map((page) => page.id), ['page-0', 'page-3'])
})

test('selected pages can move across thumbnail batches without dropping or duplicating pages', () => {
    const refs = makeRefs(50)
    const result = movePagesToPosition(refs, new Set(['page-0', 'page-2']), 49)
    assert.deepEqual(result.slice(-2).map((page) => page.id), ['page-0', 'page-2'])
    assert.equal(new Set(result.map((page) => page.id)).size, 50)
    assert.equal(refs[0].id, 'page-0')
    assert.throws(() => movePagesToPosition(refs, new Set(), 1))
    assert.throws(() => movePagesToPosition(refs, new Set(['page-0', 'page-2']), 50))
    assert.throws(() => movePagesToPosition(refs, new Set(['page-0']), 2.5))
})

test('page operations preserve originals and thumbnail keys change with edits', () => {
    const refs = makeRefs(2)
    const originalKey = thumbKey(refs[0])
    assert.strictEqual(applyOperation(refs, { kind: 'reorder', order: ['page-0', 'page-0'] }), refs)
    const rotated = applyOperation(refs, { kind: 'rotate', pageIds: ['page-0'], degrees: 90 })
    assert.equal(refs[0].rotation, 0)
    assert.notEqual(thumbKey(rotated[0]), originalKey)
    const annotated = applyOperation(refs, { kind: 'addPlacement', pageId: 'page-0', placement: { id: 'text', kind: 'text', x: 0.1, y: 0.1, text: 'test', fontSize: 12, color: '#000000' } })
    const duplicated = applyOperation(annotated, { kind: 'duplicate', pageIds: ['page-0'] })
    assert.notEqual(duplicated[1].id, duplicated[0].id)
    assert.notEqual(duplicated[1].placements[0].id, duplicated[0].placements[0].id)
    assert.equal(thumbKey(duplicated[1]), thumbKey(duplicated[0]))
    assert.notEqual(thumbKey(annotated[0]), originalKey)
})

test('automatic page numbers stay inside the visible page after cropping and uncropping', () => {
    const refs = makeRefs(1)
    refs[0].placements.push({ id: 'number', kind: 'text', dynamic: 'pageNumber', x: 0.4, y: 0.92, w: 0.2, text: '1 / 1', fontSize: 10, color: '#000000' })
    const cropped = applyOperation(refs, { kind: 'setCrop', pageIds: ['page-0'], crop: { left: 0.1, right: 0.2, top: 0.15, bottom: 0.2 } })
    const number = cropped[0].placements[0]
    assert.ok(number.x >= 0.1 && number.x + number.w <= 0.8)
    assert.ok(number.y < 0.8 && number.y > 0.7)
    assert.equal(refs[0].placements[0].y, 0.92)
    const restored = applyOperation(cropped, { kind: 'setCrop', pageIds: ['page-0'], crop: null })
    assert.equal(restored[0].placements[0].y, 0.92)
})

test('real PDF merge, rotation, Thai annotations and ZIP split retain every requested page', async () => {
    const first = await PDFDocument.create()
    first.addPage([300, 500]); first.addPage([400, 600]); first.addPage([500, 700])
    const second = await PDFDocument.create()
    second.addPage([200, 400])
    const bytesBySource = new Map([['source', asArrayBuffer(await first.save())], ['second', asArrayBuffer(await second.save())]])
    const refs = [makeRefs(1, 'second')[0], ...makeRefs(3).reverse()]
    refs[0] = { ...refs[0], id: 'second-page', rotation: 90, placements: [{ id: 'thai', kind: 'text', x: 0.1, y: 0.1, w: 0.8, text: 'ทดสอบภาษาไทย สวัสดี', fontSize: 14, color: '#000000' }] }
    const fontBytes = asArrayBuffer(fs.readFileSync(path.resolve('public/fonts/Sarabun-Regular.ttf')))
    const output = await PDFDocument.load(await buildPdf(refs, bytesBySource, { fontBytes }))
    assert.equal(output.getPageCount(), 4)
    assert.deepEqual(output.getPages().map((page) => page.getWidth()), [200, 500, 400, 300])
    assert.equal(output.getPage(0).getRotation().angle, 90)
    assert.ok(output.getPage(0).node.Resources().lookup(require('pdf-lib').PDFName.of('Font')))
    const groups = planPdfSplit(refs, 'every', '', '2', new Set(), 'combined').groups
    const progress = []
    const zip = await JSZip.loadAsync(await (await buildZip(groups, bytesBySource, { fontBytes, onProgress: (done) => progress.push(done) })).arrayBuffer())
    assert.equal(Object.keys(zip.files).length, 2)
    assert.deepEqual(progress, [1, 2, 3, 4])
    for (const group of groups) {
        const result = await PDFDocument.load(await zip.file(group.name).async('uint8array'))
        assert.equal(result.getPageCount(), group.pages.length)
    }
    const controller = new AbortController(); controller.abort()
    await assert.rejects(buildPdf(refs, bytesBySource, { signal: controller.signal }), { name: 'AbortError' })
    await assert.rejects(buildPdf(refs, new Map()), /ไม่พบไฟล์ต้นทาง/)
})

test('image conversion skips corrupt images without losing valid pages', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')
    const result = await pdfFromImages([new File([png], 'valid.png'), new File(['invalid'], 'broken.png')])
    assert.deepEqual(result.skipped, ['broken.png'])
    assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 1)
})

function asArrayBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

async function pageContent(bytes) {
    const doc = await PDFDocument.load(bytes)
    const contents = doc.getPage(0).node.Contents()
    let text = ''
    for (let index = 0; index < contents.size(); index += 1) {
        text += Buffer.from(decodePDFRawStream(doc.context.lookup(contents.get(index))).decode()).toString()
    }
    return text
}

test('pdf export keeps CropBox origin and placement geometry aligned', async () => {
    const source = await PDFDocument.create()
    const page = source.addPage([600, 800])
    page.setCropBox(100, 50, 400, 600)
    const font = await source.embedFont(StandardFonts.Helvetica)
    page.drawText('source', { x: 130, y: 500, size: 12, font })
    const sourceBytes = await source.save()

    const bytes = await buildPdf(
        [
            {
                id: 'page-1',
                sourceId: 'source-1',
                sourceIndex: 0,
                rotation: 0,
                crop: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
                placements: [
                    { id: 'line-1', kind: 'line', x: 0.1, y: 0.2, w: 0.8, h: 0.04, color: '#ff0000', opacity: 1, strokeWidth: 2 },
                    { id: 'text-1', kind: 'text', x: 0.1, y: 0.1, w: 0.8, text: 'added text', fontSize: 12, color: '#000000', align: 'center' },
                ],
            },
        ],
        new Map([['source-1', asArrayBuffer(sourceBytes)]]),
    )

    const output = await PDFDocument.load(bytes)
    assert.deepEqual(output.getPage(0).getCropBox(), { x: 140, y: 110, width: 320, height: 480 })
    assert.ok(output.getPage(0).node.Contents())
})

test('AcroForm inspection, fill, clear and flatten preserve field semantics', async () => {
    const source = await PDFDocument.create()
    const page = source.addPage([400, 300])
    const form = source.getForm()
    const name = form.createTextField('name')
    name.addToPage(page, { x: 40, y: 200, width: 200, height: 30 })
    const agree = form.createCheckBox('agree')
    agree.addToPage(page, { x: 40, y: 140, width: 20, height: 20 })
    const choice = form.createDropdown('choice')
    choice.addOptions(['one', 'two'])
    choice.addToPage(page, { x: 40, y: 90, width: 120, height: 24 })
    form.updateFieldAppearances()
    const sourceBytes = await source.save()

    const fields = await inspectPdfForm(asArrayBuffer(sourceBytes))
    assert.deepEqual(fields.map((field) => [field.name, field.kind]), [
        ['name', 'text'],
        ['agree', 'checkbox'],
        ['choice', 'dropdown'],
    ])

    const filledBytes = await buildFormPdf(asArrayBuffer(sourceBytes), { name: 'Alice', agree: true, choice: 'two' })
    const filledForm = (await PDFDocument.load(filledBytes)).getForm()
    assert.equal(filledForm.getTextField('name').getText(), 'Alice')
    assert.equal(filledForm.getCheckBox('agree').isChecked(), true)
    assert.deepEqual(filledForm.getDropdown('choice').getSelected(), ['two'])

    const clearedBytes = await buildFormPdf(asArrayBuffer(filledBytes), { name: '', agree: false, choice: '' })
    const clearedForm = (await PDFDocument.load(clearedBytes)).getForm()
    assert.equal(clearedForm.getTextField('name').getText() ?? '', '')
    assert.equal(clearedForm.getCheckBox('agree').isChecked(), false)
    assert.deepEqual(clearedForm.getDropdown('choice').getSelected(), [])

    const flattenedBytes = await buildFormPdf(asArrayBuffer(sourceBytes), { name: 'Alice', agree: true, choice: 'two' }, { flatten: true })
    assert.equal((await PDFDocument.load(flattenedBytes)).getForm().getFields().length, 0)
})

test('shared text wrapping preserves explicit lines and breaks long words', () => {
    const measure = (value) => Array.from(value).length
    assert.deepEqual(wrapTextLines('one two three', 7, measure), ['one two', 'three'])
    assert.deepEqual(wrapTextLines('one\ntwo', 20, measure), ['one', 'two'])
    assert.deepEqual(wrapTextLines('abcdefghij', 4, measure), ['abcd', 'efgh', 'ij'])
})

test('PDF text and notes use the same anchor rules as the preview', async () => {
    const source = await PDFDocument.create()
    const page = source.addPage([600, 800])
    const font = await source.embedFont(StandardFonts.Helvetica)
    page.drawText('source', { x: 10, y: 10, size: 12, font })
    const sourceBytes = await source.save()

    const bytes = await buildPdf(
        [
            {
                id: 'page-1',
                sourceId: 'source-1',
                sourceIndex: 0,
                rotation: 0,
                placements: [
                    { id: 'left', kind: 'text', x: 0.2, y: 0.2, text: 'left', fontSize: 12, color: '#000000', align: 'left' },
                    { id: 'center', kind: 'text', x: 0.2, y: 0.3, text: 'center', fontSize: 12, color: '#000000', align: 'center' },
                    { id: 'rotated', kind: 'text', x: 0.2, y: 0.3, text: 'rotated', fontSize: 12, color: '#000000', rotate: 90 },
                    { id: 'note', kind: 'note', x: 0.1, y: 0.4, w: 0.3, h: 0.03, text: 'line one\nline two\nline three', fontSize: 12, color: '#000000' },
                ],
            },
        ],
        new Map([['source-1', asArrayBuffer(sourceBytes)]]),
    )
    const content = await pageContent(bytes)
    const matrices = content.split('\n').filter((line) => line.endsWith(' Tm'))
    assert.equal(matrices[1].split(' ').at(-3), matrices[2].split(' ').at(-3), 'center alignment without a box must keep x as the left anchor')
    const rotatedMatrix = matrices.find((line) => line.includes(' -1 1 '))
    assert.ok(rotatedMatrix, 'rotated text must emit a rotated text matrix')
    const rotatedValues = rotatedMatrix.split(' ').slice(0, 6).map(Number)
    assert.ok(Math.abs(rotatedValues[4] - 120) > 1, 'rotated text baseline must move around the top anchor')
    assert.ok(Math.abs(rotatedValues[5] - 560) < 0.01, 'rotated text must keep the preview top anchor')
    assert.match(content, /\nW\n/, 'note text must be clipped to its note box')
})
