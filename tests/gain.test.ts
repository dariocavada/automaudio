import { describe, expect, it } from 'vitest'
import {
  combineTrackGain,
  envelopeForPlayback,
  envelopeFromPlayback,
} from '../src/audio/gain'

describe('track gain', () => {
  it('multiplies the manual fader by ducking exactly once', () => {
    expect(combineTrackGain(0.8, 0.25)).toBeCloseTo(0.2)
    expect(combineTrackGain(0.8, 1)).toBeCloseTo(0.8)
  })

  it('converts between relative automation and WaveSurfer gain without changing volume', () => {
    const stored = [
      { time: 0, volume: 1 },
      { time: 2, volume: 0.25 },
    ]
    const displayed = envelopeForPlayback(stored, 0.8)
    expect(displayed).toEqual([
      { time: 0, volume: 0.8 },
      { time: 2, volume: 0.2 },
    ])
    expect(envelopeFromPlayback(displayed, 0.8)).toEqual(stored)
  })

  it('avoids a point exactly at the track end during playback only', () => {
    const displayed = envelopeForPlayback([{ time: 10, volume: 1 }], 0.8, 10)
    expect(displayed[0]).toEqual({ time: 9.999, volume: 0.8 })
    expect(envelopeFromPlayback(displayed, 0.8, 10)).toEqual([{ time: 10, volume: 1 }])
  })
})
