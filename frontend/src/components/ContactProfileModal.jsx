import React from 'react';
import { UserRound } from 'lucide-react';
import ModalDialog from './ModalDialog';

export default function ContactProfileModal({ member, online, onClose }) {
  return <ModalDialog title="Thông tin người dùng" onClose={onClose}>
    <div className="contact-profile">
      {member?.avatarUrl ? <img src={member.avatarUrl} alt="Ảnh đại diện" /> : <UserRound size={64} />}
      <h3>{member?.fullName || 'Người dùng'}</h3><p>@{member?.username}</p>
      <span className={online ? 'contact-online' : 'profile-hint'}>{online ? 'Đang hoạt động' : 'Không trực tuyến'}</span>
      {member?.statusText && Date.parse(member.statusExpiresAt) > Date.now() && <blockquote>{member.statusText}</blockquote>}
      <p className="profile-hint">Bạn có thể chỉnh hồ sơ của mình bằng nút ảnh đại diện ở góc dưới bên trái.</p>
    </div>
  </ModalDialog>;
}
