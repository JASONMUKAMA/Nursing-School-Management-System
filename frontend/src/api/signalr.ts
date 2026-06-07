import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { getStoredAuth } from './client';
import type { AppNotificationPayload } from '../types';

export type SignalRStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

let connection: HubConnection | null = null;

export function getNotificationConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => getStoredAuth()?.accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();
  }
  return connection;
}

export async function startNotificationConnection(
  onNotification: (payload: AppNotificationPayload) => void,
  onStatus?: (status: SignalRStatus) => void,
): Promise<() => void> {
  const hub = getNotificationConnection();

  hub.off('ReceiveNotification');
  hub.on('ReceiveNotification', onNotification);

  const handleReconnecting = () => onStatus?.('reconnecting');
  const handleReconnected = () => onStatus?.('connected');
  const handleClose = () => onStatus?.('disconnected');

  hub.onreconnecting(handleReconnecting);
  hub.onreconnected(handleReconnected);
  hub.onclose(handleClose);

  if (hub.state === HubConnectionState.Disconnected) {
    onStatus?.('connecting');
    try {
      await hub.start();
      onStatus?.('connected');
    } catch (err) {
      onStatus?.('disconnected');
      console.error('SignalR failed to connect:', err);
    }
  } else {
    onStatus?.('connected');
  }

  return () => {
    hub.off('ReceiveNotification', onNotification);
    if (hub.state !== HubConnectionState.Disconnected) {
      void hub.stop();
    }
  };
}

export async function stopNotificationConnection(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
  connection = null;
}
