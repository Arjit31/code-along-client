import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Clipboard } from "lucide-react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { useAtom } from "jotai";
import { themeAtom } from "../atoms/themeAtom";
import { prejoinAtom } from "../atoms/prejoinAtom";
import { socketAtom } from "../atoms/socketAtom";
import { getSocket } from "../lib/socekt";

async function getConnectedDevices(type: any) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === type);
}

async function openMediaDevices(constraints: any) {
  console.log("at open midea function");
  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function Videos() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const socket = useRef<WebSocket>(
    new WebSocket(import.meta.env.VITE_WEBSOCKET_URL)
  );
  const [peerConnections, setPeerConnections] = useState<
    Map<string, RTCPeerConnection>
  >(new Map<string, RTCPeerConnection>());
  const [peerNames, setPeerNames] = useState<Map<string, string>>(
    new Map<string, string>()
  );
  const pcRef = useRef(peerConnections);
  const location = useLocation();
  const roomId = location.pathname.split("/")[2];

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [globalTheme, setGlobalTheme] = useAtom(themeAtom);

  const [showPreJoin, setShowPreJoin] = useAtom(prejoinAtom);
  const [globalSocket, setGlobalSocket] = useAtom(socketAtom);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  async function fetchDevices() {
    console.log("at fetch devices");
    await openMediaDevices({ audio: true, video: true });
    console.log("completed open midea function");
    const cams = await getConnectedDevices("videoinput");
    const mics = await getConnectedDevices("audioinput");
    setAvailableCameras(cams);
    setAvailableMics(mics);
    if (cams[0]) setSelectedCameraId(cams[0].deviceId);
    if (mics[0]) setSelectedMicId(mics[0].deviceId);
  }

  function toggleMic() {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsAudioMuted(!isAudioMuted);
    }
  }

  function toggleCam() {
    const stream = videoRef.current?.srcObject as MediaStream;
    console.log("toggle Cam", stream);
    if (stream) {
      stream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsVideoMuted(!isVideoMuted);
    }
  }

  function createNewConnection(receiverName: string, receiverId: string) {
    console.log("inside create new peer connection");
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302", // Free, public STUN
        },
      ],
    });
    setPeerConnections((currentConnections) => {
      currentConnections.set(receiverId, peerConnection);
      return currentConnections;
    });
    setPeerNames((currentPeerNames) => {
      currentPeerNames.set(receiverId, receiverName);
      return currentPeerNames;
    });
    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const offerMessage = {
        type: "createOffer",
        offer: peerConnection.localDescription,
        receiverId: receiverId,
        name: userName,
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
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      const streamId = receiverId;
      let stream = remoteStreams.current.get(streamId);

      if (!stream) {
        stream = new MediaStream();
        remoteStreams.current.set(streamId, stream);
        setStreamIds((prev) => [...prev, streamId]);
      }

      // Avoid adding duplicate tracks
      const trackAlreadyExists = stream
        .getTracks()
        .some((t) => t.id === event.track.id);
      if (!trackAlreadyExists) {
        stream.addTrack(event.track);
      }
    };
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state for ${receiverId}:`,
        peerConnection.connectionState
      );
      if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        console.log(`Peer ${receiverId} disconnected`);
        removeStream(receiverId);
        setPeerConnections((prev) => {
          const newConnections = new Map(prev);
          newConnections.delete(receiverId);
          return newConnections;
        });
      }
    };
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getAudioTracks().forEach((track) => {
      console.log("inside audio tracks", track);
      peerConnection?.addTrack(track, stream);
    });
    stream?.getVideoTracks().forEach((track) => {
      peerConnection?.addTrack(track, stream);
    });
    console.log("videoSent", stream, videoRef.current?.srcObject);
    return peerConnection;
  }

  function removeStream(streamId: string) {
    remoteStreams.current.delete(streamId);
    setStreamIds((prev) => prev.filter((id) => id !== streamId));
  }

  async function connectMedia(constraints: any) {
    try {
      const stream = await openMediaDevices(constraints);
      console.log("Audio Track", stream.getAudioTracks());
      console.log(videoRef.current, stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      console.log("Got MediaStream:", stream);
      setIsAudioMuted(false);
      setIsVideoMuted(false);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  }

  function setWebSocketConnection() {
    console.log("inside set websocket");
    socket.current = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);
    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      if (message.type === "join") {
        console.log("other joined!", message);
        const pc = await createNewConnection(message.name, message.receiverId);
      } else if (message.type === "createOffer") {
        const offer = message.offer;
        let pc = pcRef.current.get(message.senderId);
        if (!pcRef.current.has(message.senderId)) {
          pc = createNewConnection(message.name, message.senderId);
        }
        pc?.setRemoteDescription(offer);
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
      } else if (message.type === "close") {
        const senderId = message.senderId;
        removeStream(senderId);
        setPeerConnections((prev) => {
          const newConnections = new Map(prev);
          newConnections.delete(senderId);
          return newConnections;
        });
      }
    };
    socket.current.onopen = () => {
      const joinMessage = {
        type: "join",
        roomId: roomId,
        name: userName,
      };
      console.log(joinMessage);
      socket.current.send(JSON.stringify(joinMessage));
    };
    socket.current.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      // Clean up all peer connections when signaling server disconnects
      peerConnections.forEach((pc, peerId) => {
        pc.close();
        removeStream(peerId);
      });
      setPeerConnections(new Map());
    };
    getSocket(socket.current);
    setGlobalSocket(true);
  }

  useEffect(() => {
    console.log("at use Effect");
    async function init() {
      console.log("at init function");
      await fetchDevices();
      await connectMedia({
        video: { deviceId: selectedCameraId },
        audio: { deviceId: selectedMicId },
      });
    }
    init();
    return () => {
      peerConnections.forEach((pc) => pc.close());
      socket.current.close();
      remoteStreams.current.clear();
      setStreamIds([]);
    };
  }, []);

  useEffect(() => {
    pcRef.current = peerConnections;
  }, [peerConnections]);

  useEffect(() => {
    async function init() {
      if (showPreJoin === false) {
        await connectMedia({
          video: { deviceId: selectedCameraId },
          audio: { deviceId: selectedMicId },
        });
        console.log("at socket use effect");
        setWebSocketConnection();
      }
    }
    init();
  }, [showPreJoin]);

  if (showPreJoin) {
    return (
      <div className="flex w-full h-full items-center justify-center gap-10">
        <div className="flex justify-center items-center gap-10">
          <video
            autoPlay
            ref={videoRef}
            width="640"
            height="480"
            className={`rounded-2xl transition-shadow duration-300
                    ${
                      globalTheme === "dark"
                        ? "shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        : "shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                    }`}
          />
        </div>
        <div className="flex flex-col gap-4 items-center justify-center h-screen">
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className={`px-4 py-2 rounded-md border border-gray-600 w-60 focus:outline-none focus:ring-2 focus:ring-violet-500
             ${
               globalTheme === "dark"
                 ? "bg-neutral-800 text-white border-neutral-600 focus:ring-violet-500"
                 : "bg-neutral-100 text-black border-neutral-400 focus:ring-violet-500"
             }`}
            maxLength={15}
          />

          <select
            value={selectedCameraId}
            onChange={async (e) => {
              setSelectedCameraId(e.target.value);
              await connectMedia({
                video: { deviceId: e.target.value },
                audio: { deviceId: selectedMicId },
              });
            }}
            className={`border rounded px-2 py-1 transition-colors duration-300 w-60
            ${
              globalTheme === "dark"
                ? "bg-neutral-900 text-neutral-50 border-neutral-700"
                : "bg-neutral-50 text-neutral-900 border-neutral-300"
            }`}
          >
            {availableCameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cam.deviceId}`}
              </option>
            ))}
          </select>

          <select
            value={selectedMicId}
            onChange={async (e) => {
              setSelectedMicId(e.target.value);
              await connectMedia({
                video: { deviceId: selectedCameraId },
                audio: { deviceId: e.target.value },
              });
            }}
            className={`border rounded px-2 py-1 transition-colors duration-300 w-60
            ${
              globalTheme === "dark"
                ? "bg-neutral-900 text-neutral-50 border-neutral-700"
                : "bg-neutral-50 text-neutral-900 border-neutral-300"
            }`}
          >
            {availableMics.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `Microphone ${mic.deviceId}`}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-evenly w-full">
            <button
              onClick={toggleCam}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-400 transition"
            >
              {isVideoMuted ? (
                <FaVideoSlash size={20} color="black" />
              ) : (
                <FaVideo size={20} color="black" />
              )}
            </button>
            <button
              onClick={toggleMic}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-400 transition"
            >
              {isAudioMuted ? (
                <FaMicrophoneSlash size={20} color="black" />
              ) : (
                <FaMicrophone size={20} color="black" />
              )}
            </button>
            <button
              onClick={() => {
                setShowPreJoin(false);
              }}
              disabled={userName.length < 3}
              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Join Room
            </button>
          </div>
          {/* Copy Room Info */}
          <div className="flex flex-col gap-2 items-center w-full mt-4">
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium">Room ID:</p>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-mono">{roomId}</span>
                <Clipboard
                  className="w-5 h-5 cursor-pointer active:text-neutral-300"
                  onClick={() => navigator.clipboard.writeText(roomId)}
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-sm font-medium">Room Link:</p>
              <div className="flex gap-2 items-center">
                <span className="text-xs max-w-[200px] truncate font-mono">
                  {window.location.origin + "/code/" + roomId}
                </span>
                <Clipboard
                  className="w-5 h-5 cursor-pointer active:text-neutral-300"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      window.location.origin + "/code/" + roomId
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex justify-center  p-2 gap-2 ">
        <div className="flex flex-col gap-2 items-center justify-center">
          <button
            onClick={toggleCam}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-400 transition"
          >
            {isVideoMuted ? (
              <FaVideoSlash size={20} color="black" />
            ) : (
              <FaVideo size={20} color="black" />
            )}
          </button>
          <button
            onClick={toggleMic}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-400 transition"
          >
            {isAudioMuted ? (
              <FaMicrophoneSlash size={20} color="black" />
            ) : (
              <FaMicrophone size={20} color="black" />
            )}
          </button>
        </div>
        <div className="flex flex-col">
          <video
            autoPlay
            muted
            ref={videoRef}
            width="240"
            height="180"
            className={`rounded-2xl transition-shadow duration-300
            ${
              globalTheme === "dark"
                ? "shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                : "shadow-[0_0_15px_rgba(0,0,0,0.1)]"
            }`}
          />
          {userName && (
            <p className="mt-1 text-center text-sm font-medium">{userName}</p>
          )}
        </div>
        {streamIds.map((streamId) => (
          <div
            key={streamId}
            className="flex flex-col items-center justify-center"
          >
            <div className="flex items-center justify-center">
              <div className="mr-2 h-5/6 w-0.5 bg-neutral-700" />
              <video
                autoPlay
                width="240"
                height="180"
                className={`rounded-2xl transition-shadow duration-300
                            ${
                              globalTheme === "dark"
                                ? "shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                : "shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                            }`}
                ref={(videoElement) => {
                  if (videoElement) {
                    const stream = remoteStreams.current.get(streamId);
                    if (stream) videoElement.srcObject = stream;
                  }
                }}
              />
            </div>
            <p className="mt-1 text-center text-sm font-medium">
              {peerNames.get(streamId) || "Peer"}
            </p>
          </div>
        ))}
      </div>
    );
  }
}
