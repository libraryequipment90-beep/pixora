function getImageData(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
}

function putImageData(canvas, data) {
  canvas.getContext('2d').putImageData(data, 0, 0)
}

function eachPixel(data, fn) {
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b, a] = fn(d[i], d[i + 1], d[i + 2], d[i + 3], i)
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a
  }
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function applyAdjustments(canvas, adj) {
  const data = getImageData(canvas)
  const d = data.data
  const bri = adj.brightness || 0
  const con = (adj.contrast || 0) / 100
  const sat = 1 + (adj.saturation || 0) / 100
  const vib = (adj.vibrance || 0) / 100
  const hue = ((adj.hue || 0) / 180) * Math.PI
  const exp = Math.pow(2, (adj.exposure || 0) / 100)
  const gamRaw = adj.gamma == null ? 1 : adj.gamma
  const gam = gamRaw > 5 ? gamRaw / 100 : (gamRaw || 1)
  const temp = adj.temperature || 0
  const tint = adj.tint || 0
  const high = adj.highlights || 0
  const shad = adj.shadows || 0
  const cf = (259 * (con * 255 + 255)) / (255 * (259 - con * 255))
  const cosH = Math.cos(hue)
  const sinH = Math.sin(hue)

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    r *= exp; g *= exp; b *= exp
    r = cf * (r - 128) + 128 + bri
    g = cf * (g - 128) + 128 + bri
    b = cf * (b - 128) + 128 + bri
    if (gam !== 1) {
      r = 255 * Math.pow(Math.max(r, 0) / 255, 1 / gam)
      g = 255 * Math.pow(Math.max(g, 0) / 255, 1 / gam)
      b = 255 * Math.pow(Math.max(b, 0) / 255, 1 / gam)
    }
    r += temp * 0.6
    b -= temp * 0.6
    g += tint * 0.4
    const L = lum(r, g, b)
    const satAmt = sat + vib * (1 - Math.min(r, g, b) / 255)
    r = L + (r - L) * satAmt
    g = L + (g - L) * satAmt
    b = L + (b - L) * satAmt
    if (hue) {
      const nr = r * (0.213 + cosH * 0.787 - sinH * 0.213) + g * (0.715 - cosH * 0.715 - sinH * 0.715) + b * (0.072 - cosH * 0.072 + sinH * 0.928)
      const ng = r * (0.213 - cosH * 0.213 + sinH * 0.143) + g * (0.715 + cosH * 0.285 + sinH * 0.140) + b * (0.072 - cosH * 0.072 - sinH * 0.283)
      const nb = r * (0.213 - cosH * 0.213 - sinH * 0.787) + g * (0.715 - cosH * 0.715 + sinH * 0.715) + b * (0.072 + cosH * 0.928 + sinH * 0.072)
      r = nr; g = ng; b = nb
    }
    const ll = lum(r, g, b) / 255
    if (ll > 0.5) {
      const t = (ll - 0.5) * 2 * (high / 100)
      r += (255 - r) * t
      g += (255 - g) * t
      b += (255 - b) * t
    } else {
      const t = (0.5 - ll) * 2 * (shad / 100)
      r += r * t
      g += g * t
      b += b * t
    }
    d[i] = clamp(r)
    d[i + 1] = clamp(g)
    d[i + 2] = clamp(b)
  }
  putImageData(canvas, data)
}

