import { describe, expect, it } from 'vitest'
import { encodeWav } from '../src/audio/mixer'

describe('encodeWav', () => {
  it('produces a PCM WAV with the correct header and size', async () => {
    const samples = Float32Array.from([0, 0.5, -0.5, 1])
    const blob = encodeWav({
      duration: 0.5,
      length: samples.length,
      numberOfChannels: 1,
      sampleRate: 8,
      getChannelData: () => samples,
    })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF')
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + samples.length * 2)
  })
})
