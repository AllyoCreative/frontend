import { getAuthToken } from './api'

export interface SocketEventPayload {
  type: string
  projectId?: string
  workspaceId?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

type EventHandler = (event: SocketEventPayload) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectTimer: number | null = null

  connect(projectId?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const token = getAuthToken()
    const query = new URLSearchParams()
    if (token) query.set('token', token)
    if (projectId) query.set('projectId', projectId)

    const wsUrl = `ws://localhost:4000/ws?${query.toString()}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          const listeners = this.handlers.get(parsed.type)
          if (listeners) {
            listeners.forEach((fn) => fn(parsed))
          }
          const wildcardListeners = this.handlers.get('*')
          if (wildcardListeners) {
            wildcardListeners.forEach((fn) => fn(parsed))
          }
        } catch {
          // ignore non-json
        }
      }

      this.ws.onclose = () => {
        this.ws = null
        if (!this.reconnectTimer) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null
            this.connect(projectId)
          }, 3000)
        }
      }

      this.ws.onerror = () => {
        // Handled by close
      }
    } catch {
      // Offline fallback
    }
  }

  on(type: string, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: EventHandler) {
    const set = this.handlers.get(type)
    if (set) set.delete(handler)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const socket = new WebSocketService()
