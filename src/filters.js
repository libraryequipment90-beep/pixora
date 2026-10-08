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
  const hue = ((adj.hue || 0) / 180) * Math.PI
  const exp = Math.pow(2, (adj.exposure || 0) / 100)
  const gam = adj.gamma || 1
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
    r = L + (r - L) * sat
    g = L + (g - L) * sat
    b = L + (b - L) * sat
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
  { id: 'blur', label: 'Gaussian Blur' },
  { id: 'sharpen', label: 'Sharpen' },
  { id: 'emboss', label: 'Emboss' },
  { id: 'edge', label: 'Find Edges' },
  { id: 'motionBlur', label: 'Motion Blur' },
  { id: 'noise', label: 'Add Noise' },
  { id: 'pixelate', label: 'Pixelate' },
  { id: 'vignette', label: 'Vignette' }
]
