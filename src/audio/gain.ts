import type { EnvelopePoint } from '../core/types'
import { clamp } from './ducking'

/** Combines the manual track fader with the automation multiplier. */
export function combineTrackGain(trackVolume: number, automationVolume = 1): number {
  return clamp(trackVolume, 0, 1) * clamp(automationVolume, 0, 1)
}

/** Converts stored automation multipliers to the absolute gains displayed by WaveSurfer. */
export function envelopeForPlayback(
  points: EnvelopePoint[],
  trackVolume: number,
  duration?: number,
): EnvelopePoint[] {
  return points.map((point) => ({
    time: duration !== undefined && point.time >= duration
      ? Math.max(0, duration - 0.001)
      : point.time,
    volume: combineTrackGain(trackVolume, point.volume),
  }))
}

/** Converts WaveSurfer absolute gains back to multipliers independent of the track fader. */
export function envelopeFromPlayback(
  points: EnvelopePoint[],
  trackVolume: number,
  duration?: number,
): EnvelopePoint[] {
  const volume = clamp(trackVolume, 0, 1)
  return points.map((point) => ({
    time: duration !== undefined && point.time >= duration - 0.0015
      ? duration
      : point.time,
    volume: volume === 0 ? 0 : clamp(point.volume / volume, 0, 1),
  }))
}
