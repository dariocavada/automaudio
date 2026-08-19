import { createEmptyProject } from './defaults'
import type { AutomaudioProject, AutomaudioTrack, DuckingSettings } from './types'
import { AUTOMAUDIO_SCHEMA_VERSION } from './types'
import { clamp, normalizeDuckingSettings } from '../audio/ducking'

export function normalizeTrack(track: AutomaudioTrack): AutomaudioTrack {
  return {
    ...track,
    id: String(track.id),
    label: track.label.trim() || 'Audio track',
    startTime: Math.max(0, Number(track.startTime) || 0),
    ...(track.duration === undefined ? {} : { duration: Math.max(0, track.duration) }),
    volume: clamp(Number(track.volume), 0, 1),
    muted: Boolean(track.muted),
    envelope: [...track.envelope]
      .map((point) => ({ time: Math.max(0, point.time), volume: clamp(point.volume, 0, 1) }))
      .sort((a, b) => a.time - b.time),
  }
}

export function normalizeProject(input: AutomaudioProject): AutomaudioProject {
  if (input.schemaVersion !== AUTOMAUDIO_SCHEMA_VERSION) {
    throw new Error(`Unsupported project version: ${String(input.schemaVersion)}`)
  }

  const ids = new Set<string>()
  const tracks = input.tracks.map(normalizeTrack)
  for (const track of tracks) {
    if (ids.has(track.id)) throw new Error(`Duplicate track ID: ${track.id}`)
    ids.add(track.id)
  }

  const firstPrimary = tracks.find((track) => track.role === 'primary')
  if (firstPrimary) {
    for (const track of tracks) track.role = track.id === firstPrimary.id ? 'primary' : 'secondary'
  }

  return {
    ...createEmptyProject(),
    ...input,
    masterVolume: clamp(Number(input.masterVolume), 0, 1),
    ducking: normalizeDuckingSettings(input.ducking as DuckingSettings),
    tracks,
  }
}

export function serializeProject(project: AutomaudioProject, space = 2): string {
  return JSON.stringify(normalizeProject(project), null, space)
}

export function parseProject(json: string): AutomaudioProject {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error('The file does not contain valid JSON.')
  }
  if (!value || typeof value !== 'object') throw new Error('Invalid project configuration.')
  return normalizeProject(value as AutomaudioProject)
}
