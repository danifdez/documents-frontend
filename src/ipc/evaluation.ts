/** Internal main/preload relay; no executable instructions cross this boundary. */
export type EvaluationOperation = 'status' | 'capture' | 'run' | 'cancel';
export interface EvaluationInput {
  media_type: 'audio/wav' | 'audio/webm' | 'audio/webm;codecs=opus' | 'audio/ogg' | 'audio/ogg;codecs=opus';
  chunks: { size: number; sha256: string; base64: string }[];
  execution: { delivery: 'ordered_ack'; finish: 'stop' | 'cancel'; evidence_mode: 'simulated' | 'observed' };
}
export interface EvaluationRequest { id: string; operation: EvaluationOperation; requestId: string; input?: EvaluationInput; requestHash?: string }
