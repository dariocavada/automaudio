import type { Mp3ExportOptions } from '../core/types'

/** Encodes an already mixed AudioBuffer using Mediabunny and LAME/WASM. */
export async function encodeMp3(
  buffer: AudioBuffer,
  options: Mp3ExportOptions = {},
): Promise<Blob> {
  const [media, extension] = await Promise.all([
    import('mediabunny'),
    import('@mediabunny/mp3-encoder'),
  ])

  if (!(await media.canEncodeAudio('mp3'))) extension.registerMp3Encoder()

  const target = new media.BufferTarget()
  const output = new media.Output({
    format: new media.Mp3OutputFormat(),
    target,
  })
  const source = new media.AudioBufferSource({
    codec: 'mp3',
    quality: new media.Quality(options.quality ?? 'high'),
  })
  output.addAudioTrack(source)

  await output.start()
  await source.add(buffer)
  await output.finalize()

  if (!target.buffer) throw new Error('The MP3 encoder did not produce any data.')
  return new Blob([target.buffer], { type: 'audio/mpeg' })
}
