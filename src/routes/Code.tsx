import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

async function getConnectedDevices(type: any) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === type);
}

async function openMediaDevices(constraints: any) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function Code() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const otherVideo = useRef<HTMLVideoElement>(null);
  const [videos, setVideo] =
    useState<React.RefObject<HTMLVideoElement | null>>();
    const [isVideos, setIsVideos] = useState(false);
  const socket = useRef<WebSocket>(new WebSocket(""));
  const [peerConnections, setPeerConnections] = useState<
    Map<string, RTCPeerConnection>
  >(new Map<string, RTCPeerConnection>());
  const pcRef = useRef(peerConnections);
  const location = useLocation();
  const roomId = location.pathname.split("/")[2];

  function createNewConnection(message: any, receiverId: string) {
    const peerConnection = new RTCPeerConnection();
    setPeerConnections((currentConnections) => {
      currentConnections.set(message.receiverId, peerConnection);
      return currentConnections;
    });
    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const offerMessage = {
        type: "createOffer",
        offer: peerConnection.localDescription,
        receiverId: receiverId,
      };
      socket.current.send(JSON.stringify(offerMessage));
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const iceMessage = {
          type: "iceCandidate",
          ice: event.candidate,
          receiverId: receiverId,
        };
        socket.current.send(JSON.stringify(iceMessage));
      }
    };
    peerConnection.ontrack = (event: any) => {
      console.log("video recieved");
      setVideo((vid) => {
        if (vid?.current)
          vid.current.srcObject = new MediaStream([event.track]);
        return vid;
      });
      if (otherVideo.current) otherVideo.current.srcObject = new MediaStream([event.track])
      setIsVideos(true);
    };
    return peerConnection;
  }

  async function connectMedia() {
    const videoCameras = await getConnectedDevices("videoinput");
    console.log("Cameras found:", videoCameras);
    try {
      const stream = await openMediaDevices({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      console.log("Got MediaStream:", stream);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  }

  function setWebSocketConnection() {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      if (message.type === "join") {
        console.log("other joined!", message);
        const pc = await createNewConnection(message, message.receiverId);
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach((track: any) => {
          pc?.addTrack(track);
        });
        console.log("videoSent", stream, videoRef.current?.srcObject);
      } else if (message.type === "createOffer") {
        const offer = message.offer;
        let pc = pcRef.current.get(message.senderId);
        if (!pcRef.current.has(message.senderId)) {
          pc = createNewConnection(message, message.senderId);
        }
        pc?.setRemoteDescription(offer);
        videoRef.current?.addEventListener("play", () => {
          const stream = videoRef.current?.srcObject as MediaStream;
          stream?.getTracks().forEach((track: any) => {
            pc?.addTrack(track);
          });
          console.log("videoSent", stream, videoRef.current?.srcObject);
        })
        const answer = await pc?.createAnswer();
        await pc?.setLocalDescription(answer);
        const answerMessage = {
          type: "createAnswer",
          answer: pc?.localDescription,
          senderId: message.senderId,
        };
        console.log(answerMessage);
        socket.current.send(JSON.stringify(answerMessage));
      } else if (message.type === "createAnswer") {
        const receiverId = message.receiverId;
        const answer = message.answer;
        const pc = pcRef.current.get(receiverId);
        pc?.setRemoteDescription(answer);
      } else if (message.type === "iceCandidate") {
        const senderId = message.senderId;
        const ice = message.ice;
        const pc = pcRef.current.get(senderId);
        pc?.addIceCandidate(ice);
      }
    };
    socket.current.onopen = () => {
      const joinMessage = {
        type: "join",
        roomId: roomId,
      };
      socket.current.send(JSON.stringify(joinMessage));
    };
  }

  useEffect(() => {
    async function init() {
      console.log("before media");
      console.log("before websocket");
      setWebSocketConnection();
      connectMedia();
      console.log("after websocket");
    }
    init();
  }, []);

  useEffect(() => {
    pcRef.current = peerConnections;
  }, [peerConnections]);

  return (
    <>
      Code
      <video autoPlay ref={videoRef}></video>
      {isVideos ? <div>true</div> : <div>false</div>}
      <video autoPlay ref={otherVideo}></video>
      {/* {videos ? <video autoPlay ref={otherVideo}></video> : <></>} */}
    </>
  );
}
