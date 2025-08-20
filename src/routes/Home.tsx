import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaBolt, FaUsers, FaCode } from "react-icons/fa";
import { useAtom } from "jotai";
import { themeAtom } from "../atoms/themeAtom";

export function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [theme] = useAtom(themeAtom);

  async function createRoomHandler() {
    const res = await axios.post(
      import.meta.env.VITE_BACKEND_URL + "/create-room"
    );
    navigate("/code/" + res.data.roomId);
  }

  function joinRoomHandler() {
    if (roomId.trim() !== "") {
      navigate("/code/" + roomId.trim());
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center pt-20">
      <div className="flex justify-center items-center gap-2 mb-10">
        <FaCode size={50}/>
        <h1 className="text-5xl font-bold">CodeAlong</h1>
      </div>
      <h1 className="text-4xl font-bold mb-6">Collaborative Code Meet</h1>
      <p className="text-gray-400 text-center mb-1">
        A Platform for competative programming, where programmers meet, share ideas, and solve complex problems together.
      </p>
      <p className="text-gray-300 font-bold text-center mb-10">
        **The first request may be slow due to cold start on a free server, but it will respond quickly after that**
      </p>
      {/* Room Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className={`px-4 py-2 rounded-md border border-gray-600 w-64 focus:outline-none focus:ring-2 focus:ring-violet-500
             ${theme === "dark"
              ? "bg-neutral-800 text-white border-neutral-600 focus:ring-violet-500"
              : "bg-neutral-100 text-black border-neutral-400 focus:ring-violet-500"
          }`}
        />
        <button
          onClick={joinRoomHandler}
          disabled={!roomId.trim()}
          className={`px-4 py-2  cursor-pointer rounded-md font-medium transition text-white ${
            roomId.trim()
              ? "bg-violet-500 hover:bg-violet-600"
              : "bg-gray-700 cursor-not-allowed"
          }`}
        >
          Join Room
        </button>
        <button
          onClick={createRoomHandler}
          className="px-4 py-2 cursor-pointer bg-blue-500 hover:bg-blue-600 rounded-md font-medium text-white"
        >
          Create Room
        </button>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[ 
          { Icon: FaBolt, title: "Lightning Fast", desc: "Instant synchronization across all participants" },
          { Icon: FaUsers, title: "Team Collaboration", desc: "Work together with multiple developers seamlessly" },
          { Icon: FaCode, title: "Multi-Language", desc: "Support for all popular programming languages" },
        ].map(({ Icon, title, desc }, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-xl text-center shadow-md transition ${
              theme == "dark"
                ? "bg-neutral-800 text-white"
                : "bg-neutral-100 text-black"
            }`}
          >
            <Icon className="text-violet-500 text-3xl mb-3 mx-auto" />
            <h2 className="text-xl font-semibold mb-1">{title}</h2>
            <p className={`${theme == "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Creator Info */}
      <div className="mt-16 text-sm text-gray-500 text-center">
        <p>
          Made by{" "}
          <a
            href="https://akdevelops.netlify.app/"
            className="text-violet-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Arjit Khare
          </a>
        </p>
        <p className="mt-1">
          Passionate about building products that are useful in real life.
        </p>
      </div>
    </div>
  );
}
