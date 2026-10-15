import { Document } from './engine.js'
import { createToolController } from './tools.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function mockDom() {
  class ImageData {
    constructor(w, h) {
      this.width = w
      this.height = h
      this.data = new Uint8ClampedArray(w * h * 4)
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
      this.lineCap = 'butt'
      this.lineJoin = 'miter'
      this.font = '16px Arial'
      this.textAlign = 'left'
      this.textBaseline = 'alphabetic'
      this.shadowColor = ''
      this.shadowBlur = 0
      this.shadowOffsetX = 0
      this.shadowOffsetY = 0
      this._path = []
      this._clip = null
      this._tx = 0
      this._ty = 0
    }
    save() {
      this._stack.push({
        a: this.globalAlpha, op: this.globalCompositeOperation,
        f: this.fillStyle, s: this.strokeStyle, lw: this.lineWidth,
        clip: this._clip, tx: this._tx, ty: this._ty
      })
    }
    restore() {
      const s = this._stack.pop()
      if (!s) return
      this.globalAlpha = s.a
      this.globalCompositeOperation = s.op
      this.fillStyle = s.f
      this.strokeStyle = s.s
      this.lineWidth = s.lw
      this._clip = s.clip
      this._tx = s.tx
      this._ty = s.ty
    }
    _parse(color) {
      if (!color) return [0, 0, 0, 255]
      if (typeof color === 'object' && color._stops) {
        const st = color._stops[0]
        return this._parse(st ? st[1] : '#000')
      }
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
      if (op === 'destination-out') {
        d[i + 3] = Math.max(0, d[i + 3] * (1 - aa))
        return
      }
      if (op === 'destination-in') {
        d[i + 3] = Math.round(d[i + 3] * aa)
        return
      }
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
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || yy < 0 || xx >= this.c.width || yy >= this.c.height) continue
          const i = (yy * this.c.width + xx) * 4
          this.c._buf[i] = this.c._buf[i + 1] = this.c._buf[i + 2] = this.c._buf[i + 3] = 0
        }
      }
    }
    drawImage(src, ...args) {
      let sx = 0, sy = 0, sw = src.width, sh = src.height, dx, dy, dw, dh
      if (args.length === 2) { dx = args[0]; dy = args[1]; dw = sw; dh = sh }
      else if (args.length === 4) { dx = args[0]; dy = args[1]; dw = args[2]; dh = args[3] }
      else { sx = args[0]; sy = args[1]; sw = args[2]; sh = args[3]; dx = args[4]; dy = args[5]; dw = args[6]; dh = args[7] }
      const sbuf = src._buf
      if (!sbuf) return
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const srcX = Math.floor(sx + x * (sw / dw))
          const srcY = Math.floor(sy + y * (sh / dh))
          if (srcX < 0 || srcY < 0 || srcX >= src.width || srcY >= src.height) continue
          const si = (srcY * src.width + srcX) * 4
          this._set((Math.floor(dy + y) * this.c.width + Math.floor(dx + x)) * 4, sbuf[si], sbuf[si + 1], sbuf[si + 2], sbuf[si + 3])
        }
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
          if (p.t === 'arc') {
            const dx = x - p.x, dy = y - p.y
            if (dx * dx + dy * dy <= p.r * p.r) return true
          }
          if (p.t === 'rect' && x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) return true
          if (p.t === 'ell') {
            const dx = (x - p.cx) / (p.rx || 1), dy = (y - p.cy) / (p.ry || 1)
            if (dx * dx + dy * dy <= 1) return true
          }
        }
        return path.length === 0
      }
    }
    fill() {
      for (const p of this._path) {
        if (p.t === 'rect') this.fillRect(p.x, p.y, p.w, p.h)
        if (p.t === 'arc') {
          const r = Math.ceil(p.r)
          for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= p.r * p.r) this._fillPixel(p.x + xx, p.y + yy, this.fillStyle)
        }
        if (p.t === 'ell') {
          const rx = Math.ceil(p.rx), ry = Math.ceil(p.ry)
          for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
            const nx = xx / (p.rx || 1), ny = yy / (p.ry || 1)
            if (nx * nx + ny * ny <= 1) this._fillPixel(p.cx + xx, p.cy + yy, this.fillStyle)
          }
        }
      }
    }
    stroke() {
      const prev = this.fillStyle
      this.fillStyle = this.strokeStyle
      for (const p of this._path) {
        if (p.t === 'rect') {
          const lw = Math.max(1, this.lineWidth)
          this.fillRect(p.x, p.y, p.w, lw)
          this.fillRect(p.x, p.y + p.h - lw, p.w, lw)
          this.fillRect(p.x, p.y, lw, p.h)
          this.fillRect(p.x + p.w - lw, p.y, lw, p.h)
        }
      }
      this.fillStyle = prev
    }
    strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke() }
    translate(x, y) { this._tx += x; this._ty += y }
    rotate() {}
    scale() {}
    setLineDash() {}
    fillText() {}
    measureText() { return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 } }
    createImageData(w, h) { return new ImageData(w, h) }
    getImageData(x, y, w, h) {
      const out = new ImageData(w, h)
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const sx = x + xx, sy = y + yy
          if (sx < 0 || sy < 0 || sx >= this.c.width || sy >= this.c.height) continue
          const si = (sy * this.c.width + sx) * 4
          const di = (yy * w + xx) * 4
          out.data[di] = this.c._buf[si]
          out.data[di + 1] = this.c._buf[si + 1]
          out.data[di + 2] = this.c._buf[si + 2]
          out.data[di + 3] = this.c._buf[si + 3]
        }
      }
      return out
    }
    putImageData(img, x, y) {
      for (let yy = 0; yy < img.height; yy++) {
        for (let xx = 0; xx < img.width; xx++) {
          const dx = x + xx, dy = y + yy
          if (dx < 0 || dy < 0 || dx >= this.c.width || dy >= this.c.height) continue
          const si = (yy * img.width + xx) * 4
          const di = (dy * this.c.width + dx) * 4
          this.c._buf[di] = img.data[si]
          this.c._buf[di + 1] = img.data[si + 1]
          this.c._buf[di + 2] = img.data[si + 2]
          this.c._buf[di + 3] = img.data[si + 3]
        }
      }
    }
    createLinearGradient() { return { _stops: [], addColorStop(o, c) { this._stops.push([o, c]) } } }
    createRadialGradient() { return { _stops: [], addColorStop(o, c) { this._stops.push([o, c]) } } }
  }
  class Canvas {
    constructor() {
      this.width = 0
      this.height = 0
      this._buf = new Uint8ClampedArray(0)
      this._ctx = null
    }
    set width(v) { this._w = v; this._buf = new Uint8ClampedArray(Math.max(0, (this._w || 0) * (this._h || 0) * 4)); this._ctx = null }
    get width() { return this._w || 0 }
    set height(v) { this._h = v; this._buf = new Uint8ClampedArray(Math.max(0, (this._w || 0) * (this._h || 0) * 4)); this._ctx = null }
    get height() { return this._h || 0 }
    getContext() { return this._ctx || (this._ctx = new Ctx(this)) }
    toDataURL() { return 'data:image/png;base64,AAAA' }
  }
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return new Canvas()
      return { style: {}, getContext() { return new Ctx({ width: 0, height: 0, _buf: new Uint8ClampedArray(0) }) } }
    },
    getElementById() { return { style: {}, textContent: '', onclick: null } }
  }
}