export const FILTERS = {
  grayscale(canvas) {
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => {
      const v = lum(r, g, b)
      return [v, v, v, a]
    })
    putImageData(canvas, data)
  },
  invert(canvas) {
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => [255 - r, 255 - g, 255 - b, a])
    putImageData(canvas, data)
  },
  sepia(canvas) {
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => [
      clamp(r * 0.393 + g * 0.769 + b * 0.189),
      clamp(r * 0.349 + g * 0.686 + b * 0.168),
      clamp(r * 0.272 + g * 0.534 + b * 0.131),
      a
    ])
    putImageData(canvas, data)
  },
  posterize(canvas, levels = 4) {
    const step = 255 / Math.max(2, levels - 1)
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => [
      Math.round(r / step) * step,
      Math.round(g / step) * step,
      Math.round(b / step) * step,
      a
    ])
    putImageData(canvas, data)
  },
  threshold(canvas, t = 128) {
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => {
      const v = lum(r, g, b) > t ? 255 : 0
      return [v, v, v, a]
    })
    putImageData(canvas, data)
  },
  blur(canvas, radius = 2) {
    boxBlur(canvas, radius)
  },
  sharpen(canvas) {
    convolve(canvas, [0, -1, 0, -1, 5, -1, 0, -1, 0])
  },
  emboss(canvas) {
    convolve(canvas, [-2, -1, 0, -1, 1, 1, 0, 1, 2], 128)
  },
  edge(canvas) {
    convolve(canvas, [-1, -1, -1, -1, 8, -1, -1, -1, -1], 0)
  },
  motionBlur(canvas) {
    convolve(canvas, [
      1 / 9, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1 / 9, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1 / 9, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1 / 9, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 1 / 9, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 1 / 9, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1 / 9, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1 / 9, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 1 / 9
    ])
  },
  noise(canvas, amount = 30) {
    const data = getImageData(canvas)
    eachPixel(data, (r, g, b, a) => {
      const n = (Math.random() - 0.5) * amount
      return [clamp(r + n), clamp(g + n), clamp(b + n), a]
    })
    putImageData(canvas, data)
  },
  pixelate(canvas, size = 8) {
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const tmp = document.createElement('canvas')
    tmp.width = Math.max(1, Math.ceil(w / size))
    tmp.height = Math.max(1, Math.ceil(h / size))
    const tctx = tmp.getContext('2d')
    tctx.imageSmoothingEnabled = false
    tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(tmp, 0, 0, w, h)
    ctx.imageSmoothingEnabled = true
  },
  vignette(canvas, strength = 0.55) {
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.25,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${strength})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  },
  oil(canvas) {
    posterize(canvas, 6)
    boxBlur(canvas, 1)
  }
}

function posterize(canvas, levels) {
  FILTERS.posterize(canvas, levels)
}

function boxBlur(canvas, radius) {
  radius = Math.max(1, Math.round(radius))
  const src = getImageData(canvas)
  const w = src.width
  const h = src.height
  const d = src.data
  const tmp = new Uint8ClampedArray(d)
  const pass = (from, to, horiz) => {
    const len = horiz ? w : h
    const lines = horiz ? h : w
    for (let line = 0; line < lines; line++) {
      for (let i = 0; i < len; i++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0
        for (let k = -radius; k <= radius; k++) {
          const j = i + k
          if (j < 0 || j >= len) continue
          const idx = horiz
            ? (line * w + j) * 4
            : (j * w + line) * 4
          r += from[idx]; g += from[idx + 1]; b += from[idx + 2]; a += from[idx + 3]
          n++
        }
        const idx = horiz
          ? (line * w + i) * 4
          : (i * w + line) * 4
        to[idx] = r / n
        to[idx + 1] = g / n
        to[idx + 2] = b / n
        to[idx + 3] = a / n
      }
    }
  }
  pass(d, tmp, true)
  pass(tmp, d, false)
  putImageData(canvas, src)
}

function convolve(canvas, kernel, bias = 0) {
  const side = Math.round(Math.sqrt(kernel.length))
  const half = Math.floor(side / 2)
  const src = getImageData(canvas)
  const w = src.width
  const h = src.height
  const d = src.data
  const copy = new Uint8ClampedArray(d)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx - half))
          const py = Math.min(h - 1, Math.max(0, y + ky - half))
          const idx = (py * w + px) * 4
          const wt = kernel[ky * side + kx]
          r += copy[idx] * wt
          g += copy[idx + 1] * wt
          b += copy[idx + 2] * wt
        }
      }
      const i = (y * w + x) * 4
      d[i] = clamp(r + bias)
      d[i + 1] = clamp(g + bias)
      d[i + 2] = clamp(b + bias)
    }
  }
  putImageData(canvas, src)
}

