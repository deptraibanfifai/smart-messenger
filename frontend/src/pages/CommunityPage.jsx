import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, MessageCircle, UserPlus, Check, X, LogOut, Search, UserRound, ShieldBan, Home, UsersRound, Heart, Settings2 } from 'lucide-react';
import CommunityFeed from '../components/CommunityFeed';
import MeetingProfileEditor from '../components/MeetingProfileEditor';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Community.css';

export default function CommunityPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [relations, setRelations] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedVersion, setFeedVersion] = useState(0);
  const [discoverVersion, setDiscoverVersion] = useState(0);
  const [section, setSection] = useState('feed');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [section]);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/friends');
    setRelations(data);
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => Promise.all([api.get('/meeting/discover', { params: { query: query.trim() } }), api.get('/friends')])
      .then(([members, friends]) => {
        if (!alive) return;
        setPeople(members.data.content);
        setPage(0);
        setHasMore(!members.data.last);
        setRelations(friends.data);
      })
      .catch(() => { if (alive) setError('Không tải được cộng đồng. Hãy thử tải lại trang.'); })
      .finally(() => { if (alive) setLoading(false); }), 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [discoverVersion, query]);

  const relationOf = useMemo(() => new Map(relations.map(item => [item.userId, item])), [relations]);
  const incoming = relations.filter(item => item.status === 'PENDING' && !item.initiatedByMe);
  const friends = relations.filter(item => item.status === 'ACCEPTED');
  const matching = people;

  const action = async (personId, method, path) => {
    setBusyId(personId);
    setError('');
    try {
      await api({ method, url: `/friends/${personId}${path}` });
      await refresh();
      if (path === '/block') { setFeedVersion(previous => previous + 1); setDiscoverVersion(previous => previous + 1); }
    } catch (failure) {
      setError(failure.response?.data?.message || 'Không thực hiện được thao tác. Hãy thử lại.');
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (personId) => {
    setBusyId(personId);
    setError('');
    try {
      const { data } = await api.post(`/conversations/direct/${personId}`);
      navigate(`/chat?conversation=${data.id}`);
    } catch (failure) {
      setError(failure.response?.data?.message || 'Không mở được đoạn chat.');
      setBusyId(null);
    }
  };

  const loadMore = async () => {
    setError('');
    try {
      const next = page + 1;
      const { data } = await api.get('/meeting/discover', { params: { page: next, query: query.trim() } });
      setPeople(previous => [...previous, ...data.content.filter(item => !previous.some(old => old.id === item.id))]);
      setPage(next);
      setHasMore(!data.last);
    } catch { setError('Không tải được thêm thành viên.'); }
  };

  const controls = (personId) => {
    const relation = relationOf.get(personId);
    const disabled = busyId === personId;
    if (!relation) return <button disabled={disabled} className="community-action" onClick={() => action(personId, 'post', '')}><UserPlus size={16} /> Kết bạn</button>;
    if (relation.status === 'ACCEPTED') return <>
      <button disabled={disabled} className="community-action" onClick={() => openChat(personId)}><MessageCircle size={16} /> Nhắn tin</button>
      <button disabled={disabled} className="community-quiet" onClick={() => action(personId, 'delete', '')}>Hủy kết bạn</button>
    </>;
    if (relation.status === 'PENDING' && relation.initiatedByMe) return <button disabled={disabled} className="community-quiet" onClick={() => action(personId, 'delete', '')}>Đã gửi · Hủy lời mời</button>;
    if (relation.status === 'PENDING') return <>
      <button disabled={disabled} className="community-action" onClick={() => action(personId, 'put', '/accept')}><Check size={16} /> Chấp nhận</button>
      <button disabled={disabled} className="community-quiet" onClick={() => action(personId, 'delete', '/reject')}>Từ chối</button>
    </>;
    return <button disabled={disabled} className="community-quiet" onClick={() => action(personId, 'delete', '/block')}>Bỏ chặn</button>;
  };

  return (
    <div className="community-page social-community">
      <header className="community-topbar">
        <button type="button" className="community-brand" onClick={() => setSection('feed')}><HeartHandshake size={28} /> Smart Messenger <span>Gặp gỡ</span></button>
        <nav aria-label="Điều hướng cộng đồng" className="social-top-nav">
          <button type="button" className={section === 'feed' ? 'selected' : ''} onClick={() => setSection('feed')} aria-label="Bảng tin"><Home size={21} /> <span>Bảng tin</span></button>
          <button type="button" className={section === 'discover' ? 'selected' : ''} onClick={() => setSection('discover')} aria-label="Khám phá"><UsersRound size={21} /> <span>Khám phá</span></button>
          <button type="button" className={section === 'connections' ? 'selected' : ''} onClick={() => setSection('connections')} aria-label="Kết nối"><UserPlus size={21} /> <span>Kết nối</span></button>
          <button type="button" className={section === 'profile' ? 'selected' : ''} onClick={() => setSection('profile')} aria-label="Hồ sơ gặp gỡ"><UserRound size={21} /> <span>Hồ sơ</span></button>
        </nav>
        <div className="social-top-actions"><Link to="/chat" title="Tin nhắn"><MessageCircle size={21} /><span className="sr-only">Tin nhắn</span></Link><button type="button" onClick={() => { logout(); navigate('/login'); }} title="Đăng xuất"><LogOut size={20} /><span className="sr-only">Đăng xuất</span></button><button type="button" className="social-top-avatar" onClick={() => setSection('profile')} title="Hồ sơ của tôi"><img src={user?.avatarUrl} alt="" /></button></div>
      </header>
      <div className="social-layout">
        <aside className="social-left" aria-label="Menu cộng đồng">
          <button className="social-me-link" type="button" onClick={() => setSection('profile')}><img src={user?.avatarUrl} alt="" /><span>{user?.fullName || user?.username}<small>Hồ sơ gặp gỡ của tôi</small></span></button>
          <button type="button" className={section === 'feed' ? 'active' : ''} onClick={() => setSection('feed')}><Home size={21} /> Bảng tin</button>
          <button type="button" className={section === 'discover' ? 'active' : ''} onClick={() => setSection('discover')}><Heart size={21} /> Khám phá người mới</button>
          <button type="button" className={section === 'connections' ? 'active' : ''} onClick={() => setSection('connections')}><UserPlus size={21} /> Lời mời và bạn bè {incoming.length > 0 && <small>({incoming.length})</small>}</button>
          <button type="button" className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}><Settings2 size={21} /> Chỉnh sửa hồ sơ</button>
          <Link to="/chat"><MessageCircle size={21} /> Messenger</Link>
          <div className="social-left-note"><strong>Gặp gỡ theo cách của bạn</strong><p>Chia sẻ sở thích, gửi lời mời kết bạn. Chỉ nhắn tin riêng khi cả hai đồng ý.</p></div>
        </aside>
        <main className="social-main">
          {error && <p className="community-error" role="alert">{error}</p>}
          {section === 'feed' && <>
            <div className="social-section-heading"><div><span>CỘNG ĐỒNG SMART MESSENGER</span><h1>Bảng tin gặp gỡ</h1><p>Chia sẻ câu chuyện của bạn và làm quen qua những điều chung.</p></div></div>
            <CommunityFeed key={feedVersion} user={user} onError={setError} />
          </>}
          {section === 'discover' && <section className="community-discovery" id="community-people">
            <div className="social-section-heading"><div><span>KHÁM PHÁ</span><h1>Người bạn có thể gặp</h1><p>Chỉ hiển thị những người đã chọn công khai hồ sơ.</p></div></div>
            <label className="community-search"><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc sở thích..." aria-label="Tìm thành viên" /></label>
            {loading ? <p className="community-placeholder">Đang tải hồ sơ...</p> : matching.length === 0
              ? <div className="social-empty"><Heart size={28} /><h2>Chưa có hồ sơ phù hợp</h2><p>Thử từ khóa khác hoặc tạo hồ sơ của bạn để bắt đầu.</p><button type="button" className="community-action" onClick={() => setSection('profile')}>Tạo hồ sơ</button></div>
              : <div className="community-grid">{matching.map(person => <article className="community-card" key={person.id}>
                <div className="community-card-cover"><span>♡</span></div><img src={person.avatarUrl} alt="" className="community-avatar" />
                <div className="community-card-body"><h3>{person.fullName}</h3><p>@{person.username}</p><p className="meeting-card-bio">{person.bio}</p>
                  <div className="meeting-tags">{person.interests?.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 5).map(tag => <span key={tag}>{tag}</span>)}</div>
                  {person.openingQuestion && <p className="meeting-question">Hỏi mình: {person.openingQuestion}</p>}
                  <div className="community-card-actions">{controls(person.id)}
                    {relationOf.get(person.id)?.status !== 'BLOCKED' && <button type="button" className="community-block" disabled={busyId === person.id} title="Chặn thành viên" aria-label={`Chặn ${person.fullName}`} onClick={() => action(person.id, 'post', '/block')}><ShieldBan size={16} /></button>}
                  </div>
                </div>
              </article>)}</div>}
            {hasMore && <button type="button" className="community-load" onClick={loadMore}>Xem thêm thành viên</button>}
          </section>}
          {section === 'profile' && <div className="social-profile-page"><div className="social-section-heading"><div><span>HỒ SƠ GẶP GỠ</span><h1>Giới thiệu về bạn</h1><p>Chủ động chọn điều muốn chia sẻ và khi nào người khác có thể tìm thấy bạn.</p></div></div><MeetingProfileEditor user={user} onSaved={() => setDiscoverVersion(previous => previous + 1)} /></div>}
          {section === 'connections' && <section className="social-connections-page"><div className="social-section-heading"><div><span>KẾT NỐI</span><h1>Lời mời và bạn bè</h1><p>Chỉ bạn bè đã đồng ý mới có thể nhắn tin riêng.</p></div></div>
            <div className="community-panel"><h2>Lời mời đến · {incoming.length}</h2>{incoming.length ? incoming.map(item => <div className="community-request" key={item.userId}><img src={item.avatarUrl} alt="" /><div><strong>{item.fullName}</strong><p>@{item.username}</p><button disabled={busyId === item.userId} onClick={() => action(item.userId, 'put', '/accept')}><Check size={14} /> Đồng ý</button><button disabled={busyId === item.userId} onClick={() => action(item.userId, 'delete', '/reject')}><X size={14} /> Từ chối</button></div></div>) : <p className="community-muted">Chưa có lời mời mới.</p>}</div>
            <div className="community-panel"><h2>Đã gửi lời mời</h2>{relations.filter(item => item.status === 'PENDING' && item.initiatedByMe).map(item => <div className="community-friend" key={item.userId}><img src={item.avatarUrl} alt="" /><span>{item.fullName}</span><button type="button" className="community-quiet" disabled={busyId === item.userId} onClick={() => action(item.userId, 'delete', '')}>Hủy lời mời</button></div>)}{!relations.some(item => item.status === 'PENDING' && item.initiatedByMe) && <p className="community-muted">Chưa gửi lời mời nào.</p>}</div>
            <div className="community-panel"><h2>Bạn bè · {friends.length}</h2>{friends.length ? friends.map(item => <button type="button" className="community-friend" key={item.userId} disabled={busyId === item.userId} onClick={() => openChat(item.userId)}><img src={item.avatarUrl} alt="" /><span>{item.fullName}</span><MessageCircle size={17} /></button>) : <p className="community-muted">Khám phá thành viên để kết bạn.</p>}</div>
          </section>}
        </main>
        <aside className="social-right" aria-label="Kết nối của bạn">
          <section className="community-panel social-side-card"><div className="community-panel-label">LỜI MỜI KẾT BẠN · {incoming.length}</div>
            {incoming.length ? incoming.map(item => <div className="community-request" key={item.userId}><img src={item.avatarUrl} alt="" /><div><strong>{item.fullName}</strong><p>@{item.username}</p><button disabled={busyId === item.userId} onClick={() => action(item.userId, 'put', '/accept')}><Check size={14} /> Đồng ý</button><button disabled={busyId === item.userId} onClick={() => action(item.userId, 'delete', '/reject')}><X size={14} /> Từ chối</button></div></div>) : <p className="community-muted">Chưa có lời mời mới.</p>}
          </section>
          <section className="community-panel social-side-card"><div className="community-panel-label">BẠN BÈ · {friends.length}</div>
            {friends.length ? friends.slice(0, 8).map(item => <button type="button" className="community-friend" key={item.userId} disabled={busyId === item.userId} onClick={() => openChat(item.userId)}><img src={item.avatarUrl} alt="" /><span>{item.fullName}</span><MessageCircle size={17} /></button>) : <p className="community-muted">Kết bạn để bắt đầu trò chuyện.</p>}
          </section>
          <section className="social-guidance"><strong>Gặp gỡ an toàn</strong><p>Tôn trọng sự đồng ý của người khác. Bạn có thể chặn tài khoản và ẩn hồ sơ bất cứ lúc nào.</p></section>
        </aside>
      </div>
    </div>
  );
}
