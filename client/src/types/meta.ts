export interface DatabaseStatus {
  status: 'connected' | 'unavailable' | 'error';
  serverTime?: string;
  postgis: {
    available: boolean;
    version?: string;
  };
}

export interface SystemStatus {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  database: DatabaseStatus;
}
