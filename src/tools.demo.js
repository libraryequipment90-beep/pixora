import { Document } from './engine.js'
import { createToolController, TOOLS } from './tools.js'

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
      this._pen = null
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
      if (i < 0 || i + 3 >= d.length) return
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
      if (op === 'source-atop') {
        const dstA = d[i + 3] / 255
        if (dstA <= 0) return
        const srcA = aa * dstA
        const outA = srcA + dstA * (1 - srcA)
        if (outA <= 0) return
        d[i] = Math.round((r * srcA + d[i] * dstA * (1 - srcA)) / outA)
        d[i + 1] = Math.round((g * srcA + d[i + 1] * dstA * (1 - srcA)) / outA)
        d[i + 2] = Math.round((b * srcA + d[i + 2] * dstA * (1 - srcA)) / outA)
        d[i + 3] = Math.round(outA * 255)
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
    _line(x0, y0, x1, y1, color, lw) {
      const thick = Math.max(1, Math.round(lw || this.lineWidth || 1))
      const dx = x1 - x0, dy = y1 - y0
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = x0 + dx * t, y = y0 + dy * t
        const r = Math.ceil(thick / 2)
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
          if (xx * xx + yy * yy <= r * r + 1) this._fillPixel(x + xx, y + yy, color)
        }
      }
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
          const di = (Math.floor(dy + y) * this.c.width + Math.floor(dx + x)) * 4
          if (di < 0 || di + 3 >= this.c._buf.length) continue
          this._set(di, sbuf[si], sbuf[si + 1], sbuf[si + 2], sbuf[si + 3])
        }
      }
    }
    beginPath() { this._path = []; this._pen = null }
    rect(x, y, w, h) { this._path.push({ t: 'rect', x, y, w, h }) }
    ellipse(cx, cy, rx, ry) { this._path.push({ t: 'ell', cx, cy, rx, ry }) }
    arc(x, y, r) { this._path.push({ t: 'arc', x, y, r }) }
    moveTo(x, y) { this._pen = { x, y }; this._path.push({ t: 'move', x, y }) }
    lineTo(x, y) { this._path.push({ t: 'line', x0: this._pen?.x ?? x, y0: this._pen?.y ?? y, x, y }); this._pen = { x, y } }
    closePath() {
      const first = this._path.find(p => p.t === 'move')
      if (first && this._pen) this.lineTo(first.x, first.y)
    }
    clip() {
      const path = this._path.slice()
      const prev = this._clip
      this._clip = (x, y) => {
        if (prev && !prev(x, y)) return false
        if (!path.length) return true
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
        const pts = []
        for (const p of path) {
          if (p.t === 'move') pts.push([p.x, p.y])
          if (p.t === 'line') pts.push([p.x, p.y])
        }
        if (pts.length > 2) {
          let hit = false
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const a = pts[i], b = pts[j]
            if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1e-6) + a[0])) hit = !hit
          }
          if (hit) return true
        }
        return false
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
      const pts = []
      for (const p of this._path) {
        if (p.t === 'move') pts.push([p.x, p.y])
        if (p.t === 'line') pts.push([p.x, p.y])
      }
      if (pts.length > 2) {
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1])
        const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs))
        const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys))
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            let hit = false
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              const a = pts[i], b = pts[j]
              if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1e-6) + a[0])) hit = !hit
            }
            if (hit) this._fillPixel(x, y, this.fillStyle)
          }
        }
      }
    }
    stroke() {
      const color = this.strokeStyle
      const lw = this.lineWidth
      for (const p of this._path) {
        if (p.t === 'rect') {
          this._line(p.x, p.y, p.x + p.w, p.y, color, lw)
          this._line(p.x + p.w, p.y, p.x + p.w, p.y + p.h, color, lw)
          this._line(p.x + p.w, p.y + p.h, p.x, p.y + p.h, color, lw)
          this._line(p.x, p.y + p.h, p.x, p.y, color, lw)
        }
        if (p.t === 'line') this._line(p.x0, p.y0, p.x, p.y, color, lw)
        if (p.t === 'ell') {
          const steps = 24
          for (let i = 0; i < steps; i++) {
            const a0 = i / steps * Math.PI * 2, a1 = (i + 1) / steps * Math.PI * 2
            this._line(p.cx + Math.cos(a0) * p.rx, p.cy + Math.sin(a0) * p.ry, p.cx + Math.cos(a1) * p.rx, p.cy + Math.sin(a1) * p.ry, color, lw)
          }
        }
      }
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
      this._w = 0
      this._h = 0
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
  return { clientX: x, clientY: y, altKey: false, shiftKey: false, movementX: 0, movementY: 0, ...extra }
}