export const FILTER_MENU = [
  { id: 'grayscale', label: 'Black & White' },
  { id: 'invert', label: 'Invert' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'posterize', label: 'Posterize' },
  { id: 'threshold', label: 'Threshold' },
  { id: 'blur', label: 'Blur' },
  { id: 'oil', label: 'Oil Paint' },
  { id: 'sharpen', label: 'Sharpen' },
  { id: 'emboss', label: 'Emboss' },
  { id: 'edge', label: 'Find Edges' },
  { id: 'motionBlur', label: 'Motion Blur' },
  { id: 'noise', label: 'Add Noise' },
  { id: 'pixelate', label: 'Pixelate' },
  { id: 'vignette', label: 'Vignette' }
]

function applyLUT(canvas, lutR, lutG = lutR, lutB = lutR) {
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => [lutR[r], lutG[g], lutB[b], a])
  putImageData(canvas, data)
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  if (!s) {
    const v = l * 255
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255]
}

export function levels(canvas, o = {}) {
  const inB = o.inBlack ?? 0
  const inW = o.inWhite ?? 255
  const gamma = Math.max(0.05, o.gamma ?? 1)
  const outB = o.outBlack ?? 0
  const outW = o.outWhite ?? 255
  const lut = new Uint8ClampedArray(256)
  const span = Math.max(1, inW - inB)
  for (let i = 0; i < 256; i++) {
    let v = (i - inB) / span
    v = Math.max(0, Math.min(1, v))
    v = Math.pow(v, 1 / gamma)
    lut[i] = outB + v * (outW - outB)
  }
  applyLUT(canvas, lut)
}

export function curves(canvas, o = {}) {
  const sh = (o.shadows ?? 0) / 100
  const mid = (o.midtones ?? 0) / 100
  const hi = (o.highlights ?? 0) / 100
  const pts = [
    [0, 0],
    [64, Math.max(0, Math.min(255, 64 + sh * 50))],
    [128, Math.max(0, Math.min(255, 128 + mid * 64))],
    [192, Math.max(0, Math.min(255, 192 + hi * 50))],
    [255, 255]
  ]
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    let seg = 0
    while (seg < pts.length - 2 && i > pts[seg + 1][0]) seg++
    const [x0, y0] = pts[seg]
    const [x1, y1] = pts[seg + 1]
    const t = (i - x0) / Math.max(1, x1 - x0)
    lut[i] = y0 + (y1 - y0) * t
  }
  applyLUT(canvas, lut)
}

export function hueSaturation(canvas, o = {}) {
  const dh = o.hue ?? 0
  const ds = (o.saturation ?? 0) / 100
  const dl = (o.lightness ?? 0) / 100
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    let [h, s, l] = rgbToHsl(r, g, b)
    h += dh
    s = Math.max(0, Math.min(1, s * (1 + ds)))
    l = Math.max(0, Math.min(1, dl >= 0 ? l + (1 - l) * dl : l * (1 + dl)))
    const out = hslToRgb(h, s, l)
    return [out[0], out[1], out[2], a]
  })
  putImageData(canvas, data)
}

export function colorBalance(canvas, o = {}) {
  const cr = o.cyanRed ?? 0
  const mg = o.magentaGreen ?? 0
  const yb = o.yellowBlue ?? 0
  const preserve = !!o.preserveLuminosity
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const before = lum(r, g, b)
    let nr = clamp(r + cr)
    let ng = clamp(g + mg)
    let nb = clamp(b + yb)
    if (preserve) {
      const after = lum(nr, ng, nb)
      const k = after > 0 ? before / after : 1
      nr = clamp(nr * k); ng = clamp(ng * k); nb = clamp(nb * k)
    }
    return [nr, ng, nb, a]
  })
  putImageData(canvas, data)
}

