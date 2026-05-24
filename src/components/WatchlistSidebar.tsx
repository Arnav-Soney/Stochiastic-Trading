import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { Eye, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';

export const WatchlistSidebar: React.FC = () => {
  const { prices, tradingMode, liveAssets, selectedAsset, setSelectedAsset } = useTradingStore();
  
  // Local state for watchlist logic (can be moved to store later)
  const defaultWatchlist = tradingMode === 'LIVE' ? ['RELIANCE', 'TCS', 'ZOMATO'] : ['BTC', 'ETH'];
  const [watchlist, setWatchlist] = useState<string[]>(defaultWatchlist);
  const [isAdding, setIsAdding] = useState(false);
  const [newAsset, setNewAsset] = useState('');

  const availableAssets = tradingMode === 'LIVE' ? liveAssets : ['BTC', 'ETH', 'SOL', 'ADA', 'XRP'];
  const currencySymbol = tradingMode === 'LIVE' ? '₹' : '$';

  const handleAdd = () => {
    if (newAsset && !watchlist.includes(newAsset) && availableAssets.includes(newAsset)) {
      setWatchlist([...watchlist, newAsset]);
    }
    setNewAsset('');
    setIsAdding(false);
  };

  const handleRemove = (asset: string) => {
    setWatchlist(watchlist.filter(a => a !== asset));
  };

  return (
    <div className="cyber-panel h-full flex flex-col p-4 w-64 bg-bgDark border-r border-white/5">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-neonCyan">
          <Eye size={18} />
          <h2 className="font-orbitron font-bold text-sm tracking-widest">WATCHLIST</h2>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 flex gap-2">
          <select
            value={newAsset}
            onChange={(e) => setNewAsset(e.target.value)}
            className="flex-1 bg-bgSecondary border border-white/10 text-xs p-2 rounded text-white [&>option]:bg-gray-800 [&>option]:text-white"
            style={{
              colorScheme: 'dark'
            }}
          >
            <option value="" style={{backgroundColor: '#1f2937', color: '#fff'}}>Select...</option>
            {availableAssets.filter(a => !watchlist.includes(a)).map(a => (
              <option key={a} value={a} style={{backgroundColor: '#1f2937', color: '#fff'}}>{a}</option>
            ))}
          </select>
          <button 
            onClick={handleAdd}
            className="px-3 bg-neonCyan text-black text-xs font-bold rounded"
          >
            ADD
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {watchlist.map(asset => {
          const price = prices[asset] || 0;
          // Mock 24h change for UI effect
          const change = (Math.random() * 4 - 2).toFixed(2);
          const isPos = Number(change) >= 0;

          return (
            <div 
              key={asset}
              className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-all border ${
                selectedAsset === asset 
                  ? 'bg-white/10 border-neonCyan/50' 
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'
              }`}
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="flex flex-col">
                <span className="font-bold text-sm">{asset}</span>
                <span className="text-xs text-gray-400 font-mono">
                  {currencySymbol}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-xs font-mono ${isPos ? 'text-neonEmerald' : 'text-neonCrimson'}`}>
                  {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(Number(change))}%
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemove(asset); }}
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
        {watchlist.length === 0 && (
          <div className="text-center text-xs text-gray-500 mt-10">
            Empty Watchlist
          </div>
        )}
      </div>
    </div>
  );
};
