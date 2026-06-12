import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { classroomApi } from '../../api/endpoints';
import { connectToClassroom } from '../../api/classroomHub';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { FilesPanel } from '../../components/classroom/FilesPanel';
import { StudentQuizzesPanel, TeacherQuizzesPanel } from '../../components/classroom/QuizzesPanel';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../utils/toast';
import type { LectureFile, LiveSessionDetail, Quiz, QuizResult } from '../../types';

// School video server on port 443 with a valid certificate (see scripts/setup-video-server.sh).
// Do not use :8443 on the main nursing domain — HSTS blocks bypassing the self-signed cert there.
const VIDEO_DOMAIN =
  (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? 'nursing.pameoinvestimentsltd.com';

type SidebarTab = 'quizzes' | 'files';

export function LiveClassroomPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Lecturer');

  const [session, setSession] = useState<LiveSessionDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<SidebarTab>('quizzes');
  const [files, setFiles] = useState<LectureFile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [liveResults, setLiveResults] = useState<Record<string, QuizResult[]>>({});
  const [hubStatus, setHubStatus] = useState('connecting');
  const [videoLeft, setVideoLeft] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const endedRef = useRef(false);
  const jitsiApiRef = useRef<{ dispose: () => void; on: (event: string, cb: () => void) => void } | null>(null);
  const leftVideoRef = useRef(false);

  const handleLeftVideo = useCallback(() => {
    if (leftVideoRef.current) return;
    leftVideoRef.current = true;
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setVideoLeft(true);
  }, []);

  const handleJitsiApiReady = useCallback(
    (api: { dispose: () => void; on: (event: string, cb: () => void) => void }) => {
      jitsiApiRef.current = api;
      // Tear down the iframe immediately on hang-up — never show Jitsi's thank-you / feedback page.
      api.on('videoConferenceLeft', handleLeftVideo);
      api.on('readyToClose', handleLeftVideo);
    },
    [handleLeftVideo],
  );

  const upsertQuiz = useCallback((quiz: Quiz) => {
    setQuizzes((qs) => {
      const existing = qs.find((q) => q.id === quiz.id);
      if (!existing) return [quiz, ...qs];
      return qs.map((q) =>
        q.id === quiz.id
          ? {
              ...q,
              status: quiz.status,
              publishedAt: quiz.publishedAt,
              closedAt: quiz.closedAt,
              // Keep the richer question payload we already have (teachers hold the answer key).
              questions: q.questions.length >= quiz.questions.length ? q.questions : quiz.questions,
            }
          : q,
      );
    });
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      classroomApi.getSession(sessionId),
      classroomApi.getFiles(sessionId),
      classroomApi.getQuizzes(sessionId),
    ])
      .then(([s, f, q]) => {
        if (cancelled) return;
        setSession(s);
        setFiles(f);
        setQuizzes(q);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load the classroom.');
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  // Real-time wiring
  useEffect(() => {
    if (!session) return undefined;
    let cleanup: (() => Promise<void>) | null = null;
    let cancelled = false;

    void connectToClassroom(sessionId, {
      onStatus: setHubStatus,
      onQuizPublished: (quiz) => {
        upsertQuiz(quiz);
        if (!canManage) toast.info(`New quiz: "${quiz.title}" — answer it in the sidebar!`);
      },
      onQuizClosed: ({ quizId }) =>
        setQuizzes((qs) => qs.map((q) => (q.id === quizId ? { ...q, status: 'Closed' } : q))),
      onSubmissionReceived: (result) => {
        setLiveResults((prev) => {
          const list = prev[result.quizId] ?? [];
          if (list.some((r) => r.submissionId === result.submissionId)) return prev;
          return { ...prev, [result.quizId]: [result, ...list] };
        });
        toast.success(`${result.studentName} submitted: ${result.score}/${result.maxScore}`);
      },
      onFileUploaded: (file) =>
        setFiles((fs) => (fs.some((f) => f.id === file.id) ? fs : [file, ...fs])),
      onSessionStarted: () =>
        setSession((s) => (s ? { ...s, status: 'Live' } : s)),
      onSessionEnded: () => {
        if (endedRef.current) return;
        endedRef.current = true;
        setSession((s) => (s ? { ...s, status: 'Ended' } : s));
        if (!canManage) toast.info('The lecturer has ended this class.');
      },
      onParticipantJoined: ({ name }) => {
        if (canManage) toast.info(`${name} joined the classroom.`);
      },
    }).then((fn) => {
      if (cancelled) void fn();
      else cleanup = fn;
    }).catch(() => setHubStatus('disconnected'));

    return () => {
      cancelled = true;
      if (cleanup) void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, session?.id]);

  const handleEndSession = async () => {
    try {
      await classroomApi.endSession(sessionId);
      endedRef.current = true;
      setSession((s) => (s ? { ...s, status: 'Ended' } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to end the session.');
    }
  };

  const handleStartSession = async () => {
    try {
      const updated = await classroomApi.startSession(sessionId);
      setSession(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start the session.');
    }
  };

  if (loadError) {
    return (
      <div className="page">
        <p className="empty-state">{loadError}</p>
        <Button variant="secondary" onClick={() => navigate('/app/classroom')}>Back to Classrooms</Button>
      </div>
    );
  }

  if (!session) return <Loading />;

  const displayName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.userName || 'Participant';

  return (
    <div className="classroom-page">
      <div className="classroom-header">
        <div>
          <h2>{session.title}</h2>
          <p className="text-muted">
            {session.courseCode} — {session.courseName} · Host: {session.hostName} ·{' '}
            <span className={`hub-status hub-${hubStatus}`}>{hubStatus}</span>
          </p>
        </div>
        <div className="classroom-header-actions">
          {canManage && session.status === 'Scheduled' && (
            <Button onClick={() => void handleStartSession()}>Go Live</Button>
          )}
          {canManage && session.status === 'Live' && (
            <Button variant="danger" onClick={() => void handleEndSession()}>End Class</Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/app/classroom')}>Leave</Button>
        </div>
      </div>

      <div className="classroom-layout">
        <div className="classroom-video">
          {session.status === 'Live' || (canManage && session.status === 'Scheduled') ? (
            videoLeft ? (
              <div className="classroom-video-placeholder">
                <h3>You left the video</h3>
                <p className="text-muted">
                  Quizzes and lecture files are still available in the sidebar.
                  {session.status === 'Live' && ' You can rejoin the class anytime.'}
                </p>
                {session.status === 'Live' && (
                  <div className="classroom-video-placeholder-actions">
                    <Button
                      onClick={() => {
                        leftVideoRef.current = false;
                        setVideoLeft(false);
                        setVideoKey((k) => k + 1);
                      }}
                    >
                      Rejoin Video
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <JitsiMeeting
                key={videoKey}
                domain={VIDEO_DOMAIN}
                roomName={session.roomId}
                configOverwrite={{
                  prejoinPageEnabled: false,
                  startWithAudioMuted: !canManage,
                  disableThirdPartyRequests: true,
                  hideConferenceSubject: false,
                  subject: session.title,
                  enableClosePage: false,
                  feedbackPercentage: 0,
                  disableDeepLinking: true,
                  defaultLogoUrl: '',
                  brandingDataUrl: '',
                  toolbarButtons: [
                    'microphone',
                    'camera',
                    'desktop',
                    'fullscreen',
                    'hangup',
                    'chat',
                    'raisehand',
                    'tileview',
                    'participants-pane',
                    'settings',
                  ],
                }}
                interfaceConfigOverwrite={{
                  APP_NAME: 'NSMS Live Classroom',
                  NATIVE_APP_NAME: 'NSMS Live Classroom',
                  PROVIDER_NAME: 'Nursing School',
                  SHOW_JITSI_WATERMARK: false,
                  SHOW_WATERMARK_FOR_GUESTS: false,
                  SHOW_BRAND_WATERMARK: false,
                  SHOW_POWERED_BY: false,
                  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                  JITSI_WATERMARK_LINK: '',
                  BRAND_WATERMARK_LINK: '',
                  DEFAULT_LOGO_URL: '',
                  DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                  HIDE_DEEP_LINKING_LOGO: true,
                  MOBILE_APP_PROMO: false,
                  DISPLAY_WELCOME_FOOTER: false,
                  CLOSE_PAGE_GUEST_HINT: false,
                }}
                userInfo={{ displayName, email: user?.email ?? '' }}
                onApiReady={handleJitsiApiReady}
                getIFrameRef={(node) => {
                  node.style.width = '100%';
                  node.style.height = '100%';
                }}
              />
            )
          ) : (
            <div className="classroom-video-placeholder">
              {session.status === 'Ended' ? (
                <>
                  <h3>This class has ended</h3>
                  <p className="text-muted">Lecture files and quiz results remain available in the sidebar.</p>
                </>
              ) : (
                <>
                  <h3>Waiting for the lecturer to go live…</h3>
                  <p className="text-muted">The video room opens automatically when the class starts.</p>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="classroom-sidebar">
          <div className="classroom-tabs">
            <button
              type="button"
              className={`classroom-tab ${tab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setTab('quizzes')}
            >
              Quizzes
            </button>
            <button
              type="button"
              className={`classroom-tab ${tab === 'files' ? 'active' : ''}`}
              onClick={() => setTab('files')}
            >
              Files ({files.length})
            </button>
          </div>

          {tab === 'files' && <FilesPanel sessionId={sessionId} files={files} canUpload={canManage} />}

          {tab === 'quizzes' &&
            (canManage ? (
              <TeacherQuizzesPanel
                sessionId={sessionId}
                quizzes={quizzes}
                liveResults={liveResults}
                onQuizSaved={upsertQuiz}
                onQuizUpdated={upsertQuiz}
                onResultsLoaded={(quizId, results) =>
                  setLiveResults((prev) => ({ ...prev, [quizId]: results }))
                }
              />
            ) : (
              <StudentQuizzesPanel quizzes={quizzes} />
            ))}
        </aside>
      </div>
    </div>
  );
}