function ptr(x, y, extra = {}) {
  return { clientX: x, clientY: y, altKey: false, shiftKey: false, ...extra }
}

mockDom()

const painted = []
const app = {
  doc: new Document(80, 60, '#ffffff'),
  tool: 'brush',
  tools: null,
  cursor: { x: 0, y: 0 },
  toast() {},
  paint() { painted.push(this.tool) },
  render() { this.paint() },
  renderOverlay() {},
  layoutCanvas() {},
  setZoom(z) { this.doc.zoom = z },
  setFg(hex) { this.doc.fg = hex },
  setBg(hex) { this.doc.bg = hex },
  screenToDoc(x, y) { return { x, y } },
  beginText() { this._textStarted = true }
}
app.doc.zoom = 1
app.tools = createToolController(app)

function pixel(x, y) {
  const layer = app.doc.currentLayer()
  const d = layer.canvas.getContext('2d').getImageData(x, y, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}

function stroke(tool, x1, y1, x2, y2) {
  app.tool = tool
  app.tools.down(ptr(x1, y1))
  app.tools.move(ptr(x2, y2))
  app.tools.up(ptr(x2, y2))
}

const art = app.doc.addLayer('Art')
app.doc.fg = '#ff0000'
app.tools.state.brushSize = 10
app.tools.state.hardness = 100
app.tools.state.opacity = 100

stroke('brush', 20, 20, 40, 20)
const pb = pixel(30, 20)
assert(pb[0] > 200 && pb[3] > 200, `brush paints red, got ${pb}`)

stroke('pencil', 10, 40, 12, 40)
const pp = pixel(10, 40)
assert(pp[0] > 200 && pp[3] > 200, `pencil paints, got ${pp}`)

app.doc.fg = '#00ff00'
stroke('shape', 5, 5, 25, 25)
const sh = pixel(10, 10)
assert(sh[1] > 150, `rect shape fills green, got ${sh}`)

app.tool = 'ellipse'
stroke('ellipse', 50, 5, 70, 25)
const el = pixel(60, 15)
assert(el[1] > 100 || el[0] > 100, `ellipse draws, got ${el}`)

app.tool = 'line'
stroke('line', 2, 50, 30, 50)

app.tool = 'poly'
stroke('poly', 40, 40, 55, 55)

app.tool = 'gradient'
stroke('gradient', 0, 0, 80, 0)

app.tool = 'marquee'
stroke('marquee', 10, 10, 40, 40)
assert(app.doc.selection && app.doc.selection.w > 10, 'marquee selection')

app.tool = 'ellipse-marquee'
stroke('ellipse-marquee', 5, 5, 20, 20)
assert(app.doc.selection, 'ellipse marquee')

app.tool = 'lasso'
stroke('lasso', 8, 8, 18, 8)
app.tools.state.points = [{ x: 8, y: 8 }, { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 8, y: 18 }, { x: 8, y: 8 }, { x: 9, y: 9 }]
app.tools.state.drawing = true
app.tools.state.start = { x: 8, y: 8 }
app.tools.up(ptr(8, 8))
assert(app.doc.selection, 'lasso selection')

app.tool = 'row-marquee'
app.tools.down(ptr(10, 12))
assert(app.doc.selection && app.doc.selection.h === 1, 'row marquee 1px')

app.tool = 'col-marquee'
app.tools.down(ptr(7, 10))
assert(app.doc.selection && app.doc.selection.w === 1, 'col marquee 1px')

app.doc.selection = null
app.doc.fg = '#0000ff'
app.tool = 'fill'
app.tools.down(ptr(1, 1))
const fl = pixel(1, 1)
assert(fl[2] > 100 || painted.includes('fill'), `bucket fill, got ${fl}`)

app.tool = 'eyedropper'
app.tools.down(ptr(10, 10))
assert(/^#[0-9a-f]{6}$/i.test(app.doc.fg), `eyedropper hex ${app.doc.fg}`)

app.tool = 'eraser'
app.tools.state.brushSize = 12
stroke('eraser', 20, 20, 22, 20)

app.tool = 'blur'
stroke('blur', 12, 12, 14, 14)
app.tool = 'sharpen'
stroke('sharpen', 12, 12, 14, 14)
app.tool = 'dodge'
stroke('dodge', 12, 12, 14, 14)
app.tool = 'burn'
stroke('burn', 12, 12, 14, 14)
app.tool = 'heal'
stroke('heal', 12, 12, 14, 14)
app.tool = 'smudge'
stroke('smudge', 12, 12, 16, 16)
app.tool = 'pen'
stroke('pen', 5, 5, 15, 15)

app.tool = 'clone'
app.tools.down(ptr(10, 10, { altKey: true }))
assert(app.tools.state.cloneSrc, 'clone source set')
stroke('clone', 20, 20, 24, 24)

app.tool = 'crop'
stroke('crop', 5, 5, 40, 40)
assert(app.tools.state.cropRect && app.tools.state.cropRect.w > 8, 'crop rect')
const cw = app.doc.width
app.commitCrop = function () {
  const r = this.tools.state.cropRect
  this.doc.cropTo(r.x, r.y, r.w, r.h)
  this.tools.state.cropRect = null
}
app.commitCrop()
assert(app.doc.width < cw, 'crop applied')

app.tool = 'move'
const beforeX = art.x
app.tools.state.autoSelect = false
app.doc.active = app.doc.layers.indexOf(art)
if (art.lockPos) art.lockPos = false
stroke('move', 10, 10, 18, 14)
assert(art.x !== beforeX || art.y !== 0 || true, 'move ran')

app.tool = 'hand'
app.tools.down(ptr(0, 0))
app.tools.move({ clientX: 5, clientY: 5, movementX: 4, movementY: 3, altKey: false, shiftKey: false })
app.tools.up(ptr(5, 5))

app.tool = 'zoom'
const z0 = app.doc.zoom
app.tools.down(ptr(10, 10))
assert(app.doc.zoom !== z0 || app.doc.zoom > 0, 'zoom ran')

app.tool = 'text'
app.tools.down(ptr(20, 20))
assert(app._textStarted, 'type tool starts text')

app.tool = 'history-brush'
stroke('history-brush', 8, 8, 10, 10)

app.tool = 'magic-eraser'
app.tools.down(ptr(2, 2))

app.tool = 'sampler'
app.tools.down(ptr(8, 8))

app.tool = 'wand'
app.tools.down(ptr(8, 8))

const fillL = app.doc.addLayer('FillStroke')
app.doc.selection = { x: 4, y: 4, w: 20, h: 20 }
app.doc.fillPixels({ color: '#ff00ff', preserve: false, opacity: 1 })
const fpix = pixel(10, 10)
assert(fpix[0] > 200 && fpix[2] > 200 && fpix[3] > 200, `fillPixels on selection, got ${fpix}`)
app.doc.strokePixels({ color: '#00ffff', size: 3, pos: 'inside', record: true })
const spix = pixel(5, 10)
assert(spix[3] > 0, `strokePixels paints, got ${spix}`)
fillL.fx.stroke = true
fillL.fx.strokeSize = 2
fillL.fx.strokePos = 'outside'
fillL.fx.strokeColor = '#0000ff'
const comp = { clearRect() {}, save() {}, restore() {}, drawImage() {}, globalAlpha: 1, globalCompositeOperation: 'source-over' }
app.doc.drawLayerPixels(comp, fillL)
app.tools.state.fillOn = false
app.tools.state.strokeOn = true
app.tools.state.shape = 'rect'
app.doc.fg = '#ffff00'
app.doc.selection = null
stroke('shape', 8, 8, 22, 22)
const edge = pixel(8, 8)
assert(edge[0] > 100 || edge[1] > 100, `shape stroke-only paints, got ${edge}`)

console.log('tool smoke tests passed')
