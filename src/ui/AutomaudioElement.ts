import Multitrack, { type TrackOptions } from 'wavesurfer-multitrack'
import { envelopeForPlayback, envelopeFromPlayback } from '../audio/gain'
import { Automaudio } from '../core/Automaudio'
import type {
  AutomaudioProject,
  AutomaudioTrack,
  NewAutomaudioTrack,
} from '../core/types'

const TAG_NAME = 'automaudio-editor'

export class AutomaudioElement extends HTMLElement {
  readonly engine = new Automaudio()

  private multitrack: Multitrack | undefined
  private readonly objectUrls = new Map<string, string>()
  private readonly unsubscribers: Array<() => void> = []
  private initialized = false
  private zoomLevel = 32
  private panMode = false
  private suppressEnvelopeEventsUntil = 0

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (this.initialized) return
    this.initialized = true
    this.renderShell()
    this.bindControls()
    this.unsubscribers.push(
      this.engine.on('change', (project) => {
        this.renderTrackList(project)
        this.syncSettings(project)
        this.dispatchEvent(new CustomEvent('automaudio-change', { detail: project }))
      }),
      this.engine.on('status', ({ message }) => this.setStatus(message)),
      this.engine.on('error', ({ error }) => this.reportError(error)),
    )
    this.refresh()
  }

  disconnectedCallback(): void {
    this.multitrack?.destroy()
    this.multitrack = undefined
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url)
    this.objectUrls.clear()
    this.initialized = false
  }

  async addTrack(input: NewAutomaudioTrack): Promise<AutomaudioTrack> {
    const track = this.engine.addTrack(input)
    await this.prepareTrack(track.id)
    this.renderTimeline()
    return this.engine.getProject().tracks.find((candidate) => candidate.id === track.id)!
  }

  loadProject(project: AutomaudioProject | string): void {
    this.engine.importProject(project)
    this.renderTimeline()
  }

  getProject(): AutomaudioProject {
    return this.engine.getProject()
  }

  async applyAutoDucking(): Promise<AutomaudioProject> {
    const project = await this.withBusy(() => this.engine.applyAutoDucking())
    this.renderTimeline()
    return project
  }

  async exportMix(format: 'mp3' | 'wav' = 'mp3'): Promise<Blob> {
    return this.withBusy(() => format === 'mp3' ? this.engine.exportMp3() : this.engine.exportWav())
  }

  private renderShell(): void {
    const root = this.shadowRoot!
    root.innerHTML = `
      <style>${styles}</style>
      <section class="editor" aria-label="Audio editor with automatic ducking">
        <header class="hero">
          <div>
            <span class="eyebrow">AUTOMAUDIO</span>
            <h2>Keep every voice clear, automatically.</h2>
            <p>Add voice and music. Automaudio finds the pauses and builds the mix.</p>
          </div>
          <label class="button primary file-button">
            <input id="audio-files" type="file" accept="audio/*" multiple />
            <span>＋ Add audio</span>
          </label>
        </header>

        <div class="toolbar" role="toolbar" aria-label="Playback and export">
          <button id="play" class="icon-button" type="button" title="Play">▶</button>
          <button id="pause" class="icon-button" type="button" title="Pause">Ⅱ</button>
          <span class="toolbar-separator"></span>
          <button id="auto-duck" class="button accent" type="button">✦ Apply auto ducking</button>
          <span class="toolbar-spacer"></span>
          <button id="save-project" class="button ghost" type="button">Save project</button>
          <label class="button ghost file-button">
            <input id="project-file" type="file" accept="application/json,.json" />
            <span>Open project</span>
          </label>
          <select id="export-format" aria-label="Export format">
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
          <button id="export-mix" class="button primary" type="button">Export mix</button>
        </div>

        <div class="workspace">
          <main class="timeline-panel">
            <div id="empty" class="empty-state">
              <span class="empty-icon">♫</span>
              <strong>Start with the voice track</strong>
              <span>Drop or select MP3, WAV, M4A, and other browser-supported formats.</span>
            </div>
            <div id="arrangement" hidden>
              <div class="arrangement-toolbar" aria-label="Timeline navigation">
                <button id="pan-tool" class="tool-button" type="button" aria-pressed="false" title="Drag the timeline without moving tracks">✋ Pan</button>
                <button id="scroll-left" class="tool-button icon-only" type="button" title="Scroll left">←</button>
                <button id="scroll-right" class="tool-button icon-only" type="button" title="Scroll right">→</button>
                <span class="zoom-label">Zoom</span>
                <button id="zoom-out" class="tool-button icon-only" type="button" title="Zoom out">−</button>
                <input id="zoom" class="zoom-slider" type="range" min="8" max="180" step="2" value="32" aria-label="Zoom timeline" />
                <button id="zoom-in" class="tool-button icon-only" type="button" title="Zoom in">＋</button>
                <output id="zoom-value" class="zoom-value">32 px/s</output>
                <button id="zoom-fit" class="tool-button" type="button">Fit</button>
                <span class="navigation-hint">Shift + wheel to scroll</span>
              </div>
              <div class="arrangement">
                <div id="tracks" class="track-list" aria-label="Track controls"></div>
                <div id="timeline" class="timeline" tabindex="0" aria-label="Audio timeline"></div>
              </div>
              <p class="envelope-hint">Double-click the line to add a point. Drag the handles; points are preserved automatically at the edges.</p>
            </div>
          </main>

          <aside class="settings-panel">
            <div class="panel-heading">
              <div>
                <span class="eyebrow">DUCKING</span>
                <h3>Automatic adjustment</h3>
              </div>
              <span class="live-dot" title="Changes apply to the next detection pass"></span>
            </div>

            <label class="control">
              <span><b>Voice threshold</b><output data-output="thresholdDb"></output></span>
              <input data-setting="thresholdDb" type="range" min="-70" max="-10" step="1" />
              <small>Higher values ignore quieter sounds.</small>
            </label>
            <label class="control">
              <span><b>Minimum pause</b><output data-output="silenceDurationMs"></output></span>
              <input data-setting="silenceDurationMs" type="range" min="100" max="3000" step="50" />
              <small>Music returns after this much silence.</small>
            </label>
            <div class="control-pair">
              <label class="control compact">
                <span><b>Low volume</b><output data-output="minVolume"></output></span>
                <input data-setting="minVolume" type="range" min="0" max="1" step="0.01" />
              </label>
              <label class="control compact">
                <span><b>High volume</b><output data-output="maxVolume"></output></span>
                <input data-setting="maxVolume" type="range" min="0" max="1" step="0.01" />
              </label>
            </div>

            <details>
              <summary>Advanced settings</summary>
              <label class="control compact">
                <span><b>Attack</b><output data-output="attackMs"></output></span>
                <input data-setting="attackMs" type="range" min="0" max="1000" step="10" />
              </label>
              <label class="control compact">
                <span><b>Release</b><output data-output="releaseMs"></output></span>
                <input data-setting="releaseMs" type="range" min="0" max="3000" step="10" />
              </label>
              <label class="control compact">
                <span><b>Minimum voice</b><output data-output="minVoiceDurationMs"></output></span>
                <input data-setting="minVoiceDurationMs" type="range" min="0" max="1000" step="10" />
              </label>
            </details>
          </aside>
        </div>

        <footer class="statusbar">
          <span id="status" role="status" aria-live="polite">Ready.</span>
          <span class="privacy">● Local processing in your browser</span>
        </footer>
      </section>
    `
  }

  private bindControls(): void {
    const root = this.shadowRoot!
    this.byId<HTMLInputElement>('audio-files').addEventListener('change', (event) => {
      const files = Array.from((event.currentTarget as HTMLInputElement).files ?? [])
      void this.addFiles(files)
    })
    this.byId<HTMLButtonElement>('play').addEventListener('click', () => void this.multitrack?.play())
    this.byId<HTMLButtonElement>('pause').addEventListener('click', () => this.multitrack?.pause())
    this.byId<HTMLButtonElement>('auto-duck').addEventListener('click', () => {
      void this.applyAutoDucking().catch((error: unknown) => this.reportError(asError(error)))
    })
    this.byId<HTMLButtonElement>('save-project').addEventListener('click', () => {
      downloadBlob(
        new Blob([this.engine.exportProject()], { type: 'application/json' }),
        `${fileSafeName(this.engine.getProject().title)}.automaudio.json`,
      )
    })
    this.byId<HTMLInputElement>('project-file').addEventListener('change', (event) => {
      const file = (event.currentTarget as HTMLInputElement).files?.[0]
      if (!file) return
      void file.text()
        .then((json) => this.loadProject(json))
        .catch((error: unknown) => this.reportError(asError(error)))
    })
    this.byId<HTMLButtonElement>('export-mix').addEventListener('click', () => {
      const format = this.byId<HTMLSelectElement>('export-format').value as 'mp3' | 'wav'
      void this.exportMix(format)
        .then((blob) => downloadBlob(blob, `${fileSafeName(this.engine.getProject().title)}.${format}`))
        .then(() => this.setStatus('Mix exported.'))
        .catch((error: unknown) => this.reportError(asError(error)))
    })

    this.byId<HTMLButtonElement>('pan-tool').addEventListener('click', () => {
      this.panMode = !this.panMode
      const button = this.byId<HTMLButtonElement>('pan-tool')
      button.setAttribute('aria-pressed', String(this.panMode))
      button.classList.toggle('active', this.panMode)
      this.byId<HTMLDivElement>('timeline').classList.toggle('pan-mode', this.panMode)
      this.setStatus(this.panMode ? 'Pan enabled: drag the timeline.' : 'Pan disabled.')
    })
    this.byId<HTMLButtonElement>('scroll-left').addEventListener('click', () => this.scrollTimeline(-0.7))
    this.byId<HTMLButtonElement>('scroll-right').addEventListener('click', () => this.scrollTimeline(0.7))
    this.byId<HTMLButtonElement>('zoom-out').addEventListener('click', () => this.setZoom(Math.max(8, this.zoomLevel - 10)))
    this.byId<HTMLButtonElement>('zoom-in').addEventListener('click', () => this.setZoom(Math.min(180, Math.max(8, this.zoomLevel) + 10)))
    this.byId<HTMLButtonElement>('zoom-fit').addEventListener('click', () => this.setZoom(0))
    this.byId<HTMLInputElement>('zoom').addEventListener('input', (event) => {
      this.setZoom(Number((event.currentTarget as HTMLInputElement).value))
    })
    this.bindTimelineNavigation()

    root.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.setting!
        this.engine.updateDucking({ [key]: Number(input.value) })
      })
    })
  }

  private bindTimelineNavigation(): void {
    const timeline = this.byId<HTMLDivElement>('timeline')

    timeline.addEventListener('wheel', (event) => {
      const scroller = this.timelineScroller()
      if (!scroller) return
      const isHorizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      if (!this.panMode && !event.shiftKey && !isHorizontalGesture) return
      event.preventDefault()
      scroller.scrollLeft += isHorizontalGesture ? event.deltaX : event.deltaY
    }, { passive: false })

    timeline.addEventListener('pointerdown', (event) => {
      if (!this.panMode && event.button !== 1) return
      const scroller = this.timelineScroller()
      if (!scroller) return
      event.preventDefault()
      event.stopImmediatePropagation()
      const startX = event.clientX
      const startScroll = scroller.scrollLeft
      timeline.classList.add('panning')

      const move = (moveEvent: PointerEvent) => {
        scroller.scrollLeft = startScroll - (moveEvent.clientX - startX)
      }
      const end = () => {
        timeline.classList.remove('panning')
        window.removeEventListener('pointermove', move, true)
        window.removeEventListener('pointerup', end, true)
        window.removeEventListener('pointercancel', end, true)
      }
      window.addEventListener('pointermove', move, true)
      window.addEventListener('pointerup', end, true)
      window.addEventListener('pointercancel', end, true)
    }, true)
  }

  private setZoom(value: number): void {
    this.zoomLevel = value
    this.multitrack?.zoom(value)
    const input = this.byId<HTMLInputElement>('zoom')
    const output = this.byId<HTMLOutputElement>('zoom-value')
    if (value > 0) {
      input.value = String(value)
      output.value = `${value} px/s`
    } else {
      output.value = 'Fit'
    }
  }

  private scrollTimeline(viewports: number): void {
    const scroller = this.timelineScroller()
    scroller?.scrollBy({ left: scroller.clientWidth * viewports, behavior: 'smooth' })
  }

  private timelineScroller(): HTMLElement | undefined {
    return this.byId<HTMLDivElement>('timeline').firstElementChild as HTMLElement | undefined
  }

  private async addFiles(files: File[]): Promise<void> {
    if (files.length === 0) return
    await this.withBusy(async () => {
      for (const file of files) {
        const assetKey = `${crypto.randomUUID()}:${file.name}`
        const track = this.engine.addTrack({
          label: file.name.replace(/\.[^.]+$/, ''),
          source: { type: 'asset', value: assetKey, fileName: file.name, mimeType: file.type },
        })
        this.engine.registerAsset(assetKey, file)
        this.objectUrls.set(track.id, URL.createObjectURL(file))
        await this.prepareTrack(track.id)
      }
    })
    this.renderTimeline()
    this.setStatus(`${files.length} ${files.length === 1 ? 'track added' : 'tracks added'}.`)
  }

  private async prepareTrack(id: string): Promise<void> {
    try {
      const buffer = await this.engine.decodeTrack(id)
      this.engine.updateTrack(id, { duration: buffer.duration })
    } catch (error) {
      this.reportError(asError(error))
      throw error
    }
  }

  private renderTrackList(project = this.engine.getProject()): void {
    const container = this.byId<HTMLDivElement>('tracks')
    container.replaceChildren()
    const hasTracks = project.tracks.length > 0
    this.byId<HTMLDivElement>('empty').hidden = hasTracks
    this.byId<HTMLDivElement>('arrangement').hidden = !hasTracks

    project.tracks.forEach((track, index) => {
      const row = document.createElement('article')
      row.className = `track-row ${track.role}`

      const color = document.createElement('span')
      color.className = 'track-color'
      color.style.setProperty('--track-index', String(index))

      const info = document.createElement('div')
      info.className = 'track-info'
      const name = document.createElement('strong')
      name.textContent = track.label
      const meta = document.createElement('span')
      meta.textContent = track.role === 'primary' ? 'PRIMARY VOICE' : 'SECONDARY TRACK'
      info.append(name, meta)

      const top = document.createElement('div')
      top.className = 'track-top'
      top.append(color, info)

      const primary = document.createElement('button')
      primary.type = 'button'
      primary.className = track.role === 'primary' ? 'role-button selected' : 'role-button'
      primary.textContent = track.role === 'primary' ? 'Voice ✓' : 'Set voice'
      primary.addEventListener('click', () => {
        this.engine.setPrimaryTrack(track.id)
        this.renderTimeline()
      })

      const mute = document.createElement('button')
      mute.type = 'button'
      mute.className = track.muted ? 'mini-button active danger' : 'mini-button'
      mute.textContent = 'M'
      mute.title = track.muted ? 'Unmute track' : 'Mute track'
      mute.setAttribute('aria-pressed', String(track.muted))
      mute.addEventListener('click', () => {
        const muted = !track.muted
        this.engine.updateTrack(track.id, { muted })
        this.renderTimeline()
      })

      const volumeWrap = document.createElement('label')
      volumeWrap.className = 'track-volume'
      volumeWrap.title = 'Manual track volume'
      const volumeLabel = document.createElement('span')
      volumeLabel.textContent = 'Volume'
      const volume = document.createElement('input')
      volume.type = 'range'
      volume.min = '0'
      volume.max = '1'
      volume.step = '0.01'
      volume.value = String(track.volume)
      const volumeOutput = document.createElement('output')
      volumeOutput.value = `${Math.round(track.volume * 100)}%`
      volume.addEventListener('input', () => {
        const value = Number(volume.value)
        volumeOutput.value = `${Math.round(value * 100)}%`
        this.previewTrackVolume(index, track, value)
      })
      volume.addEventListener('change', () => {
        this.engine.updateTrack(track.id, { volume: Number(volume.value) })
      })
      volumeWrap.append(volumeLabel, volume, volumeOutput)

      const actions = document.createElement('div')
      actions.className = 'track-actions'
      actions.append(mute, primary)

      if (track.role === 'secondary' && track.envelope.length > 0) {
        const clear = document.createElement('button')
        clear.type = 'button'
        clear.className = 'mini-button automation-clear'
        clear.textContent = 'Reset aut.'
        clear.title = 'Remove all automation handles'
        clear.addEventListener('click', () => {
          this.engine.updateTrack(track.id, { envelope: [] })
          this.renderTimeline()
        })
        actions.append(clear)
      }

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'remove-button'
      remove.title = `Remove ${track.label}`
      remove.setAttribute('aria-label', remove.title)
      remove.textContent = '×'
      remove.addEventListener('click', () => {
        this.engine.removeTrack(track.id)
        const objectUrl = this.objectUrls.get(track.id)
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        this.objectUrls.delete(track.id)
        this.renderTimeline()
      })

      top.append(remove)

      row.append(top, actions, volumeWrap)
      container.append(row)
    })
  }

  private previewTrackVolume(index: number, track: AutomaudioTrack, volume: number): void {
    if (track.muted) return
    if (track.role === 'secondary' && track.envelope.length > 0) {
      this.suppressEnvelopeEventsUntil = Date.now() + 350
      this.multitrack?.setEnvelopePoints(
        index,
        envelopeForPlayback(track.envelope, volume, track.duration),
      )
    } else {
      this.multitrack?.setTrackVolume(index, volume)
    }
  }

  private renderTimeline(): void {
    this.multitrack?.destroy()
    this.multitrack = undefined
    const container = this.byId<HTMLDivElement>('timeline')
    container.replaceChildren()
    const project = this.engine.getProject()
    if (project.tracks.length === 0) return

    const colors = ['#7c5cff', '#13b8a6', '#ff9f43', '#ef5da8', '#4ea8de']
    this.multitrack = Multitrack.create(
      project.tracks.map((track, index): TrackOptions => {
        const options: TrackOptions = {
          id: track.id,
          startPosition: track.startTime,
          volume: track.muted ? 0 : track.volume,
          draggable: true,
          envelope: track.role === 'secondary'
            ? (track.envelope.length > 0
                ? envelopeForPlayback(
                    track.envelope,
                    track.muted ? 0 : track.volume,
                    track.duration,
                  )
                : true)
            : false,
          options: {
            height: 78,
            waveColor: colors[index % colors.length]!,
            progressColor: '#f4f3ff',
          },
        }
        const url = this.trackUrl(track)
        if (url) options.url = url
        return options
      }),
      {
        container,
        minPxPerSec: this.zoomLevel,
        cursorColor: '#ffffff',
        cursorWidth: 2,
        trackBackground: '#191b24',
        trackBorderColor: '#292c38',
        dragBounds: true,
        timelineOptions: {
          height: 24,
          style: {
            color: '#9ca0b3',
            background: '#11131a',
          },
        },
        envelopeOptions: {
          lineColor: '#f8df68',
          lineWidth: '4px',
          dragPointSize: 16,
          dragPointFill: '#fff4a8',
          dragPointStroke: '#5d4300',
        },
      },
    )

    this.multitrack.on('start-position-change', ({ id, startPosition }) => {
      this.engine.updateTrack(String(id), { startTime: startPosition })
    })
    this.multitrack.on('envelope-points-change', ({ id, points }) => {
      if (Date.now() < this.suppressEnvelopeEventsUntil) return
      const track = this.engine.getProject().tracks.find((candidate) => candidate.id === String(id))
      if (!track) return

      if (points.length < track.envelope.length) {
        const index = this.engine.getProject().tracks.findIndex((candidate) => candidate.id === track.id)
        this.suppressEnvelopeEventsUntil = Date.now() + 350
        this.multitrack?.setEnvelopePoints(
          index,
          envelopeForPlayback(
            track.envelope,
            track.muted ? 0 : track.volume,
            track.duration,
          ),
        )
        this.setStatus('Handle preserved: use “Reset aut.” to remove automation.')
        return
      }

      this.engine.updateTrack(track.id, {
        envelope: envelopeFromPlayback(
          points,
          track.muted ? 0 : track.volume,
          track.duration,
        ),
      })
    })
  }

  private trackUrl(track: AutomaudioTrack): string | undefined {
    return track.source.type === 'url' ? track.source.value : this.objectUrls.get(track.id)
  }

  private syncSettings(project: AutomaudioProject): void {
    const units: Record<string, (value: number) => string> = {
      thresholdDb: (value) => `${value} dB`,
      silenceDurationMs: (value) => value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`,
      minVolume: (value) => `${Math.round(value * 100)}%`,
      maxVolume: (value) => `${Math.round(value * 100)}%`,
      attackMs: (value) => `${value} ms`,
      releaseMs: (value) => `${value} ms`,
      minVoiceDurationMs: (value) => `${value} ms`,
    }

    this.shadowRoot!.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
      const key = input.dataset.setting as keyof typeof project.ducking
      input.value = String(project.ducking[key])
      const output = this.shadowRoot!.querySelector<HTMLOutputElement>(`[data-output="${key}"]`)
      if (output) output.value = units[key]?.(project.ducking[key]) ?? String(project.ducking[key])
    })
  }

  private refresh(): void {
    const project = this.engine.getProject()
    this.renderTrackList(project)
    this.syncSettings(project)
    this.renderTimeline()
  }

  private async withBusy<T>(operation: () => Promise<T>): Promise<T> {
    this.toggleBusy(true)
    try {
      return await operation()
    } finally {
      this.toggleBusy(false)
    }
  }

  private toggleBusy(busy: boolean): void {
    this.shadowRoot!.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = busy
    })
    this.classList.toggle('is-busy', busy)
  }

  private setStatus(message: string): void {
    this.byId<HTMLSpanElement>('status').textContent = message
  }

  private reportError(error: Error): void {
    this.setStatus(error.message)
    this.dispatchEvent(new CustomEvent('automaudio-error', { detail: error }))
  }

  private byId<T extends HTMLElement>(id: string): T {
    const element = this.shadowRoot?.getElementById(id)
    if (!element) throw new Error(`Missing UI element: ${id}`)
    return element as T
  }
}

export function defineAutomaudioElement(tagName = TAG_NAME): void {
  if (!customElements.get(tagName)) customElements.define(tagName, AutomaudioElement)
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function fileSafeName(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'automaudio-mix'
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const styles = `
  :host {
    --aa-bg: #101117;
    --aa-panel: #171922;
    --aa-panel-soft: #1e202b;
    --aa-border: #2a2d39;
    --aa-text: #f7f7fb;
    --aa-muted: #9ca0b3;
    --aa-primary: #7c5cff;
    --aa-primary-hover: #8f76ff;
    --aa-accent: #f8df68;
    display: block;
    color: var(--aa-text);
    font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  :host([fullscreen]) { min-height: 100dvh; }
  * { box-sizing: border-box; }
  button, input, select { font: inherit; }
  button, label.file-button, select { transition: border-color .18s, background .18s, transform .18s; }
  button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible {
    outline: 2px solid var(--aa-accent); outline-offset: 2px;
  }
  .editor { overflow: hidden; border: 1px solid var(--aa-border); border-radius: 22px; background: var(--aa-bg); box-shadow: 0 24px 70px rgba(0,0,0,.28); }
  :host([fullscreen]) .editor { display: flex; min-height: 100dvh; flex-direction: column; border: 0; border-radius: 0; box-shadow: none; }
  .hero { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: 26px 28px; background: radial-gradient(circle at 15% 0, rgba(124,92,255,.2), transparent 34%), var(--aa-panel); }
  .hero h2 { margin: 4px 0 4px; max-width: 680px; font-size: clamp(20px, 3vw, 30px); line-height: 1.15; letter-spacing: -.035em; }
  .hero p { margin: 0; color: var(--aa-muted); }
  .eyebrow { color: var(--aa-accent); font-size: 10px; font-weight: 800; letter-spacing: .16em; }
  .toolbar { display: flex; align-items: center; gap: 8px; min-height: 62px; padding: 11px 18px; border-block: 1px solid var(--aa-border); background: #13151c; }
  .toolbar-spacer { flex: 1; }
  .toolbar-separator { width: 1px; align-self: stretch; margin: 3px 5px; background: var(--aa-border); }
  .button, .icon-button, .tool-button, .role-button, .mini-button, .remove-button, select { border: 1px solid var(--aa-border); border-radius: 10px; background: var(--aa-panel-soft); color: var(--aa-text); cursor: pointer; }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 8px 13px; font-weight: 700; white-space: nowrap; }
  .button:hover, .icon-button:hover, .tool-button:hover, select:hover { border-color: #555a6e; transform: translateY(-1px); }
  .button.primary { border-color: var(--aa-primary); background: var(--aa-primary); }
  .button.primary:hover { background: var(--aa-primary-hover); }
  .button.accent { border-color: rgba(248,223,104,.45); background: rgba(248,223,104,.12); color: #fff1a7; }
  .button.ghost { background: transparent; color: #c8cad5; }
  .icon-button { width: 38px; height: 38px; }
  button:disabled { opacity: .45; cursor: wait; transform: none !important; }
  .file-button input { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; pointer-events: none; }
  select { min-height: 38px; padding: 0 28px 0 10px; }
  .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 310px; min-height: 510px; }
  .timeline-panel { min-width: 0; padding: 22px; border-right: 1px solid var(--aa-border); }
  #arrangement[hidden] { display: none; }
  .arrangement-toolbar { display: flex; align-items: center; gap: 6px; min-height: 42px; padding: 6px 8px; border: 1px solid var(--aa-border); border-bottom: 0; border-radius: 12px 12px 0 0; background: #11131a; }
  .tool-button { min-height: 28px; padding: 4px 8px; border-radius: 7px; color: #c9cbd6; font-size: 11px; }
  .tool-button.icon-only { width: 29px; padding-inline: 0; font-size: 15px; }
  .tool-button.active { border-color: var(--aa-accent); background: rgba(248,223,104,.15); color: var(--aa-accent); }
  .zoom-label { margin-left: 5px; color: var(--aa-muted); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .zoom-slider { width: min(130px, 15vw) !important; }
  .zoom-value { min-width: 52px; color: #c6baff; font-size: 10px; font-variant-numeric: tabular-nums; }
  .navigation-hint { margin-left: auto; color: #777c91; font-size: 10px; white-space: nowrap; }
  .arrangement { display: grid; grid-template-columns: 210px minmax(0, 1fr); overflow: hidden; border: 1px solid var(--aa-border); border-radius: 0 0 12px 12px; background: #151720; }
  .timeline { min-width: 0; overflow: hidden; border-left: 1px solid var(--aa-border); background: #151720; touch-action: pan-y; }
  .timeline.pan-mode { cursor: grab; touch-action: none; }
  .timeline.panning { cursor: grabbing; }
  .timeline ::part(envelope) { overflow: visible; filter: drop-shadow(0 1px 2px rgba(0,0,0,.8)); }
  .timeline ::part(envelope-circle) { filter: drop-shadow(0 0 3px rgba(248,223,104,.8)); }
  .envelope-hint { margin: 8px 2px 0; color: #85899c; font-size: 10px; }
  .empty-state { display: grid; place-items: center; gap: 8px; min-height: 300px; padding: 30px; border: 1px dashed #363a49; border-radius: 16px; color: var(--aa-muted); text-align: center; }
  .empty-state[hidden] { display: none; }
  .empty-state strong { color: var(--aa-text); font-size: 17px; }
  .empty-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: rgba(124,92,255,.15); color: #a996ff; font-size: 24px; }
  .track-list { min-width: 0; background: #12141b; }
  .track-row { display: grid; grid-template-rows: auto auto auto; align-content: center; gap: 4px; height: 78px; padding: 5px 8px; border-bottom: 0; background: var(--aa-panel); }
  .track-row + .track-row { height: 80px; border-top: 2px solid var(--aa-border); }
  .track-row.primary { background: linear-gradient(90deg, rgba(124,92,255,.13), transparent 75%), var(--aa-panel); }
  .track-top { display: grid; grid-template-columns: 4px minmax(0, 1fr) 24px; align-items: center; gap: 7px; min-width: 0; }
  .track-color { align-self: stretch; min-height: 22px; border-radius: 4px; background: hsl(calc(var(--track-index) * 72 + 255) 78% 65%); }
  .track-info { display: flex; min-width: 0; flex-direction: column; }
  .track-info strong { overflow: hidden; font-size: 11px; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
  .track-info span { color: var(--aa-muted); font-size: 7px; font-weight: 800; letter-spacing: .08em; }
  .track-actions { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .role-button { min-height: 20px; padding: 2px 6px; border-radius: 5px; color: var(--aa-muted); font-size: 9px; }
  .role-button.selected { border-color: rgba(124,92,255,.6); background: rgba(124,92,255,.16); color: #cfc5ff; }
  .mini-button { min-width: 22px; min-height: 20px; padding: 1px 5px; border-radius: 5px; color: var(--aa-muted); font-size: 9px; font-weight: 800; }
  .mini-button.active { border-color: #e0bf4f; color: #ffe978; }
  .mini-button.danger { border-color: #ff667a; background: rgba(255,80,106,.12); color: #ff8c9b; }
  .mini-button.automation-clear { margin-left: auto; white-space: nowrap; }
  .track-volume { display: grid; grid-template-columns: auto minmax(0, 1fr) 29px; align-items: center; gap: 5px; color: var(--aa-muted); font-size: 8px; text-transform: uppercase; }
  .track-volume input { min-width: 0; }
  .track-volume output { color: #d8d4e8; font-size: 9px; font-variant-numeric: tabular-nums; text-align: right; }
  .remove-button { width: 23px; height: 23px; padding: 0; border-color: transparent; background: transparent; color: var(--aa-muted); font-size: 18px; line-height: 1; }
  .remove-button:hover { color: #ff8294; background: rgba(255,80,106,.1); }
  input[type="range"] { width: 100%; accent-color: var(--aa-primary); cursor: pointer; }
  .settings-panel { padding: 22px 20px; background: var(--aa-panel); }
  .panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }
  .panel-heading h3 { margin: 2px 0 0; font-size: 17px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #51d88a; box-shadow: 0 0 0 5px rgba(81,216,138,.1); }
  .control { display: grid; gap: 7px; margin-bottom: 22px; }
  .control > span { display: flex; justify-content: space-between; gap: 8px; }
  .control b { font-size: 12px; }
  .control output { color: #c6baff; font-size: 12px; font-variant-numeric: tabular-nums; }
  .control small { color: var(--aa-muted); font-size: 11px; }
  .control.compact { margin: 14px 0; }
  .control-pair { padding: 12px 13px 4px; border: 1px solid var(--aa-border); border-radius: 12px; background: #14161d; }
  details { margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--aa-border); }
  summary { color: #c7c9d4; cursor: pointer; font-size: 12px; font-weight: 700; }
  .statusbar { display: flex; justify-content: space-between; gap: 15px; padding: 9px 18px; border-top: 1px solid var(--aa-border); background: #0d0e13; color: var(--aa-muted); font-size: 11px; }
  .privacy { color: #71d7a0; }
  :host(.is-busy) .live-dot { animation: pulse 1s infinite; background: var(--aa-accent); }
  @keyframes pulse { 50% { opacity: .35; } }
  @media (min-width: 901px) {
    :host([fullscreen]) { height: 100dvh; }
    :host([fullscreen]) .editor { height: 100%; min-height: 0; }
    :host([fullscreen]) .hero,
    :host([fullscreen]) .toolbar,
    :host([fullscreen]) .statusbar { flex: 0 0 auto; }
    :host([fullscreen]) .workspace { min-height: 0; flex: 1 1 auto; overflow: hidden; }
    :host([fullscreen]) .timeline-panel,
    :host([fullscreen]) .settings-panel { min-height: 0; overflow-y: auto; }
    :host([fullscreen]) .arrangement-toolbar { position: sticky; top: 0; z-index: 4; }
  }
  @media (max-width: 900px) {
    .workspace { grid-template-columns: 1fr; }
    .timeline-panel { border-right: 0; border-bottom: 1px solid var(--aa-border); }
    .settings-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 22px; }
    .panel-heading, details { grid-column: 1 / -1; }
    .arrangement { grid-template-columns: 185px minmax(0, 1fr); }
    .navigation-hint { display: none; }
  }
  @media (max-width: 680px) {
    .hero { align-items: stretch; flex-direction: column; }
    .toolbar { flex-wrap: wrap; }
    .toolbar-spacer { display: none; }
    .toolbar-separator { display: none; }
    .workspace { min-height: 0; }
    .settings-panel { display: block; }
    .arrangement { grid-template-columns: 150px minmax(0, 1fr); }
    .arrangement-toolbar { overflow-x: auto; }
    .zoom-label, .zoom-value { display: none; }
    .zoom-slider { width: 80px !important; }
    .track-row { padding-inline: 5px; }
    .track-info span, .track-volume > span { display: none; }
    .track-volume { grid-template-columns: minmax(0, 1fr) 27px; }
    .track-actions { gap: 2px; }
    .role-button, .mini-button { padding-inline: 3px; }
    .statusbar { flex-direction: column; }
  }
`
