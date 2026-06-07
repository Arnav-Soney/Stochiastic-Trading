import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TradingProvider } from './store/useTradingStore';
import { LandingPage } from './pages/LandingPage';
import { SimulationArena } from './pages/SimulationArena';
import { LiveArena } from './pages/LiveArena';
// @ts-ignore
import GrowwAlgoDashboard from './pages/GrowwAlgoDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <TradingProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/trade/simulation" element={<SimulationArena />} />
          <Route path="/trade/live" element={<LiveArena />} />
          <Route path="/trade/algos" element={<GrowwAlgoDashboard />} />
        </Routes>
      </TradingProvider>
    </BrowserRouter>
  );
}
