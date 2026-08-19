import type { AutomaudioProject, DuckingSettings } from './types'
import { AUTOMAUDIO_SCHEMA_VERSION } from './types'

export const DEFAULT_DUCKING_SETTINGS: Readonly<DuckingSettings> = Object.freeze({
  thresholdDb: -42,
  silenceDurationMs: 650,
  minVoiceDurationMs: 120,
  analysisWindowMs: 30,
  attackMs: 120,
  releaseMs: 380,
  minVolume: 0.24,
  maxVolume: 1,
})

export function createEmptyProject(
  overrides: Partial<AutomaudioProject> = {},
): AutomaudioProject {
  return {
    schemaVersion: AUTOMAUDIO_SCHEMA_VERSION,
    title: overrides.title ?? 'New mix',
    masterVolume: overrides.masterVolume ?? 1,
    ducking: {
      ...DEFAULT_DUCKING_SETTINGS,
      ...overrides.ducking,
    },
    tracks: overrides.tracks ? structuredClone(overrides.tracks) : [],
  }
}
