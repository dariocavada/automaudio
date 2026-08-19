import { Automaudio } from '../../src/core/Automaudio'

export interface GainDiagnosticResult {
  expectedRatio: number
  measuredRatio: number
  passed: boolean
  duration: number
}

export async function runGainDiagnostic(audioUrl: string): Promise<GainDiagnosticResult> {
  const audio = new Automaudio()
  const track = audio.addTrack({
    label: 'Gain diagnostic',
    role: 'primary',
    source: { type: 'url', value: audioUrl },
    volume: 0.8,
  })
  const source = await audio.decodeTrack(track.id)
  audio.updateTrack(track.id, {
    duration: source.duration,
    envelope: [
      { time: 0, volume: 0.5 },
      { time: source.duration, volume: 0.5 },
    ],
  })
  const mix = await audio.renderMix({ sampleRate: source.sampleRate, channels: 2 })
  const expectedRatio = 0.4
  const measuredRatio = rms(mix) / rms(source)
  audio.destroy()

  return {
    expectedRatio,
    measuredRatio,
    passed: Math.abs(measuredRatio - expectedRatio) < 0.01,
    duration: mix.duration,
  }
}

function rms(buffer: AudioBuffer): number {
  let sumSquares = 0
  let count = 0
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index] ?? 0
      sumSquares += sample * sample
      count += 1
    }
  }
  return Math.sqrt(sumSquares / Math.max(1, count))
}
