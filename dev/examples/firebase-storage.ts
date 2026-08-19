// Install `firebase` in the host application before using this adapter.
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import type { AutomaudioElement } from '@dariocavada/automaudio/element'

export async function uploadAndAddTrack(
  editor: AutomaudioElement,
  storage: FirebaseStorage,
  projectId: string,
  file: File,
): Promise<void> {
  const storageRef = ref(storage, `automaudio/${projectId}/${crypto.randomUUID()}-${file.name}`)
  await uploadBytes(storageRef, file, { contentType: file.type })
  const url = await getDownloadURL(storageRef)
  await editor.addTrack({
    label: file.name,
    source: { type: 'url', value: url },
  })
}
