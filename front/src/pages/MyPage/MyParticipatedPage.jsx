import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";
import api from "../../api/api";
import HeaderTextAndNavigate from "../../components/HeaderTextAndNavigate";
import VoteItem from "../../components/VoteItem";

function MyParticipatedPage() {
  const [voteList, setVoteList] = useState([]);

  useEffect(() => {
    axios
      .get(api.getVotes(), {
        params: {
          participated: true,
        },
        headers: {
          Authorization: "Bearer " + localStorage.getItem("jwtToken"),
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
      {voteList.map((vote, index) => (
        <VoteItem vote={vote} key={index}></VoteItem>
      ))}
    </>
  );
}

export default MyParticipatedPage;
