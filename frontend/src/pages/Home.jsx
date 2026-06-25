import { useState } from "react";
import { useNavigate } from "react-router";
import ShipImg from "../assets/cruise-ship.png";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleModeSelection = (mode) => {
    if (!playerName.trim()) {
      setError("Please enter your name commander!");
      return;
    }

    setError("");
    navigate("/setup", { state: { playerName: playerName.trim(), mode } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full text-center">
        {/* Minimalist Title */}
        <div className="flex items-center justify-center gap-2">
          <img className="h-10 w-10" src={ShipImg} alt="#" />
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
            Battleship
          </h1>
        </div>

        <p className="text-slate-500 mb-10">
          Prepare your fleet for deployment.
        </p>

        {/* Input Section */}
        <div className="mb-8 text-left">
          <label
            htmlFor="playerName"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Commander Name
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && handleModeSelection("single")
            }
            placeholder="e.g. John"
            className="w-full border border-slate-300 rounded bg-white text-slate-700 px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleModeSelection("single")}
            className="flex-1 bg-slate-900 text-white font-medium py-2.5 px-4 rounded hover:bg-slate-800 transition-colors"
          >
            Single Player
          </button>

          <button
            onClick={() => handleModeSelection("multi")}
            className="flex-1 border-2 border-blue-600 text-blue-600 font-medium py-2.5 px-4 rounded hover:bg-blue-50 transition-colors"
          >
            Multiplayer
          </button>
        </div>
      </div>
    </div>
  );
}
