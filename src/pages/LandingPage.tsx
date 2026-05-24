import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Shield, ChevronRight, BarChart2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bgDark text-white overflow-x-hidden font-inter selection:bg-neonCyan selection:text-black">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-bgDark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-neonCyan flex items-center justify-center text-bgDark font-bold">
              <Activity size={20} />
            </div>
            <span className="font-orbitron font-bold text-xl tracking-wider">STOCH<span className="text-neonCyan">-AI</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-neonCyan transition-colors">Features</a>
            <a href="#markets" className="hover:text-neonCyan transition-colors">Markets</a>
            <a href="#pricing" className="hover:text-neonCyan transition-colors">Pricing</a>
          </div>
          <button 
            onClick={() => navigate('/trade')}
            className="px-6 py-2 bg-neonCyan/10 border border-neonCyan text-neonCyan font-medium rounded-sm hover:bg-neonCyan hover:text-bgDark transition-all duration-300 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
          >
            Launch Terminal
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-bgDark/50 via-bgDark to-bgDark" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-neonCyan mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonCyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neonCyan"></span>
            </span>
            Live Market Engine v2.0 Online
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl lg:text-7xl font-orbitron font-bold leading-tight mb-6"
          >
            Institutional-Grade <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-blue-500">
              Algorithmic Execution.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-10 font-light"
          >
            Deploy HFT sequences, run Monte Carlo tail-risk simulations, and access low-latency market data directly through your browser. No downloads required.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button 
              onClick={() => navigate('/trade')}
              className="px-8 py-4 bg-neonCyan text-bgDark font-bold rounded-sm hover:bg-white hover:shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              Start Trading 
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-sm hover:bg-white/10 transition-all duration-300">
              View Documentation
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-bgDark relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-orbitron font-bold mb-4">Unfair Advantage.</h2>
            <p className="text-gray-400">Advanced quantitative tools previously restricted to hedge funds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="text-neonCyan" size={32} />, title: 'Real-Time Streaming', desc: 'Direct WebSocket integration with zero-latency market ticking and execution.' },
              { icon: <BarChart2 className="text-neonCyan" size={32} />, title: 'Monte Carlo Simulations', desc: 'Project portfolio tail risks and visualize probabilistic outcomes.' },
              { icon: <Shield className="text-neonCyan" size={32} />, title: 'JARVIS Copilot', desc: 'Context-aware AI that writes custom TradingView strategies on the fly.' }
            ].map((feat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                key={i} 
                className="p-8 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-neonCyan/30 transition-colors group"
              >
                <div className="w-16 h-16 rounded-full bg-neonCyan/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 font-orbitron">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
