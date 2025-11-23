import React from 'react';

interface VisualizerProps {
  volume: number; // 0 to 100
  isActive: boolean;
  state: 'listening' | 'speaking' | 'idle';
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, state }) => {
  // Create a set of bars that react to volume
  const bars = Array.from({ length: 5 });

  return (
    <div className="relative flex items-center justify-center h-32 w-32 mx-auto mb-6">
      {/* Outer Glow */}
      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
        isActive 
          ? state === 'listening' 
            ? 'bg-blue-100 scale-125 opacity-50' 
            : 'bg-emerald-100 scale-110 opacity-50'
          : 'bg-gray-100 scale-100 opacity-20'
      }`} />

      {/* Inner Circle */}
      <div className={`relative z-10 flex items-center justify-center h-24 w-24 rounded-full shadow-lg transition-colors duration-300 ${
        isActive
          ? state === 'listening'
            ? 'bg-blue-600'
            : 'bg-emerald-500'
          : 'bg-gray-300'
      }`}>
        {/* Icon */}
        {isActive ? (
          <div className="flex items-end justify-center gap-1 h-8">
             {bars.map((_, i) => {
               // Simple fake visualization logic
               // We use the volume prop to scale heights randomly but somewhat related to volume
               const height = Math.max(4, Math.min(24, volume * (0.5 + Math.random()) * 0.8));
               
               return (
                 <div
                   key={i}
                   className="w-1.5 bg-white rounded-full transition-all duration-75"
                   style={{ 
                     height: `${isActive ? height : 4}px`,
                     opacity: isActive ? 1 : 0.5 
                   }}
                 />
               );
             })}
          </div>
        ) : (
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>
      
      {/* Status Text Badge */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          isActive
          ? state === 'listening' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'
          : 'text-gray-500'
        }`}>
          {isActive ? (state === 'listening' ? 'Listening...' : 'Lingo Speaking') : 'Tap to Start'}
        </span>
      </div>
    </div>
  );
};

export default Visualizer;
