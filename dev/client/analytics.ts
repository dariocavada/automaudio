/** Visit analytics belong to the hosted demo, never to the reusable library. */
export function installVisitAnalytics(doc: Document, hostname: string, production: boolean): void {
  if (!production || hostname !== 'automaudio.dchs-music.com') return
  if (doc.querySelector('script[data-cf-beacon]')) return

  const script = doc.createElement('script')
  script.type = 'module'
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  // Public site identifier, not an API credential.
  script.dataset.cfBeacon = JSON.stringify({ token: 'ef8497765f3442108088bb74a84c0bf6' })
  doc.head.append(script)
}
