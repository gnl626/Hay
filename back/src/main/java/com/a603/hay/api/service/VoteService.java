package com.a603.hay.api.service;

import com.a603.hay.api.dto.CommentDto.CreateCommentRequest;
import com.a603.hay.api.dto.CommentDto.VoteDetailComment;
import com.a603.hay.api.dto.VoteDto.CreateVoteRequest;
import com.a603.hay.api.dto.VoteDto.VoteDetailResponse;
import com.a603.hay.api.dto.VoteDto.VoteListResponse;
import com.a603.hay.api.dto.VoteDto.VoteListResponseVote;
import com.a603.hay.api.dto.VoteDto.VoteOneRequest;
import com.a603.hay.api.dto.VoteDto.VoteResultResponse;
import com.a603.hay.api.dto.VoteItemDto.VoteDetailItem;
import com.a603.hay.api.dto.VoteItemDto.VoteResultItem;
import com.a603.hay.db.entity.Category;
import com.a603.hay.db.entity.Comment;
import com.a603.hay.db.entity.Image;
import com.a603.hay.db.entity.Likes;
import com.a603.hay.db.entity.Location;
import com.a603.hay.db.entity.User;
import com.a603.hay.db.entity.Vote;
import com.a603.hay.db.entity.VoteItem;
import com.a603.hay.db.entity.VoteLog;
import com.a603.hay.db.repository.CategoryRepository;
import com.a603.hay.db.repository.CommentRepository;
import com.a603.hay.db.repository.ImageRepository;
import com.a603.hay.db.repository.LikesRepository;
import com.a603.hay.db.repository.LocationRepository;
import com.a603.hay.db.repository.UserRepository;
import com.a603.hay.db.repository.VoteItemRepository;
import com.a603.hay.db.repository.VoteLogRepository;
import com.a603.hay.db.repository.VoteRepository;
import com.a603.hay.db.specification.VoteSpecification;
import com.a603.hay.exception.CustomException;
import com.a603.hay.exception.ErrorCode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoteService {

  @Autowired
  UserRepository userRepository;

  @Autowired
  VoteRepository voteRepository;

  @Autowired
  VoteItemRepository voteItemRepository;

  @Autowired
  VoteLogRepository voteLogRepository;

  @Autowired
  CommentRepository commentRepository;

  @Autowired
  LikesRepository likesRepository;

  @Autowired
  CategoryRepository categoryRepository;

  @Autowired
  LocationRepository locationRepository;

  @Autowired
  ImageRepository imageRepository;

  @Transactional(rollbackFor = Exception.class)
  public void createVote(CreateVoteRequest createVoteRequest, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Vote newVote = new Vote();
    Category category = categoryRepository.findById(createVoteRequest.getCategoryId())
        .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
    newVote.setCategory(category);
    newVote.setUser(user);
    newVote.setTitle(createVoteRequest.getTitle());
    newVote.setBody(createVoteRequest.getBody());
    LocalDateTime nowTime = LocalDateTime.now();
    newVote.setStartDate(LocalDateTime.of(nowTime.getYear(), nowTime.getMonth(), nowTime.getDayOfMonth(),
        nowTime.getHour(), nowTime.getMinute(), nowTime.getSecond()));
    newVote.setEndDate(createVoteRequest.getEndDate());
    newVote.setCommentable(createVoteRequest.isCommentable());
    newVote.setEnded(false);
    Location location = locationRepository.findById(user.getCurrentLocation())
        .orElseThrow(() -> new CustomException(ErrorCode.LOCATION_NOT_FOUND));
    newVote.setLat(location.getLat());
    newVote.setLng(location.getLng());
    newVote.setVoteCount(0);
    newVote.setCreatedAt(LocalDateTime.now());
    newVote.setUpdatedAt(LocalDateTime.now());
    Vote vote = voteRepository.save(newVote);
    createVoteRequest.getVoteItemContents().forEach(content -> {
      VoteItem voteItem = new VoteItem();
      voteItem.setContent(content);
      voteItem.setVoteCount(0);
      voteItem.setCreatedAt(LocalDateTime.now());
      voteItem.setUpdatedAt(LocalDateTime.now());
      voteItem.setVote(vote);
      voteItemRepository.save(voteItem);
    });
    createVoteRequest.getImageUrls().forEach(url -> {
      Image image = new Image();
      image.setUrl(url);
      image.setCreatedAt(LocalDateTime.now());
      image.setUpdatedAt(LocalDateTime.now());
      image.setVote(vote);
      imageRepository.save(image);
    });
  }

  @Transactional(rollbackFor = Exception.class)
  public void endVote(long voteId, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Vote vote = voteRepository.findById(voteId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOTE_NOT_FOUND));

    // 투표 작성자인지 검사
    if (vote.getUser().getId() != user.getId()) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    vote.setEnded(true);
    voteRepository.save(vote);
  }

  @Transactional(readOnly = true)
  public VoteListResponse getVoteList(String search, Long categoryId, boolean myVote,
      boolean participated, boolean done, String order, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    if (myVote) {
      Specification<Vote> spec = Specification.where(VoteSpecification.equalUser(user));
      List<VoteListResponseVote> voteList = new ArrayList<>();
      voteRepository.findAll(spec).forEach(vote -> {
        voteList.add(
            VoteListResponseVote.builder().id(vote.getId()).title(vote.getTitle())
                .startDate(vote.getStartDate())
                .endDate(vote.getEndDate()).isEnded(vote.isEnded()).voteCount(vote.getVoteCount())
                .build());
      });
      return VoteListResponse.builder().votes(voteList).build();
    }

    if (participated) {
      List<VoteLog> voteLogs = voteLogRepository.findAllByUser(user);
      List<VoteListResponseVote> voteList = new ArrayList<>();
      voteLogs.forEach(voteLog -> {
        Vote vote = voteLog.getVote();
        voteList.add(
            VoteListResponseVote.builder().id(vote.getId()).title(vote.getTitle())
                .startDate(vote.getStartDate())
                .endDate(vote.getEndDate()).isEnded(vote.isEnded()).voteCount(vote.getVoteCount())
                .build());
      });
      return VoteListResponse.builder().votes(voteList).build();
    }

    if (order == null) {
      throw new CustomException(ErrorCode.BAD_REQUEST);
    }
    String properties = "";
    switch (order) {
      case "최신":
        properties = "startDate";
        break;
      case "참여자":
        properties = "voteCount";
        break;
      default:
        throw new CustomException(ErrorCode.BAD_REQUEST);
    }
    Sort sort = Sort.by(properties).descending();

    Specification<Vote> spec = null;
    if (!done) {
      spec = Specification.where(VoteSpecification.equalEnded(false));
    }
    if (categoryId != null) {
      Category category = categoryRepository.findById(categoryId)
          .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
      spec = (spec == null ? Specification.where(VoteSpecification.equalCategory(category))
          : spec.and(VoteSpecification.equalCategory(category)));
    }
    if (search != null) {
      spec = (spec == null ? Specification.where(VoteSpecification.likeTitle(search))
          : spec.and(VoteSpecification.likeTitle(search)));
    }
    Location location = locationRepository.findById(user.getCurrentLocation())
        .orElseThrow(() -> new CustomException(ErrorCode.LOCATION_NOT_FOUND));
    spec = (spec == null ? Specification.where(
        VoteSpecification.withinRange(location.getLat(), location.getLng(), user.getCurrentRange()))
        : spec.and(VoteSpecification.withinRange(location.getLat(), location.getLng(),
            user.getCurrentRange())));
    List<VoteListResponseVote> voteList = new ArrayList<>();
    List<Vote> votes = voteRepository.findAll(spec, sort);
    int maxCount = -1;
    VoteListResponseVote bestVote = null;
    for (int i = 0; i < votes.size(); i++) {
      Vote vote = votes.get(i);
      if (vote.getVoteCount() > maxCount) {
        maxCount = vote.getVoteCount();
        bestVote = VoteListResponseVote.builder().id(vote.getId()).title(vote.getTitle())
            .startDate(vote.getStartDate())
            .endDate(vote.getEndDate()).isEnded(vote.isEnded()).voteCount(vote.getVoteCount())
            .build();
      }
      voteList.add(
          VoteListResponseVote.builder().id(vote.getId()).title(vote.getTitle())
              .startDate(vote.getStartDate())
              .endDate(vote.getEndDate()).isEnded(vote.isEnded()).voteCount(vote.getVoteCount())
              .build());
    }
    return VoteListResponse.builder().bestVote(bestVote).votes(voteList).build();
  }

  // 두 좌표 사이의 거리를 구하는 함수
  // dsitance(첫번쨰 좌표의 위도, 첫번째 좌표의 경도, 두번째 좌표의 위도, 두번째 좌표의 경도)
  private static double distance(double lat1, double lon1, double lat2, double lon2) {
    double theta = lon1 - lon2;
    double dist =
        Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) + Math.cos(deg2rad(lat1)) * Math.cos(
            deg2rad(lat2)) * Math.cos(deg2rad(theta));
    dist = Math.acos(dist);
    dist = rad2deg(dist);
    dist = dist * 60 * 1.1515 * 1609.344;

    return dist; //단위 meter
  }

  //  10진수를 radian(라디안)으로 변환
  private static double deg2rad(double deg) {
    return (deg * Math.PI / 180.0);
  }

  //  radian(라디안)을 10진수로 변환
  private static double rad2deg(double rad) {
    return (rad * 180 / Math.PI);
  }

  @Transactional(rollbackFor = Exception.class)
  public void voteOne(long voteId, VoteOneRequest voteOneRequest, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    VoteItem voteItem = voteItemRepository.findById(voteOneRequest.getVoteItemId())
        .orElseThrow(() -> new CustomException(ErrorCode.VOTEITEM_NOT_FOUND));
    Vote vote = voteItem.getVote();
    if (vote.getId() != voteId) {
      throw new CustomException(ErrorCode.VOTEITEM_NOT_FOUND);
    }
    if (vote.isEnded() || (voteLogRepository.countByUserAndVote(user, vote) > 0)) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    VoteLog voteLog = new VoteLog();
    voteLog.setCreatedAt(LocalDateTime.now());
    voteLog.setUpdatedAt(LocalDateTime.now());
    voteLog.setUser(user);
    voteLog.setVote(vote);
    voteLog.setVoteItem(voteItem);
    voteLogRepository.save(voteLog);

    voteItem.setVoteCount(voteLogRepository.countByVoteItem(voteItem));
    voteItemRepository.save(voteItem);

    vote.setVoteCount(voteLogRepository.countByVote(vote));
    voteRepository.save(vote);
  }

  @Transactional(rollbackFor = Exception.class)
  public void createComment(long voteId, CreateCommentRequest createCommentRequest,
      String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Comment comment = new Comment();
    comment.setContent(createCommentRequest.getContent());
    comment.setLikesCount(0);
    comment.setDeleted(false);
    comment.setCreatedAt(LocalDateTime.now());
    comment.setUpdatedAt(LocalDateTime.now());
    comment.setUser(user);
    comment.setVote(voteRepository.findById(voteId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOTE_NOT_FOUND)));

    // 부모 댓글이 있을 경우
    if (createCommentRequest.getCommentId() != null) {
      Comment originalComment = commentRepository.findById(createCommentRequest.getCommentId())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
      if (originalComment.getVote().getId() != voteId || originalComment.getComment() != null) {
        throw new CustomException(ErrorCode.FORBIDDEN);
      }
      comment.setComment(originalComment);
    }

    commentRepository.save(comment);
  }

  @Transactional(rollbackFor = Exception.class)
  public void deleteComment(long voteId, long commentId, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Comment comment = commentRepository.findById(commentId)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
    if (comment.getVote().getId() != voteId || comment.getUser().getId() != user.getId()) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    comment.setUpdatedAt(LocalDateTime.now());
    comment.setDeleted(true);
    commentRepository.save(comment);
  }

  @Transactional(rollbackFor = Exception.class)
  public void clickCommentLikes(long voteId, long commentId, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Comment comment = commentRepository.findById(commentId)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
    if (comment.getVote().getId() != voteId) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    Optional<Likes> oLikes = likesRepository.findByUserAndComment(user, comment);
    if (oLikes.isPresent()) {
      likesRepository.delete(oLikes.get());
      comment.setLikesCount(comment.getLikesCount() - 1);
      commentRepository.save(comment);
    } else {
      Likes likes = new Likes();
      likes.setCreatedAt(LocalDateTime.now());
      likes.setUpdatedAt(LocalDateTime.now());
      likes.setUser(user);
      likes.setComment(comment);
      likesRepository.save(likes);
      comment.setLikesCount(comment.getLikesCount() + 1);
      commentRepository.save(comment);
    }

  }

  @Transactional(readOnly = true)
  public VoteDetailResponse voteDetail(long voteId, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    VoteDetailResponse voteDetailResponse = new VoteDetailResponse();
    Location location = locationRepository.findById(user.getCurrentLocation())
        .orElseThrow(() -> new CustomException(ErrorCode.LOCATION_NOT_FOUND));

    Vote vote = voteRepository.findById(voteId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOTE_NOT_FOUND));
    voteDetailResponse.setTitle(vote.getTitle());
    voteDetailResponse.setBody(vote.getBody());

    double d = distance(location.getLat(), location.getLng(), vote.getLat(), vote.getLng());
    voteDetailResponse.setDistanceLevel(d < 500 ? 0 : d < 1000 ? 1 : 2);
    voteDetailResponse.setWriterNickname(vote.getUser().getNickname());
    voteDetailResponse.setStartDate(vote.getStartDate());
    voteDetailResponse.setEndDate(vote.getEndDate());
    voteDetailResponse.setEnded(vote.isEnded());
    voteDetailResponse.setVoteCount(vote.getVoteCount());

    List<String> imageUrls = new ArrayList<>();
    vote.getImages().forEach(image -> {
      imageUrls.add(image.getUrl());
    });
    voteDetailResponse.setImageUrls(imageUrls);

    // 투표 참여 여부
    boolean isVoted = (voteLogRepository.countByUserAndVote(user, vote) > 0) ? true : false;

    voteDetailResponse.setVoted(isVoted);

    List<VoteDetailItem> voteDetailItems = new ArrayList<>();
    vote.getVoteItems().forEach(voteItem -> {
      voteDetailItems.add(VoteDetailItem.builder()
          .id(voteItem.getId())
          .content(voteItem.getContent())
          .voteCount(isVoted ? voteItem.getVoteCount() : 0)
          .isVoted(isVoted ? (voteLogRepository.countByUserAndVoteItem(user, voteItem) > 0 ? true
              : false) : false)
          .build());
    });
    voteDetailResponse.setVoteItems(voteDetailItems);

    List<VoteDetailComment> voteDetailComments = new ArrayList<>();
    if (isVoted) {
      List<Comment> comments = commentRepository.findAllByVote(vote);
      comments.forEach(comment -> {
        if (comment.getComment() != null) {
          return;
        }
        List<VoteDetailComment> voteDetailReplies = new ArrayList<>();
        comment.getReplies().forEach(reply -> {
          voteDetailReplies.add(VoteDetailComment.builder()
              .id(reply.getId())
              .content(reply.getContent())
              .likesCount(reply.getLikesCount())
              .isDeleted(reply.isDeleted())
              .createdAt(reply.getCreatedAt())
              .updatedAt(reply.getUpdatedAt())
              .writerNickname(reply.getUser().getNickname())
              .writtenByMe(reply.getUser().getId() == user.getId() ? true : false)
              .likedByMe(
                  likesRepository.findByUserAndComment(user, reply).isPresent() ? true : false)
              .build());
        });
        voteDetailComments.add(VoteDetailComment.builder()
            .id(comment.getId())
            .content(comment.getContent())
            .likesCount(comment.getLikesCount())
            .isDeleted(comment.isDeleted())
            .createdAt(comment.getCreatedAt())
            .updatedAt(comment.getUpdatedAt())
            .writerNickname(comment.getUser().getNickname())
            .writtenByMe(comment.getUser().getId() == user.getId() ? true : false)
            .likedByMe(
                likesRepository.findByUserAndComment(user, comment).isPresent() ? true : false)
            .replies(voteDetailReplies)
            .build());
      });
    }
    voteDetailResponse.setComments(voteDetailComments);
    if(voteDetailComments.size() == 0) {
      voteDetailResponse.setBestComment(null);
    } else {
      Comment bestComment = commentRepository.findFirstByVoteAndIsDeletedOrderByLikesCountDesc(vote,
              false)
          .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
      voteDetailResponse.setBestComment(VoteDetailComment.builder()
          .id(bestComment.getId())
          .content(bestComment.getContent())
          .likesCount(bestComment.getLikesCount())
          .isDeleted(bestComment.isDeleted())
          .createdAt(bestComment.getCreatedAt())
          .updatedAt(bestComment.getUpdatedAt())
          .writerNickname(bestComment.getUser().getNickname())
          .writtenByMe(bestComment.getUser().getId() == user.getId() ? true : false)
          .likedByMe(
              likesRepository.findByUserAndComment(user, bestComment).isPresent() ? true : false)
          .build());
    }
    return voteDetailResponse;
  }

  @Transactional(readOnly = true)
  public VoteResultResponse voteResult(long voteId, String userEmail) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_EXIST));

    Vote vote = voteRepository.findById(voteId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOTE_NOT_FOUND));
    if (voteId != vote.getId() || voteLogRepository.countByUserAndVote(user, vote) == 0) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    List<VoteResultItem> voteResultItems = new ArrayList<>();
    vote.getVoteItems().toString();
    vote.getVoteItems().forEach(voteItem -> {
      VoteResultItem voteResultItem = new VoteResultItem();
      voteResultItem.setId(voteItem.getId());
      voteResultItem.setContent(voteItem.getContent());
      voteResultItem.setVoteCount(voteItem.getVoteCount());

      List<Integer> statisticsGender = Arrays.asList(0, 0, 0);
      List<Integer> statisticsAgeGroup = Arrays.asList(0, 0, 0, 0);
      List<VoteLog> voteLogs = voteLogRepository.findAllByVoteItem(voteItem);
      voteLogs.forEach(voteLog -> {
        String gender = voteLog.getUser().getGender();
        switch (gender) {
          case "male":
            statisticsGender.set(0, statisticsGender.get(0) + 1);
            break;
          case "female":
            statisticsGender.set(1, statisticsGender.get(1) + 1);
            break;
          default:
            statisticsGender.set(2, statisticsGender.get(2) + 1);
        }

        int age = (LocalDate.now().getYear() - voteLog.getUser().getBirthYear()) / 10;
        if (age < 3) {
          statisticsAgeGroup.set(0, statisticsAgeGroup.get(0) + 1);
        } else if (age == 3) {
          statisticsAgeGroup.set(1, statisticsAgeGroup.get(1) + 1);
        } else if (age == 4) {
          statisticsAgeGroup.set(2, statisticsAgeGroup.get(2) + 1);
        } else {
          statisticsAgeGroup.set(3, statisticsAgeGroup.get(3) + 1);
        }
      });
      voteResultItem.setStatisticsGender(statisticsGender);
      voteResultItem.setStatisticsAgeGroup(statisticsAgeGroup);

      voteResultItems.add(voteResultItem);
    });

    return new VoteResultResponse().builder().voteResultItems(voteResultItems).build();

  }
}
