import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function VaaniLogo({ isAnimating = false }) {
  const [intensity, setIntensity] = useState(1);

  // Voice animation effect
  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setIntensity(prev => (prev === 1 ? 1.2 : 1));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isAnimating]);

  return (
    <motion.div className="relative w-24 h-24">
      {/* Main Logo Container */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: intensity }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* V Shape with Gradient */}
        <motion.div 
          className="w-20 h-20 relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left part of V */}
          <motion.div 
            className="absolute left-0 top-0 w-3 h-16 rounded-full transform -rotate-45"
            style={{
              background: 'linear-gradient(to bottom, #cc2b5e, #753a88)',
              filter: 'blur(1px)'
            }}
            animate={{
              scale: isAnimating ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
          />
          
          {/* Right part of V */}
          <motion.div 
            className="absolute right-0 top-0 w-3 h-16 rounded-full transform rotate-45"
            style={{
              background: 'linear-gradient(to bottom, #cc2b5e, #753a88)',
              filter: 'blur(1px)'
            }}
            animate={{
              scale: isAnimating ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0, delay: 0.25 }}
          />
        </motion.div>
      </motion.div>

      {/* Voice Animation Rings */}
      {isAnimating && (
        <motion.div 
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-purple-500/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.5, 2],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default VaaniLogo; 