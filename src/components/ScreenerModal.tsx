import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, ShieldAlert, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ScreenerModalProps {
  title: string;
  videoUrl: string;
  watermarkText: string;
  onClose: () => void;
}

export const ScreenerModal: React.FC<ScreenerModalProps> = ({
  title,
  videoUrl,
  watermarkText,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showWatermarkAnim, setShowWatermarkAnim] = useState(0);

  // Periodic random shift in watermark placement to simulate dynamic forensic watermarking!
  useEffect(() => {
    const timer = setInterval(() => {
      setShowWatermarkAnim((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.error("Error playing video:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Watermark positioning
  const watermarkPositions = [
    "top-12 left-12 text-left",
    "top-12 right-12 text-right",
    "bottom-16 right-12 text-right",
    "bottom-16 left-12 text-left"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white border border-slate-150 rounded-2xl w-full max-w-4xl overflow-hidden shadow-xl"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <h3 className="font-extrabold text-slate-900 truncate max-w-md">{title} — Movie Preview</h3>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onClick={handlePlayPause}
            className="w-full h-full object-contain"
            playsInline
          />

          {/* Dynamic watermark layer */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10">
            {/* Center static watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <span className="text-3xl md:text-5xl font-sans font-black tracking-wider text-white rotate-12 uppercase">
                {watermarkText.split(' // ')[0] || watermarkText}
              </span>
            </div>

            {/* Dynamic moving identifier */}
            <div className={`absolute transition-all duration-1000 ease-in-out ${watermarkPositions[showWatermarkAnim]}`}>
              <div className="bg-black/40 backdrop-blur-xs border border-white/10 px-3 py-1.5 rounded text-[10px] font-sans text-slate-200 font-medium tracking-wider shadow-lg">
                <span className="uppercase text-white/90">{watermarkText}</span>
              </div>
            </div>
          </div>

          {/* Screener Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            {/* Scrub bar */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-300">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full relative overflow-hidden cursor-pointer"
                   onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const pos = (e.clientX - rect.left) / rect.width;
                     if (videoRef.current) {
                       videoRef.current.currentTime = pos * duration;
                     }
                   }}
              >
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-blue-500"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-300">{formatTime(duration)}</span>
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handlePlayPause}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-full transition-colors active:scale-95"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button 
                  onClick={handleRestart}
                  className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg transition-colors"
                  title="Restart Movie"
                >
                  <RotateCcw size={16} />
                </button>

                <button 
                  onClick={handleMuteToggle}
                  className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg transition-colors"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-900/60 border border-white/10">
                <span className="text-[10px] font-sans text-slate-200 uppercase tracking-wider">Preview mode</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-slate-950 font-bold">Secure Watermarked Preview</div>
            <div className="text-slate-500 text-xs max-w-lg leading-relaxed">
              This video contains a personal watermark to keep content secure before agreements are signed. When you sign the deal, a master clean file is delivered directly.
            </div>
          </div>
          <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 whitespace-nowrap self-start md:self-auto">
            <CheckCircle size={16} />
            <span className="font-bold text-xs uppercase tracking-wider">Ready to watch</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
