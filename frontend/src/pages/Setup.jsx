import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import socket from "../socket";

export default function Setup() {
  const location = useLocation();
  const navigate = useNavigate();

  const { playerName, mode } = location.state || {
    playerName: "Commander",
    mode: "single",
  };

  const [gridSize, setGridSize] = useState(10);
  const [joinCode, setJoinCode] = useState("");
  const [generatedRoomCode, setGeneratedRoomCode] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!location.state?.playerName) {
      navigate("/");
    }
  }, [location, navigate]);

  useEffect(() => {
    if (mode !== "multi") return;

    const handleRoomCreated = ({ roomCode }) => {
      setGeneratedRoomCode(roomCode);
      setIsWaiting(true);
      setError("");
    };

    const handleGameStart = ({ players, gridSize: serverGridSize }) => {
      navigate(`/game/${generatedRoomCode || joinCode}`, {
        state: { playerName, mode: "multi", players, gridSize: serverGridSize },
      });
    };

    const handleError = (msg) => {
      setError(msg);
      setIsWaiting(false);
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("game-start", handleGameStart);
    socket.on("error", handleError);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("game-start", handleGameStart);
      socket.off("error", handleError);
    };
  }, [mode, navigate, playerName, generatedRoomCode, joinCode]);

  const handleSinglePlayerStart = () => {
    navigate("/game/single", {
      state: { playerName, mode: "single", gridSize },
    });
  };

  const handleCreateRoom = () => {
    socket.connect();
    socket.emit("create-room", { playerName, gridSize });
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      setError("Please enter a room code.");
      return;
    }
    socket.connect();
    socket.emit("join-room", {
      roomCode: joinCode.trim().toUpperCase(),
      playerName,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg p-6 md:p-10">
        <button
          onClick={() => navigate("/")}
          className="bg-slate-900 text-slate-50 w-18 rounded-xs px-2 py-1.5 text-center"
        >
          Back
        </button>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome, {playerName}!
          </h2>
          <p className="text-slate-500">
            {mode === "single"
              ? "Configure your offline mission."
              : "Set up your multiplayer lobby."}
          </p>
        </div>

        {/* single player or multiplayer */}
        {!isWaiting && (
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 text-center">
              Select Grid Size
            </h3>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {[8, 10, 12].map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`py-2.5 px-5 rounded text-lg font-medium transition-colors border-2 ${
                    gridSize === size
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {size} x {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-center border border-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center">
          {mode === "single" && (
            <button
              onClick={handleSinglePlayerStart}
              className="w-full md:w-72 bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 transition-colors text-lg"
            >
              Start Game
            </button>
          )}
        </div>

        {mode === "multi" && (
          <div className="space-y-8">
            {isWaiting ? (
              <div className="text-center p-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-500 mb-2">Your Room Code</p>

                <h1 className="text-5xl font-mono tracking-widest text-blue-600 font-bold mb-6">
                  {generatedRoomCode}
                </h1>

                <div className="flex items-center justify-center space-x-2 text-slate-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Waiting for opponent to join...</span>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  Room expires in 1 hour
                </p>
              </div>
            ) : (
              // create or join
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700 uppercase">
                    Host a Game
                  </p>

                  <button
                    onClick={handleCreateRoom}
                    className="w-full bg-slate-900 text-white font-medium py-3 px-4 rounded hover:bg-slate-800 transition-colors"
                  >
                    Create Custom Room
                  </button>
                </div>

                <div className="space-y-3 relative">
                  {/* Visual Divider for Desktop */}
                  <div className="hidden md:block absolute -left-4 top-1/2 bottom-0 w-px bg-slate-200"></div>

                  <p className="text-sm font-semibold text-slate-700 uppercase">
                    Join a Game
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Room Code"
                      maxLength={5}
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      className="flex-1 border border-slate-300 rounded bg-white px-4 py-3 focus:outline-none focus:border-blue-500 font-mono uppercase"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="bg-blue-600 text-white font-medium py-3 px-6 rounded hover:bg-blue-700 transition-colors"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
