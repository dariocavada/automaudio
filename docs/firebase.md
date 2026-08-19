# Firebase Storage

Automaudio does not import Firebase. The host application retains control over authentication, uploads, and security rules.

## Persistent URL

After uploading a file, pass its download URL as the source:

```ts
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

const audioRef = ref(storage, `projects/${projectId}/${file.name}`)
await uploadBytes(audioRef, file)
const url = await getDownloadURL(audioRef)

await editor.addTrack({
  label: file.name,
  source: { type: 'url', value: url },
})
```

Configure bucket CORS so the browser can download and decode the audio.

## Application key

To avoid storing download URLs in JSON, save an `asset` source and use `assetResolver`:

```ts
const audio = new Automaudio({
  assetResolver: async (source) => {
    if (source.type === 'url') return source.value
    return getDownloadURL(ref(storage, source.value))
  },
})
```
