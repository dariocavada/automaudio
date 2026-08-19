import { describe, expect, it } from 'vitest'
import { createEmptyProject } from '../src/core/defaults'
import { normalizeProject, parseProject, serializeProject } from '../src/core/project'

describe('project persistence', () => {
  it('keeps exactly one primary track', () => {
    const project = createEmptyProject({
      tracks: [
        { id: 'a', label: 'A', role: 'primary', source: { type: 'url', value: '/a.mp3' }, startTime: 0, volume: 1, muted: false, envelope: [] },
        { id: 'b', label: 'B', role: 'primary', source: { type: 'url', value: '/b.mp3' }, startTime: 0, volume: 1, muted: false, envelope: [] },
      ],
    })
    const normalized = normalizeProject(project)
    expect(normalized.tracks.map((track) => track.role)).toEqual(['primary', 'secondary'])
  })

  it('round-trips JSON', () => {
    const project = createEmptyProject({ title: 'Test' })
    expect(parseProject(serializeProject(project))).toEqual(project)
  })

  it('rejects unknown versions', () => {
    expect(() => parseProject('{"schemaVersion":99,"tracks":[]}')).toThrow(/Unsupported project version/)
  })
})
