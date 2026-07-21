import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Comment } from '../api/types';
import { useAuth } from '../auth/AuthContext';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function CommentRow({
  comment,
  isReply,
  onReply,
  onDelete,
  onReport,
  canDelete,
  isReported,
}: {
  comment: Comment;
  isReply: boolean;
  onReply?: () => void;
  onDelete: () => void;
  onReport: () => void;
  canDelete: boolean;
  isReported: boolean;
}) {
  return (
    <div style={{ marginLeft: isReply ? 28 : 0, marginTop: isReply ? 10 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: '0.88rem' }}>{comment.author_pseudo}</strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{DATE_FORMAT.format(new Date(comment.created_at))}</span>
      </div>
      <p style={{ margin: '4px 0 6px', fontSize: '0.9rem' }}>{comment.content}</p>
      <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem' }}>
        {onReply && (
          <button type="button" onClick={onReply} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Répondre
          </button>
        )}
        {canDelete && (
          <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Supprimer
          </button>
        )}
        {isReported ? (
          <span style={{ color: 'var(--color-text-muted)' }}>Signalé ✓</span>
        ) : (
          <button type="button" onClick={onReport} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Signaler
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const load = () => api.get<Comment[]>(`/recipes/${recipeId}/comments`).then(setComments);

  useEffect(() => {
    setComments(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!newComment.trim()) return;
    setError(null);
    setPosting(true);
    try {
      await api.post(`/recipes/${recipeId}/comments`, { content: newComment.trim() });
      setNewComment('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setError(null);
    try {
      await api.post(`/recipes/${recipeId}/comments`, { content: replyContent.trim(), parentCommentId: parentId });
      setReplyContent('');
      setReplyingTo(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    }
  };

  const deleteComment = async (id: string) => {
    await api.delete(`/comments/${id}`);
    await load();
  };

  const startReport = (id: string) => {
    if (!user) return navigate('/login');
    setReportingId(reportingId === id ? null : id);
    setReportReason('');
  };

  const submitReport = async (id: string) => {
    if (!reportReason.trim()) return;
    setError(null);
    try {
      await api.post('/reports', { targetType: 'commentaire', targetId: id, reason: reportReason.trim() });
      setReportedIds((prev) => new Set(prev).add(id));
      setReportingId(null);
      setReportReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    }
  };

  if (comments === null) return <p>Chargement des commentaires...</p>;

  const topLevel = comments.filter((c) => c.parent_comment_id === null);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_comment_id) {
      const list = repliesByParent.get(c.parent_comment_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_comment_id, list);
    }
  }

  const renderReportForm = (id: string) =>
    reportingId === id && (
      <div style={{ marginLeft: 28, marginTop: 10, display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder="Pourquoi signaler ce commentaire ?"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitReport(id)}
        />
        <button className="btn" type="button" onClick={() => submitReport(id)} disabled={!reportReason.trim()}>
          Envoyer
        </button>
        <button className="btn btn--ghost" type="button" onClick={() => setReportingId(null)}>
          Annuler
        </button>
      </div>
    );

  return (
    <div className="card">
      <h2>Commentaires {comments.length > 0 && `(${comments.length})`}</h2>
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={submitComment} style={{ marginBottom: 20 }}>
        <div className="field">
          <textarea
            rows={2}
            placeholder={user ? 'Ajouter un commentaire...' : 'Connectez-vous pour commenter'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={posting || !newComment.trim()}>
          {posting ? 'Envoi...' : 'Publier'}
        </button>
      </form>

      {topLevel.length === 0 ? (
        <p className="empty-state">Aucun commentaire pour l'instant — soyez le premier.</p>
      ) : (
        topLevel.map((c) => (
          <div key={c.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
            <CommentRow
              comment={c}
              isReply={false}
              onReply={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
              onDelete={() => deleteComment(c.id)}
              onReport={() => startReport(c.id)}
              canDelete={user?.id === c.user_id}
              isReported={reportedIds.has(c.id)}
            />
            {renderReportForm(c.id)}
            {(repliesByParent.get(c.id) ?? []).map((reply) => (
              <div key={reply.id}>
                <CommentRow
                  comment={reply}
                  isReply
                  onDelete={() => deleteComment(reply.id)}
                  onReport={() => startReport(reply.id)}
                  canDelete={user?.id === reply.user_id}
                  isReported={reportedIds.has(reply.id)}
                />
                {renderReportForm(reply.id)}
              </div>
            ))}
            {replyingTo === c.id && (
              <div style={{ marginLeft: 28, marginTop: 10, display: 'flex', gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  placeholder="Votre réponse..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitReply(c.id)}
                />
                <button className="btn" type="button" onClick={() => submitReply(c.id)} disabled={!replyContent.trim()}>
                  Envoyer
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
