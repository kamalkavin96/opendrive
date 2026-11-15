import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  MdForward10,
  MdMusicNote,
  MdPause,
  MdPlayArrow,
  MdRepeat,
  MdReplay10,
  MdVolumeOff,
  MdVolumeUp,
} from 'react-icons/md';

import type { PreviewProps } from '../previewTypes';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const controlSx = {
  color: '#fff',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
};

const sliderSx = {
  color: '#fff',
  height: 4,
  '& .MuiSlider-thumb': {
    width: 12,
    height: 12,
    '&:hover, &.Mui-focusVisible': {
      boxShadow: '0 0 0 8px rgba(255,255,255,0.16)',
    },
  },
  '& .MuiSlider-rail': { opacity: 0.3 },
};

export default function AudioPreview({ file, src }: Readonly<PreviewProps>) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState<number | null>(null); // value while dragging

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);

  // Reset when the file changes
  useEffect(() => {
    setPlaying(false);
    setWaiting(true);
    setError(null);
    setCurrent(0);
    setDuration(0);
    setSeeking(null);
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err: unknown) => {
        // AbortError happens when src changes mid-play; not a real failure
        if ((err as DOMException)?.name !== 'AbortError') {
          console.error('Audio play error:', err);
          setError('Unable to play this audio file.');
        }
      });
    } else {
      audio.pause();
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), max);
  }, []);

  const changeVolume = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(1, Math.max(0, audio.volume + delta));
    audio.volume = next;
    audio.muted = false;
    setVolume(next);
    setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }, []);

  const cycleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    audio.playbackRate = next;
    setRate(next);
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !loop;
    setLoop(!loop);
  };

  // Keyboard shortcuts (ignored while typing or dragging a slider)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, changeVolume, toggleMute]);

  const shownTime = seeking ?? current;
  const hasDuration = Number.isFinite(duration) && duration > 0;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: '#2b2b2b',
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setWaiting(false);
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (seeking === null) setCurrent(e.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onPlaying={() => setWaiting(false)}
        onError={() => {
          setWaiting(false);
          setError('Unable to load this audio file. The format may not be supported.');
        }}
      >
        <track kind="captions" />
      </audio>

      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          p: 3,
          borderRadius: 3,
          bgcolor: 'rgba(15,15,15,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: '#fff',
        }}
      >
        {/* Artwork + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              flexShrink: 0,
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.08)',
            }}
          >
            <MdMusicNote size={32} />
          </Box>
          <Typography fontSize={15} fontWeight={600} sx={{ minWidth: 0, wordBreak: 'break-word' }}>
            {file.fileName}
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Seek bar */}
            <Slider
              size="small"
              min={0}
              max={hasDuration ? duration : 1}
              step={0.1}
              value={Math.min(shownTime, hasDuration ? duration : 1)}
              disabled={!hasDuration}
              onChange={(_, v) => setSeeking(v as number)}
              onChangeCommitted={(_, v) => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = v as number;
                setCurrent(v as number);
                setSeeking(null);
              }}
              aria-label="Seek"
              sx={sliderSx}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
              <Typography fontSize={12} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {formatTime(shownTime)}
              </Typography>
              <Typography fontSize={12} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {hasDuration ? formatTime(duration) : '--:--'}
              </Typography>
            </Box>

            {/* Transport controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 1,
              }}
            >
              <Tooltip title="Back 10 seconds">
                <span>
                  <IconButton onClick={() => skip(-10)} sx={controlSx}>
                    <MdReplay10 size={26} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={playing ? 'Pause (Space)' : 'Play (Space)'}>
                <span>
                  <IconButton
                    onClick={togglePlay}
                    sx={{
                      ...controlSx,
                      width: 56,
                      height: 56,
                      bgcolor: 'rgba(255,255,255,0.14)',
                    }}
                  >
                    {waiting && !playing ? (
                      <CircularProgress size={26} sx={{ color: '#fff' }} />
                    ) : playing ? (
                      <MdPause size={30} />
                    ) : (
                      <MdPlayArrow size={32} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Forward 10 seconds">
                <span>
                  <IconButton onClick={() => skip(10)} sx={controlSx}>
                    <MdForward10 size={26} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {/* Secondary controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mt: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 150 }}>
                <Tooltip title={muted ? 'Unmute (M)' : 'Mute (M)'}>
                  <IconButton size="small" onClick={toggleMute} sx={controlSx}>
                    {muted || volume === 0 ? (
                      <MdVolumeOff size={20} />
                    ) : (
                      <MdVolumeUp size={20} />
                    )}
                  </IconButton>
                </Tooltip>
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(_, v) => {
                    const audio = audioRef.current;
                    const next = v as number;
                    if (audio) {
                      audio.volume = next;
                      audio.muted = false;
                    }
                    setVolume(next);
                    setMuted(false);
                  }}
                  aria-label="Volume"
                  sx={sliderSx}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Playback speed">
                  <Typography
                    fontSize={13}
                    onClick={cycleSpeed}
                    sx={{
                      minWidth: 44,
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                    }}
                  >
                    {rate}x
                  </Typography>
                </Tooltip>

                <Tooltip title={loop ? 'Loop: on' : 'Loop: off'}>
                  <IconButton
                    size="small"
                    onClick={toggleLoop}
                    sx={{
                      ...controlSx,
                      color: loop ? '#4fc3f7' : '#fff',
                    }}
                  >
                    <MdRepeat size={20} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}