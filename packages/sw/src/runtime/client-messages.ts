export const notifyClients = async (message: Record<string, unknown>): Promise<void> => {
  const clients = await globalThis.self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  for (const client of clients) {
    client.postMessage(message)
  }
}
