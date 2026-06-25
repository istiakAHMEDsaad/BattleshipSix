import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Game from "./pages/Game";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
    </div>
  );
}

export default App;
