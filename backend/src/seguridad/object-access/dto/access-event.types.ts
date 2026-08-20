/** Event published when admin changes object permissions */
export interface AccessChangedEvent {
  id_acceso: string;
  usernames: string[];
  timestamp: string;
}
