// 카테고리 (이전 페이지) 이동 바
// 제목
// 작성자 닉네임, 거리 안내

// 본문

// 투표 - 유저가 참여하지 않았고, 진행중일 경우
// 투표 - 유저가 참여하였고, 진행중일 경우
// 투표 - 유저가 참여하지 않았고, 종료된 경우
// 투표 - 유저가 참여하였고, 종료된 경우

// 댓글 수, 공유하기
// 댓글 리스트

import HowToVoteIcon from "@mui/icons-material/HowToVote";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import CheckIcon from "@mui/icons-material/Check";
import React, { useEffect, useState } from "react";
import "./VoteDetail.css";
import { useLocation } from "react-router-dom";
import axios from "axios";
import PieGraph from './PieGraph';
import api from "../../api/api";
import { Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import HeaderTextAndNavigate from "../../components/HeaderTextAndNavigate";
import KakaoShareButton from "./KakaoShareButton";

function VoteDetail() {
  let { state } = useLocation();
  const [details, setDetails] = useState();
  const [selectedItemId, setSelectedItemId] = useState();
  const [commentText, setCommentText] = useState("");
  const [targetComment, setTargetComment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItemId, setModalItemId] = useState(0);
  const parts = window.location.pathname.split('/');
  const voteId = parts.pop() || parts.pop();
  useEffect(() => {
    //공유하기를 통해 url 이동 시 state 채워줌
    // if (!state) { 
    //   const parts = window.location.pathname.split('/');
    //   const lastSegment = parts.pop() || parts.pop();
    //   state = {voteId : +lastSegment, path : "/main"};
    // }

    getDetail();
    const script = document.createElement('script')
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
    script.async = true

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, []);

  /**
   * 투표 내용을 받아오는 함수
   */
  const getDetail = () => {
    axios
      .get(api.getVoteDetail(voteId))
      .then(({ data }) => {
        setDetails(data.response);
      })
      .catch((Error) => {
        console.log(Error);
      });
  }

  const doVote = () => {
    axios.post(api.pickVote(voteId), { "voteItemId": selectedItemId })
    .then(() => {getDetail(); setSelectedItemId();})
    .catch((Error) => {
      console.log(Error);
    });
  }

  const handleEndVote = () => {
    if (window.confirm("정말 종료하시겠습니까?")) {
      axios.put(api.endVote(state.voteId))
      .then(() => {alert("투표가 종료되었습니다."); getDetail();})
      .catch((Error) => {
        console.log(Error);
      });
    }
  }

  const writeComment = () => {
    let addCommentBody = {"content": commentText};
    if (targetComment != null) {
      addCommentBody = {
        "commentId": targetComment.id,
        "content": commentText
      }
    }
    axios.post(api.addComment(voteId), addCommentBody).then(() => {getDetail();})
    .catch((Error) => {
      console.log(Error);
    });
  }

  /**
   * 좋아요 아이콘 클릭시 좋아요 처리가 되거나 이미 되어있다면 취소하는 함수
   */
  const clickFavoriteIcon = (commentId) => {
    axios.post(api.likeComment(voteId, commentId))
    .then(() => {getDetail()})
    .catch((Error) => {
      console.log(Error);
    });
  }

  /**
   * 댓글별로 대댓글까지 순회하며 카운트해서 총 댓글 수를 반환하는 함수
   * @returns number
   */
  const commentCount = () => {
    let result = 0;
    for (let comment of details.comments) {
      if (comment.replies.length > 0) {
        for (let tmp of comment.replies) {
          result += !!tmp;
        }
      }
      result += 1;
    }
    return result;
  };

  /**
   * 투표거리에 따른 단계(스타일 적용된)
   */
  const distanceLevel = (distanceLevel) => {
    let result = "";
    switch (distanceLevel) {
      case 0: {
        result = "0.5km 이내";
        return (
          <div
            style={{
              backgroundColor: "#e7f3fe",
              padding: "6px",
              fontSize: "12px",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            {result}
          </div>
        );
      }
      case 1: {
        result = "1km 이내";
        return (
          <div
            style={{
              backgroundColor: "#cfe8fc",
              padding: "6px",
              fontSize: "12px",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            {result}
          </div>
        );
      }
      default: {
        result = "2km 이내";
        return (
          <div
            style={{
              backgroundColor: "#b6dcfb",
              padding: "6px",
              fontSize: "12px",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            {result}
          </div>
        );
      }
    }
  };

  const endVoteButton = () => {
    return (
      <div>
        <Button onClick={handleEndVote}>투표 종료하기</Button>
      </div>
    )
  }

  function openModal(id) {
    if (details.ended) {
      setModalItemId(id);
      setModalOpen(true);
    }
  }
  const closeModal = () => {
    setModalOpen(false);
  }

  /**
   * 투표 선택지 반복랜더링
   * 1. 종료된 투표 또는 조회자가 선택 완료한 투표일 경우 - 막대그래프 result
   * 2. 재투표중 또는 미투표 상태 - 라디오버튼 + 선택
   */
  const selectionGroup = (details) => {
    if (details.ended || details.voted) {
      return (
        <div>
          {details.voteItems.map((selection, index) => (
            <>
            <div className="votedSelection" key={index} onMouseDown={(e)=>{e.preventDefault()}} onClick={() => openModal(selection.id)}>
              <div className="checkSelection">
                {selection.voted ? (
                  <CheckIcon color="primary" className="checkIcon" />
                ) : (
                  <></>
                )}
                <div>{selection.content}</div>
                <div className="votedCount">{selection.voteCount}명</div>
              </div>
              <div className="voteGraph">
                <div
                  className="voteGraphRatio"
                  style={{
                    width:
                      Math.round(
                        (selection.voteCount / details.voteCount) * 100
                      ) + "%",
                  }}
                ></div>
              </div>
            </div>
            {details.ended && <PieGraph selection={selection} voteId={voteId} modalItemId={modalItemId} isOpen={modalOpen} close={closeModal}/>}
            </>
          ))}
        </div>
      );
    } else {
      return (
        <div>
          <RadioGroup
            aria-labelledby="demo-radio-buttons-group-label"
            name="radio-buttons-group"
            onChange={(e) => {setSelectedItemId(e.target.value)}}
          >
          {details.voteItems.map((selection, index) => (
            <FormControlLabel value={selection.id} control={<Radio />} label={selection.content} key={index} />
            // <div
            //   className={
            //     selection.voted ? "unvotedSelected" : "unvotedSelection"
            //   }
            //   key={index}
            //   onClick={() => {console.log(selection.voted); selection.voted = !selection.voted}}
            // >
            //   <div className="votedIcon">
            //     {selection.voted ? (
            //       <RadioButtonCheckedIcon color="primary" />
            //     ) : (
            //       <RadioButtonUncheckedIcon />
            //     )}
            //   </div>
            //   <div className="selectContent">{selection.content}</div>
            // </div>
          ))}
          </RadioGroup>
        </div>
      );
    }
  };
  /**
   * 조건 분기에 따른 투표하기 버튼 표시
   */
  const gotoVote = (ended, voted, voteItems) => {
    let selected = 0;
    voteItems.forEach((element) => {
      selected += !!element.voted;
    });
    // 투표가 종료된 경우 -> 아무것도 표시x
    if (!ended) {
      if (selectedItemId) {
        // 선택한 경우 -> 투표하기
        return <div className="gotoVote" onClick={() => doVote()}>투표하기</div>;
      }
      // 선택한 것이 아무것도 없는 경우 -> 아무것도 표시x
    }
  };

  /**
   * 댓글 표시
   */
  const comment = (comments) => {
    let result = [];
    for (let i = 0; i < comments.length; i++) {
      result.push(
        <div className="comment">
          { comments[i].deleted
          ? <div>삭제된 댓글입니다.</div>
          : <div onClick={() => {
              if (targetComment != null) {
                setTargetComment(null);
              } else {
                setTargetComment(comments[i]);
              }
            }}>
              <div className="commentInfor">
                <div className="commentBy">{comments[i].writerNickname}</div>
                <div className="commentCreatedAt">{comments[i].createdAt.substring(0, 16)}</div>
              </div>
              <div>
                {comments[i].content}
              </div>
              <div className="commentLike">
                {comments[i].likedByMe ? <FavoriteIcon onClick={() => clickFavoriteIcon(comments[i].id)} color="primary" /> : <FavoriteBorderIcon onClick={() => clickFavoriteIcon(comments[i].id)} />}
                <div className="good">좋아요</div>
                {comments[i].likesCount ? (<div>{comments[i].likesCount}</div>) : (null)}
              </div>
            </div>
          }
        </div>
      );
      for (let j = 0; j < comments[i].replies.length; j++) {
        result.push(
          <div className="reply">
            <ArrowRightAltIcon />
            <div className="replyDiv">
              <div className="commentInfor">
                <div className="commentBy">
                  {comments[i].replies[j].writerNickname}
                </div>
                <div className="commentCreatedAt">
                  {comments[i].replies[j].createdAt.substring(0, 16)}
                </div>
              </div>

              <div>{comments[i].replies[j].content}</div>

              <div className="commentLike">
                {comments[i].replies[j].likedByMe ? <FavoriteIcon onClick={() => clickFavoriteIcon(comments[i].replies[j].id)} color="primary" /> : <FavoriteBorderIcon onClick={() => clickFavoriteIcon(comments[i].replies[j].id)} />}
                <div className="good">좋아요</div>
                {comments[i].replies[j].likesCount ? (<div>{comments[i].replies[j].likesCount}</div>) : (null)}
              </div>
            </div>
          </div>
        );
      }
    }

    /**
     * 댓글 작성 함수
     */
    const commentCreate = () => {
      const replyComments = (target) => {
        return (
          <div className="replyInfor">
            <div className="replyFor">{target.writerNickname}</div>
            <div>님에게 답글</div>
          </div>
        );
      };

      return (
        <div>
          {targetComment ? replyComments(targetComment) : <></>}
          <div className="commentCreateBoard">
            <input
              className="commentInput"
              type="text"
              placeholder="댓글을 남겨주세요"
              onChange={(e) => {setCommentText(e.target.value)}}
            ></input>
            <div className="commentSubmitButton" onClick={() => writeComment()} >게시</div>
          </div>
        </div>
      );
    };
    result.push(commentCreate())

    return result;
  };

  return (
    <div>
      {details ? (
        <div className="contentAll">
          <HeaderTextAndNavigate
            path={state ? state.path : "/main"}
            text={details.title}
          ></HeaderTextAndNavigate>
          <div>
            <div className="title">{details.title}</div>
            <div className="titleGroup">
              <div className="writter">{details.writerNickname}</div>
              {distanceLevel(details.distanceLevel)}
              <div className="startDate">
                {details.startDate.substring(0, 16)}
              </div>
            </div>
          </div>
          {details.imageUrls[0] && <img
            className="profile-img"
            src={
              `https://` +
              process.env.REACT_APP_BUCKET_NAME +
              `.s3.ap-northeast-2.amazonaws.com/hay/vote/${details.imageUrls[0]}.jpg`
            }
            width='100%'
            alt="업로드 이미지"
          />}
          <div className="article">{details.body}</div>
          <div className="vote">
            <div className="voteTitle">
              <HowToVoteIcon color="primary" fontSize="small" />
              <div className="voteText">투표</div>
              <div>{details.voteCount}명 참여</div>
            </div>
            <div className="remainDate">{남은날짜계산(details.endDate, details.ended)}</div>
            <div className="selectionGroup">{selectionGroup(details)}</div>
            <div>
              {gotoVote(details.ended, details.voted, details.voteItems)}
            </div>
            <div>
              {details.writenByMe&&!details.ended&&(남은날짜계산(details.endDate, details.ended) !== "종료된 투표")
              ?endVoteButton():null}
            </div>
          </div>
          {!details.voted ? (
            <div className="commentShare">
              <div></div>
              <div className="shareRight"><KakaoShareButton details={details}/></div>
            </div>
          ) : details.commentable ? (
            <div className="commentShare">
              <div>댓글 {commentCount()}</div>
              <div className="shareRight"><KakaoShareButton details={details}/></div>
            </div>
          ) : (
            <div className="commentShare">
              <div>댓글을 작성할 수 없는 게시글입니다</div>
              <div className="shareRight"><KakaoShareButton details={details}/></div>
            </div>
          )}
          {
            details.commentable && details.voted ? (
              <div className="commentAll">
                {details.bestComment ? (
                  <div
                    onClick={() => {
                      if (targetComment != null) {
                        setTargetComment(null);
                      } else {
                        setTargetComment(details.bestComment);
                      }
                    }}
                  >
                    <div className="bestCommentTitle">베스트 댓글</div>
                    <div className="bestComment">
                      <div className="comment">
                        <div className="commentInfor">
                          <div className="commentBy">{details.bestComment.writerNickname}</div>
                          <div className="commentCreatedAt">{details.bestComment.createdAt.substring(0, 16)}</div>
                        </div>
                        <div>{details.bestComment.content}</div>
                        <div className="commentLike">
                          {details.bestComment.likedByMe ? (
                            <FavoriteIcon
                              onClick={() =>
                                clickFavoriteIcon(details.bestComment.id)
                              }
                              color="primary"
                            />
                          ) : (
                            <FavoriteBorderIcon
                              onClick={() =>
                                clickFavoriteIcon(details.bestComment.id)
                              }
                            />
                          )}
                          <div className="good">좋아요</div>
                          {details.bestComment.likesCount ? (<div>{details.bestComment.likesCount}</div>) : (null)}
                        </div>

                      </div>
                    </div>
                  </div>
                ) : null}
                {comment(details.comments)}
              </div>
            ) : (
              <></>
            ) /* 댓글 작성불가==댓글 목록 조회x */
          }
        </div>
      ) : null}
    </div>
  );
}

export default VoteDetail;

/**
 * 종료시점과 현재날짜를 비교하여 남은 날짜 또는 시간을 보여주거나 종료된 투표임을 반환하는 함수.
 * @returns {string}
 */
//  const 남은날짜계산1 = (endTime) => {
//   let todayRaw = new Date();
//   let today = todayRaw.getFullYear() + "-" + todayRaw.getMonth() + "-" + todayRaw.getDate() + " " + todayRaw.getHours() + ":" + todayRaw.getMinutes() + ":" + todayRaw.getSeconds() + ".000000";
//   let result = 0;

//   if (today > endTime) {
//     // 투표 종료된 이후
//     result = "종료된 투표";
//   } else if (today.substring(5, 7) < endTime.substring(5, 7)) { // 예외처리를 월 차이만 하자.
//     // 다음 달까지 넘어감
//     result = new Date(2022/*parseInt(endTime.substring(0, 4))*/, parseInt(endTime.substring(5, 7)), 0).getDate() + parseInt(endTime.substring(8, 10)) - parseInt(today.substring(8, 10));
//     result = result + "일 후 종료됩니다.";
//   } else if (parseInt(endTime.substring(8, 10)) - parseInt(today.substring(8, 10)) < 1) {
//     // 하루보다 짧은 시간일 경우
//     result = parseInt(endTime.substring(11, 13)) - parseInt(today.substring(11, 13));
//     result = result + "시간 후 종료됩니다.";
//   } else {
//     result = parseInt(endTime.substring(8, 10)) - parseInt(today.substring(8, 10));
//     result = result + "일 후 종료됩니다.";
//   }

//   return result;
// }

/**
 * 종료시점과 현재날짜를 비교하여 남은 날짜 또는 시간을 보여주거나 종료된 투표임을 반환하는 함수.
 * @returns {string}
 */
const 남은날짜계산 = (endTime, ended) => {
  const today = new Date();
  const end = new Date(endTime);
  const diff = end - today;
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diff / (1000 * 60));

  if (ended) {
    return "종료된 투표";
  }

  if (end < today) {
    return "종료된 투표";
  } else if (diffHours < 1) {
    if (diffMinutes < 5) {
      return "잠시 후 종료됩니다.";
    } else {
      return `${diffMinutes}분 후 종료됩니다.`;
    }
  } else if (diffDays < 1) {
    return `${diffHours}시간 후 종료됩니다.`;
  } else {
    return `${diffDays}일 후 종료됩니다.`;
  }
};

/**
 * 해당 투표와 조회한 사람의 거리를 0.5km, 1km로 끊어 어느 정도 가까운지를 반환하는 함수.
 *
 * 최대 조회 거리가 2km임을 감안하여 1km 이상의 거리는 별도로 끊지 않았음에 주의
 * @param {number} distance
 * @returns {string}
 */
const 거리계산 = (distance) => {
  let result = "";
  if (distance < 500) {
    result = "0.5km 이내";
  } else if (distance < 1000) {
    result = "1km 이내";
  } else {
    result = "1km 이상";
  }
  return result;
};
