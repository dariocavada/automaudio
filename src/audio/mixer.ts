import type { AudioBufferLike, AutomaudioProject, AutomaudioTrack, MixOptions } from '../core/types'
import { combineTrackGain } from './gain'

export type TrackBufferLoader = (track: AutomaudioTrack) => Promise<AudioBuffer>

export async function renderProjectMix(
  project: AutomaudioProject,
  loadBuffer: TrackBufferLoader,
  options: MixOptions = {},
): Promise<AudioBuffer> {
  const audibleTracks = project.tracks.filter((track) => !track.muted)
  if (audibleTracks.length === 0) throw new Error('Add at least one audible track before exporting.')

  const loaded = await Promise.all(
    audibleTracks.map(async (track) => ({ track, buffer: await loadBuffer(track) })),
  )
  const sampleRate = options.sampleRate ?? Math.max(...loaded.map(({ buffer }) => buffer.sampleRate), 44_100)
  const channels = options.channels ?? 2
  const duration = Math.max(
    ...loaded.map(({ track, buffer }) => track.startTime + buffer.duration),
  )
  const frameCount = Math.max(1, Math.ceil(duration * sampleRate))
  const context = new OfflineAudioContext(channels, frameCount, sampleRate)
  const master = context.createGain()
  master.gain.value = project.masterVolume
  master.connect(context.destination)

  for (const { track, buffer } of loaded) {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.connect(gain)
    gain.connect(master)
    scheduleTrackGain(gain.gain, track, context.currentTime)
    source.start(track.startTime)
  }

  return context.startRendering()
}

function scheduleTrackGain(param: AudioParam, track: AutomaudioTrack, origin: number): void {
  const points = track.envelope
  if (points.length === 0) {
    param.setValueAtTime(combineTrackGain(track.volume), origin)
    return
  }

  const first = points[0]!
  param.setValueAtTime(combineTrackGain(track.volume, first.volume), origin)
  for (const point of points.slice(1)) {
    param.linearRampToValueAtTime(
      combineTrackGain(track.volume, point.volume),
      origin + track.startTime + point.time,
    )
  }
}

export function encodeWav(buffer: AudioBufferLike): Blob {
  const channelCount = Math.min(2, Math.max(1, buffer.numberOfChannels))
  const bytesPerSample = 2
  const dataLength = buffer.length * channelCount * bytesPerSample
  const output = new ArrayBuffer(44 + dataLength)
  const view = new DataView(output)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channelCount * bytesPerSample, true)
  view.setUint16(32, channelCount * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let sample = 0; sample < buffer.length; sample += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const value = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[sample] ?? 0))
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([output], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}
