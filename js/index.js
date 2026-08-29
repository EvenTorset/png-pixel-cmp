import init, { comparePngPixels as compare } from '../pkg/png_pixel_cmp.js'

let ready

export async function comparePngPixels(a, b) {
  ready ??= init()
  await ready
  return compare(a, b)
}

export async function ready$() {
  ready ??= init()
  return ready
}
