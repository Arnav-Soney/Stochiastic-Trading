import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Shield, ChevronRight, BarChart2 } from 'lucide-react';
import { Hero3D } from '../components/Hero3D';

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
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#markets" className="hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-white transition-colors">Enterprise</a>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/trade/simulation')}
              className="px-6 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-sm hover:bg-white hover:text-black transition-all duration-300"
            >
              Sandbox
            </button>
            <button 
              onClick={() => navigate('/trade/live')}
              className="px-6 py-2 bg-neonCyan/10 border border-neonCyan text-neonCyan font-medium rounded-sm hover:bg-neonCyan hover:text-bgDark transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 min-h-screen flex items-center overflow-hidden">
        
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-bgDark via-bgDark/90 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-bgDark/50 via-transparent to-bgDark pointer-events-none z-0" />

        {/* 3D Interactive Object on the right */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-3/5 z-0">
          <Hero3D />
        </div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col items-start text-left lg:w-1/2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 mb-8 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonCyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neonCyan"></span>
            </span>
            Stochiastic Intelligence Engine 4.0 Released
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl lg:text-7xl font-inter font-bold leading-[1.1] tracking-tight mb-6"
          >
            Institutional-Grade <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500">
              Algorithmic Execution.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-gray-400 max-w-xl mb-12 font-light leading-relaxed"
          >
            Deploy high-frequency trading sequences, run robust Monte Carlo tail-risk simulations, and access low-latency market data directly through your browser with unprecedented clarity.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={() => navigate('/trade/live')}
              className="px-8 py-4 bg-white text-black font-medium rounded-sm hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              Start Building
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/trade/algos')}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-sm hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Explore Algorithms
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-bgDark relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-inter font-bold mb-4 tracking-tight">Unfair Advantage.</h2>
            <p className="text-gray-400 text-lg">Advanced quantitative tools previously restricted to hedge funds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="text-white" size={28} />, title: 'Real-Time Streaming', desc: 'Direct WebSocket integration with zero-latency market ticking and execution.' },
              { icon: <BarChart2 className="text-white" size={28} />, title: 'Monte Carlo Simulations', desc: 'Project portfolio tail risks and visualize probabilistic outcomes.' },
              { icon: <Shield className="text-white" size={28} />, title: 'JARVIS Copilot', desc: 'Context-aware AI that writes custom TradingView strategies on the fly.' }
            ].map((feat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                key={i} 
                className="p-10 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-500 group"
              >
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
