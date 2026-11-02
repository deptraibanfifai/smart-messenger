package com.smartmessenger.service;

import com.smartmessenger.dto.CommunityCommentDto;
import com.smartmessenger.dto.CommunityPostDto;
import com.smartmessenger.model.*;
import com.smartmessenger.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {
    private final CommunityPostRepository posts;
    private final CommunityCommentRepository comments;
    private final CommunityLikeRepository likes;
    private final FriendshipRepository friendships;
    private final UserRepository users;

    private User member(Long id) {
        return users.findById(id).filter(user -> user.getRole() == Role.ROLE_USER
                && user.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản không được tham gia cộng đồng"));
    }

    private CommunityPost post(Long id) {
        return posts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));
    }

    private boolean blocked(Long a, Long b) {
        return !a.equals(b) && friendships.existsByUserLow_IdAndUserHigh_IdAndStatus(
                Math.min(a, b), Math.max(a, b), FriendshipStatus.BLOCKED);
    }

    private void canInteract(Long viewer, CommunityPost post) {
        if (blocked(viewer, post.getAuthor().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể tương tác với thành viên này");
    }

    private CommunityPostDto toPost(CommunityPost post, Long viewer) {
        User author = post.getAuthor();
        return new CommunityPostDto(post.getId(), author.getId(), author.getFullName(), author.getUsername(),
                author.getAvatarUrl(), post.getContent(), post.getCreatedAt(),
                likes.countByPost_Id(post.getId()), comments.countByPost_Id(post.getId()),
                likes.existsByPost_IdAndUser_Id(post.getId(), viewer));
    }

    @Transactional(readOnly = true)
    public List<CommunityPostDto> feed(Long viewer, int page) {
        member(viewer);
        return posts.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(Math.max(0, page), 10)).stream()
                .filter(post -> post.getAuthor().getStatus() == UserStatus.ACTIVE
                        && !blocked(viewer, post.getAuthor().getId()))
                .map(post -> toPost(post, viewer)).toList();
    }

    @Transactional
    public CommunityPostDto create(Long viewer, String text) {
        User author = member(viewer);
        String content = validate(text, 2000);
        return toPost(posts.saveAndFlush(CommunityPost.builder().author(author).content(content).build()), viewer);
    }

    @Transactional
    public void delete(Long viewer, Long id) {
        CommunityPost post = post(id);
        if (!post.getAuthor().getId().equals(viewer))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ tác giả được xóa bài viết");
        likes.deleteByPost_Id(id);
        comments.deleteByPost_Id(id);
        posts.delete(post);
    }

    @Transactional
    public CommunityPostDto like(Long viewer, Long id) {
        User member = member(viewer);
        CommunityPost post = post(id);
        canInteract(viewer, post);
        if (!likes.existsByPost_IdAndUser_Id(id, viewer)) {
            try {
                likes.saveAndFlush(CommunityLike.builder().post(post).user(member).build());
            } catch (DataIntegrityViolationException collision) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Lượt thích đã được cập nhật");
            }
        }
        return toPost(post, viewer);
    }

    @Transactional
    public CommunityPostDto unlike(Long viewer, Long id) {
        member(viewer);
        CommunityPost post = post(id);
        canInteract(viewer, post);
        likes.findByPost_IdAndUser_Id(id, viewer).ifPresent(likes::delete);
        return toPost(post, viewer);
    }

    @Transactional(readOnly = true)
    public List<CommunityCommentDto> listComments(Long viewer, Long postId, int page) {
        member(viewer);
        CommunityPost post = post(postId);
        canInteract(viewer, post);
        return comments.findByPost_IdOrderByCreatedAtDescIdDesc(postId, PageRequest.of(Math.max(0, page), 20))
                .stream().filter(comment -> comment.getAuthor().getStatus() == UserStatus.ACTIVE
                        && !blocked(viewer, comment.getAuthor().getId()))
                .map(this::toComment).toList();
    }

    @Transactional
    public CommunityCommentDto comment(Long viewer, Long postId, String text) {
        User member = member(viewer);
        CommunityPost post = post(postId);
        canInteract(viewer, post);
        return toComment(comments.saveAndFlush(CommunityComment.builder()
                .post(post).author(member).content(validate(text, 500)).build()));
    }

    @Transactional
    public void deleteComment(Long viewer, Long postId, Long commentId) {
        member(viewer);
        CommunityComment comment = comments.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bình luận"));
        if (!comment.getPost().getId().equals(postId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bình luận không thuộc bài viết");
        if (!comment.getAuthor().getId().equals(viewer)
                && !comment.getPost().getAuthor().getId().equals(viewer))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền xóa bình luận");
        comments.delete(comment);
    }

    private CommunityCommentDto toComment(CommunityComment comment) {
        User author = comment.getAuthor();
        return new CommunityCommentDto(comment.getId(), author.getId(), author.getFullName(),
                author.getAvatarUrl(), comment.getContent(), comment.getCreatedAt());
    }

    private String validate(String content, int max) {
        if (content == null || content.isBlank() || content.length() > max)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung phải có 1–" + max + " ký tự");
        return content.trim();
    }
}
