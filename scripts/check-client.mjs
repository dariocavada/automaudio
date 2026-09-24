import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('dist-client')
const files = await readdir(root, { recursive: true })
assert(files.includes('index.html'), 'Client entry point is missing')
let registersEditor = false

for (const file of files) {
  assert(!/\.(mp3|wav|m4a|aac|ogg|flac|map)$/i.test(file), `Unexpected public asset: ${file}`)
  if (!/\.(js|html)$/.test(file)) continue
  const source = await readFile(resolve(root, file), 'utf8')
  if (file.endsWith('.js') && /customElements\.define\(/.test(source)) registersEditor = true
  assert(!/tests\/res|test-voice\.mp3|test-effect|gain-diagnostic|Running gain diagnostic/.test(source),
    `Development fixtures or diagnostics leaked into ${file}`)
}
assert(registersEditor, 'Web Component registration was removed from the client bundle')

const html = await readFile(resolve(root, 'index.html'), 'utf8')
assert(html.includes('<automaudio-editor fullscreen>'), 'Editor is missing')
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)]
assert(assets.length > 0, 'No bundled entry assets found')
for (const [, asset] of assets) {
  assert((await stat(resolve(root, `.${asset}`))).isFile(), `Missing asset: ${asset}`)
}
console.log('Client output verified: bundled editor, valid entry assets, no local audio or diagnostics.')