export function exposure(canvas, o = {}) {
  const stops = (o.exposure ?? 0) / 50
  const offset = o.offset ?? 0
  const gamma = Math.max(0.05, o.gamma ?? 1)
  const mul = Math.pow(2, stops)
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    const v = Math.max(0, Math.min(1, (i * mul + offset) / 255))
    lut[i] = Math.pow(v, 1 / gamma) * 255
  }
  applyLUT(canvas, lut)
}

export function vibrance(canvas, o = {}) {
  const amount = (o.vibrance ?? 0) / 100
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max ? (max - min) / max : 0
    const boost = 1 + amount * (1 - sat)
    const l = lum(r, g, b)
    return [clamp(l + (r - l) * boost), clamp(l + (g - l) * boost), clamp(l + (b - l) * boost), a]
  })
  putImageData(canvas, data)
}

export function blackWhite(canvas, o = {}) {
  const w = [
    (o.reds ?? 0),
    (o.yellows ?? 0),
    (o.greens ?? 0),
    (o.cyans ?? 0),
    (o.blues ?? 0),
    (o.magentas ?? 0)
  ]
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const [h, s] = rgbToHsl(r, g, b)
    let v = lum(r, g, b)
    if (s > 0.05) {
      const idx = Math.round(((h % 360) / 60)) % 6
      v = clamp(v * (1 + w[idx] / 100))
    }
    return [v, v, v, a]
  })
  putImageData(canvas, data)
}

export function photoFilter(canvas, o = {}) {
  const color = o.color || '#ec8a00'
  const density = (o.density ?? 25) / 100
  const preserve = o.preserveLuminosity !== false
  const m = /^#?([0-9a-f]{6})$/i.exec(color)
  if (!m) return
  const n = parseInt(m[1], 16)
  const fr = (n >> 16) & 255
  const fg = (n >> 8) & 255
  const fb = n & 255
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const l0 = lum(r, g, b)
    let nr = r * (1 - density) + fr * density
    let ng = g * (1 - density) + fg * density
    let nb = b * (1 - density) + fb * density
    if (preserve) {
      const l1 = lum(nr, ng, nb)
      const k = l1 > 0 ? l0 / l1 : 1
      nr = clamp(nr * k); ng = clamp(ng * k); nb = clamp(nb * k)
    }
    return [nr, ng, nb, a]
  })
  putImageData(canvas, data)
}

export function gradientMap(canvas, o = {}) {
  const from = o.from || '#000000'
  const to = o.to || '#ffffff'
  const parse = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [r0, g0, b0] = parse(from)
  const [r1, g1, b1] = parse(to)
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const t = Math.max(0, Math.min(1, lum(r, g, b) / 255))
    return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t, a]
  })
  putImageData(canvas, data)
}

export function desaturate(canvas) {
  const data = getImageData(canvas)
  eachPixel(data, (r, g, b, a) => {
    const l = lum(r, g, b)
    return [l, l, l, a]
  })
  putImageData(canvas, data)
}

export function equalize(canvas) {
  const data = getImageData(canvas)
  const hist = new Array(256).fill(0)
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] === 0) continue
    hist[Math.round(lum(data.data[i], data.data[i + 1], data.data[i + 2]))]++
  }
  let total = 0
  for (const h of hist) total += h
  if (!total) return
  const lut = new Uint8ClampedArray(256)
  let acc = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    lut[i] = (acc / total) * 255
  }
  applyLUT(canvas, lut)
}

