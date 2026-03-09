import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Music2, Radio, Zap, ChevronUp, ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

// ─── Playlist ──────────────────────────────────────────────────────────────────
type Track = {
  id: number;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  color: string;
  // YouTube embed ID — usamos apenas o áudio via iframe API
  youtubeId: string;
};

const PLAYLIST: Track[] = [
  { id: 1, title: "Riders on the Storm", artist: "The Doors", genre: "Rock Clássico", bpm: 103, color: "#7c3aed", youtubeId: "IV4PQHbQ_rI" },
  { id: 2, title: "Numb / Encore", artist: "Linkin Park & Jay-Z", genre: "Nu Metal / Hip-Hop", bpm: 114, color: "#dc2626", youtubeId: "1yw1Tgj9-VU" },
  { id: 3, title: "Lose Yourself", artist: "Eminem", genre: "Hip-Hop", bpm: 171, color: "#d97706", youtubeId: "itvJybkiMgU" },
  { id: 4, title: "Headstrong", artist: "Trapt", genre: "Nu Metal", bpm: 148, color: "#059669", youtubeId: "Ycq2uo0OgU8" },
  { id: 5, title: "In the End", artist: "Linkin Park", genre: "Nu Metal", bpm: 105, color: "#0891b2", youtubeId: "eVTXPUF4Oz4" },
  { id: 6, title: "Bring Me to Life", artist: "Evanescence", genre: "Rock", bpm: 93, color: "#9333ea", youtubeId: "3YxaaGgTQYM" },
  { id: 7, title: "Du Hast", artist: "Rammstein", genre: "Industrial Metal", bpm: 130, color: "#b91c1c", youtubeId: "W3q8Od5qJio" },
  { id: 8, title: "Clubbed to Death", artist: "Rob D", genre: "Electronic", bpm: 100, color: "#1d4ed8", youtubeId: "ETAHONhBFpE" },
];

