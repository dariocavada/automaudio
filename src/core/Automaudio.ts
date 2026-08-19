import { createDuckingEnvelope, detectVoiceSegments, normalizeDuckingSettings } from '../audio/ducking'
import { encodeWav, renderProjectMix } from '../audio/mixer'
import { encodeMp3 } from '../export/mp3'
import { createEmptyProject } from './defaults'
import { normalizeProject, normalizeTrack, parseProject, serializeProject } from './project'
import type {
  AutomaudioEventMap,
  AutomaudioOptions,
  AutomaudioProject,
  AutomaudioTrack,
  DuckingSettings,
  MixOptions,
  Mp3ExportOptions,
  NewAutomaudioTrack,
  RuntimeAsset,
  TrackSource,
} from './types'

type EventName = keyof AutomaudioEventMap
type Listener<K extends EventName> = (detail: AutomaudioEventMap[K]) => void

export class Automaudio {
  private project: AutomaudioProject
  private readonly runtimeAssets = new Map<string, RuntimeAsset>()
  private readonly decodedBuffers = new Map<string, AudioBuffer>()
  private readonly listeners = new Map<EventName, Set<(detail: never) => void>>()
  private readonly assetResolver?: AutomaudioOptions['assetResolver']
  private audioContext: AudioContext | undefined

  constructor(options: AutomaudioOptions = {}) {
    this.project = normalizeProject(createEmptyProject(options.project))
    this.assetResolver = options.assetResolver
    this.audioContext = options.audioContext
  }

  getProject(): AutomaudioProject {
    return structuredClone(this.project)
  }

  addTrack(input: NewAutomaudioTrack): AutomaudioTrack {
    const id = input.id ?? createId()
    if (this.project.tracks.some((track) => track.id === id)) {
      throw new Error(`A track with ID ${id} already exists.`)
    }

    const hasPrimary = this.project.tracks.some((track) => track.role === 'primary')
    const track = normalizeTrack({
      id,
      label: input.label,
      source: input.source,
      role: input.role ?? (hasPrimary ? 'secondary' : 'primary'),
      startTime: input.startTime ?? 0,
      ...(input.duration === undefined ? {} : { duration: input.duration }),
      volume: input.volume ?? 1,
      muted: input.muted ?? false,
      envelope: input.envelope ?? [],
    })
    if (track.role === 'primary') this.demoteOtherPrimary(track.id)
    this.project.tracks.push(track)
    this.emitChange()
    return structuredClone(track)
  }

  updateTrack(id: string, patch: Partial<Omit<AutomaudioTrack, 'id'>>): AutomaudioTrack {
    const index = this.requireTrackIndex(id)
    const current = this.project.tracks[index]!
    const updated = normalizeTrack({ ...current, ...patch, id })
    if (updated.role === 'primary') this.demoteOtherPrimary(id)
    this.project.tracks[index] = updated
    this.emitChange()
    return structuredClone(updated)
  }

  removeTrack(id: string): void {
    const index = this.requireTrackIndex(id)
    this.project.tracks.splice(index, 1)
    this.decodedBuffers.delete(id)
    this.emitChange()
  }

  setPrimaryTrack(id: string): void {
    this.requireTrackIndex(id)
    this.demoteOtherPrimary(id)
    this.project.tracks = this.project.tracks.map((track) => ({
      ...track,
      role: track.id === id ? 'primary' : 'secondary',
    }))
    this.emitChange()
  }

  updateDucking(settings: Partial<DuckingSettings>): DuckingSettings {
    this.project.ducking = normalizeDuckingSettings({ ...this.project.ducking, ...settings })
    this.emitChange()
    return { ...this.project.ducking }
  }

  registerAsset(key: string, asset: RuntimeAsset): void {
    this.runtimeAssets.set(key, asset)
    this.decodedBuffers.clear()
  }

  unregisterAsset(key: string): void {
    this.runtimeAssets.delete(key)
    this.decodedBuffers.clear()
  }

  async decodeTrack(id: string): Promise<AudioBuffer> {
    const cached = this.decodedBuffers.get(id)
    if (cached) return cached
    const track = this.project.tracks[this.requireTrackIndex(id)]!
    const asset = await this.resolveAsset(track.source, track)
    const data = await toArrayBuffer(asset)
    const context = this.getAudioContext()
    const buffer = await context.decodeAudioData(data.slice(0))
    this.decodedBuffers.set(id, buffer)
    if (track.duration !== buffer.duration) track.duration = buffer.duration
    return buffer
  }