export function autoTone(canvas) {
  const data = getImageData(canvas)
  const d = data.data
  const lo = [255, 255, 255]
  const hi = [0, 0, 0]
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    for (let c = 0; c < 3; c++) {
      if (d[i + c] < lo[c]) lo[c] = d[i + c]
      if (d[i + c] > hi[c]) hi[c] = d[i + c]
    }
  }
  const lut = (c) => {
    const span = Math.max(1, hi[c] - lo[c])
    const t = new Uint8ClampedArray(256)
    for (let i = 0; i < 256; i++) t[i] = ((i - lo[c]) / span) * 255
    return t
  }
  applyLUT(canvas, lut(0), lut(1), lut(2))
}

export function autoColor(canvas) {
  const data = getImageData(canvas)
  const d = data.data
  let sr = 0, sg = 0, sb = 0, n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++
  }
  if (!n) return
  const avg = (sr + sg + sb) / (3 * n)
  const kr = avg / Math.max(1, sr / n)
  const kg = avg / Math.max(1, sg / n)
  const kb = avg / Math.max(1, sb / n)
  eachPixel(data, (r, g, b, a) => [clamp(r * kr), clamp(g * kg), clamp(b * kb), a])
  putImageData(canvas, data)
}

export function gaussianBlur(canvas, radius = 4) {
  const r = Math.max(1, Math.round(radius / 2))
  boxBlur(canvas, r)
  boxBlur(canvas, r)
  boxBlur(canvas, r)
}

export function motionBlurAngle(canvas, distance = 10, angle = 0) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = -Math.sin(rad)
  const steps = Math.max(2, Math.min(40, Math.round(distance)))
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const s = src.data
  const out = new Uint8ClampedArray(s.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1) - 0.5
        const px = Math.min(w - 1, Math.max(0, Math.round(x + dx * distance * t)))
        const py = Math.min(h - 1, Math.max(0, Math.round(y + dy * distance * t)))
        const idx = (py * w + px) * 4
        r += s[idx]; g += s[idx + 1]; b += s[idx + 2]; a += s[idx + 3]
      }
      const o = (y * w + x) * 4
      out[o] = r / steps; out[o + 1] = g / steps; out[o + 2] = b / steps; out[o + 3] = a / steps
    }
  }
  const img = canvas.getContext('2d').createImageData(w, h)
  img.data.set(out)
  putImageData(canvas, img)
}

export function radialBlur(canvas, amount = 10, mode = 'zoom') {
  const steps = Math.max(3, Math.min(16, Math.round(amount / 2) + 3))
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const s = src.data
  const out = new Uint8ClampedArray(s.length)
  const cx = w / 2, cy = h / 2
  const maxR = Math.max(cx, cy)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1)
        let px, py
        if (mode === 'zoom') {
          const scale = 1 - (amount / 100) * t
          px = cx + (x - cx) * scale
          py = cy + (y - cy) * scale
        } else {
          const ang = (amount / 100) * Math.PI * t
          const c = Math.cos(ang), sn = Math.sin(ang)
          px = cx + (x - cx) * c - (y - cy) * sn
          py = cy + (x - cx) * sn + (y - cy) * c
        }
        px = Math.min(w - 1, Math.max(0, Math.round(px)))
        py = Math.min(h - 1, Math.max(0, Math.round(py)))
        const idx = (py * w + px) * 4
        r += s[idx]; g += s[idx + 1]; b += s[idx + 2]; a += s[idx + 3]
      }
      const o = (y * w + x) * 4
      out[o] = r / steps; out[o + 1] = g / steps; out[o + 2] = b / steps; out[o + 3] = a / steps
    }
  }
  const img = canvas.getContext('2d').createImageData(w, h)
  img.data.set(out)
  putImageData(canvas, img)
  void maxR
}

export function median(canvas, radius = 2) {
  radius = Math.max(1, Math.min(3, Math.round(radius)))
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const s = src.data
  const out = new Uint8ClampedArray(s.length)
  const buf = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        buf.length = 0
        for (let ky = -radius; ky <= radius; ky++) {
          const py = Math.min(h - 1, Math.max(0, y + ky))
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx))
            buf.push(s[(py * w + px) * 4 + c])
          }
        }
        buf.sort((a, b) => a - b)
        out[(y * w + x) * 4 + c] = buf[(buf.length / 2) | 0]
      }
      const ai = (y * w + x) * 4 + 3
      out[ai] = s[ai]
    }
  }
  const img = canvas.getContext('2d').createImageData(w, h)
  img.data.set(out)
  putImageData(canvas, img)
}

