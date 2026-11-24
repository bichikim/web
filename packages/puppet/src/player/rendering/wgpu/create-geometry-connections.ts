import type {GeometryConnection} from '../../geometry/types'
interface ConnectionOptions {
  /** Stable rendering-device identity. */
  readonly owner: string
  /** Transfers a new port to this device's Worker. */
  readonly connect: (connection: number, port: MessagePort) => Promise<void>
  /** Releases the device's connection after normal caller disposal. */
  readonly disconnect: (connection: number) => void
}
type CloseConnection = () => void
/** Owns untransferred port ends and signals rendering-owner loss to active leases. */
export const createGeometryConnections = (options: ConnectionOptions) => {
  const connections = new Map<number, CloseConnection>()
  let sequence = 0
  let disposed = false
  return {
    async connect(): Promise<GeometryConnection> {
      if (disposed) {
        throw new Error('Rendering device closed')
      }
      const channel = new MessageChannel()
      sequence += 1
      const connection = sequence
      let notify!: () => void
      const closed = new Promise<void>((resolve) => {
        notify = resolve
      })
      connections.set(connection, () => {
        channel.port1.close()
        channel.port2.close()
        notify()
      })
      try {
        await options.connect(connection, channel.port2)
        if (disposed) {
          throw new Error('Rendering device closed')
        }
      } catch (cause) {
        connections.delete(connection)
        channel.port1.close()
        channel.port2.close()
        throw cause
      }
      return {
        closed,
        connection,
        owner: options.owner,
        port: channel.port1,
        release() {
          if (connections.delete(connection)) {
            channel.port1.close()
            channel.port2.close()
            if (!disposed) {
              options.disconnect(connection)
            }
          }
        },
      }
    },
    destroy() {
      if (!disposed) {
        disposed = true
        connections.forEach((close) => close())
        connections.clear()
      }
    },
  }
}
