import '../../src/element'
import { encodeWav } from '../../src/audio/mixer'
import type { AutomaudioElement } from '../../src/ui/AutomaudioElement'
import { runGainDiagnostic } from './gain-diagnostic'

const fixtureTracks = [
  { label: 'Test voice', url: new URL('../../tests/res/test-voice.mp3', import.meta.url).href, role: 'primary' as const },
  { label: 'Test music', url: new URL('../../tests/res/test-music.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 1', url: new URL('../../tests/res/test-effect.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 2', url: new URL('../../tests/res/test-effect2.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 3', url: new URL('../../tests/res/test-effect3.mp3', import.meta.url).href, role: 'secondary' as const },
]

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

async function loadFixtures(short = false): Promise<void> {
  await customElements.whenDefined('automaudio-editor')
  const editor = document.querySelector<AutomaudioElement>('automaudio-editor')
  if (!editor || editor.getProject().tracks.length > 0) return

  const selectedFixtures = short
    ? fixtureTracks.filter((fixture) => fixture.role === 'primary' || fixture.label === 'Test effect 1')
    : fixtureTracks

  for (const fixture of selectedFixtures) {
    await editor.addTrack({
      label: fixture.label,
      role: fixture.role,
      source: { type: 'url', value: fixture.url },
    })
  }
}

const fixtureMode = new URLSearchParams(window.location.search).get('fixtures')
const demoMode = new URLSearchParams(window.location.search).get('demo')
if (demoMode !== null) {
  void loadSyntheticDemo()
} else if (fixtureMode !== null) {
  void loadFixtures(fixtureMode === 'short')
}

if (new URLSearchParams(window.location.search).get('diagnostics') === 'gain') {
  const result = document.createElement('output')
  result.id = 'gain-diagnostic'
  result.setAttribute('role', 'status')
  result.textContent = 'Running gain diagnostic…'
  document.querySelector('main')?.prepend(result)

  void runGainDiagnostic(fixtureTracks[2]!.url)
    .then((diagnostic) => {
      result.dataset.passed = String(diagnostic.passed)
      result.textContent = diagnostic.passed
        ? `Mixer gain is correct: ${diagnostic.measuredRatio.toFixed(3)} (expected ${diagnostic.expectedRatio.toFixed(3)})`
        : `Mixer gain is incorrect: ${diagnostic.measuredRatio.toFixed(3)} (expected ${diagnostic.expectedRatio.toFixed(3)})`
    })
    .catch((error: unknown) => {
      result.dataset.passed = 'false'
      result.textContent = error instanceof Error ? error.message : String(error)
    })
}
