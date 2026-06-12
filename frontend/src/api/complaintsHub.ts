import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { getStoredAuth } from './client';
import type { Complaint } from '../types';

export interface ComplaintsHubHandlers {
  onComplaintPosted?: (complaint: Complaint) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
}

/** Connects to the shared complaints room. Returns a cleanup that stops the connection. */
export async function connectToComplaints(
  handlers: ComplaintsHubHandlers,
): Promise<() => Promise<void>> {
  const hub: HubConnection = new HubConnectionBuilder()
    .withUrl('/hubs/complaints', {
      accessTokenFactory: () => getStoredAuth()?.accessToken ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
    .build();

  if (handlers.onComplaintPosted) hub.on('ComplaintPosted', handlers.onComplaintPosted);

  hub.onreconnecting(() => handlers.onStatus?.('reconnecting'));
  hub.onreconnected(() => handlers.onStatus?.('connected'));
  hub.onclose(() => handlers.onStatus?.('disconnected'));

  handlers.onStatus?.('connecting');
  await hub.start();
  handlers.onStatus?.('connected');

  return async () => {
    await hub.stop();
  };
}
