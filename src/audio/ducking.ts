import type {
  AudioBufferLike,
  DuckingSettings,
  EnvelopePoint,
  VoiceSegment,
} from '../core/types'

const EPSILON = 1e-8

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeDuckingSettings(settings: DuckingSettings): DuckingSettings {
  const minVolume = clamp(settings.minVolume, 0, 1)
  const maxVolume = clamp(settings.maxVolume, minVolume, 1)

  return {
    thresholdDb: clamp(settings.thresholdDb, -96, 0),
    silenceDurationMs: clamp(settings.silenceDurationMs, 0, 10_000),
    minVoiceDurationMs: clamp(settings.minVoiceDurationMs, 0, 5_000),
    analysisWindowMs: clamp(settings.analysisWindowMs, 5, 250),
    attackMs: clamp(settings.attackMs, 0, 5_000),
    releaseMs: clamp(settings.releaseMs, 0, 10_000),
    minVolume,
    maxVolume,
  }
}

/**
 * Detects vocal regions using windowed RMS energy. Brief silences are joined,
 * while silences longer than `silenceDurationMs` reopen the secondary tracks.
 */
export function detectVoiceSegments(
  buffer: AudioBufferLike,
  inputSettings: DuckingSettings,
): VoiceSegment[] {
  const settings = normalizeDuckingSettings(inputSettings)
  const frameSize = Math.max(1, Math.round((settings.analysisWindowMs / 1000) * buffer.sampleRate))
  const activeFrames: Array<{ start: number; end: number }> = []

  for (let frameStart = 0; frameStart < buffer.length; frameStart += frameSize) {
    const frameEnd = Math.min(buffer.length, frameStart + frameSize)
    let sumSquares = 0
    let sampleCount = 0

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel)
      for (let sample = frameStart; sample < frameEnd; sample += 1) {
        const value = samples[sample] ?? 0
        sumSquares += value * value
        sampleCount += 1
      }
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount))
    const db = 20 * Math.log10(Math.max(EPSILON, rms))
    if (db >= settings.thresholdDb) {
      activeFrames.push({ start: frameStart / buffer.sampleRate, end: frameEnd / buffer.sampleRate })
    }
  }

  if (activeFrames.length === 0) return []

  const maxGap = settings.silenceDurationMs / 1000
  const minVoiceDuration = settings.minVoiceDurationMs / 1000
  const segments: VoiceSegment[] = []
  let current: VoiceSegment = { ...activeFrames[0]! }

  for (const frame of activeFrames.slice(1)) {
    if (frame.start - current.end <= maxGap) {
      current.end = frame.end
    } else {
      if (current.end - current.start >= minVoiceDuration) segments.push(current)
      current = { ...frame }
    }
  }

  if (current.end - current.start >= minVoiceDuration) segments.push(current)
  return segments
}

export interface EnvelopeOptions {
  timelineOffset?: number
  duration: number
}

/** Converts global vocal regions into an envelope relative to one track. */
export function createDuckingEnvelope(
  segments: VoiceSegment[],
  inputSettings: DuckingSettings,
  options: EnvelopeOptions,
): EnvelopePoint[] {
  const settings = normalizeDuckingSettings(inputSettings)
  const offset = options.timelineOffset ?? 0
  const duration = Math.max(0, options.duration)
  const attack = settings.attackMs / 1000
  const release = settings.releaseMs / 1000
  const points: EnvelopePoint[] = [{ time: 0, volume: settings.maxVolume }]

  for (const segment of segments) {
    const localStart = segment.start - offset
    const localEnd = segment.end - offset
    if (localEnd < 0 || localStart > duration) continue

    const attackStart = clamp(localStart - attack, 0, duration)
    const duckStart = clamp(localStart, 0, duration)
    const duckEnd = clamp(localEnd, 0, duration)
    const releaseEnd = clamp(localEnd + release, 0, duration)

    points.push(
      { time: attackStart, volume: settings.maxVolume },
      { time: duckStart, volume: settings.minVolume },
      { time: duckEnd, volume: settings.minVolume },
      { time: releaseEnd, volume: settings.maxVolume },
    )
  }

  points.push({ time: duration, volume: settings.maxVolume })
  return compactEnvelope(points)
}

function compactEnvelope(points: EnvelopePoint[]): EnvelopePoint[] {
  const sorted = points
    .map((point) => ({ time: Math.max(0, point.time), volume: clamp(point.volume, 0, 1) }))
    .sort((a, b) => a.time - b.time)

  const compact: EnvelopePoint[] = []
  for (const point of sorted) {
    const previous = compact.at(-1)
    if (previous && Math.abs(previous.time - point.time) < 1e-6) {
      previous.volume = Math.min(previous.volume, point.volume)
      continue
    }
    if (previous && previous.volume === point.volume && compact.length > 1) {
      const beforePrevious = compact.at(-2)
      if (beforePrevious?.volume === point.volume) {
        previous.time = point.time
        continue
      }
    }
    compact.push(point)
  }
  return compact
}
