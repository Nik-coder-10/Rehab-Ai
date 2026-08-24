/**
 * WebSocket telemetry client with exponential backoff auto-reconnect.
 */

export type WsConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';

export interface ExerciseSessionWsClientOptions {
  sessionId: string;
  token: string;
  onStatusChange?: (status: WsConnectionStatus) => void;
  onServerMessage?: (msg: any) => void;
  maxReconnectAttempts?: number;
}

export class ExerciseSessionWsClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private token: string;
  private status: WsConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectTimeout: any = null;
  private isIntentionallyClosed: boolean = false;

  private onStatusChange?: (status: WsConnectionStatus) => void;
  private onServerMessage?: (msg: any) => void;

  constructor(options: ExerciseSessionWsClientOptions) {
    this.sessionId = options.sessionId;
    this.token = options.token;
    this.onStatusChange = options.onStatusChange;
    this.onServerMessage = options.onServerMessage;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When in dev Vite proxy, connects to 127.0.0.1:8000
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/exercise-session/${this.sessionId}?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onServerMessage?.(data);
        } catch {
          // Ignore invalid non-JSON frame
        }
      };

      this.ws.onerror = () => {
        this.setStatus('ERROR');
      };

      this.ws.onclose = () => {
        if (!this.isIntentionallyClosed) {
          this.handleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch {
      this.handleReconnect();
    }
  }

  public sendMetrics(metrics: {
    current_angle: number;
    current_rom: number;
    current_velocity: number;
    phase: string;
    current_score: number;
    active_feedback: string;
    reps_completed: number;
  }): void {
    this.sendJson({
      action: 'METRICS_UPDATE',
      session_id: this.sessionId,
      timestamp_ms: performance.now(),
      ...metrics,
    });
  }

  public sendRepCompleted(rep: {
    rep_number: number;
    form_score: number;
    peak_rom: number;
    duration_seconds: number;
    feedback_cues: string[];
  }): void {
    this.sendJson({
      action: 'REP_COMPLETED',
      session_id: this.sessionId,
      timestamp_ms: performance.now(),
      ...rep,
    });
  }

  public pauseSession(): void {
    this.sendJson({ action: 'SESSION_PAUSE', session_id: this.sessionId });
  }

  public resumeSession(): void {
    this.sendJson({ action: 'SESSION_RESUME', session_id: this.sessionId });
  }

  public endSession(): void {
    this.sendJson({ action: 'SESSION_END', session_id: this.sessionId });
    this.disconnect();
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  private sendJson(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private handleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setStatus('RECONNECTING');
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.setStatus('DISCONNECTED');
    }
  }

  private setStatus(newStatus: WsConnectionStatus): void {
    this.status = newStatus;
    this.onStatusChange?.(newStatus);
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }
}
