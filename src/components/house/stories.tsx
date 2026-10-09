import { useEffect, useRef, useState } from "react";
import { Lock, Plus, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { THREADS, type StoryFrame, type StoryThread } from "@/lib/catalog";
import { FILTERS, gradeById, type FilterId } from "@/lib/filters";
import { dollars, OFFERS, threadOpen, TIP_IDS } from "@/lib/offers";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHouse } from "@/lib/store";
import { PayButton } from "@/components/house/pay";

const SOURCES: { id: string; kind: "image" | "video"; src: string; poster?: string; label: string }[] = [
  { id: "tape", kind: "video", src: "/media/booth-tape.mp4", poster: "/media/tape-poster.jpg", label: "House tape" },
  { id: "face", kind: "image", src: "/media/reina-face.jpg", label: "Face" },
  { id: "room", kind: "image", src: "/media/studio.jpg", label: "Room" },
  { id: "ink", kind: "image", src: "/media/comic.jpg", label: "Ink" },
  { id: "seen", kind: "image", src: "/media/ian-seen.jpg", label: "Seen" },
];

export function Grade({
  id,
  quiet = false,
  className = "",
  children,
}: {
  id: string;
  quiet?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const spec = gradeById(id);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="size-full" style={{ filter: spec.css }}>
        {children}
      </div>
      {spec.wash && (
        <div aria-hidden className={`pointer-events-none absolute inset-0 ${spec.wash}`} style={{ mixBlendMode: spec.blend }} />
      )}
      {!quiet && spec.grain && <div aria-hidden className="grade-grain pointer-events-none absolute inset-0" />}
      {!quiet && spec.scan && <div aria-hidden className="grade-scan pointer-events-none absolute inset-0" />}
      {!quiet && spec.vignette && <div aria-hidden className="grade-vignette pointer-events-none absolute inset-0" />}
    </div>
  );
}

function stillOf(frame: StoryFrame) {
  return frame.kind === "video" ? frame.poster || frame.src : frame.src;
}

