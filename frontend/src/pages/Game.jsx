import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import socket from "../socket";

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const {
    playerName: initialName,
    mode,
    gridSize = 10,
    players = [],
  } = location.state || {};

  const myPlayer = players.find((p) => p.id === socket.id);
  const myName = myPlayer ? myPlayer.name : initialName || "Commander";

  const opponentPlayer = players.find((p) => p.id !== socket.id);
  const opponentName = opponentPlayer ? opponentPlayer.name : "Bot";

  const isHost = players.length > 0 ? players[0].id === socket.id : true;

  const INITIAL_SHIPS = useMemo(() => {
    const standardFleet = [
      { id: "carrier-1", name: "carrier", length: 5 },
      { id: "battleship-1", name: "battleship", length: 4 },
      { id: "cruiser-1", name: "cruiser", length: 3 },
      { id: "submarine-1", name: "submarine", length: 3 },
      { id: "destroyer-1", name: "destroyer", length: 2 },
    ];

    if (gridSize === 8) return standardFleet;
    if (gridSize === 10)
      return [
        ...standardFleet,
        { id: "submarine-2", name: "submarine", length: 3 },
      ];

    return [
      ...standardFleet,
      { id: "battleship-2", name: "battleship", length: 4 },
      { id: "destroyer-2", name: "destroyer", length: 2 },
    ];
  }, [gridSize]);

  const playSound = useCallback((type) => {
    const sounds = {
      hit: "/explosionSound.mp3",
      miss: "/splashSound.mp3",
      win: "/winSound.mp3",
      lose: "/loseSound.mp3",
    };
    const audio = new Audio(sounds[type]);
    audio.play().catch((e) => console.log("Audio play blocked by browser:", e));
  }, []);

  const [gameState, setGameState] = useState("placement");
  const [turn, setTurn] = useState("user");
  const [winner, setWinner] = useState(null);

  const [userBoard, setUserBoard] = useState(
    Array(gridSize * gridSize).fill({ ship: null, status: "empty" }),
  );
  const [enemyBoard, setEnemyBoard] = useState(
    Array(gridSize * gridSize).fill({ ship: null, status: "empty" }),
  );
  // Placement States
  const [availableShips, setAvailableShips] = useState(INITIAL_SHIPS);
  const [selectedShip, setSelectedShip] = useState(INITIAL_SHIPS[0]);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [enemyReady, setEnemyReady] = useState(mode === "single");

  useEffect(() => {
    if (!initialName) navigate("/");
  }, [initialName, navigate]);

  useEffect(() => {
    setAvailableShips(INITIAL_SHIPS);
    setSelectedShip(INITIAL_SHIPS[0]);
  }, [INITIAL_SHIPS]);

  // mutliplayer
  useEffect(() => {
    if (mode !== "multi" || gameState === "gameover") return;

    socket.on("enemy-ready", () => setEnemyReady(true));

    socket.on("fire", (index) => {
      setUserBoard((prev) => {
        const newBoard = [...prev];
        const cell = newBoard[index];
        const isHit = cell.ship !== null;

        newBoard[index] = { ...cell, status: isHit ? "hit" : "miss" };

        socket.emit("fire-reply", {
          roomCode: roomId,
          index,
          isHit,
          shipName: cell.ship,
        });
        playSound(isHit ? "hit" : "miss");
        setTurn("user"); // It's now my turn
        return newBoard;
      });
    });

    socket.on("fire-reply", ({ index, isHit, shipName }) => {
      setEnemyBoard((prev) => {
        const newBoard = [...prev];
        newBoard[index] = { ship: shipName, status: isHit ? "hit" : "miss" };
        return newBoard;
      });
      playSound(isHit ? "hit" : "miss");
    });

    socket.on("player-disconnected", () => {
      setWinner("user");
      setGameState("gameover");
      playSound("win");
    });

    return () => {
      socket.off("enemy-ready");
      socket.off("fire");
      socket.off("fire-reply");
      socket.off("player-disconnected");
    };
  }, [mode, roomId, gameState, playSound]);

  // win/loss
  useEffect(() => {
    if (gameState !== "playing") return;

    const totalShipCells = INITIAL_SHIPS.reduce(
      (acc, ship) => acc + ship.length,
      0,
    );

    const enemyHitCount = enemyBoard.filter(
      (cell) => cell.status === "hit",
    ).length;
    if (enemyHitCount === totalShipCells) {
      setWinner("user");
      setGameState("gameover");
      playSound("win");
      return;
    }

    const userHitCount = userBoard.filter(
      (cell) => cell.status === "hit",
    ).length;
    if (userHitCount === totalShipCells) {
      setWinner("enemy");
      setGameState("gameover");
      playSound("lose");
    }
  }, [userBoard, enemyBoard, gameState, playSound, INITIAL_SHIPS]);

  // start if ready
  useEffect(() => {
    if (
      isReady &&
      enemyReady &&
      gameState === "placement" &&
      availableShips.length === 0
    ) {
      setGameState("playing");
      // The host attacks first, the joining player waits
      setTurn(isHost ? "user" : "enemy");
    }
  }, [isReady, enemyReady, gameState, availableShips, isHost]);

  // ship placement
  const handlePlaceShip = (index) => {
    if (gameState !== "placement" || !selectedShip) return;

    const newBoard = [...userBoard];
    const shipIndices = [];
    let isValid = true;

    for (let i = 0; i < selectedShip.length; i++) {
      let targetIndex = isHorizontal ? index + i : index + i * gridSize;

      if (
        targetIndex >= gridSize * gridSize ||
        newBoard[targetIndex].ship !== null ||
        (isHorizontal &&
          Math.floor(targetIndex / gridSize) !== Math.floor(index / gridSize))
      ) {
        isValid = false;
        break;
      }
      shipIndices.push(targetIndex);
    }

    if (isValid) {
      shipIndices.forEach(
        (i) => (newBoard[i] = { ...newBoard[i], ship: selectedShip.name }),
      );
      setUserBoard(newBoard);

      const remainingShips = availableShips.filter(
        (s) => s.name !== selectedShip.name,
      );
      setAvailableShips(remainingShips);
      setSelectedShip(remainingShips[0] || null);
    }
  };

  const handleReady = () => {
    setIsReady(true);
    if (mode === "multi") {
      socket.emit("player-ready", { roomCode: roomId });
    }
    if (enemyReady) {
      setGameState("playing");
      setTurn(mode === "multi" ? "user" : "user");
    }
  };

  // start game if both are ready
  useEffect(() => {
    if (
      isReady &&
      enemyReady &&
      gameState === "placement" &&
      availableShips.length === 0
    ) {
      setGameState("playing");
    }
  }, [isReady, enemyReady, gameState, availableShips]);

  // --- GAMEPLAY LOGIC ---
  const handleFire = (index) => {
    if (
      gameState !== "playing" ||
      turn !== "user" ||
      enemyBoard[index].status !== "empty"
    )
      return;

    if (mode === "single") {
      // Fake Bot Logic
      const isHit = Math.random() > 0.7; // 30% chance bot placed a ship here
      setEnemyBoard((prev) => {
        const newBoard = [...prev];
        newBoard[index] = {
          ship: isHit ? "unknown" : null,
          status: isHit ? "hit" : "miss",
        };
        return newBoard;
      });
      playSound(isHit ? "hit" : "miss");
      setTurn("enemy");

      // Bot fires back after delay
      setTimeout(() => {
        if (gameState === "gameover") return;
        let botTarget;
        do {
          botTarget = Math.floor(Math.random() * (gridSize * gridSize));
        } while (userBoard[botTarget].status !== "empty");

        setUserBoard((prev) => {
          const newBoard = [...prev];
          const cell = newBoard[botTarget];
          const botIsHit = cell.ship !== null;
          newBoard[botTarget] = { ...cell, status: botIsHit ? "hit" : "miss" };
          playSound(botIsHit ? "hit" : "miss");
          setTurn("user");
          return newBoard;
        });
      }, 1000);
    } else {
      // Multiplayer logic
      setTurn("enemy"); // Lock board immediately
      socket.emit("fire", { roomCode: roomId, id: index });
    }
  };

  // --- RENDER HELPERS ---
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    gap: "2px",
    backgroundColor: "#cbd5e1", // slate-300 gap color
    border: "2px solid #cbd5e1",
    width: "100%",
    aspectRatio: "1 / 1",
  };

  const getCellColor = (cell, isEnemy) => {
    // animate-pulse for a fresh hit, scale-up for an explosion feel
    if (cell.status === "hit")
      return "bg-red-500 animate-[pulse_0.5s_ease-in-out] scale-95 rounded-sm";

    // soft fade for a miss
    if (cell.status === "miss")
      return "bg-white opacity-80 scale-95 rounded-sm transition-all duration-300";

    // Highlight user ships
    if (!isEnemy && cell.ship) return "bg-slate-800 shadow-inner rounded-sm";

    // Base water styling
    return "bg-blue-400 hover:bg-blue-300 transition-colors duration-200";
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 md:px-8">
      {/* Header Info */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">
          {mode === "single" ? "Offline Mode" : `Room: ${roomId}`}
        </h2>
        <p className="text-slate-500 mb-4 font-medium uppercase tracking-widest text-sm">
          {myName} <span className="text-blue-400 mx-2">VS</span> {opponentName}
        </p>

        {gameState === "placement" && (
          <p className="text-blue-600 font-medium">
            Position your fleet, {myName}.
          </p>
        )}
        {gameState === "playing" && (
          <p
            className={`text-xl font-bold ${turn === "user" ? "text-green-600" : "text-orange-500"}`}
          >
            {turn === "user" ? "YOUR TURN" : "ENEMY IS AIMING..."}
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl justify-center items-start">
        {/* USER BOARD */}
        <div className="flex-1 w-full max-w-md mx-auto">
          <h3 className="text-center font-semibold mb-2">{myName}'s Waters</h3>
          <div style={gridStyle}>
            {userBoard.map((cell, index) => (
              <div
                key={`user-${index}`}
                onClick={() => handlePlaceShip(index)}
                className={`${getCellColor(cell, false)} cursor-pointer transition-colors`}
              />
            ))}
          </div>
        </div>

        {/* ENEMY BOARD */}
        <div className="flex-1 w-full max-w-md mx-auto">
          <h3 className="text-center font-semibold mb-2 text-slate-700">
            {opponentName}'s Waters
          </h3>
          <div
            style={gridStyle}
            className={
              turn !== "user" || gameState !== "playing"
                ? "opacity-75 pointer-events-none"
                : ""
            }
          >
            {enemyBoard.map((cell, index) => (
              <div
                key={`enemy-${index}`}
                onClick={() => handleFire(index)}
                className={`${getCellColor(cell, true)} cursor-pointer transition-colors`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PLACEMENT CONTROLS */}
      {gameState === "placement" && (
        <div className="mt-8 w-full max-w-2xl bg-white p-6 border border-slate-200 rounded text-center">
          {availableShips.length > 0 ? (
            <>
              <h3 className="font-semibold mb-4 text-slate-700">
                Select ship & tap your board to place
              </h3>
              <div className="flex flex-wrap justify-center gap-4 mb-4">
                {availableShips.map((ship) => (
                  <button
                    key={ship.name}
                    onClick={() => setSelectedShip(ship)}
                    className={`px-4 py-2 rounded font-medium border-2 capitalize ${selectedShip?.name === ship.name ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}
                  >
                    {ship.name} ({ship.length})
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="text-sm font-medium text-slate-500 underline"
              >
                Currently placing:{" "}
                {isHorizontal ? "Horizontally" : "Vertically"} (Tap to switch)
              </button>
            </>
          ) : (
            <div>
              <p className="text-green-600 font-bold mb-4">
                All ships deployed!
              </p>
              <button
                onClick={handleReady}
                disabled={isReady}
                className="bg-slate-900 text-white px-8 py-3 rounded font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {isReady ? "Waiting for enemy..." : "READY TO BATTLE"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === "gameover" && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-lg max-w-sm w-full text-center text-slate-800">
            <h1
              className={`text-4xl font-extrabold mb-2 ${winner === "user" ? "text-green-500" : "text-red-500"}`}
            >
              {winner === "user" ? "VICTORY!" : "DEFEAT!"}
            </h1>
            <p className="mb-8 text-slate-500">
              {winner === "user"
                ? "You annihilated the enemy fleet."
                : "Your fleet rests at the bottom of the ocean."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors"
            >
              Return to Base
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
