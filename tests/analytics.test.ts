import { describe, expect, it, vi } from 'vitest'
import { installVisitAnalytics } from '../dev/client/analytics'

function fixture(existing = false) {
  const script = { type: '', src: '', dataset: {} }
  const append = vi.fn()
  const createElement = vi.fn(() => script)
  const doc = { querySelector: () => existing ? script : null, createElement, head: { append } }
  return { doc: doc as unknown as Document, script, append, createElement }
}

describe('hosted client visit analytics', () => {
  it.each(['localhost', '127.0.0.1', 'example.com', 'automaudio.workers.dev'])('does not track %s', hostname => {
    const f = fixture()
    installVisitAnalytics(f.doc, hostname, true)
    expect(f.createElement).not.toHaveBeenCalled()
  })
  it('does not track development even on the public hostname', () => {
    const f = fixture()
    installVisitAnalytics(f.doc, 'automaudio.dchs-music.com', false)
    expect(f.createElement).not.toHaveBeenCalled()
  })
  it('loads the provider beacon on the production app', () => {
    const f = fixture()
    installVisitAnalytics(f.doc, 'automaudio.dchs-music.com', true)
    expect(f.script.src).toBe('https://static.cloudflareinsights.com/beacon.min.js')
    expect(f.append).toHaveBeenCalledWith(f.script)
  })
  it('does not add a duplicate beacon', () => {
    const f = fixture(true)
    installVisitAnalytics(f.doc, 'automaudio.dchs-music.com', true)
    expect(f.createElement).not.toHaveBeenCalled()
  })
})
