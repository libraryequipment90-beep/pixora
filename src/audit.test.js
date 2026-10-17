import { Document, documentFromProject, createCanvas } from './engine.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function mockDom() {
  class ImageData {
    constructor(w, h) {
      this.width = w
      this.height = h
      this.data = new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4)
    }
  }
  class Ctx {
    constructor(c) {
      this.c = c
      this.canvas = c
      this._stack = []
      this.globalAlpha = 1
      this.globalCompositeOperation = 'source-over'
      this.fillStyle = '#000'
      this.strokeStyle = '#000'
      this.lineWidth = 1
      this._path = []
      this._clip = null
    }
    save() { this._stack.push({ a: this.globalAlpha, op: this.globalCompositeOperation, f: this.fillStyle, s: this.strokeStyle, clip: this._clip }) }
    restore() {
      const s = this._stack.pop()
      if (!s) return
      this.globalAlpha = s.a
      this.globalCompositeOperation = s.op
      this.fillStyle = s.f
      this.strokeStyle = s.s
      this._clip = s.clip
    }
    _parse(color) {
      if (!color) return [0, 0, 0, 255]
      if (typeof color === 'object' && color._stops) return this._parse((color._stops[0] || ['', '#000'])[1])
      const s = String(color)
      if (s.startsWith('#')) {
        const h = s.slice(1)
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
      }
      const m = s.match(/rgba?\(([^)]+)\)/)
      if (m) {
        const p = m[1].split(',').map(Number)
        return [p[0] | 0, p[1] | 0, p[2] | 0, p[3] == null ? 255 : Math.round(p[3] * 255)]
      }
      return [0, 0, 0, 255]
    }
    _set(i, r, g, b, a) {
      const d = this.c._buf
      const op = this.globalCompositeOperation
      const aa = (a / 255) * this.globalAlpha
      if (op === 'destination-out') { d[i + 3] = Math.max(0, d[i + 3] * (1 - aa)); return }
      if (op === 'destination-in') { d[i + 3] = Math.round(d[i + 3] * aa); return }
      const srcA = aa
      const dstA = d[i + 3] / 255
      const outA = srcA + dstA * (1 - srcA)
      if (outA <= 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; return }
      d[i] = Math.round((r * srcA + d[i] * dstA * (1 - srcA)) / outA)
      d[i + 1] = Math.round((g * srcA + d[i + 1] * dstA * (1 - srcA)) / outA)
      d[i + 2] = Math.round((b * srcA + d[i + 2] * dstA * (1 - srcA)) / outA)
      d[i + 3] = Math.round(outA * 255)
    }
    _fillPixel(x, y, color) {
      x = Math.floor(x); y = Math.floor(y)
      if (x < 0 || y < 0 || x >= this.c.width || y >= this.c.height) return
      if (this._clip && !this._clip(x, y)) return
      const [r, g, b, a] = this._parse(color)
      this._set((y * this.c.width + x) * 4, r, g, b, a)
    }
    fillRect(x, y, w, h) {
      x = Math.floor(x); y = Math.floor(y); w = Math.ceil(w); h = Math.ceil(h)
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this._fillPixel(xx, yy, this.fillStyle)
    }
    clearRect(x, y, w, h) {
      x = Math.floor(x); y = Math.floor(y); w = Math.ceil(w); h = Math.ceil(h)
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.c.width || yy >= this.c.height) continue
        const i = (yy * this.c.width + xx) * 4
        this.c._buf[i] = this.c._buf[i + 1] = this.c._buf[i + 2] = this.c._buf[i + 3] = 0
      }
    }
    drawImage(src, ...args) {
      let sx = 0, sy = 0, sw = src.width, sh = src.height, dx, dy, dw, dh
      if (args.length === 2) { dx = args[0]; dy = args[1]; dw = sw; dh = sh }
      else if (args.length === 4) { dx = args[0]; dy = args[1]; dw = args[2]; dh = args[3] }
      else { [sx, sy, sw, sh, dx, dy, dw, dh] = args }
      const sbuf = src._buf
      if (!sbuf) return
      for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
        const srcX = Math.floor(sx + x * (sw / dw))
        const srcY = Math.floor(sy + y * (sh / dh))
        if (srcX < 0 || srcY < 0 || srcX >= src.width || srcY >= src.height) continue
        const gx = Math.floor(dx + x), gy = Math.floor(dy + y)
        if (this._clip && !this._clip(gx, gy)) continue
        const si = (srcY * src.width + srcX) * 4
        this._set((gy * this.c.width + gx) * 4, sbuf[si], sbuf[si + 1], sbuf[si + 2], sbuf[si + 3])
      }
    }
    beginPath() { this._path = [] }
    rect(x, y, w, h) { this._path.push({ t: 'rect', x, y, w, h }) }
    ellipse(cx, cy, rx, ry) { this._path.push({ t: 'ell', cx, cy, rx, ry }) }
    arc(x, y, r) { this._path.push({ t: 'arc', x, y, r }) }
    moveTo() {}
    lineTo() {}
    closePath() {}
    clip() {
      const path = this._path.slice()
      const prev = this._clip
      this._clip = (x, y) => {
        if (prev && !prev(x, y)) return false
        for (const p of path) {
          if (p.t === 'rect' && x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) return true
          if (p.t === 'arc') { const dx = x - p.x, dy = y - p.y; if (dx * dx + dy * dy <= p.r * p.r) return true }
          if (p.t === 'ell') { const dx = (x - p.cx) / (p.rx || 1), dy = (y - p.cy) / (p.ry || 1); if (dx * dx + dy * dy <= 1) return true }
        }
        return path.length === 0
      }
    }
    fill() {
      for (const p of this._path) {
        if (p.t === 'rect') this.fillRect(p.x, p.y, p.w, p.h)
        if (p.t === 'arc') { const r = Math.ceil(p.r); for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= p.r * p.r) this._fillPixel(p.x + xx, p.y + yy, this.fillStyle) }
        if (p.t === 'ell') { const rx = Math.ceil(p.rx), ry = Math.ceil(p.ry); for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) { const nx = xx / (p.rx || 1), ny = yy / (p.ry || 1); if (nx * nx + ny * ny <= 1) this._fillPixel(p.cx + xx, p.cy + yy, this.fillStyle) } }
      }
    }
    stroke() {}
    strokeRect() {}
    translate() {}
    rotate() {}
    scale() {}
    setLineDash() {}
    fillText() {}
    measureText(t) {
      const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '')
      const size = m ? +m[1] : 10
      const str = t == null ? ' ' : String(t)
      return { width: str.length * size * 0.55, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 }
    }
    createImageData(w, h) { return new ImageData(w, h) }
    getImageData(x, y, w, h) {
      const out = new ImageData(w, h)
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const sx = x + xx, sy = y + yy
        if (sx < 0 || sy < 0 || sx >= this.c.width || sy >= this.c.height) continue
        const si = (sy * this.c.width + sx) * 4, di = (yy * w + xx) * 4
        out.data[di] = this.c._buf[si]; out.data[di + 1] = this.c._buf[si + 1]
        out.data[di + 2] = this.c._buf[si + 2]; out.data[di + 3] = this.c._buf[si + 3]
      }
      return out
    }
    putImageData(img, x, y) {
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const dx = x + xx, dy = y + yy
        if (dx < 0 || dy < 0 || dx >= this.c.width || dy >= this.c.height) continue
        const si = (yy * img.width + xx) * 4, di = (dy * this.c.width + dx) * 4
        this.c._buf[di] = img.data[si]; this.c._buf[di + 1] = img.data[si + 1]
        this.c._buf[di + 2] = img.data[si + 2]; this.c._buf[di + 3] = img.data[si + 3]
      }
    }
    createLinearGradient() { return { _stops: [], addColorStop(o, c) { this._stops.push([o, c]) } } }
    createRadialGradient() { return { _stops: [], addColorStop(o, c) { this._stops.push([o, c]) } } }
  }
  class Canvas {
    constructor() { this._w = 0; this._h = 0; this._buf = new Uint8ClampedArray(0); this._ctx = null }
    set width(v) { this._w = v; this._buf = new Uint8ClampedArray(Math.max(0, (this._w || 0) * (this._h || 0) * 4)); this._ctx = null }
    get width() { return this._w || 0 }
    set height(v) { this._h = v; this._buf = new Uint8ClampedArray(Math.max(0, (this._w || 0) * (this._h || 0) * 4)); this._ctx = null }
    get height() { return this._h || 0 }
    getContext() { return this._ctx || (this._ctx = new Ctx(this)) }
    toDataURL() { return 'data:image/png;base64,AAAA' }
    toBlob(cb, type) { cb({ type: type || 'image/png', _buf: this._buf.slice(), width: this.width, height: this.height }) }
  }
  class Image {
    set src(v) {
      // Simulate decoding into a canvas of fixed size 8x6
      const c = new Canvas()
      c.width = 8
      c.height = 6
      c.getContext('2d').fillRect(0, 0, 8, 6)
      this._canvas = c
      this.naturalWidth = 8
      this.naturalHeight = 6
      setTimeout(() => this.onload && this.onload(), 0)
    }
  }
  globalThis.Image = Image
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return new Canvas()
      return { style: {}, getContext() { return new Ctx(new Canvas()) } }
    },
    getElementById() { return { style: {}, textContent: '', onclick: null } }
  }
}

