import type { AutomaudioElement } from '../../src/ui/AutomaudioElement'
import { runGainDiagnostic } from './gain-diagnostic'

const fixtureTracks = [
  { label: 'Test voice', url: new URL('../../tests/res/test-voice.mp3', import.meta.url).href, role: 'primary' as const },
  { label: 'Test music', url: new URL('../../tests/res/test-music.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 1', url: new URL('../../tests/res/test-effect.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 2', url: new URL('../../tests/res/test-effect2.mp3', import.meta.url).href, role: 'secondary' as const },
  { label: 'Test effect 3', url: new URL('../../tests/res/test-effect3.mp3', import.meta.url).href, role: 'secondary' as const },
]

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

const params = new URLSearchParams(window.location.search)
if (!params.has('demo') && params.has('fixtures')) {
  void loadFixtures(params.get('fixtures') === 'short')
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