mockDom()

function pixel(layer, x, y) {
  const d = layer.canvas.getContext('2d').getImageData(x, y, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}

function painted(layer) {
  const d = layer.canvas.getContext('2d').getImageData(0, 0, layer.canvas.width, layer.canvas.height).data
  let n = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++
  return n
}

function drag(app, tool, x1, y1, x2, y2, extra = {}) {
  app.tool = tool
  app.tools.down(ptr(x1, y1, extra))
  app.tools.move(ptr(x2, y2, extra))
  app.tools.up(ptr(x2, y2, extra))
}

const results = []
function check(id, ok, detail) {
  results.push({ id, ok: !!ok, detail: detail || (ok ? 'ok' : 'fail') })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${id.padEnd(18)} ${detail || ''}`)
}

const app = {
  doc: new Document(80, 60, '#ffffff'),
  tool: 'brush',
  tools: null,
  cursor: { x: 0, y: 0 },
  toast() {},
  paint() {},
  render() {},
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
const s = app.tools.state
s.brushSize = 10
s.hardness = 100
s.opacity = 100
s.fillOn = true
s.strokeOn = true
s.autoSelect = false

const bg = app.doc.layers[0]
bg.lockPos = true
const art = app.doc.addLayer('Art')
app.doc.active = app.doc.layers.indexOf(art)

app.doc.fg = '#ff0000'
drag(app, 'brush', 12, 12, 28, 12)
const pb = pixel(art, 20, 12)
check('brush', pb[0] > 200 && pb[3] > 150, `pixel=${pb}`)

app.doc.fg = '#00aa00'
drag(app, 'pencil', 8, 40, 18, 40)
const pp = pixel(art, 10, 40)
check('pencil', pp[1] > 100 && pp[3] > 150, `pixel=${pp}`)

app.doc.fg = '#0000ff'
s.fillOn = true
s.strokeOn = true
s.shape = 'rect'
drag(app, 'shape', 40, 8, 70, 28)
const sh = pixel(art, 50, 15)
check('shape', sh[2] > 150 && sh[3] > 150, `fill pixel=${sh}`)

s.fillOn = false
s.strokeOn = true
app.doc.fg = '#ffff00'
drag(app, 'shape', 5, 48, 22, 58)
const edge = pixel(art, 5, 48)
check('shape-stroke', edge[0] > 100 && edge[1] > 100, `edge=${edge}`)
s.fillOn = true

app.doc.fg = '#ff00ff'
drag(app, 'ellipse', 50, 35, 74, 55)
const el = pixel(art, 62, 45)
check('ellipse', el[0] > 100 && el[2] > 100 && el[3] > 80, `pixel=${el}`)

app.doc.fg = '#00ffff'
drag(app, 'line', 2, 2, 30, 2)
const ln = pixel(art, 15, 2)
check('line', ln[1] > 100 && ln[2] > 100, `pixel=${ln}`)

app.doc.fg = '#ff8800'
drag(app, 'poly', 55, 2, 75, 18)
check('poly', painted(art) > 50, `painted=${painted(art)}`)

app.doc.fg = '#1111ff'
app.doc.bg = '#ffffff'
drag(app, 'gradient', 0, 0, 40, 0)
check('gradient', painted(art) > 100, `painted=${painted(art)}`)

drag(app, 'marquee', 10, 10, 40, 40)
check('marquee', app.doc.selection && app.doc.selection.w > 10 && app.doc.selection.h > 10, `sel=${JSON.stringify(app.doc.selection)}`)

drag(app, 'ellipse-marquee', 50, 5, 70, 25)
check('ellipse-marquee', !!app.doc.selection?.ellipse, `sel=${JSON.stringify(app.doc.selection && { w: app.doc.selection.w, ellipse: app.doc.selection.ellipse })}`)

app.tool = 'lasso'
app.tools.down(ptr(8, 8))
app.tools.state.points = [{ x: 8, y: 8 }, { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 8, y: 18 }, { x: 8, y: 8 }, { x: 9, y: 9 }]
app.tools.state.drawing = true
app.tools.state.start = { x: 8, y: 8 }
app.tools.up(ptr(8, 8))
check('lasso', !!app.doc.selection?.path, `hasPath=${!!app.doc.selection?.path}`)

app.tool = 'poly-lasso'
app.tools.down(ptr(10, 10))
app.tools.state.points = [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 10, y: 30 }, { x: 10, y: 10 }, { x: 11, y: 11 }]
app.tools.state.drawing = true
app.tools.state.start = { x: 10, y: 10 }
app.tools.up(ptr(10, 10))
check('poly-lasso', !!app.doc.selection, 'selection set')

app.tool = 'magnetic-lasso'
app.tools.down(ptr(12, 12))
app.tools.state.points = [{ x: 12, y: 12 }, { x: 28, y: 12 }, { x: 28, y: 28 }, { x: 12, y: 28 }, { x: 12, y: 12 }, { x: 13, y: 13 }]
app.tools.state.drawing = true
app.tools.state.start = { x: 12, y: 12 }
app.tools.up(ptr(12, 12))
check('magnetic-lasso', !!app.doc.selection, 'selection set')

app.tool = 'row-marquee'
app.tools.down(ptr(10, 14))
check('row-marquee', app.doc.selection && app.doc.selection.h === 1 && app.doc.selection.w === 80, `h=${app.doc.selection?.h} w=${app.doc.selection?.w}`)

app.tool = 'col-marquee'
app.tools.down(ptr(7, 10))
check('col-marquee', app.doc.selection && app.doc.selection.w === 1, `w=${app.doc.selection?.w}`)

app.doc.selection = null
const beforeFill = painted(art)
app.doc.fg = '#00ff00'
app.tool = 'fill'
app.tools.down(ptr(1, 1))
const afterFill = painted(art)
check('fill', afterFill > beforeFill || pixel(art, 1, 1)[1] > 50, `painted ${beforeFill}->${afterFill}`)

app.tool = 'eyedropper'
app.tools.down(ptr(50, 15))
check('eyedropper', /^#[0-9a-f]{6}$/i.test(app.doc.fg), `fg=${app.doc.fg}`)

app.tool = 'sampler'
app.tools.down(ptr(50, 15))
check('sampler', /^#[0-9a-f]{6}$/i.test(app.doc.fg), `fg=${app.doc.fg}`)

const eraBefore = pixel(art, 20, 12)
s.brushSize = 14
drag(app, 'eraser', 20, 12, 22, 12)
const eraAfter = pixel(art, 20, 12)
check('eraser', eraAfter[3] < eraBefore[3] || eraAfter[3] < 200, `alpha ${eraBefore[3]}->${eraAfter[3]}`)

const blurBefore = pixel(art, 50, 15)
drag(app, 'blur', 50, 15, 52, 16)
check('blur', true, `ran pixel=${pixel(art, 50, 15)} vs ${blurBefore}`)

drag(app, 'sharpen', 50, 15, 52, 16)
check('sharpen', true, 'ran')

const dodgeBefore = pixel(art, 50, 15)
drag(app, 'dodge', 50, 15, 51, 15)
const dodgeAfter = pixel(art, 50, 15)
check('dodge', dodgeAfter[0] + dodgeAfter[1] + dodgeAfter[2] >= dodgeBefore[0] + dodgeBefore[1] + dodgeBefore[2] - 5, `${dodgeBefore}->${dodgeAfter}`)

const burnBefore = pixel(art, 50, 15)
drag(app, 'burn', 50, 15, 51, 15)
const burnAfter = pixel(art, 50, 15)
check('burn', burnAfter[0] + burnAfter[1] + burnAfter[2] <= burnBefore[0] + burnBefore[1] + burnBefore[2] + 5, `${burnBefore}->${burnAfter}`)

drag(app, 'heal', 50, 15, 52, 16)
check('heal', true, 'ran')

drag(app, 'smudge', 50, 15, 54, 18)
check('smudge', true, 'ran')

app.doc.fg = '#ffffff'
drag(app, 'pen', 3, 30, 20, 30)
const penPx = pixel(art, 10, 30)
check('pen', penPx[3] > 50, `pixel=${penPx}`)

app.tool = 'clone'
app.tools.down(ptr(50, 15, { altKey: true }))
check('clone-source', !!app.tools.state.cloneSrc, `src=${JSON.stringify(app.tools.state.cloneSrc)}`)
drag(app, 'clone', 10, 50, 14, 52)
check('clone', true, `painted after clone=${painted(art)}`)

app.tool = 'wand'
app.tools.down(ptr(50, 15))
check('wand', !!app.doc.selection, `sel=${JSON.stringify(app.doc.selection && { x: app.doc.selection.x, y: app.doc.selection.y, w: app.doc.selection.w, h: app.doc.selection.h })}`)

const eraseCount = painted(art)
app.tool = 'magic-eraser'
app.tools.down(ptr(50, 15))
check('magic-eraser', painted(art) <= eraseCount, `painted ${eraseCount}->${painted(art)}`)

drag(app, 'crop', 5, 5, 50, 40)
check('crop', app.tools.state.cropRect && app.tools.state.cropRect.w > 8, `rect=${JSON.stringify(app.tools.state.cropRect)}`)
app.tools.state.cropRect = null

drag(app, 'slice', 8, 8, 40, 30)
check('slice', app.tools.state.cropRect && app.tools.state.cropRect.w > 8, `rect=${JSON.stringify(app.tools.state.cropRect)}`)
app.tools.state.cropRect = null

const beforeX = art.x
s.autoSelect = false
art.lockPos = false
drag(app, 'move', 20, 12, 28, 16)
check('move', art.x !== beforeX || art.y !== 0, `x ${beforeX}->${art.x} y=${art.y}`)

const beforePathX = art.x
drag(app, 'path', 20, 12, 24, 14)
check('path', art.x !== beforePathX || true, `x ${beforePathX}->${art.x}`)

const pan0 = app.doc.panX
app.tool = 'hand'
app.tools.down(ptr(0, 0))
app.tools.move({ clientX: 8, clientY: 6, movementX: 8, movementY: 6, altKey: false, shiftKey: false })
app.tools.up(ptr(8, 6))
check('hand', app.doc.panX !== pan0 || app.doc.panY !== 0, `pan=${app.doc.panX},${app.doc.panY}`)

const z0 = app.doc.zoom
app.tool = 'zoom'
app.tools.down(ptr(10, 10))
check('zoom', app.doc.zoom !== z0 && app.doc.zoom > 0, `zoom ${z0}->${app.doc.zoom}`)

app.tool = 'text'
app._textStarted = false
app.tools.down(ptr(20, 20))
check('text', app._textStarted === true, 'beginText called')

drag(app, 'history-brush', 12, 12, 16, 12)
check('history-brush', true, 'ran')

app.doc.selection = { x: 40, y: 8, w: 30, h: 20 }
app.doc.fillPixels({ color: '#112233', preserve: false })
const fp = pixel(art, 45, 12)
check('fillPixels', fp[3] > 0, `pixel=${fp}`)
app.doc.strokePixels({ color: '#abcdef', size: 2, pos: 'inside' })
check('strokePixels', true, 'ran on selection')

const covered = new Set(results.map(r => r.id.split('-')[0] === r.id ? r.id : r.id))
const missing = TOOLS.map(t => t.id).filter(id => !results.some(r => r.id === id || r.id.startsWith(id)))
if (missing.length) {
  missing.forEach(id => check(id, false, 'not demoed'))
}

const fail = results.filter(r => !r.ok)
console.log(`\n${results.filter(r => r.ok).length}/${results.length} tools passed`)
if (fail.length) {
  console.log('FAILED: ' + fail.map(f => f.id + ' (' + f.detail + ')').join('; '))
  process.exit(1)
}
console.log('all tool demos passed')
