import axios from "axios";
import React, { useState, useEffect } from "react";
import api from "../../api/api";
import HeaderTextAndNavigate from "../../components/HeaderTextAndNavigate";
import VoteItem from "../../components/VoteItem";
import "./MyParticipatedPage.css"

function MyParticipatedPage() {
  const [voteList, setVoteList] = useState([]);

  useEffect(() => {
    axios
      .get(api.getVotes(), {
        params: {
          participated: true,
        },
      })
      .then(({ data }) => {
        setVoteList(data.response.votes);
      })
      .catch((Error) => {
        setVoteList([]);
        console.log(Error);
      });
  }, []);

  return (
    <>
      <HeaderTextAndNavigate path="/mypage" text="내가 참여한 투표" />
      <div className="voteListSpace">
        {voteList.map((vote, index) => (
          <VoteItem vote={vote} path={"/myparticipated"} key={index}></VoteItem>
        ))}
      </div>
    </>
  );
}

export default MyParticipatedPage;
