import { describe, expect, it } from 'vitest'
import { createDuckingEnvelope, detectVoiceSegments } from '../src/audio/ducking'
import { DEFAULT_DUCKING_SETTINGS } from '../src/core/defaults'
import type { AudioBufferLike } from '../src/core/types'

function monoBuffer(samples: number[], sampleRate = 10): AudioBufferLike {
  const channel = Float32Array.from(samples)
  return {
    duration: channel.length / sampleRate,
    length: channel.length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => channel,
  }
}

describe('detectVoiceSegments', () => {
  it('merges pauses shorter than the threshold and separates longer pauses', () => {
    const buffer = monoBuffer([0, 0.5, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 0, 0.5, 0.5])
    const segments = detectVoiceSegments(buffer, {
      ...DEFAULT_DUCKING_SETTINGS,
      analysisWindowMs: 100,
      silenceDurationMs: 250,
      minVoiceDurationMs: 100,
    })

    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ start: 0.1, end: 0.7 })
    expect(segments[1]).toEqual({ start: 1.1, end: 1.3 })
  })

  it('ignores sounds below the threshold', () => {
    const buffer = monoBuffer([0.001, 0.001, 0])
    expect(detectVoiceSegments(buffer, DEFAULT_DUCKING_SETTINGS)).toEqual([])
  })
})

describe('createDuckingEnvelope', () => {
  it('creates attack and release transitions with configured volumes', () => {
    const points = createDuckingEnvelope(
      [{ start: 2, end: 4 }],
      { ...DEFAULT_DUCKING_SETTINGS, attackMs: 200, releaseMs: 500, minVolume: 0.2, maxVolume: 0.9 },
      { duration: 6 },
    )

    expect(points).toContainEqual({ time: 1.8, volume: 0.9 })
    expect(points).toContainEqual({ time: 2, volume: 0.2 })
    expect(points).toContainEqual({ time: 4, volume: 0.2 })
    expect(points).toContainEqual({ time: 4.5, volume: 0.9 })
  })

  it('converts global time to track-local time', () => {
    const points = createDuckingEnvelope(
      [{ start: 3, end: 4 }],
      { ...DEFAULT_DUCKING_SETTINGS, attackMs: 0, releaseMs: 0 },
      { duration: 5, timelineOffset: 2 },
    )
    expect(points).toContainEqual({ time: 1, volume: DEFAULT_DUCKING_SETTINGS.minVolume })
  })
})