mockDom()

const failures = []
const ok = (name, cond, detail = '') => {
  if (cond) console.log(`PASS  ${name}${detail ? '  ' + detail : ''}`)
  else { console.log(`FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name) }
}

// --- fill a layer's canvas with a colour ---
function paint(layer, color, x = 0, y = 0, w = null, h = null) {
  const ctx = layer.canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(x, y, w == null ? layer.canvas.width : w, h == null ? layer.canvas.height : h)
}

// 1. flip mirrors layer positions (regression)
{
  const doc = new Document(100, 80, '#ffffff')
  const art = doc.addLayer('Art')
  art.x = 10
  art.y = 20
  doc.flip(true)
  const expectX = 100 - 10 - art.canvas.width
  ok('flip-h mirrors layer x', art.x === expectX, `x=${art.x} expected=${expectX}`)
  ok('flip-h keeps layer y', art.y === 20, `y=${art.y}`)
}

// 2. flip vertical mirrors y
{
  const doc = new Document(100, 80, '#ffffff')
  const art = doc.addLayer('Art')
  art.x = 10
  art.y = 20
  doc.flip(false)
  const expectY = 80 - 20 - art.canvas.height
  ok('flip-v mirrors layer y', art.y === expectY, `y=${art.y} expected=${expectY}`)
}

// 3. undo/redo restores layer count and pixels
{
  const doc = new Document(20, 20, '#ffffff')
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  doc.pushHistory('Paint A')
  const b = doc.addLayer('B')
  paint(b, '#00ff00')
  doc.pushHistory('Paint B')
  const before = doc.layers.length
  doc.undo()
  doc.undo()
  ok('undo reduces layers', doc.layers.length < before, `len=${doc.layers.length}`)
  doc.redo()
  doc.redo()
  ok('redo restores layers', doc.layers.length === before, `len=${doc.layers.length}`)
}

// 4. group snapshot/restore preserves children
{
  const doc = new Document(40, 40, '#ffffff')
  const a = doc.addLayer('A')
  const b = doc.addLayer('B')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(b), true)
  const g = doc.groupSelected()
  const snap = doc.snapshot()
  doc.undo()
  doc.restore(snap)
  const restored = doc.layers.find(l => l.kind === 'group')
  ok('group survives restore', !!restored)
  if (restored) {
    const kids = doc.layers.filter(l => l.parentId === restored.id)
    ok('group children survive restore', kids.length === 2, `kids=${kids.length}`)
  }
}

// 4b. group opacity and visibility affect the composite
{
  const doc = new Document(20, 20, null)
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  const b = doc.addLayer('B')
  paint(b, '#ff0000')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(b), true)
  const g = doc.groupSelected()
  const full = createCanvas(20, 20)
  doc.compositeTo(full.getContext('2d'))
  const alpha = (c) => c.getContext('2d').getImageData(5, 5, 1, 1).data[3]
  ok('group children render in composite', alpha(full) > 200, `a=${alpha(full)}`)
  g.opacity = 0.5
  const half = createCanvas(20, 20)
  doc.compositeTo(half.getContext('2d'))
  ok('group opacity applies to composite', alpha(half) < alpha(full) - 50, `half=${alpha(half)} full=${alpha(full)}`)
  g.opacity = 1
  g.visible = false
  const hid = createCanvas(20, 20)
  doc.compositeTo(hid.getContext('2d'))
  ok('hidden group hides children', alpha(hid) === 0, `a=${alpha(hid)}`)
}

// 5. mergeVisible no-ops with fewer than 2 visible layers
{
  const doc = new Document(20, 20, '#ffffff')
  const n = doc.layers.length
  doc.layers.forEach(l => { l.visible = false })
  doc.mergeVisible()
  ok('mergeVisible no-op when <2 visible', doc.layers.length === n, `len=${doc.layers.length}`)
}

// 5b. deleting a nested group removes all descendants
{
  const doc = new Document(40, 40, '#ffffff')
  const a = doc.addLayer('A')
  doc.selectLayer(doc.layers.indexOf(a), false)
  const outer = doc.groupSelected()          // outer group + inner layer
  doc.active = doc.layers.indexOf(outer)
  doc.selected = new Set([outer.id])
  doc.groupSelected()                         // nested group inside outer
  const total = doc.layers.length
  doc.active = doc.layers.indexOf(outer)
  doc.selected = new Set([outer.id])
  doc.deleteLayer()
  const orphaned = doc.layers.filter(l => l.parentId && !doc.layers.some(p => p.id === l.parentId))
  ok('nested group delete removes descendants', doc.layers.length < total && orphaned.length === 0, `len=${doc.layers.length} total=${total} orphans=${orphaned.length}`)
}

// 5c. mergeVisible respects groups and leaves no orphans
{
  const doc = new Document(40, 40, null)
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  const b = doc.addLayer('B')
  paint(b, '#00ff00')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(b), true)
  const g = doc.groupSelected()
  a.visible = false                    // hidden child inside a visible group
  const c = doc.addLayer('C')
  paint(c, '#0000ff')
  const d = doc.addLayer('D')
  paint(d, '#ffff00')
  doc.mergeVisible()
  const orphaned = doc.layers.filter(l => l.parentId && !doc.layers.some(p => p.id === l.parentId))
  ok('mergeVisible leaves no orphaned layers', orphaned.length === 0, `orphans=${orphaned.length}`)
  ok('mergeVisible collapsed visible content', doc.layers.some(l => l.name === 'Merged'), 'merged present')
}

// 6. deleteLayer never empties the document
{
  const doc = new Document(20, 20, '#ffffff')
  doc.deleteLayer()
  ok('deleteLayer keeps >=1 layer', doc.layers.length >= 1, `len=${doc.layers.length}`)
}

// 6g. duplicating a group copies its children
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  const b = doc.addLayer('B')
  paint(b, '#00ff00')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(b), true)
  const g = doc.groupSelected()
  doc.active = doc.layers.indexOf(g)
  doc.selected = new Set([g.id])
  const kids = doc.layers.filter(l => l.parentId === g.id).length
  doc.duplicateLayer()
  const dup = doc.currentLayer()
  const dupKids = doc.layers.filter(l => l.parentId === dup.id).length
  const orphaned = doc.layers.filter(l => l.parentId && !doc.layers.some(p => p.id === l.parentId))
  ok('duplicate group is a group', dup.kind === 'group', dup.kind)
  ok('duplicate group copies children', dupKids === kids, `dupKids=${dupKids} kids=${kids}`)
  ok('duplicate group has no orphans', orphaned.length === 0, `orphans=${orphaned.length}`)
}

// 6b. crop shifts layer content into the new origin
{
  const doc = new Document(100, 80, null)
  const l = doc.addLayer('Art')
  l.x = 10; l.y = 20
  paint(l, '#ff0000', 0, 0, l.canvas.width, l.canvas.height)
  doc.cropTo(10, 20, 50, 40)
  const px = l.canvas.getContext('2d').getImageData(0, 0, 1, 1).data
  ok('crop repositions layer to origin', l.x === 0 && l.y === 0, `x=${l.x} y=${l.y}`)
  ok('crop keeps layer pixel content', px[0] === 255 && px[3] > 0, `rgba=${Array.from(px)}`)
  ok('crop resizes canvas', l.canvas.width === 50 && l.canvas.height === 40, `${l.canvas.width}x${l.canvas.height}`)
}

// 6c. resize scales layer position and canvas
{
  const doc = new Document(100, 100, null)
  const l = doc.addLayer('Art')
  l.x = 20; l.y = 20
  doc.resize(200, 200)
  ok('resize scales layer position', l.x === 40 && l.y === 40, `x=${l.x} y=${l.y}`)
  ok('resize scales layer canvas', l.canvas.width === 200 && l.canvas.height === 200, `${l.canvas.width}x${l.canvas.height}`)
  ok('resize updates doc size', doc.width === 200 && doc.height === 200, `${doc.width}x${doc.height}`)
}

// 6d. applyMask bakes the mask into the layer and clears the mask
{
  const doc = new Document(40, 40, null)
  const l = doc.addLayer('Art')
  paint(l, '#00ff00', 0, 0, 40, 40)
  doc.selection = { x: 0, y: 0, w: 20, h: 40 }
  doc.addMask()
  doc.applyMask()
  const inpx = l.canvas.getContext('2d').getImageData(10, 20, 1, 1).data
  const outpx = l.canvas.getContext('2d').getImageData(30, 20, 1, 1).data
  ok('applyMask keeps selected pixels', inpx[3] > 200, `a=${inpx[3]}`)
  ok('applyMask removes unselected pixels', outpx[3] === 0, `a=${outpx[3]}`)
  ok('applyMask clears layer.mask', l.mask === null, String(l.mask))
}

// 6e. layerViaCopy isolates selection into a new layer
{
  const doc = new Document(40, 40, null)
  const l = doc.addLayer('Art')
  paint(l, '#0000ff', 0, 0, 40, 40)
  doc.selection = { x: 0, y: 0, w: 20, h: 20 }
  const n = doc.layers.length
  doc.layerViaCopy(false)
  const copy = doc.currentLayer()
  const inpx = copy.canvas.getContext('2d').getImageData(10, 10, 1, 1).data
  const outpx = copy.canvas.getContext('2d').getImageData(30, 30, 1, 1).data
  ok('layerViaCopy adds a layer', doc.layers.length === n + 1, `len=${doc.layers.length}`)
  ok('layerViaCopy copies inside selection', inpx[3] > 0, `a=${inpx[3]}`)
  ok('layerViaCopy leaves outside empty', outpx[3] === 0, `a=${outpx[3]}`)
}

// 6f. layer mask hides pixels in the live composite
{
  const doc = new Document(40, 40, null)
  const l = doc.addLayer('Art')
  paint(l, '#ff00ff', 0, 0, 40, 40)
  doc.selection = { x: 0, y: 0, w: 20, h: 40 }
  doc.addMask()
  const out = createCanvas(40, 40)
  doc.compositeTo(out.getContext('2d'))
  const inA = out.getContext('2d').getImageData(10, 20, 1, 1).data[3]
  const outA = out.getContext('2d').getImageData(30, 20, 1, 1).data[3]
  ok('mask shows pixels inside selection', inA > 200, `a=${inA}`)
  ok('mask hides pixels outside selection', outA === 0, `a=${outA}`)
  doc.disableMask()
  const off = createCanvas(40, 40)
  doc.compositeTo(off.getContext('2d'))
  ok('disabled mask reveals pixels', off.getContext('2d').getImageData(30, 20, 1, 1).data[3] > 200, 'disabled')
}

// 6h. canvasSize anchors content correctly
{
  const topLeft = new Document(100, 100, null)
  const a = topLeft.addLayer('A')
  a.x = 10; a.y = 10
  topLeft.canvasSize(200, 200, 'top-left')
  ok('canvasSize top-left keeps origin', a.x === 10 && a.y === 10, `x=${a.x} y=${a.y}`)

  const center = new Document(100, 100, null)
  const b = center.addLayer('B')
  b.x = 10; b.y = 10
  center.canvasSize(200, 200, 'center')
  ok('canvasSize center offsets by half', b.x === 60 && b.y === 60, `x=${b.x} y=${b.y}`)

  const bottomRight = new Document(100, 100, null)
  const c = bottomRight.addLayer('C')
  c.x = 10; c.y = 10
  bottomRight.canvasSize(200, 200, 'bottom-right')
  ok('canvasSize bottom-right offsets by delta', c.x === 110 && c.y === 110, `x=${c.x} y=${c.y}`)
}

// 7. project round-trip preserves structure
{
  const doc = new Document(30, 30, '#ffffff')
  const a = doc.addLayer('Alpha')
  a.visible = false
  const b = doc.addLayer('Beta')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(b), true)
  doc.groupSelected()
  const data = await doc.toProject()
  const doc2 = await documentFromProject(data)
  ok('roundtrip layer count', doc2.layers.length === doc.layers.length, `${doc2.layers.length} vs ${doc.layers.length}`)
  const g1 = doc.layers.find(l => l.kind === 'group')
  const g2 = doc2.layers.find(l => l.kind === 'group')
  ok('roundtrip group present', !!g2)
  ok('roundtrip hidden layer', doc2.layers.some(l => l.visible === false), 'hidden preserved')
  ok('roundtrip group children', !!g1 && doc2.layers.filter(l => l.parentId === g2.id).length === doc.layers.filter(l => l.parentId === g1.id).length)
}

// 8. exportBlob jpeg fills white behind transparency
{
  const doc = new Document(20, 20, null) // transparent doc
  doc.layers.forEach(l => { l.locked = false })
  const blob = await doc.exportBlob('image/jpeg')
  const px = blob && blob._buf ? Array.from(blob._buf.slice(0, 4)) : null
  ok('jpeg export is opaque white where transparent', !!px && px[0] === 255 && px[1] === 255 && px[2] === 255 && px[3] === 255, `rgba=${px}`)
  const png = await doc.exportBlob('image/png')
  const ppx = png && png._buf ? Array.from(png._buf.slice(0, 4)) : null
  ok('png export keeps transparency', !!ppx && ppx[3] === 0, `rgba=${ppx}`)
}

// 9. mergeSelected combines multiple selected layers into the bottom one
{
  const doc = new Document(20, 20, null)
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  const b = doc.addLayer('B')
  paint(b, '#00ff00')
  const c = doc.addLayer('C')
  paint(c, '#0000ff')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(c), true)
  const before = doc.layers.length
  doc.mergeSelected()
  ok('mergeSelected reduces layer count', doc.layers.length === before - 1, `len=${doc.layers.length} before=${before}`)
  const merged = doc.currentLayer()
  const px = merged.canvas.getContext('2d').getImageData(10, 10, 1, 1).data
  ok('mergeSelected bakes topmost visible pixel', px[2] > 200 && px[3] > 200, `rgba=${Array.from(px)}`)
  ok('mergeSelected selects merged layer', doc.selected.has(merged.id), 'selected')
}

// 10. mergeSelected falls back to mergeDown with a single layer
{
  const doc = new Document(20, 20, null)
  const a = doc.addLayer('A')
  paint(a, '#ff0000')
  const b = doc.addLayer('B')
  paint(b, '#00ff00')
  doc.selectLayer(doc.layers.indexOf(b), false)
  const before = doc.layers.length
  doc.mergeSelected()
  ok('mergeSelected single falls back to mergeDown', doc.layers.length === before - 1, `len=${doc.layers.length}`)
}

// 11. new layer added while a group is active goes inside that group
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  doc.selectLayer(doc.layers.indexOf(a), false)
  const g = doc.groupSelected()          // wraps A into a group
  doc.active = doc.layers.indexOf(g)
  doc.selected = new Set([g.id])
  const inner = doc.addLayer('Inner')
  ok('addLayer inside group sets parentId', inner.parentId === g.id, `parent=${inner.parentId}`)
  const gIdx = doc.layers.indexOf(g)
  const innerIdx = doc.layers.indexOf(inner)
  const maxChild = Math.max(...doc.layers.map((l, i) => l.parentId === g.id ? i : -1))
  ok('addLayer appends inside group', innerIdx === maxChild && innerIdx > gIdx, `inner=${innerIdx} g=${gIdx}`)
}

// 12. reparentLayer moves a layer into a group (drag and drop)
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  const b = doc.addLayer('B')
  doc.selectLayer(doc.layers.indexOf(b), false)
  const g = doc.groupSelected()          // wraps B
  const loose = doc.addLayer('Loose')
  const from = doc.layers.indexOf(loose)
  doc.reparentLayer(from, doc.layers.indexOf(g))
  ok('reparentLayer nests into group', loose.parentId === g.id, `parent=${loose.parentId}`)
  const gIdx = doc.layers.indexOf(g)
  const looseIdx = doc.layers.indexOf(loose)
  ok('reparentLayer inserts right after group', looseIdx === gIdx + 1, `loose=${looseIdx} g=${gIdx}`)
}

// 13. reparentLayer refuses to move a group into its own descendant
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  doc.selectLayer(doc.layers.indexOf(a), false)
  const outer = doc.groupSelected()
  doc.active = doc.layers.indexOf(outer)
  doc.selected = new Set([outer.id])
  const inner = doc.groupSelected()      // nested group inside outer
  const from = doc.layers.indexOf(outer)
  const to = doc.layers.indexOf(inner)
  const snapshotParents = doc.layers.map(l => l.parentId)
  doc.reparentLayer(from, to)
  const unchanged = doc.layers.every((l, i) => l.parentId === snapshotParents[i])
  ok('reparentLayer blocks group cycles', unchanged, 'unchanged')
}

// 14. groupSelected wraps selected layers so they become children
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  const b = doc.addLayer('B')
  const c = doc.addLayer('C')
  doc.selectLayer(doc.layers.indexOf(a), false)
  doc.selectLayer(doc.layers.indexOf(c), true)
  const g = doc.groupSelected()
  const kids = doc.layers.filter(l => l.parentId === g.id).map(l => l.name).sort()
  ok('groupSelected nests selected layers', kids.join(',') === 'A,C', `kids=${kids.join(',')}`)
  ok('groupSelected keeps B outside group', b.parentId === null, `b.parent=${b.parentId}`)
}

// 15. grouping a group together with a layer nests both
{
  const doc = new Document(30, 30, null)
  const a = doc.addLayer('A')
  const b = doc.addLayer('B')
  const c = doc.addLayer('C')
  doc.selectLayer(doc.layers.indexOf(b), false)
  const g = doc.groupSelected()
  doc.selected = new Set([g.id, c.id])
  doc.active = doc.layers.indexOf(c)
  const ng = doc.groupSelected()
  const gIn = doc.layers.find(l => l.id === g.id).parentId === ng.id
  const cIn = doc.layers.find(l => l.id === c.id).parentId === ng.id
  ok('mixed selection groups group + layer', gIn && cIn, `g=${gIn} c=${cIn}`)
  ok('mixed grouping keeps nested child', doc.layers.find(l => l.id === b.id).parentId === g.id, 'B stays in g')
  ok('mixed grouping does not duplicate descendants', doc.layers.filter(l => l.parentId === ng.id).length === 2, `kids=${doc.layers.filter(l => l.parentId === ng.id).length}`)
}

// 16. scaling a text layer re-renders it instead of upscaling pixels
{
  const doc = new Document(200, 200, null)
  const layer = doc.addLayer('Hello')
  layer.kind = 'text'
  layer.text = 'Hello'
  layer.fontFamily = 'Arial'
  layer.fontSize = 40
  layer.color = '#ffffff'
  layer.align = 'left'
  layer.textBold = false
  layer.textItalic = false
  doc.renderTextLayer(layer)
  const startW = layer.canvas.width
  const startH = layer.canvas.height
  doc.scaleLayerTo(layer, 10, 10, Math.round(startW * 2), Math.round(startH * 2))
  ok('text stays a text layer after scaling', layer.kind === 'text', layer.kind)
  ok('scaling keeps text content', layer.text === 'Hello', layer.text)
  ok('scaling grows font size proportionally', Math.abs(layer.fontSize - 80) <= 2, `fontSize=${layer.fontSize}`)
  ok('scaling grows canvas height', layer.canvas.height > startH, `${startH} -> ${layer.canvas.height}`)
  ok('font string matches new size', /8[0-2]px/.test(layer.font || ''), layer.font)
  ok('scaled text is positioned at requested origin', layer.x === 10 && layer.y === 10, `x=${layer.x} y=${layer.y}`)
}

// 17. scaling a text layer down keeps it editable and crisp
{
  const doc = new Document(200, 200, null)
  const layer = doc.addLayer('T')
  layer.kind = 'text'
  layer.text = 'T'
  layer.fontFamily = 'Arial'
  layer.fontSize = 100
  layer.color = '#ffffff'
  layer.align = 'left'
  doc.renderTextLayer(layer)
  const startH = layer.canvas.height
  doc.scaleLayerTo(layer, 0, 0, layer.canvas.width, Math.round(startH / 2))
  ok('scaling down keeps text kind', layer.kind === 'text', layer.kind)
  ok('scaling down halves font size', Math.abs(layer.fontSize - 50) <= 2, `fontSize=${layer.fontSize}`)
  ok('scaling down shrinks canvas', layer.canvas.height < startH, `${startH} -> ${layer.canvas.height}`)
}

// 18. scaling a raster layer resizes its bitmap
{
  const doc = new Document(100, 100, null)
  const layer = doc.addLayer('Raster')
  paint(layer, '#ff0000')
  doc.scaleLayerTo(layer, 0, 0, 50, 50)
  ok('raster scaling resizes canvas', layer.canvas.width === 50 && layer.canvas.height === 50, `${layer.canvas.width}x${layer.canvas.height}`)
  ok('raster scaling keeps kind raster', layer.kind === 'raster', layer.kind)
}

// 19. rendering text sets caret anchor metadata used for editing
{
  const doc = new Document(120, 120, null)
  const layer = doc.addLayer('Edit')
  layer.kind = 'text'
  layer.text = 'Edit'
  layer.fontFamily = 'Arial'
  layer.fontSize = 30
  layer.color = '#000000'
  layer.align = 'center'
  const r = doc.renderTextLayer(layer)
  ok('renderTextLayer returns ascent', r && r.ascent > 0, `ascent=${r && r.ascent}`)
  ok('renderTextLayer stores ascent on layer', layer.ascent === r.ascent, `${layer.ascent}`)
  ok('center-aligned text canvas is wider than zero', layer.canvas.width > 2, `w=${layer.canvas.width}`)
}

console.log(`\n${failures.length ? failures.length + ' failing' : 'all audit checks passed'}`)
if (failures.length) process.exitCode = 1
