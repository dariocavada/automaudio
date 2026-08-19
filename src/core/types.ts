export const AUTOMAUDIO_SCHEMA_VERSION = 1 as const

export type TrackRole = 'primary' | 'secondary'

export interface UrlTrackSource {
  type: 'url'
  value: string
}

export interface AssetTrackSource {
  type: 'asset'
  value: string
  fileName?: string
  mimeType?: string
}

export type TrackSource = UrlTrackSource | AssetTrackSource

export interface EnvelopePoint {
  /** Time relative to the beginning of the track, in seconds. */
  time: number
  /** Linear gain between 0 and 1. */
  volume: number
}

export interface AutomaudioTrack {
  id: string
  label: string
  role: TrackRole
  source: TrackSource
  startTime: number
  duration?: number
  volume: number
  muted: boolean
  envelope: EnvelopePoint[]
}

export type NewAutomaudioTrack = Pick<AutomaudioTrack, 'label' | 'source'> &
  Partial<Omit<AutomaudioTrack, 'id' | 'label' | 'source'>> & {
    id?: string
  }

export interface DuckingSettings {
  /** A frame is considered voice above this RMS level. */
  thresholdDb: number
  /** Silences shorter than this value remain inside the vocal segment. */
  silenceDurationMs: number
  /** Ignore very short sounds and clicks. */
  minVoiceDurationMs: number
  /** Analysis frame size. */
  analysisWindowMs: number
  /** Envelope time used to lower secondary tracks. */
  attackMs: number
  /** Envelope time used to restore secondary tracks. */
  releaseMs: number
  /** Automation gain while voice is active. */
  minVolume: number
  /** Automation gain while voice is inactive. */
  maxVolume: number
}

export interface AutomaudioProject {
  schemaVersion: typeof AUTOMAUDIO_SCHEMA_VERSION
  title: string
  masterVolume: number
  ducking: DuckingSettings
  tracks: AutomaudioTrack[]
}

export interface VoiceSegment {
  start: number
  end: number
}

export interface AudioBufferLike {
  readonly duration: number
  readonly length: number
  readonly numberOfChannels: number
  readonly sampleRate: number
  getChannelData(channel: number): Float32Array
}

export type RuntimeAsset = Blob | ArrayBuffer | string

export type AssetResolver = (
  source: TrackSource,
  track: AutomaudioTrack,
) => RuntimeAsset | Promise<RuntimeAsset>

export interface AutomaudioOptions {
  project?: Partial<AutomaudioProject>
  assetResolver?: AssetResolver
  audioContext?: AudioContext
}

export interface MixOptions {
  sampleRate?: number
  channels?: 1 | 2
}

export interface Mp3ExportOptions {
  quality?: 'low' | 'medium' | 'high' | 'very-high'
}

export interface AutomaudioEventMap {
  change: AutomaudioProject
  status: { message: string }
  error: { error: Error }
  ducking: { segments: VoiceSegment[]; project: AutomaudioProject }
}
