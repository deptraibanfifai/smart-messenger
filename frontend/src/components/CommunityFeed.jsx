import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, PenLine, Send, Trash2, Sparkles } from 'lucide-react';
import api from '../services/api';

const timeLabel = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function CommunityFeed({ user, onError }) {
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentPages, setCommentPages] = useState({});
  const [moreComments, setMoreComments] = useState({});

  useEffect(() => {
    let alive = true;
    api.get('/community/posts').then(({ data }) => {
      if (!alive) return;
      setPosts(data);
      setHasMore(data.length === 10);
    }).catch(() => { if (alive) onError('Không tải được bảng tin. Hãy thử tải lại trang.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [onError]);

  const publish = async event => {
    event.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    onError('');
    try {
      const { data } = await api.post('/community/posts', { content: draft.trim() });
      setPosts(previous => [data, ...previous]);
      setDraft('');
    } catch (failure) { onError(failure.response?.data?.message || 'Không đăng được bài viết.'); }
    finally { setPosting(false); }
  };

  const remove = async id => {
    setBusyId(id);
    onError('');
    try {
      await api.delete(`/community/posts/${id}`);
      setPosts(previous => previous.filter(post => post.id !== id));
    } catch (failure) { onError(failure.response?.data?.message || 'Không xóa được bài viết.'); }
    finally { setBusyId(null); }
  };

  const toggleLike = async post => {
    setBusyId(post.id);
    onError('');
    try {
      const { data } = await api({ url: `/community/posts/${post.id}/like`,
        method: post.likedByMe ? 'delete' : 'put' });
      setPosts(previous => previous.map(item => item.id === post.id ? data : item));
    } catch (failure) { onError(failure.response?.data?.message || 'Không cập nhật được lượt thích.'); }
    finally { setBusyId(null); }
  };

  const showComments = async id => {
    if (openComments[id]) {
      setOpenComments(previous => ({ ...previous, [id]: false }));
      return;
    }
    setOpenComments(previous => ({ ...previous, [id]: true }));
    if (comments[id]) return;
    try {
      const { data } = await api.get(`/community/posts/${id}/comments`);
      setComments(previous => ({ ...previous, [id]: data }));
      setMoreComments(previous => ({ ...previous, [id]: data.length === 20 }));
    } catch (failure) {
      setOpenComments(previous => ({ ...previous, [id]: false }));
      onError(failure.response?.data?.message || 'Không tải được bình luận.');
    }
  };

  const loadMoreComments = async id => {
    const nextPage = (commentPages[id] || 0) + 1;
    try {
      const { data } = await api.get(`/community/posts/${id}/comments`, { params: { page: nextPage } });
      setComments(previous => ({ ...previous, [id]: [...(previous[id] || []),
        ...data.filter(item => !(previous[id] || []).some(old => old.id === item.id))] }));
      setCommentPages(previous => ({ ...previous, [id]: nextPage }));
      setMoreComments(previous => ({ ...previous, [id]: data.length === 20 }));
    } catch { onError('Không tải được thêm bình luận.'); }
  };

  const submitComment = async (event, postId) => {
    event.preventDefault();
    const text = commentDrafts[postId]?.trim();
    if (!text || busyId === postId) return;
    setBusyId(postId);
    onError('');
    try {
      const { data } = await api.post(`/community/posts/${postId}/comments`, { content: text });
      setComments(previous => ({ ...previous, [postId]: [data, ...(previous[postId] || [])] }));
      setPosts(previous => previous.map(item => item.id === postId ? { ...item, comments: item.comments + 1 } : item));
      setCommentDrafts(previous => ({ ...previous, [postId]: '' }));
    } catch (failure) { onError(failure.response?.data?.message || 'Không gửi được bình luận.'); }
    finally { setBusyId(null); }
  };

  const removeComment = async (postId, commentId) => {
    setBusyId(postId);
    onError('');
    try {
      await api.delete(`/community/posts/${postId}/comments/${commentId}`);
      setComments(previous => ({ ...previous, [postId]: (previous[postId] || []).filter(item => item.id !== commentId) }));
      setPosts(previous => previous.map(item => item.id === postId ? { ...item, comments: Math.max(0, item.comments - 1) } : item));
    } catch (failure) { onError(failure.response?.data?.message || 'Không xóa được bình luận.'); }
    finally { setBusyId(null); }
  };

  const loadMorePosts = async () => {
    onError('');
    try {
      const { data } = await api.get('/community/posts', { params: { page: page + 1 } });
      setPosts(previous => [...previous, ...data.filter(item => !previous.some(old => old.id === item.id))]);
      setPage(previous => previous + 1);
      setHasMore(data.length === 10);
    } catch { onError('Không tải được thêm bài viết.'); }
  };

  return (
    <section className="community-feed" id="community-feed">
      <div className="community-section-title">
        <div><span>01 / BẢNG TIN</span><h2>Câu chuyện gặp gỡ</h2></div>
        <span className="community-feed-caption"><Sparkles size={16} /> Chia sẻ, làm quen, kết nối</span>
      </div>
      <form className="community-compose" onSubmit={publish}>
        <div className="community-compose-top"><img src={user?.avatarUrl} alt="" /><div><strong>{user?.fullName || user?.username}</strong><small>Chia sẻ với mọi người trong Góc gặp gỡ</small></div></div>
        <div className="social-post-prompts" aria-label="Gợi ý bài viết">
          <button type="button" onClick={() => setDraft('Một chút về mình: ')}>Giới thiệu bản thân</button>
          <button type="button" onClick={() => setDraft('Mình thích ')}>Chia sẻ sở thích</button>
          <button type="button" onClick={() => setDraft('Mình muốn làm quen với người ')}>Muốn làm quen</button>
        </div>
        <label htmlFor="community-post-content" className="sr-only">Nội dung bài viết</label>
        <textarea id="community-post-content" rows={3} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Bạn muốn chia sẻ gì để bắt đầu làm quen?" />
        <div className="community-compose-bottom"><span>{draft.length}/2000 ký tự · Bài viết văn bản</span><button type="submit" disabled={posting || !draft.trim()}><PenLine size={16} /> {posting ? 'Đang đăng...' : 'Đăng bài'}</button></div>
      </form>
      {loading ? <p className="community-placeholder">Đang tải bảng tin...</p> : posts.length === 0
        ? <div className="community-feed-empty"><Sparkles size={29} /><h3>Chưa có bài viết nào</h3><p>Hãy giới thiệu về bạn hoặc chia sẻ một sở thích để bắt đầu làm quen.</p></div>
        : <div className="community-posts">{posts.map(post => (
          <article className="community-post" key={post.id}>
            <div className="community-post-head"><img src={post.avatarUrl} alt="" /><div><strong>{post.authorName}</strong><span>@{post.username} · {timeLabel(post.createdAt)}</span></div>
              {post.authorId === user?.id && <button type="button" disabled={busyId === post.id} title="Xóa bài viết của tôi" aria-label="Xóa bài viết" onClick={() => remove(post.id)}><Trash2 size={17} /></button>}
            </div>
            <p className="community-post-content">{post.content}</p>
            <div className="community-post-counts"><span>{post.likes} lượt thích</span><span>{post.comments} bình luận</span></div>
            <div className="community-post-actions">
              <button type="button" aria-pressed={post.likedByMe} disabled={busyId === post.id} onClick={() => toggleLike(post)}><Heart size={18} fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likedByMe ? 'Đã thích' : 'Thích'}</button>
              <button type="button" aria-expanded={!!openComments[post.id]} onClick={() => showComments(post.id)}><MessageCircle size={18} /> Bình luận</button>
            </div>
            {openComments[post.id] && <div className="community-comments">
              <form onSubmit={event => submitComment(event, post.id)}><img src={user?.avatarUrl} alt="" /><input aria-label="Viết bình luận" maxLength={500} placeholder="Viết bình luận..." value={commentDrafts[post.id] || ''} onChange={event => setCommentDrafts(previous => ({ ...previous, [post.id]: event.target.value }))} /><button type="submit" disabled={busyId === post.id || !commentDrafts[post.id]?.trim()} aria-label="Gửi bình luận"><Send size={17} /></button></form>
              {(comments[post.id] || []).map(comment => <div className="community-comment" key={comment.id}><img src={comment.avatarUrl} alt="" /><div><strong>{comment.authorName}</strong><small>{timeLabel(comment.createdAt)}</small><p>{comment.content}</p></div>{(comment.authorId === user?.id || post.authorId === user?.id) && <button disabled={busyId === post.id} type="button" onClick={() => removeComment(post.id, comment.id)} title="Xóa bình luận" aria-label="Xóa bình luận"><Trash2 size={15} /></button>}</div>)}
              {moreComments[post.id] && <button type="button" className="community-more-comments" onClick={() => loadMoreComments(post.id)}>Xem thêm bình luận</button>}
              {comments[post.id]?.length === 0 && <p className="community-muted">Hãy để lại bình luận đầu tiên.</p>}
            </div>}
          </article>
        ))}</div>}
      {hasMore && <button className="community-load" type="button" onClick={loadMorePosts}>Xem thêm bài viết</button>}
    </section>
  );
}