export function reduceNoise(canvas, amount = 6) {
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const s = src.data
  const out = new Uint8ClampedArray(s)
  const k = amount / 10
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += s[((y + ky) * w + (x + kx)) * 4 + c]
          }
        }
        const avg = sum / 9
        out[i + c] = s[i + c] + (avg - s[i + c]) * k
      }
    }
  }
  const img = canvas.getContext('2d').createImageData(w, h)
  img.data.set(out)
  putImageData(canvas, img)
}

export function highPass(canvas, radius = 6) {
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const copy = document.createElement('canvas')
  copy.width = w
  copy.height = h
  copy.getContext('2d').drawImage(canvas, 0, 0)
  gaussianBlur(copy, radius)
  const blur = copy.getContext('2d').getImageData(0, 0, w, h).data
  const d = src.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128 + (d[i] - blur[i])
    d[i + 1] = 128 + (d[i + 1] - blur[i + 1])
    d[i + 2] = 128 + (d[i + 2] - blur[i + 2])
  }
  putImageData(canvas, src)
}

function rankFilter(canvas, radius, pickMax) {
  const src = getImageData(canvas)
  const w = src.width, h = src.height
  const s = src.data
  const out = new Uint8ClampedArray(s.length)
  radius = Math.max(1, Math.min(6, Math.round(radius)))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let best = pickMax ? 0 : 255
        for (let ky = -radius; ky <= radius; ky++) {
          const py = Math.min(h - 1, Math.max(0, y + ky))
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx))
            const v = s[(py * w + px) * 4 + c]
            best = pickMax ? Math.max(best, v) : Math.min(best, v)
          }
        }
        out[(y * w + x) * 4 + c] = best
      }
      out[(y * w + x) * 4 + 3] = s[(y * w + x) * 4 + 3]
    }
  }
  const img = canvas.getContext('2d').createImageData(w, h)
  img.data.set(out)
  putImageData(canvas, img)
}

export function minimum(canvas, radius = 2) { rankFilter(canvas, radius, false) }
export function maximum(canvas, radius = 2) { rankFilter(canvas, radius, true) }

export function offsetFilter(canvas, x = 0, y = 0) {
  const w = canvas.width, h = canvas.height
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')
  const ox = ((x % w) + w) % w
  const oy = ((y % h) + h) % h
  tctx.drawImage(canvas, ox, oy)
  tctx.drawImage(canvas, ox - w, oy)
  tctx.drawImage(canvas, ox, oy - h)
  tctx.drawImage(canvas, ox - w, oy - h)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(tmp, 0, 0)
}

export function clouds(canvas, scale = 40) {
  const w = canvas.width, h = canvas.height
  const seed = Math.random() * 1000
  const data = getImageData(canvas)
  const d = data.data
  const octave = (x, y, f) => {
    const v = Math.sin(x * f + seed) * Math.cos(y * f - seed) + Math.sin((x + y) * f * 0.7 + seed * 2)
    return (v + 2) / 4
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = 1 / Math.max(4, scale)
      let v = octave(x, y, f) * 0.5 + octave(x, y, f * 2) * 0.3 + octave(x, y, f * 4) * 0.2
      v = Math.max(0, Math.min(1, v))
      const i = (y * w + x) * 4
      d[i] = d[i + 1] = d[i + 2] = v * 255
      d[i + 3] = 255
    }
  }
  putImageData(canvas, data)
}

export function sharpenAmount(canvas, amount = 100) {
  const k = amount / 100
  convolve(canvas, [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0])
}
