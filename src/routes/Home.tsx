import axios from "axios";
import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();
  async function clickHandler() {
    const res = await axios.post(
      import.meta.env.VITE_BACKEND_URL + "/create-room"
    );
    console.log(res.data);
    navigate("/code/" + res.data.roomId);
  }
  return (
    <>
      <input type="text" className="bg-green-200" />
      <button className="bg-amber-200 p-2">Join Room</button>
      <button className="bg-amber-200 p-2" onClick={clickHandler}>
        Create Room
      </button>
    </>
  );
}
