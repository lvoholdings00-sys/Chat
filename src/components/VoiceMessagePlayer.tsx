import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Mic } from 'lucide-react';

interface VoiceMessagePlayerProps {
  url: string;
  duration?: number;
  fileName?: string;
  isMe?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  url,
  duration = 0,
  fileName = 'Voice Note',
  isMe = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Generate deterministic waveform bar heights from url string
  const waveformBars = useMemo(() => {
    const barsCount = 28;
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (hash * 31 + url.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < barsCount; i++) {
      // Generate pleasing wave envelope: lower at edges, varied in middle
      const seed = Math.abs(Math.sin(hash + i * 1.7) * 10000);
      const rand = seed - Math.floor(seed);
      const envelope = Math.sin((i / (barsCount - 1)) * Math.PI) * 0.5 + 0.5;
      const height = Math.max(22, Math.min(95, Math.round((rand * 0.65 + 0.35) * envelope * 100)));
      bars.push(height);
    }
    return bars;
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setIsReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && totalDuration === 0) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [totalDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn('Audio playback prevented or failed:', err);
      });
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = waveformRef.current;
    if (!audio || !container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetDuration = totalDuration > 0 ? totalDuration : audio.duration || 1;
    const newTime = fraction * targetDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audio) {
      audio.playbackRate = nextRate;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audio.play().catch(() => {});
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressFraction = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div
      className={`rounded-2xl p-3 select-none transition-all ${
        isMe
          ? 'bg-gradient-to-r from-indigo-950/40 via-indigo-900/30 to-purple-950/30 border border-indigo-500/30'
          : 'bg-[#151722] border border-white/10 hover:border-white/20'
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Top Header info */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Mic className="w-3 h-3" />
          </div>
          <span className="font-semibold text-neutral-200 text-[11px] truncate max-w-[160px]">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Playback speed toggle */}
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-mono text-[10px] transition-colors"
            title="Adjust playback speed"
          >
            {playbackRate}x
          </button>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={resetAudio}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main playback control row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-95 ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 ring-2 ring-rose-500/20'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
        </button>

        {/* Interactive Waveform Scrubber */}
        <div className="flex-1 min-w-0">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="h-9 flex items-center gap-[2.5px] cursor-pointer group py-1"
            title="Click to seek"
          >
            {waveformBars.map((heightPercent, idx) => {
              const barFraction = (idx + 0.5) / waveformBars.length;
              const hasPlayed = barFraction <= progressFraction;

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[2px] rounded-full transition-all duration-75 flex items-center justify-center"
                  style={{ height: '100%' }}
                >
                  <div
                    className={`w-full rounded-full transition-all duration-100 ${
                      hasPlayed
                        ? 'bg-gradient-to-t from-indigo-400 to-sky-300 group-hover:from-indigo-300 group-hover:to-sky-200 shadow-xs shadow-sky-400/30'
                        : 'bg-white/20 group-hover:bg-white/30'
                    }`}
                    style={{
                      height: `${heightPercent}%`,
                      transform: isPlaying && hasPlayed ? 'scaleY(1.08)' : 'scaleY(1)',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Time tracker */}
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-0.5 mt-0.5">
            <span className={isPlaying ? 'text-indigo-300 font-semibold' : ''}>
              {formatTime(currentTime)}
            </span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