  async applyAutoDucking(): Promise<AutomaudioProject> {
    const primary = this.project.tracks.find((track) => track.role === 'primary')
    if (!primary) throw new Error('Select a primary voice track.')

    this.emit('status', { message: 'Analyzing voice…' })
    const primaryBuffer = await this.decodeTrack(primary.id)
    const localSegments = detectVoiceSegments(primaryBuffer, this.project.ducking)
    const globalSegments = localSegments.map((segment) => ({
      start: segment.start + primary.startTime,
      end: segment.end + primary.startTime,
    }))

    for (const track of this.project.tracks.filter((candidate) => candidate.role === 'secondary')) {
      const buffer = await this.decodeTrack(track.id)
      track.duration = buffer.duration
      track.envelope = createDuckingEnvelope(globalSegments, this.project.ducking, {
        timelineOffset: track.startTime,
        duration: buffer.duration,
      })
    }

    this.emitChange()
    this.emit('ducking', { segments: globalSegments, project: this.getProject() })
    this.emit('status', {
      message: `${globalSegments.length} voice segments detected.`,
    })
    return this.getProject()
  }

  async renderMix(options: MixOptions = {}): Promise<AudioBuffer> {
    this.emit('status', { message: 'Rendering mix…' })
    return renderProjectMix(this.project, (track) => this.decodeTrack(track.id), options)
  }

  async exportWav(options: MixOptions = {}): Promise<Blob> {
    return encodeWav(await this.renderMix(options))
  }

  async exportMp3(
    mixOptions: MixOptions = {},
    mp3Options: Mp3ExportOptions = {},
  ): Promise<Blob> {
    const mix = await this.renderMix(mixOptions)
    this.emit('status', { message: 'Encoding MP3…' })
    return encodeMp3(mix, mp3Options)
  }

  exportProject(space = 2): string {
    return serializeProject(this.project, space)
  }

  importProject(projectOrJson: AutomaudioProject | string): AutomaudioProject {
    const project = typeof projectOrJson === 'string' ? parseProject(projectOrJson) : normalizeProject(projectOrJson)
    this.project = project
    this.decodedBuffers.clear()
    this.emitChange()
    return this.getProject()
  }

  on<K extends EventName>(event: K, listener: Listener<K>): () => void {
    const listeners = this.listeners.get(event) ?? new Set()
    listeners.add(listener as (detail: never) => void)
    this.listeners.set(event, listeners)
    return () => listeners.delete(listener as (detail: never) => void)
  }

  destroy(): void {
    this.listeners.clear()
    this.runtimeAssets.clear()
    this.decodedBuffers.clear()
    void this.audioContext?.close()
  }

  private async resolveAsset(source: TrackSource, track: AutomaudioTrack): Promise<RuntimeAsset> {
    if (source.type === 'asset') {
      const runtimeAsset = this.runtimeAssets.get(source.value)
      if (runtimeAsset) return runtimeAsset
    }
    if (this.assetResolver) return this.assetResolver(source, structuredClone(track))
    if (source.type === 'url') return source.value
    throw new Error(`The local asset “${source.fileName ?? source.value}” must be selected again.`)
  }

  private getAudioContext(): AudioContext {
    this.audioContext ??= new AudioContext()
    return this.audioContext
  }

  private requireTrackIndex(id: string): number {
    const index = this.project.tracks.findIndex((track) => track.id === id)
    if (index < 0) throw new Error(`Track not found: ${id}`)
    return index
  }

  private demoteOtherPrimary(id: string): void {
    for (const track of this.project.tracks) {
      if (track.id !== id && track.role === 'primary') track.role = 'secondary'
    }
  }

  private emitChange(): void {
    this.emit('change', this.getProject())
  }

  private emit<K extends EventName>(event: K, detail: AutomaudioEventMap[K]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(detail as never)
  }
}

async function toArrayBuffer(asset: RuntimeAsset): Promise<ArrayBuffer> {
  if (asset instanceof ArrayBuffer) return asset
  if (typeof asset === 'string') {
    const response = await fetch(asset)
    if (!response.ok) throw new Error(`Unable to load audio (${response.status}).`)
    return response.arrayBuffer()
  }
  return asset.arrayBuffer()
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `track-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
