// 상단 내 동네 설정
// 지도
// 동네 선택
// 지역은 최소 1개 최대 2개를 설정할 수 있어요
// 동네 1, 동네 2
// 동네 1과 거리
// 선택한 범위의 게시물만 볼 수 있어요
// 막대 컨트롤러

import React from 'react'
import HeaderTextAndNavigate from "../../components/HeaderTextAndNavigate";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from 'react-router-dom';
import { Button } from "@mui/material";
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import AutorenewIcon from "@mui/icons-material/Autorenew";
import styled from "styled-components";
import Map from '../../components/Map'
import HeaderOnlyText from '../../components/HeaderOnlyText';
import { userAction } from "../../_slice/UserSlice";
import { useLocation } from "react-router";
import axios from 'axios';
import api from '../../api/api';
import "./MyLocationSetting.css";

const LocationContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;
const BoldText = styled.div`
  font-weight: 700;
  margin: 5px 0;
`;
const LightText = styled.div`
  margin: 10px 0;

  font-weight: 300;
  font-size: 12px;
  line-height: 150%;
  color: rgba(0, 0, 0, 0.5);
`;
const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;
const RefreshButton = styled.div`
  margin-top: 10px;
  &:hover {
    cursor: pointer;
  }
  &:active {
    transform: scale(0.95);
  }
`;

function MyLocationSetting() {
  const [position, setPosition] = useState({});
  const [renew, setRenew] = useState(false);
  const [defalutRange, setDefaultRange] = useState(500);
  const [locations, setLocations] = useState([]);

  const dispatch = useDispatch();
  const latitude = useSelector((state) => state.user.latitude);
  const longitude = useSelector((state) => state.user.longitude);
  const areaName = useSelector((state) => state.user.areaName);

  //api 통신들
  //등록된 동네 조회
  function getMyLocations() {
    axios.get(api.getLocation())
    .then(({ data }) => {
      setLocations(data.response);
      // console.log("data", data);
      // console.log(locations);
    })
    .catch((Error) => {
      console.log(Error);
    })
  }
  //동네 추가
  function addMyLocation(seq) {
    axios.post(api.addLocation(), {
      lat : latitude,
      lng : longitude,
      address : areaName,
      seq : seq
    })
    .then((Response)=>{
      const result = Response.data.response
      // console.log(result);
      getMyLocations();
    })
    .catch((Error)=>{console.log(Error)})
  }
  //동네 삭제
  function deleteMyLocation(locationId, seq) {
    if(locations[0].id === null || locations[1].id === null) { }
    else {
      axios.delete(api.deleteLocation(locationId))
      .then((Response)=>{
        const result = Response.data.response
        // console.log(result);
        getMyLocations();
        setCurrentLocation(locations[seq].id, seq)
      })
      .catch((Error)=>{console.log(Error)})
    }
  }
  //현재 동네 설정
  function setCurrentLocation(locationId, seq) {
    // console.log("locationId : ", locationId)
    if(locationId === null) { 
      addMyLocation(seq);
    }
    else {
      axios.post(api.setCurrentLocation(), {
        locationId: locationId,
      })
      .then((Response)=>{
        const result = Response.data.response
        // console.log("현재동네설정", result);
        getMyLocations();
      })
      .catch((Error)=>{console.log(Error)})
    }
  }
  //동네 범위 설정
  function setLocationRange(range) {
    axios.post(api.setLocationRange(), {
      range : range,
    })
    .then((Response)=>{
      const result = Response.data.response
      getLocationRange();
      console.log(result);
    })
    .catch((Error)=>{console.log(Error)})
  }
  //동네 범위 조회
  //setDefaultRange();
  function getLocationRange() {
    axios.get(api.setLocationRange())
    .then((Response)=>{
      console.log(Response.data.response.range);
      setDefaultRange(Response.data.response.range);
    })
    .catch((Error)=>{console.log(Error)})
  }

  
  function handleRenew() {
    setRenew(!renew)
  }

  useEffect(() => {
    getMyLocations();
    getLocationRange();
  }, []);

  useEffect(() => {
    async function getLocation() {
      const result = await new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          const now = new Date();
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                err: 0,
                time: now.toLocaleTimeString(),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (err) => {
              console.log("error getLocation")
              resolve({
                err: -1,
                latitude: -1,
                longitude: -1,
              });
            },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
          );
        } else {
          reject({ error: -2, latitude: -1, longitude: -1 });
        }
      });
      setPosition(result);
    }
    getLocation();
  }, [renew]);

  dispatch(userAction.latitude(position.latitude));
  dispatch(userAction.longitude(position.longitude));

  const valuetext = (value) => {
    return `${value}km`;
  }
  const marks = [
    {
      value: 500,
      label: "0.5km",
    },
    {
      value: 1000,
      label: "1km",
    },
    {
      value: 2000,
      label: "2km",
    }
  ]
  const valueLabelFormat = (value) => {
    return marks.findIndex((mark) => mark.value === value) + 1;
  }
  
  return (
    <div className="myLocationSettingPage">
      <HeaderTextAndNavigate path="/mypage" text="내 동네 설정" />
      <Map />
      <LocationContainer>
        <BoldText>동네선택</BoldText>
        <LightText>지역은 최소 1개 최대 2개를 설정할 수 있어요</LightText>
        <Stack direction="row" spacing={2} justifyContent="center">
          {locations[0]?.id ? (
            <Chip
              label={locations[0]?.address}
              onClick={() => setCurrentLocation(locations[0]?.id, 0)}
              onDelete={() => {
                deleteMyLocation(locations[0]?.id, 1);
              }}
              color="primary"
              variant={locations[0]?.isCurrent ? "filled" : "outlined"}
            />
          ) : (
            <Chip
              label="선택하여 설정"
              onClick={() => setCurrentLocation(locations[0]?.id, 0)}
              color="primary"
              variant={locations[0]?.isCurrent ? "filled" : "outlined"}
            />
          )}
          {locations[1]?.id ? (
            <Chip
              label={locations[1]?.address}
              onClick={() => setCurrentLocation(locations[1]?.id, 1)}
              onDelete={() => {
                deleteMyLocation(locations[1]?.id, 0);
              }}
              color="primary"
              variant={locations[1]?.isCurrent ? "filled" : "outlined"}
            />
          ) : (
            <Chip
              label="선택하여 설정"
              onClick={() => setCurrentLocation(locations[1]?.id, 1)}
              color="primary"
              variant={locations[1]?.isCurrent ? "filled" : "outlined"}
            />
          )}
        </Stack>
        <RefreshButton onClick={handleRenew}>
          <AutorenewIcon sx={{ fontSize: 50 }} />
        </RefreshButton>
      </LocationContainer>
      <hr />
      <SliderContainer>
        <BoldText>
          {locations.filter((location) => location.isCurrent).length > 0 ? locations.filter((location) => location.isCurrent)[0].address : "선택 안됨"}과(와)
          {defalutRange / 1000}km 이내
        </BoldText>
        <LightText>선택한 범위의 게시물만 볼 수 있어요</LightText>
        <div className="slider">
          <Slider
            aria-label="Restricted values"
            value={defalutRange}
            valueLabelFormat={valueLabelFormat}
            getAriaValueText={valuetext}
            step={null}
            max={2000}
            valueLabelDisplay="off"
            marks={marks}
            onChange={(e) => setLocationRange(e.target.value)}
          />
        </div>
      </SliderContainer>
    </div>
  );
}

export default MyLocationSetting
