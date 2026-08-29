import init, { comparePngPixels as compare } from '../pkg/png_pixel_cmp.js'

let ready

function load() {
  if (globalThis.process?.versions?.node) {
    const fs = 'node:fs/promises'
    return import(fs)
      .then(({ readFile }) => readFile(new URL('../pkg/png_pixel_cmp_bg.wasm', import.meta.url)))
      .then(bytes => init({ module_or_path: bytes }))
  }
  return init()
}

export async function comparePngPixels(a, b) {
  ready ??= load()
  await ready
  return compare(a, b)
}

export async function ready$() {
  ready ??= load()
  return ready
}
