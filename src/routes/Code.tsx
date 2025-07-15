import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

async function getConnectedDevices(type: any) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === type);
}

async function openMediaDevices(constraints: any) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

async function createOffer() {
  const peerConnection = new RTCPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log(offer);
  const peerConnection1 = new RTCPeerConnection();
  const offer1 = await peerConnection1.createOffer();
  await peerConnection1.setLocalDescription(offer);
  console.log(offer1);
}

export function Code() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socket = useRef<WebSocket>(new WebSocket("ws://localhost:3000"));
  const [peerConnections, setPeerConnections] = useState<
    Map<string, RTCPeerConnection>
  >(new Map<string, RTCPeerConnection>());
  const pcRef = useRef(peerConnections);
  const location = useLocation();
  const roomId = location.pathname.split("/")[2];

  useEffect(() => {
    pcRef.current = peerConnections;
  }, [peerConnections]);

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
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      if (message.type === "join") {
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
            receiver: message.receiverId,
          };
          socket.current.send(JSON.stringify(offerMessage));
        };
      } else if (message.type === "createOffer") {
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
    connectMedia();
    createOffer();
    setWebSocketConnection();
  }, []);
  return (
    <>
      Code
      <video autoPlay ref={videoRef}></video>
    </>
  );
}
