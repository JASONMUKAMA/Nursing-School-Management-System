import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { complaintsApi } from '../../api/endpoints';
import { connectToComplaints } from '../../api/complaintsHub';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../hooks/useAuth';
import type { Complaint } from '../../types';
import type { Role } from '../../types';
import { ROLES } from '../../utils/roles';
import { ComplaintAttachment } from './ComplaintAttachment';
import { COMPLAINT_EMOJIS } from './complaintEmojis';

const MAX_ATTACHMENT_BYTES = 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateGroupLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-UG', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function roleLabel(role: string | null | undefined) {
  if (!role) return null;
  return ROLES[role as Role] ?? role;
}

function roleClass(role: string | null | undefined) {
  const key = (role ?? 'default').toLowerCase();
  if (key === 'admin') return 'complaint-avatar-admin';
  if (key === 'registrar') return 'complaint-avatar-registrar';
  if (key === 'lecturer') return 'complaint-avatar-lecturer';
  if (key === 'student') return 'complaint-avatar-student';
  if (key === 'financeofficer') return 'complaint-avatar-finance';
  if (key === 'clinicalcoordinator') return 'complaint-avatar-clinical';
  return 'complaint-avatar-default';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function groupByDate(messages: Complaint[]) {
  const groups: { label: string; items: Complaint[] }[] = [];
  let currentLabel = '';
  for (const msg of messages) {
    const label = dateGroupLabel(msg.postedAt);
    if (label !== currentLabel) {
      groups.push({ label, items: [msg] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].items.push(msg);
    }
  }
  return groups;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function validateAttachment(file: File): string | null {
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowedByType = ALLOWED_ATTACHMENT_TYPES.has(type);
  const allowedByExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext);
  if (!allowedByType && !allowedByExt) {
    return 'Only photos (JPG, PNG, WebP) and PDF files are allowed.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'File must be 1 MB or smaller.';
  }
  return null;
}

const HUB_STATUS_LABEL = {
  connecting: 'Connecting…',
  connected: 'Live',
  reconnecting: 'Reconnecting…',
  disconnected: 'Offline',
} as const;

export function ComplaintsPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [hubStatus, setHubStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupByDate(messages), [messages]);
  const canSend = Boolean(draft.trim() || attachment) && !sending;

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const appendMessage = useCallback((msg: Complaint) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].sort(
        (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await complaintsApi.getMessages(1, 200);
        if (cancelled) return;
        const sorted = [...result.items].sort(
          (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
        );
        setMessages(sorted);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load complaints');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let disconnect: (() => Promise<void>) | undefined;
    void connectToComplaints({
      onComplaintPosted: appendMessage,
      onStatus: setHubStatus,
    }).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => {
      void disconnect?.();
    };
  }, [appendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
  }, [attachmentPreview]);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next.slice(0, 2000));
    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.min(start + emoji.length, 2000);
      el.setSelectionRange(pos, pos);
    });
    setShowEmojiPicker(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateAttachment(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    setError(null);
    clearAttachment();
    setAttachment(file);
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if ((!text && !attachment) || sending) return;
    setSending(true);
    setError(null);
    try {
      const posted = await complaintsApi.post(text, attachment ?? undefined);
      appendMessage(posted);
      setDraft('');
      clearAttachment();
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send complaint');
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="complaints-page">
      <div className="complaints-shell">
        <header className="complaints-hero">
          <div className="complaints-hero-main">
            <div className="complaints-hero-icon" aria-hidden>
              💬
            </div>
            <div>
              <h2>School Complaints</h2>
              <p className="complaints-subtitle">
                A shared channel for students and staff. Post feedback, concerns, or issues — everyone can see and respond.
              </p>
            </div>
          </div>
          <div className="complaints-hero-meta">
            <span className={`complaints-live-pill complaints-live-${hubStatus}`}>
              <span className="complaints-live-dot" />
              {HUB_STATUS_LABEL[hubStatus]}
            </span>
            <span className="complaints-message-count">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </header>

        <div className="complaints-panel">
          <div className="complaints-chat" role="log" aria-live="polite" aria-label="Complaints messages">
            {messages.length === 0 ? (
              <div className="complaints-empty">
                <div className="complaints-empty-icon" aria-hidden>
                  📭
                </div>
                <h3>No complaints yet</h3>
                <p>Be the first to share feedback. Your message will be visible to everyone in the school.</p>
              </div>
            ) : (
              grouped.map((group) => (
                <section key={group.label} className="complaints-day-group">
                  <div className="complaints-day-divider">
                    <span>{group.label}</span>
                  </div>
                  {group.items.map((msg) => {
                    const mine = user?.id === msg.userId;
                    const label = roleLabel(msg.primaryRole);
                    const hasText = Boolean(msg.message?.trim());
                    return (
                      <article
                        key={msg.id}
                        className={`complaint-row${mine ? ' complaint-row-mine' : ''}`}
                      >
                        {!mine && (
                          <div
                            className={`complaint-avatar ${roleClass(msg.primaryRole)}`}
                            title={msg.authorName}
                            aria-hidden
                          >
                            {initials(msg.authorName)}
                          </div>
                        )}
                        <div className={`complaint-bubble${mine ? ' complaint-bubble-mine' : ''}`}>
                          <header className="complaint-bubble-meta">
                            <strong>{mine ? 'You' : msg.authorName}</strong>
                            {label && (
                              <span className={`complaint-role complaint-role-${(msg.primaryRole ?? '').toLowerCase()}`}>
                                {label}
                              </span>
                            )}
                            <time dateTime={msg.postedAt}>{formatTime(msg.postedAt)}</time>
                          </header>
                          {hasText && <p className="complaint-bubble-text">{msg.message}</p>}
                          <ComplaintAttachment complaint={msg} />
                        </div>
                        {mine && (
                          <div
                            className={`complaint-avatar ${roleClass(msg.primaryRole)}`}
                            title={msg.authorName}
                            aria-hidden
                          >
                            {initials(msg.authorName)}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form className="complaints-compose" onSubmit={handleSubmit}>
            {error && (
              <div className="complaints-compose-error" role="alert">
                {error}
              </div>
            )}

            {attachment && (
              <div className="complaints-attachment-preview">
                {attachmentPreview ? (
                  <img src={attachmentPreview} alt="" className="complaints-attachment-preview-thumb" />
                ) : (
                  <span className="complaints-attachment-preview-pdf" aria-hidden>
                    📄
                  </span>
                )}
                <div className="complaints-attachment-preview-meta">
                  <strong>{attachment.name}</strong>
                  <span>{formatFileSize(attachment.size)}</span>
                </div>
                <button
                  type="button"
                  className="complaints-attachment-remove"
                  onClick={clearAttachment}
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            )}

            <div className="complaints-compose-toolbar">
              <div className="complaints-compose-tools" ref={emojiPickerRef}>
                <button
                  type="button"
                  className="complaints-tool-btn"
                  onClick={() => setShowEmojiPicker((open) => !open)}
                  aria-label="Insert emoji"
                  aria-expanded={showEmojiPicker}
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="complaints-emoji-picker" role="listbox" aria-label="Emoji picker">
                    {COMPLAINT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="complaints-emoji-btn"
                        onClick={() => insertEmoji(emoji)}
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="complaints-tool-btn"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach photo or PDF"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="complaints-file-input"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                />
              </div>
              <span className="complaints-char-count">{draft.length}/2000</span>
            </div>

            <div className="complaints-compose-inner">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your complaint or concern…"
                rows={2}
                maxLength={2000}
                disabled={sending}
                aria-label="Write a complaint"
              />
              <Button type="submit" disabled={!canSend}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
            <p className="complaints-compose-hint">
              Photos &amp; PDFs up to 1&nbsp;MB · <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
