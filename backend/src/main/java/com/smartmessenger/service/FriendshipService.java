package com.smartmessenger.service;

import com.smartmessenger.dto.FriendshipDto;
import com.smartmessenger.model.*;
import com.smartmessenger.repository.FriendshipRepository;
import com.smartmessenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FriendshipService {
    private final FriendshipRepository relationships;
    private final UserRepository users;

    private Optional<Friendship> between(Long a, Long b) {
        return relationships.findByUserLow_IdAndUserHigh_Id(Math.min(a, b), Math.max(a, b));
    }

    private Friendship existing(Long a, Long b) {
        return between(a, b).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có lời mời kết bạn"));
    }

    private User available(Long id) {
        return users.findById(id).filter(user -> user.getRole() == Role.ROLE_USER
                && user.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên"));
    }

    private void different(Long a, Long b) {
        if (a.equals(b)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tự kết bạn");
    }

    @Transactional(readOnly = true)
    public List<FriendshipDto> list(Long actor) {
        return relationships.findByUserLow_IdOrUserHigh_Id(actor, actor).stream()
                .filter(item -> item.getStatus() != FriendshipStatus.BLOCKED || item.getInitiatedBy().getId().equals(actor))
                .map(item -> FriendshipDto.from(item, actor)).toList();
    }

    @Transactional(readOnly = true)
    public FriendshipDto status(Long actor, Long other) {
        different(actor, other);
        return between(actor, other).map(relation -> {
            if (relation.getStatus() == FriendshipStatus.BLOCKED
                    && !relation.getInitiatedBy().getId().equals(actor)) return null;
            return FriendshipDto.from(relation, actor);
        }).orElse(null);
    }

    @Transactional
    public FriendshipDto request(Long actor, Long other) {
        different(actor, other);
        User me = available(actor);
        User target = available(other);
        Optional<Friendship> current = between(actor, other);
        if (current.isPresent()) {
            Friendship relation = current.get();
            if (relation.getStatus() == FriendshipStatus.PENDING && relation.getInitiatedBy().getId().equals(actor))
                return FriendshipDto.from(relation, actor);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã có quan hệ hoặc lời mời giữa hai tài khoản");
        }
        try {
            Friendship relation = relationships.saveAndFlush(Friendship.builder()
                    .userLow(actor < other ? me : target)
                    .userHigh(actor < other ? target : me)
                    .initiatedBy(me).status(FriendshipStatus.PENDING).build());
            return FriendshipDto.from(relation, actor);
        } catch (DataIntegrityViolationException collision) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lời mời đã được tạo. Hãy tải lại trang.");
        }
    }

    @Transactional
    public FriendshipDto accept(Long actor, Long other) {
        Friendship relation = existing(actor, other);
        if (relation.getStatus() != FriendshipStatus.PENDING || relation.getInitiatedBy().getId().equals(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ người nhận lời mời mới có thể chấp nhận");
        available(actor);
        available(other);
        relation.setStatus(FriendshipStatus.ACCEPTED);
        return FriendshipDto.from(relationships.save(relation), actor);
    }

    @Transactional
    public void remove(Long actor, Long other) {
        Friendship relation = existing(actor, other);
        if (relation.getStatus() == FriendshipStatus.BLOCKED)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hãy bỏ chặn trước");
        if (relation.getStatus() == FriendshipStatus.PENDING
                && !relation.getInitiatedBy().getId().equals(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hãy từ chối lời mời");
        relationships.delete(relation);
    }

    @Transactional
    public void reject(Long actor, Long other) {
        Friendship relation = existing(actor, other);
        if (relation.getStatus() != FriendshipStatus.PENDING || relation.getInitiatedBy().getId().equals(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ người nhận lời mời mới có thể từ chối");
        relationships.delete(relation);
    }

    @Transactional
    public FriendshipDto block(Long actor, Long other) {
        different(actor, other);
        User me = available(actor);
        User target = available(other);
        Friendship relation = between(actor, other).orElseGet(() -> Friendship.builder()
                .userLow(actor < other ? me : target)
                .userHigh(actor < other ? target : me).build());
        if (relation.getStatus() == FriendshipStatus.BLOCKED && !relation.getInitiatedBy().getId().equals(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể thay đổi trạng thái này");
        relation.setStatus(FriendshipStatus.BLOCKED);
        relation.setInitiatedBy(me);
        try {
            return FriendshipDto.from(relationships.saveAndFlush(relation), actor);
        } catch (DataIntegrityViolationException collision) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Quan hệ đã được thay đổi. Hãy tải lại trang.");
        }
    }

    @Transactional
    public void unblock(Long actor, Long other) {
        Friendship relation = existing(actor, other);
        if (relation.getStatus() != FriendshipStatus.BLOCKED || !relation.getInitiatedBy().getId().equals(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa chặn tài khoản này");
        relationships.delete(relation);
    }

    public void requireFriends(Long a, Long b) {
        if (a == null || b == null || a.equals(b)
                || !relationships.existsByUserLow_IdAndUserHigh_IdAndStatus(
                        Math.min(a, b), Math.max(a, b), FriendshipStatus.ACCEPTED))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hai người cần kết bạn trước khi nhắn tin");
    }
}
