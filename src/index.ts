export { Automaudio } from './core/Automaudio'
export { createEmptyProject, DEFAULT_DUCKING_SETTINGS } from './core/defaults'
export { normalizeProject, parseProject, serializeProject } from './core/project'
export {
  clamp,
  createDuckingEnvelope,
  detectVoiceSegments,
  normalizeDuckingSettings,
} from './audio/ducking'
export { encodeWav, renderProjectMix } from './audio/mixer'
export { combineTrackGain, envelopeForPlayback, envelopeFromPlayback } from './audio/gain'
export { encodeMp3 } from './export/mp3'
export type * from './core/types'