export function StoryRow() {
  const userFrames = useHouse((s) => s.userFrames);
  const paid = useHouse((s) => s.paid);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const you: StoryThread | null = userFrames.length
    ? { id: "you", name: "You", avatar: stillOf(userFrames[0]!), frames: userFrames }
    : null;
  const threads = you ? [you, ...THREADS] : THREADS;
  const open = threads.find((thread) => thread.id === openId) ?? null;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-display text-2xl italic">Stories</h2>
        <button type="button" onClick={() => setComposing(true)} className="text-sm text-violet">
          Grade a tape
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button type="button" onClick={() => setComposing(true)} className="w-16 shrink-0 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full border-2 border-dashed border-violet text-violet">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <span className="mt-1 block truncate text-xs text-mute">New</span>
        </button>
        {threads.map((thread) => {
          const frame = thread.frames[0];
          if (!frame) return null;
          const locked = !threadOpen(paid, thread.sku);
          return (
            <button key={thread.id} type="button" onClick={() => setOpenId(thread.id)} className="w-16 shrink-0 text-center">
              <span className={`relative mx-auto block size-14 overflow-hidden rounded-full border-2 ${locked ? "border-gold" : "border-violet"}`}>
                <Grade id={frame.filter} quiet className="size-full">
                  <img src={stillOf(frame)} alt="" className="size-full object-cover" />
                </Grade>
                {locked && (
                  <span className="absolute right-0 bottom-0 grid size-5 place-items-center rounded-full bg-ink text-gold">
                    <Lock className="size-3" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-xs text-mute">{thread.name}</span>
            </button>
          );
        })}
      </div>
      {open && <StoryViewer thread={open} paid={paid} onClose={() => setOpenId(null)} />}
      {composing && <Composer onClose={() => setComposing(false)} onPosted={() => setOpenId("you")} />}
    </div>
  );
}

function StoryViewer({ thread, paid, onClose }: { thread: StoryThread; paid: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frame = thread.frames[index] ?? thread.frames[0]!;
  const locked = !threadOpen(paid, thread.sku);
  const spec = gradeById(frame.filter);

  function go(step: number) {
    const next = index + step;
    if (next < 0) return;
    if (next >= thread.frames.length) {
      onClose();
      return;
    }
    setProgress(0);
    setIndex(next);
  }

  useEffect(() => {
    if (locked || frame.kind === "video") return;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const next = Math.min(1, (now - start) / 5200);
      setProgress(next);
      if (next < 1) raf = requestAnimationFrame(loop);
      else go(1);
    };
    setProgress(0);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [index, thread.id, locked, frame.kind, frame.id, thread.frames.length, onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || locked) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [index, thread.id, locked]);

  return (
    <div className="fixed inset-0 z-50 bg-ink" role="dialog" aria-label={`${thread.name} story`}>
      <div className="relative mx-auto h-dvh max-w-md">
        <Grade id={frame.filter} className="absolute inset-0">
          {frame.kind === "video" ? (
            <video
              ref={videoRef}
              src={locked ? undefined : frame.src}
              poster={frame.poster}
              muted={muted}
              playsInline
              autoPlay
              className="size-full object-cover"
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) setProgress(el.currentTime / el.duration);
              }}
              onEnded={() => go(1)}
            />
          ) : (
            <img src={frame.src} alt="" className={`size-full object-cover ${locked ? "scale-105 blur-md" : ""}`} />
          )}
        </Grade>
        {locked && frame.kind === "video" && (
          <img src={frame.poster || frame.src} alt="" className="absolute inset-0 size-full scale-105 object-cover blur-md" />
        )}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {thread.frames.map((item, i) => (
            <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-bone/30">
              <span
                className="block h-full bg-bone"
                style={{ width: i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%" }}
              />
            </span>
          ))}
        </div>
        <div className="absolute top-6 right-3 left-3 z-30 flex items-center justify-between pt-3">
          <p className="text-xs tracking-widest text-bone uppercase">{spec.name}</p>
          <button type="button" onClick={onClose} className="h-11 rounded-full bg-ink/70 px-4 text-sm">
            Close
          </button>
        </div>
        {!locked && (
          <>
            <button type="button" className="absolute top-16 bottom-40 left-0 z-10 w-1/3" aria-label="Previous frame" onClick={() => go(-1)} />
            <button type="button" className="absolute top-16 right-0 bottom-40 z-10 w-1/3" aria-label="Next frame" onClick={() => go(1)} />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ink via-ink/80 to-transparent p-4 pt-16">
          <p className="text-xs tracking-widest text-violet uppercase">{thread.name}</p>
          <p className="mt-2 text-sm leading-relaxed">{frame.caption}</p>
          {locked && thread.sku ? (
            <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
              <p className="font-display text-2xl italic">After Hours</p>
              <p className="mt-1 text-sm text-mute">{OFFERS[thread.sku]?.line} Inner Room and Patron open it too.</p>
              <div className="mt-3">
                <PayButton sku={thread.sku} />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {frame.kind === "video" && (
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  className="flex size-11 items-center justify-center rounded-full border border-line bg-ink/70"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              )}
              {TIP_IDS.map((id) => (
                <Tip key={id} sku={id} about={thread.name} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tip({ sku, about }: { sku: string; about: string }) {
  const offer = OFFERS[sku];
  if (!offer) return null;
  return (
    <div className="min-w-0">
      <PayButton sku={sku} about={about} />
    </div>
  );
}

function Composer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const addFrame = useHouse((s) => s.addFrame);
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [sourceId, setSourceId] = useState("tape");
  const [upload, setUpload] = useState<{ kind: "image" | "video"; src: string } | null>(null);
  const [filter, setFilter] = useState<FilterId>("film");
  const [caption, setCaption] = useState("");
  const source = SOURCES.find((item) => item.id === sourceId) ?? SOURCES[0]!;
  const media = upload
    ? { kind: upload.kind, src: upload.src, poster: undefined }
    : { kind: source.kind, src: source.src, poster: source.poster };
  const spec = gradeById(filter);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const kind = file.type.startsWith("video") ? "video" : "image";
    if (upload?.src.startsWith("blob:")) URL.revokeObjectURL(upload.src);
    setUpload({ kind, src: URL.createObjectURL(file) });
    setSourceId("upload");
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    if (!user) {
      await navigate({ to: "/login" });
      return;
    }
    const frame: StoryFrame = {
      id: crypto.randomUUID(),
      kind: media.kind,
      src: media.src,
      poster: media.poster,
      filter,
      caption: caption.trim().slice(0, 180) || spec.line,
    };
    addFrame(frame);
    onPosted();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close grader" onClick={onClose} />
      <form onSubmit={(e) => void post(e)} className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl italic">Grade a tape</h2>
          <button type="button" onClick={onClose} className="h-11 rounded-full border border-line px-4 text-sm">
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-mute">Ten grades for a story. Pick one, then post it on your thread.</p>
        <Grade id={filter} className="mx-auto mt-4 h-72 w-44 rounded-2xl bg-ink">
          {media.kind === "video" ? (
            <video src={media.src} poster={media.poster} muted playsInline autoPlay loop className="size-full object-cover" />
          ) : (
            <img src={media.src} alt="" className="size-full object-cover" />
          )}
        </Grade>
        <p className="mt-3 text-sm text-bone">
          {spec.name}. <span className="text-mute">{spec.line}</span>
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`h-11 shrink-0 rounded-full border px-3 text-sm ${filter === item.id ? "border-violet text-bone" : "border-line text-mute"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSourceId(item.id);
                setUpload(null);
              }}
              className={`h-11 shrink-0 rounded-full border px-3 text-sm ${!upload && sourceId === item.id ? "border-violet text-bone" : "border-line text-mute"}`}
            >
              {item.label}
            </button>
          ))}
          <label className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full border border-line px-3 text-sm text-mute">
            Upload
            <input
              type="file"
              accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Caption</span>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="One line on the tape"
            className="h-11 w-full rounded-xl border border-line bg-raise px-3 text-sm"
          />
        </label>
        <button type="submit" className="mt-3 h-11 w-full rounded-full bg-violet text-sm font-medium text-ink">
          {!isPending && !user ? "Enter to post" : "Post the tape"}
        </button>
        <p className="mt-2 text-xs text-faint">
          A camera upload stays for this visit. House pictures stay on the thread. {dollars(OFFERS["tip-3"]!.cents)} tips on a story go to the house.
        </p>
      </form>
    </div>
  );
}
