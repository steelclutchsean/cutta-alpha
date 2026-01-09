'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  shortName: string;
  seed: number | null;
  region: string | null;
}

interface WheelSpinProps {
  teams: Team[];
  targetTeamId: string | null;
  isSpinning: boolean;
  spinDuration?: number;
  onSpinComplete?: (team: Team) => void;
  assignedUserName?: string;
}

// NFL team colors for visual appeal
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  KC: { primary: '#E31837', secondary: '#FFB612' },
  NE: { primary: '#002244', secondary: '#C60C30' },
  PIT: { primary: '#FFB612', secondary: '#101820' },
  HOU: { primary: '#03202F', secondary: '#A71930' },
  BUF: { primary: '#00338D', secondary: '#C60C30' },
  JAX: { primary: '#006778', secondary: '#D7A22A' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E' },
  DET: { primary: '#0076B6', secondary: '#B0B7BC' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF' },
  CAR: { primary: '#0085CA', secondary: '#101820' },
  CHI: { primary: '#C83803', secondary: '#0B162A' },
  GB: { primary: '#203731', secondary: '#FFB612' },
  SF: { primary: '#AA0000', secondary: '#B3995D' },
  LAR: { primary: '#003594', secondary: '#FFA300' },
};

const DEFAULT_COLORS = { primary: '#6366f1', secondary: '#a855f7' };

export default function WheelSpin({
  teams,
  targetTeamId,
  isSpinning,
  spinDuration = 5000,
  onSpinComplete,
  assignedUserName,
}: WheelSpinProps) {
  const [rotation, setRotation] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [idleRotation, setIdleRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle single team edge case - still show a full wheel but with one segment
  const segmentAngle = teams.length > 0 ? 360 / Math.max(teams.length, 1) : 360;
  const showSingleTeamMode = teams.length === 1;

  // Idle rotation animation - slow continuous spin when not actively spinning
  useEffect(() => {
    if (!isSpinning && teams.length > 0) {
      // Start idle rotation
      idleIntervalRef.current = setInterval(() => {
        setIdleRotation(prev => prev + 0.3); // Slow rotation speed
      }, 50);

      return () => {
        if (idleIntervalRef.current) {
          clearInterval(idleIntervalRef.current);
        }
      };
    } else {
      // Stop idle rotation when spinning
      if (idleIntervalRef.current) {
        clearInterval(idleIntervalRef.current);
        idleIntervalRef.current = null;
      }
    }
  }, [isSpinning, teams.length]);

  // Calculate target rotation to land on specific team
  const calculateTargetRotation = useCallback((teamId: string) => {
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return 0;

    // Calculate angle to center the team at the top (pointer position)
    const baseAngle = teamIndex * segmentAngle;
    // Add extra rotations for dramatic effect (5-7 full spins)
    const extraRotations = (5 + Math.random() * 2) * 360;
    // Offset to center the segment under the pointer
    const centerOffset = segmentAngle / 2;
    
    return extraRotations + (360 - baseAngle) - centerOffset;
  }, [teams, segmentAngle]);

  // Handle spin animation
  useEffect(() => {
    if (isSpinning && targetTeamId) {
      const targetRotation = calculateTargetRotation(targetTeamId);
      const startRotation = rotation + idleRotation;
      
      controls.start({
        rotate: startRotation + targetRotation,
        transition: {
          duration: spinDuration / 1000,
          ease: [0.2, 0.8, 0.3, 1], // Custom easing for realistic wheel physics
        },
      }).then(() => {
        setRotation(startRotation + targetRotation);
        setIdleRotation(0); // Reset idle rotation
        const team = teams.find(t => t.id === targetTeamId);
        if (team) {
          setSelectedTeam(team);
          setShowCelebration(true);
          onSpinComplete?.(team);
          
          // Hide celebration after 3 seconds
          setTimeout(() => setShowCelebration(false), 3000);
        }
      });
    }
  }, [isSpinning, targetTeamId, calculateTargetRotation, controls, spinDuration, teams, onSpinComplete, rotation, idleRotation]);

  const getTeamColors = (shortName: string) => {
    return TEAM_COLORS[shortName] || DEFAULT_COLORS;
  };

  // Combined rotation (idle + actual rotation)
  const currentRotation = isSpinning ? rotation : rotation + idleRotation;

  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel Container */}
      <div className="relative w-80 h-80 md:w-96 md:h-96">
        {/* Outer Ring Glow - pulsing when idle, brighter when spinning */}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/30 via-gold-500/30 to-primary-500/30 blur-xl transition-opacity duration-500 ${
            isSpinning ? 'opacity-100 animate-pulse' : 'opacity-60'
          }`} 
        />
        
        {/* Ambient light rays when idle */}
        {!isSpinning && teams.length > 0 && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div 
              className="absolute inset-[-50%] opacity-20"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,191,0,0.3), transparent, rgba(99,102,241,0.3), transparent)',
                animation: 'spin 8s linear infinite',
              }}
            />
          </div>
        )}
        
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <motion.div 
            animate={isSpinning ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.2, repeat: isSpinning ? Infinity : 0 }}
            className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[24px] border-l-transparent border-r-transparent border-t-gold-400 drop-shadow-lg"
          />
        </div>

        {/* Main Wheel */}
        <motion.div
          ref={wheelRef}
          animate={isSpinning ? controls : { rotate: currentRotation }}
          transition={isSpinning ? undefined : { duration: 0.05, ease: 'linear' }}
          className="absolute inset-4 rounded-full overflow-hidden shadow-2xl"
          style={!isSpinning ? { rotate: currentRotation } : undefined}
        >
          {/* Wheel Segments */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {teams.map((team, index) => {
              const startAngle = index * segmentAngle - 90; // Start from top
              const endAngle = (index + 1) * segmentAngle - 90;
              const colors = getTeamColors(team.shortName);
              
              // Calculate SVG arc path
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              const largeArc = segmentAngle > 180 ? 1 : 0;

              return (
                <g key={team.id}>
                  {/* Segment */}
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={index % 2 === 0 ? colors.primary : colors.secondary}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.5"
                  />
                  {/* Team Label */}
                  <text
                    x="50"
                    y="50"
                    fill="white"
                    fontSize="3.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`
                      rotate(${startAngle + segmentAngle / 2 + 90}, 50, 50)
                      translate(0, -35)
                    `}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {team.shortName}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center Hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-dark-700 to-dark-900 border-4 border-gold-500 shadow-xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gold-400" />
            </div>
          </div>
        </motion.div>

        {/* Tick Marks */}
        <div className="absolute inset-0 rounded-full pointer-events-none">
          {Array.from({ length: teams.length }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-3 bg-white/30 origin-bottom"
              style={{
                left: '50%',
                top: '4px',
                transform: `translateX(-50%) rotate(${i * segmentAngle}deg)`,
                transformOrigin: '50% calc(50vw - 4px)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Status Display */}
      <div className="mt-6 text-center">
        {isSpinning ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel !p-4 !rounded-2xl"
          >
            <p className="text-lg font-medium text-white">Spinning for...</p>
            <p className="text-2xl font-bold text-gold-400">{assignedUserName}</p>
          </motion.div>
        ) : selectedTeam && showCelebration ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel !p-6 !rounded-2xl glass-border-animated"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-gold-400" />
              <span className="text-sm font-medium text-gold-400">SELECTED!</span>
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{selectedTeam.name}</p>
            <p className="text-dark-400">
              {selectedTeam.region} #{selectedTeam.seed}
            </p>
            {assignedUserName && (
              <p className="mt-2 text-primary-400">
                Assigned to <span className="font-bold">{assignedUserName}</span>
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card !p-4"
          >
            <p className="text-dark-300 font-medium">
              {showSingleTeamMode ? 'Final Team!' : 'Ready to spin'}
            </p>
            <p className="text-sm text-dark-500">
              {teams.length} {teams.length === 1 ? 'team' : 'teams'} on the wheel
            </p>
          </motion.div>
        )}
      </div>

      {/* Celebration Particles */}
      <AnimatePresence>
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#fbbf24' : '#a855f7',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* CSS for conic gradient animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Export a mini version for previews
export function WheelSpinMini({ teams }: { teams: Team[] }) {
  const segmentAngle = teams.length > 0 ? 360 / teams.length : 360;

  return (
    <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg animate-[spin_20s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {teams.map((team, index) => {
          const startAngle = index * segmentAngle - 90;
          const endAngle = (index + 1) * segmentAngle - 90;
          const colors = TEAM_COLORS[team.shortName] || DEFAULT_COLORS;
          
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 50 + 50 * Math.cos(startRad);
          const y1 = 50 + 50 * Math.sin(startRad);
          const x2 = 50 + 50 * Math.cos(endRad);
          const y2 = 50 + 50 * Math.sin(endRad);

          return (
            <path
              key={team.id}
              d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
              fill={index % 2 === 0 ? colors.primary : colors.secondary}
            />
          );
        })}
        {/* Center */}
        <circle cx="50" cy="50" r="15" fill="#1f2937" stroke="#fbbf24" strokeWidth="2" />
      </svg>
    </div>
  );
}