// ─── Visualizer bars ──────────────────────────────────────────────────────────
function VisualizerBars({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-end gap-[2px] h-16 px-2">
      {bars.map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            backgroundColor: color,
            opacity: isPlaying ? 0.7 + Math.random() * 0.3 : 0.2,
            height: isPlaying
              ? `${20 + Math.sin(i * 0.8 + Date.now() * 0.005) * 30 + 20}%`
              : "15%",
            animation: isPlaying ? `pulse ${0.3 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.03}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Format time ──────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MusicPlayer() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "all" | "one">("none");
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [tick, setTick] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const track = PLAYLIST[currentIdx];

  // Visualizer animation tick
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setProgress(0);
    setDuration(0);
    setIsPlaying(true);
  }, []);

  const nextTrack = useCallback(() => {
    if (repeat === "one") {
      setProgress(0);
      setIsPlaying(true);
      return;
    }
    if (shuffle) {
      let next = Math.floor(Math.random() * PLAYLIST.length);
      while (next === currentIdx && PLAYLIST.length > 1) next = Math.floor(Math.random() * PLAYLIST.length);
      goTo(next);
    } else {
      const next = (currentIdx + 1) % PLAYLIST.length;
      if (next === 0 && repeat === "none") {
        setIsPlaying(false);
        setProgress(0);
      } else {
        goTo(next);
      }
    }
  }, [currentIdx, repeat, shuffle, goTo]);

  const prevTrack = useCallback(() => {
    if (progress > 3) {
      setProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    goTo((currentIdx - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, [currentIdx, progress, goTo]);

  const togglePlay = () => setIsPlaying(p => !p);

  // YouTube iframe player via postMessage
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      if (isPlaying) {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      }
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [currentIdx]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (isPlaying) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
  }, [isPlaying]);

  // Simulate progress (YouTube API doesn't expose currentTime easily via postMessage)
  useEffect(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setProgress(p => {
          const estimatedDuration = duration || 240;
          const next = p + 1;
          if (next >= estimatedDuration) {
            nextTrack();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, duration, nextTrack]);

  const handleSeek = (val: number[]) => {
    const t = val[0];
    setProgress(t);
  };

  const estimatedDuration = duration || 240;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(220,38,38,0.1) 0%, transparent 50%), #09090b",
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow behind card */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000 pointer-events-none"
        style={{ background: track.color, top: "30%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      {/* ── CARD ── */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: track.color }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wider">DAP RADIO</span>
          </div>
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 text-xs">LIVE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
          </div>
        </div>

        {/* Album art / visualizer */}
        <div
          className="rounded-2xl overflow-hidden mb-6 relative"
          style={{
            background: `linear-gradient(135deg, ${track.color}22, ${track.color}44)`,
            border: `1px solid ${track.color}33`,
            boxShadow: `0 0 40px ${track.color}22`,
          }}
        >
          {/* Hidden YouTube iframe */}
          <iframe
            ref={iframeRef}
            key={track.youtubeId}
            src={`https://www.youtube.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0`}
            allow="autoplay"
            className="absolute opacity-0 w-0 h-0"
            title="audio"
          />

          {/* Visualizer */}
          <div className="h-32 flex items-end pb-2">
            <VisualizerBars isPlaying={isPlaying} color={track.color} key={tick} />
          </div>

          {/* Track info overlay */}
          <div className="px-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-xl leading-tight">{track.title}</h2>
                <p className="text-zinc-400 text-sm mt-0.5">{track.artist}</p>
              </div>
              <div className="text-right">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${track.color}33`, color: track.color, border: `1px solid ${track.color}44` }}
                >
                  {track.genre}
                </span>
                <p className="text-zinc-500 text-xs mt-1">{track.bpm} BPM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <Slider
            value={[progress]}
            max={estimatedDuration}
            step={1}
            onValueChange={handleSeek}
            className="mb-1"
            style={{ "--slider-color": track.color } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{fmtTime(progress)}</span>
            <span>{fmtTime(estimatedDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-5">
          {/* Shuffle */}
          <button
            onClick={() => setShuffle(s => !s)}
            className={`p-2 rounded-lg transition-colors ${shuffle ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
            style={shuffle ? { color: track.color } : {}}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Prev */}
          <button
            onClick={prevTrack}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${track.color}, ${track.color}cc)`,
              boxShadow: `0 0 24px ${track.color}66`,
            }}
          >
            {isPlaying
              ? <Pause className="w-6 h-6 text-white" />
              : <Play className="w-6 h-6 text-white ml-0.5" />
            }
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => setRepeat(r => r === "none" ? "all" : r === "all" ? "one" : "none")}
            className="p-2 rounded-lg transition-colors"
            style={repeat !== "none" ? { color: track.color } : { color: "#52525b" }}
          >
            {repeat === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMuted(m => !m)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider
            value={[muted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => { setVolume(v / 100); setMuted(false); }}
            className="flex-1"
          />
          <span className="text-zinc-500 text-xs w-8 text-right">{muted ? 0 : Math.round(volume * 100)}%</span>
        </div>

        {/* Playlist toggle */}
        <button
          onClick={() => setShowPlaylist(s => !s)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors mb-2"
        >
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4" />
            <span className="text-xs font-medium">PLAYLIST — {PLAYLIST.length} faixas</span>
          </div>
          {showPlaylist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Playlist */}
        {showPlaylist && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {PLAYLIST.map((t, i) => (
              <button
                key={t.id}
                onClick={() => goTo(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/60 ${
                  i === currentIdx ? "bg-zinc-800/80" : ""
                } ${i !== PLAYLIST.length - 1 ? "border-b border-zinc-800/60" : ""}`}
              >
                {/* Color dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: t.color, boxShadow: i === currentIdx ? `0 0 6px ${t.color}` : "none" }}
                />

                {/* Number or playing indicator */}
                <span className="text-zinc-600 text-xs w-5 text-center flex-shrink-0">
                  {i === currentIdx && isPlaying
                    ? <span style={{ color: t.color }}>▶</span>
                    : <span>{i + 1}</span>
                  }
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${i === currentIdx ? "text-white" : "text-zinc-300"}`}>
                    {t.title}
                  </p>
                  <p className="text-zinc-500 text-xs truncate">{t.artist}</p>
                </div>

                {/* BPM */}
                <span className="text-zinc-600 text-xs flex-shrink-0">{t.bpm}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-zinc-700 text-xs mt-4">Doctor Auto Prime · DAP Radio</p>
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
