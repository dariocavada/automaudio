import { defineAutomaudioElement } from '../../src/element'
import { encodeWav } from '../../src/audio/mixer'
import type { AutomaudioElement } from '../../src/ui/AutomaudioElement'

defineAutomaudioElement()

const previewObjectUrls: string[] = []

async function loadSyntheticDemo(): Promise<void> {
  await customElements.whenDefined('automaudio-editor')
  const editor = document.querySelector<AutomaudioElement>('automaudio-editor')
  if (!editor || editor.getProject().tracks.length > 0) return

  const tracks = [
    { label: 'Narration', role: 'primary' as const, duration: 24, frequency: 180, rhythm: 'voice' as const },
    { label: 'Background music', role: 'secondary' as const, duration: 42, frequency: 110, rhythm: 'music' as const },
    { label: 'Intro effect', role: 'secondary' as const, duration: 14, frequency: 280, rhythm: 'pulse' as const },
    { label: 'Transition', role: 'secondary' as const, duration: 8, frequency: 420, rhythm: 'pulse' as const },
    { label: 'Outro effect', role: 'secondary' as const, duration: 11, frequency: 220, rhythm: 'pulse' as const },
  ]

  for (const track of tracks) {
    const url = URL.createObjectURL(createSyntheticWav(track.duration, track.frequency, track.rhythm))
    previewObjectUrls.push(url)
    await editor.addTrack({
      label: track.label,
      role: track.role,
      source: { type: 'url', value: url },
    })
  }
}

function createSyntheticWav(
  duration: number,
  frequency: number,
  rhythm: 'voice' | 'music' | 'pulse',
): Blob {
  const sampleRate = 16_000
  const samples = new Float32Array(Math.ceil(duration * sampleRate))

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate
    const carrier = Math.sin(2 * Math.PI * frequency * time)
    const harmonic = Math.sin(2 * Math.PI * frequency * 1.97 * time) * 0.35
    const gate = rhythm === 'voice'
      ? ((time % 8 < 3.1 || (time % 8 > 4.4 && time % 8 < 6.5)) ? 1 : 0)
      : rhythm === 'pulse'
        ? (time % 2.4 < 0.65 ? Math.exp(-(time % 2.4) * 2.6) : 0)
        : 0.42 + Math.sin(time * 2.1) * 0.12
    const fade = Math.min(1, time * 8, (duration - time) * 8)
    samples[index] = (carrier + harmonic) * gate * fade * 0.32
  }

  return encodeWav({
    numberOfChannels: 1,
    length: samples.length,
    sampleRate,
    duration,
    getChannelData: () => samples,
  })
}

const demoMode = new URLSearchParams(window.location.search).get('demo')
if (demoMode !== null) {
  void loadSyntheticDemo()
}

if (import.meta.env.DEV) {
  void import('./local-diagnostics')
}
