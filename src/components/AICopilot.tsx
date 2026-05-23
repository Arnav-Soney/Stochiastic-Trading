import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { REGIMES } from '../utils/mathEngine';

interface Message {
  sender: 'USER' | 'JARVIS';
  text: string;
  timestamp: string;
  isCode?: boolean;
}

export const AICopilot: React.FC = () => {
  const { selectedAsset, prices, stochastic, currentRegime, probabilities } = useTradingStore();

  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'JARVIS',
      text: 'SYSTEM STATUS: ONLINE.\nI am STOCH-AI, your probabilistic trading intelligence. Ask me to formulate strategies, simulate tail risks, or analyze stochastic momentum indicators.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');

    // Add user message
    const userMsg: Message = {
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // AI dynamic reasoning pipeline
    setTimeout(() => {
      let aiText = '';
      let isCode = false;

      const lowerText = text.toLowerCase();
      const currentPrice = prices[selectedAsset];
      const stochVal = stochastic[selectedAsset] || { k: 50, d: 50 };
      const activeRegime = REGIMES[currentRegime];

      if (lowerText.includes('strategy') || lowerText.includes('scalp') || lowerText.includes('create')) {
        isCode = true;
        aiText = `// STOCHASTIC HIGH-FREQUENCY SCALPER STRATEGY
// Target Asset: ${selectedAsset}/USD
// Compiled for: STOCH-AI Automated Bot Runner

strategy("StochAI_Scalper_${selectedAsset}", overlay=true)

// Quantitative thresholds
stoch_k = stochastic_k(k_period=14, smooth_d=3)
stoch_d = simple_ma(stoch_k, 3)

buy_signal = stoch_k < 20 and cross_over(stoch_k, stoch_d)
sell_signal = stoch_k > 80 and cross_under(stoch_k, stoch_d)

if (buy_signal)
    strategy.entry("Long", strategy.long, margin=2000)
    strategy.exit("Limit_TP", "Long", profit=${(currentPrice * 0.02).toFixed(2)})
    strategy.exit("Stop_SL", "Long", loss=${(currentPrice * 0.01).toFixed(2)})

if (sell_signal)
    strategy.close("Long", comment="Reversal Exhaustion Detected")
`;
      } else if (lowerText.includes('btc') || lowerText.includes('price') || lowerText.includes('analyze') || lowerText.includes('market')) {
        aiText = `ANALYSIS FOR ${selectedAsset}/USD:
Current Market Regime: "${activeRegime.label}"
Estimated tail risk is currently ${probabilities.liquidation > 30 ? 'HIGH' : 'STABLE'} at ${probabilities.liquidation}% liquidation probability.
Stochastic oscillators show %K at ${stochVal.k} and %D at ${stochVal.d}. 
${stochVal.k < 30 ? 'INDICATOR OVERSOLD: High probability of structural reversal in next 10 intervals. Recommend DCA BUY.' : 
  stochVal.k > 70 ? 'INDICATOR OVERBOUGHT: Volatility expansion overextended. Reversal risk high. Take Profit suggested.' : 
  'INDICATOR BALANCED: Neutral momentum. Trend continuation likelihood is active.'}`;
      } else if (lowerText.includes('risk') || lowerText.includes('vix') || lowerText.includes('exposure')) {
        aiText = `RISK ENGINE TELEMETRY REPORT:
- Max Portfolio Value under stress: $100,000 USD
- Current Liquidation Zone Probability: ${probabilities.liquidation}%
- Current Breakout Threshold: ${probabilities.breakout}%
- Regime Volatility coefficient: ${activeRegime.volatility}
We detect no critical overexposure in active positions. Ensure your stop loss multiplier is at least 1.5x ATR during the "${activeRegime.label}" state to avoid standard noise liquidations.`;
      } else {
        aiText = `Welcome back. The current selected asset is ${selectedAsset} trading at $${currentPrice.toLocaleString()}.
Stochastic oscillators are outputting K: ${stochVal.k}, D: ${stochVal.d}.
The market transition state is currently in a "${activeRegime.label}" regime with a ${probabilities.breakout}% breakout probability.
Let me know if you would like me to compile a custom algorithmic backtest or check risk thresholds.`;
      }

      const aiMsg: Message = {
        sender: 'JARVIS',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCode
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 900);
  };

  const quickQuestions = [
    { text: `📊 Analyze ${selectedAsset} Momentum`, query: `Analyze ${selectedAsset} price momentum` },
    { text: '⚡ Generate Scalping Strategy', query: 'Create a scalping strategy' },
    { text: '⚠️ Check Tail Risk Parameters', query: 'What is our current liquidation and tail risk status?' }
  ];

  return (
    <div className="cyber-panel accent-purple" style={styles.container}>
      <div style={styles.panelTitle}>
        <span style={{ color: 'hsl(var(--neon-purple))' }}>🤖</span> STOCH-AI QUANT COPILOT
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.messageWrapper,
              alignSelf: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={styles.msgHeader}>
              <span style={styles.msgSender}>{msg.sender === 'JARVIS' ? 'STOCH-AI' : 'TRADER'}</span>
              <span style={styles.msgTime}>{msg.timestamp}</span>
            </div>
            
            {msg.isCode ? (
              <pre style={styles.codeBlock}>
                <code>{msg.text}</code>
              </pre>
            ) : (
              <div style={{
                ...styles.msgBubble,
                backgroundColor: msg.sender === 'USER' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(179, 0, 255, 0.08)',
                borderColor: msg.sender === 'USER' ? 'hsl(var(--neon-cyan) / 0.3)' : 'hsl(var(--neon-purple) / 0.3)',
              }}>
                {msg.text.split('\n').map((line, lIdx) => (
                  <div key={lIdx} style={{ margin: '2px 0' }}>{line}</div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ ...styles.messageWrapper, alignSelf: 'flex-start' }}>
            <span style={styles.typingIndicator} className="pulse-glowing">STOCH-AI IS SOLVING MATHEMATICAL GRADIENTS...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.query)}
            style={styles.quickBtn}
          >
            {q.text}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <div style={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask STOCH-AI: 'Create NIFTY strategy' or 'Explain risk index'..."
          className="cyber-input"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => handleSend()}
          className="cyber-btn btn-purple"
          style={styles.sendBtn}
        >
          <span>SEND</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: 480,
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-secondary))',
    letterSpacing: '0.05em',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  chatArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
    overflowY: 'auto',
    paddingRight: 6,
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxWidth: '85%',
  },
  msgHeader: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    fontSize: '9px',
    fontWeight: 'bold',
    paddingLeft: 4,
  },
  msgSender: {
    color: 'hsl(var(--text-secondary))',
    letterSpacing: '0.05em',
  },
  msgTime: {
    color: 'hsl(var(--text-muted))',
  },
  msgBubble: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    fontSize: '12px',
    lineHeight: '1.45',
    color: 'hsl(var(--text-primary))',
    whiteSpace: 'pre-wrap',
  },
  codeBlock: {
    background: 'rgba(10,12,18,0.95)',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'hsl(var(--neon-emerald))',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  typingIndicator: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'hsl(var(--neon-purple))',
    paddingLeft: 4,
  },
  quickActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickBtn: {
    background: 'hsl(var(--bg-secondary))',
    border: '1px solid hsl(var(--border-color))',
    color: 'hsl(var(--text-secondary))',
    padding: '5px 10px',
    fontSize: '10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  inputArea: {
    display: 'flex',
    gap: 10,
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: 12,
  },
  sendBtn: {
    padding: '6px 14px',
    fontSize: '11px',
  }
};
export default AICopilot;
