export const notifyClients = async (message: Record<string, unknown>): Promise<void> => {
  const clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'})

  for (const client of clients) {
    client.postMessage(message)
  }
}
