import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { getStoredAuth } from './client';
import type { LectureFile, Quiz, QuizResult } from '../types';

export interface ClassroomHubHandlers {
  onQuizPublished?: (quiz: Quiz) => void;
  onQuizClosed?: (payload: { quizId: string }) => void;
  onSubmissionReceived?: (result: QuizResult) => void;
  onFileUploaded?: (file: LectureFile) => void;
  onSessionStarted?: (payload: { sessionId: string }) => void;
  onSessionEnded?: (payload: { sessionId: string }) => void;
  onParticipantJoined?: (payload: { name: string; at: string }) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
}

/**
 * Connects to the classroom hub and joins the group for one live session.
 * Returns a cleanup function that leaves the group and stops the connection.
 */
export async function connectToClassroom(
  sessionId: string,
  handlers: ClassroomHubHandlers,
): Promise<() => Promise<void>> {
  const hub: HubConnection = new HubConnectionBuilder()
    .withUrl('/hubs/classroom', {
      accessTokenFactory: () => getStoredAuth()?.accessToken ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
    .build();

  if (handlers.onQuizPublished) hub.on('QuizPublished', handlers.onQuizPublished);
  if (handlers.onQuizClosed) hub.on('QuizClosed', handlers.onQuizClosed);
  if (handlers.onSubmissionReceived) hub.on('SubmissionReceived', handlers.onSubmissionReceived);
  if (handlers.onFileUploaded) hub.on('FileUploaded', handlers.onFileUploaded);
  if (handlers.onSessionStarted) hub.on('SessionStarted', handlers.onSessionStarted);
  if (handlers.onSessionEnded) hub.on('SessionEnded', handlers.onSessionEnded);
  if (handlers.onParticipantJoined) hub.on('ParticipantJoined', handlers.onParticipantJoined);

  hub.onreconnecting(() => handlers.onStatus?.('reconnecting'));
  hub.onreconnected(() => {
    handlers.onStatus?.('connected');
    // Re-join the group after the connection id changes on reconnect.
    void hub.invoke('JoinSession', sessionId);
  });
  hub.onclose(() => handlers.onStatus?.('disconnected'));

  handlers.onStatus?.('connecting');
  await hub.start();
  await hub.invoke('JoinSession', sessionId);
  handlers.onStatus?.('connected');

  return async () => {
    try {
      if (hub.state === HubConnectionState.Connected) {
        await hub.invoke('LeaveSession', sessionId);
      }
    } finally {
      await hub.stop();
    }
  };
}
