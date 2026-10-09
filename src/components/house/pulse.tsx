import { useState } from "react";
import { AudioLines, Heart, MessageCircle, Send } from "lucide-react";
import { FACES, type Post } from "@/lib/catalog";
import { getEngine } from "@/lib/engine";
import { publishLive, useHouse, type RoomId } from "@/lib/store";
import { Card } from "@/components/house/bits";
import { StoryRow } from "@/components/house/stories";

type Lane = "wall" | "room" | "pockets";

function ride(pocket: string, into?: RoomId) {
  const house = useHouse.getState();
  const same = house.playing && house.patternId === pocket && !into;
  if (same) {
    getEngine().stop();
    house.setPlaying(false);
    return;
  }
  house.hear(pocket);
  publishLive();
  if (!useHouse.getState().playing) {
    getEngine().play((step) => useHouse.getState().setStep(step));
    useHouse.getState().setPlaying(true);
  }
  if (into) house.setRoom(into);
}

function letters(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function Pulse() {
  const posts = useHouse((s) => s.posts);
  const likes = useHouse((s) => s.likes);
  const likeBoost = useHouse((s) => s.likeBoost);
  const comments = useHouse((s) => s.comments);
  const toggleLike = useHouse((s) => s.toggleLike);
  const addComment = useHouse((s) => s.addComment);
  const addPost = useHouse((s) => s.addPost);
  const follows = useHouse((s) => s.follows);
  const toggleFollow = useHouse((s) => s.toggleFollow);
  const patternId = useHouse((s) => s.patternId);
  const patterns = useHouse((s) => s.patterns);
  const playing = useHouse((s) => s.playing);
  const [draft, setDraft] = useState("");
  const [clip, setClip] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [lane, setLane] = useState<Lane>("wall");
  const [who, setWho] = useState<string | null>(null);

  const pocketName = patterns[patternId]?.name ?? "Candle";
  const tapes = posts.filter((p) => p.video || p.image);
  const paid = useHouse((s) => s.paid);
  const badge = paid.includes("pass-patron") ? "Patron" : paid.includes("pass-inner") ? "Inner" : paid.includes("pass-key") ? "Key" : null;
  const shown = posts.filter((post) => {
    if (lane === "room") return post.handle === "you" || !!follows[post.handle];
    if (lane === "pockets") return !!post.pocket;
    return true;
  });
  const profilePosts = who ? posts.filter((post) => post.handle === who) : [];
  const profile = who ? (FACES[who] ?? { city: "House", line: "In the room." }) : null;
  const profileName = profilePosts[0]?.author ?? (who === "you" ? "You" : who);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-line">
        <div className="relative aspect-[16/10]">
          <img src="/media/studio.jpg" alt="The house studio, dark, with an I AM neon and a warm console" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs tracking-widest text-violet uppercase">Melitia Marie</p>
            <h1 className="neon font-display text-5xl text-violet italic">I AM</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-bone">
              One house. The board, the booth, the lesson, the drop, and the people you make it with.
            </p>
            <button type="button" onClick={() => useHouse.getState().setRoom("tour")} className="mt-3 h-11 rounded-full border border-violet/70 px-4 text-sm text-violet">
              Walk with Reina
            </button>
          </div>
        </div>
      </section>

      <StoryRow />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addPost(draft);
            setDraft("");
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="note">
            Write a note
          </label>
          <input
            id="note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a note on this pocket"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm text-bone placeholder:text-faint"
          />
          <button
            type="submit"
            className="flex size-11 items-center justify-center rounded-full bg-violet text-ink"
            aria-label="Post note"
          >
            <Send className="size-4" />
          </button>
        </form>
        <p className="mt-2 text-xs text-faint">
          This note rides <span className="text-gold">{pocketName}</span>. Anyone can make on it.
        </p>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1" role="tablist" aria-label="Wall">
          {(
            [
              ["wall", "Wall"],
              ["room", "Room"],
              ["pockets", "Pockets"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={lane === id}
              onClick={() => setLane(id)}
              className={`h-9 rounded-full px-3 text-sm ${lane === id ? "bg-violet text-ink" : "text-mute"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setClip(true)} className="text-sm text-violet">
          Open tapes
        </button>
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-mute">Follow someone on the wall. The room only keeps who you let in.</p>
      )}

      {shown.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          pocketLabel={post.pocket ? (patterns[post.pocket]?.name ?? post.pocket) : null}
          riding={!!post.pocket && playing && patternId === post.pocket}
          liked={!!likes[post.id]}
          count={post.likes + (likeBoost[post.id] ?? 0)}
          notes={comments[post.id] ?? []}
          followed={post.handle === "you" ? true : !!follows[post.handle]}
          badge={post.handle === "you" ? badge : null}
          onLike={() => toggleLike(post.id)}
          onFollow={() => post.handle !== "you" && toggleFollow(post.handle)}
          onOpen={() => setWho(post.handle)}
          onRide={() => post.pocket && ride(post.pocket)}
          onMake={() => post.pocket && ride(post.pocket, "studio")}
          commenting={noteFor === post.id}
          note={noteFor === post.id ? note : ""}
          onOpenNote={() => {
            setNoteFor(post.id);
            setNote("");
          }}
          onNote={(value) => setNote(value)}
          onSend={() => {
            addComment(post.id, note);
            setNote("");
            setNoteFor(null);
          }}
        />
      ))}

      {who && profile && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-ink/70" aria-label="Close profile" onClick={() => setWho(null)} />
          <div className="house-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border border-line bg-panel p-5 md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[28rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="flex items-center gap-3">
              <Face handle={who} author={profileName ?? "House"} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-3xl italic">{profileName}</p>
                <p className="text-xs tracking-widest text-mute uppercase">{profile.city}</p>
              </div>
              {who !== "you" && (
                <button
                  type="button"
                  onClick={() => toggleFollow(who)}
                  className="h-11 rounded-full border border-line px-4 text-sm"
                >
                  {follows[who] ? "In the room" : "Follow"}
                </button>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mute">{profile.line}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {profilePosts.map((post) => (
                <li key={post.id}>
                  <Card>
                    <p className="text-sm leading-relaxed">{post.text}</p>
                    {post.pocket && (
                      <button
                        type="button"
                        onClick={() => ride(post.pocket!, "studio")}
                        className="mt-3 h-11 rounded-full bg-violet px-4 text-sm text-ink"
                      >
                        Make on {patterns[post.pocket]?.name ?? "this"}
                      </button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {clip && (
        <div className="fixed inset-0 z-50 bg-ink">
          <button type="button" onClick={() => setClip(false)} className="absolute top-4 right-4 z-10 h-11 rounded-full border border-line bg-ink/80 px-4 text-sm">
            Close
          </button>
          <div className="h-dvh snap-y snap-mandatory overflow-y-auto">
            {tapes.map((post) => (
              <article key={post.id} className="relative flex h-dvh snap-start items-end">
                {post.video ? (
                  <video src={post.video} poster={post.poster} controls playsInline className="absolute inset-0 size-full object-cover" />
                ) : (
                  <img src={post.image} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                <div className="relative z-10 flex w-full items-end gap-3 p-4 pb-24">
                  <div className="max-w-sm flex-1 rounded-2xl bg-ink/75 p-4">
                    <button type="button" onClick={() => setWho(post.handle)} className="text-xs tracking-widest text-violet uppercase">
                      {post.author}
                    </button>
                    <p className="mt-2 text-sm leading-relaxed">{post.text}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => toggleLike(post.id)} className="flex size-11 items-center justify-center rounded-full bg-ink/80" aria-label="Like">
                      <Heart className={`size-4 ${likes[post.id] ? "fill-violet text-violet" : "text-bone"}`} />
                    </button>
                    {post.pocket && (
                      <button type="button" onClick={() => ride(post.pocket!, "studio")} className="flex size-11 items-center justify-center rounded-full bg-violet text-ink" aria-label="Make on this pocket">
                        <AudioLines className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Face({ handle, author }: { handle: string; author: string }) {
  if (handle === "melitia") {
    return <img src="/media/reina-face.jpg" alt="" className="size-10 rounded-full object-cover object-top" />;
  }
  return (
    <span className="flex size-10 items-center justify-center rounded-full border border-line bg-raise text-xs text-violet">
      {letters(author)}
    </span>
  );
}

function PostCard({
  post,
  pocketLabel,
  riding,
  liked,
  count,
  notes,
  followed,
  badge,
  onLike,
  onFollow,
  onOpen,
  onRide,
  onMake,
  commenting,
  note,
  onOpenNote,
  onNote,
  onSend,
}: {
  post: Post;
  pocketLabel: string | null;
  riding: boolean;
  liked: boolean;
  count: number;
  notes: { id: string; name: string; text: string }[];
  followed: boolean;
  badge: string | null;
  onLike: () => void;
  onFollow: () => void;
  onOpen: () => void;
  onRide: () => void;
  onMake: () => void;
  commenting: boolean;
  note: string;
  onOpenNote: () => void;
  onNote: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onOpen} className="shrink-0" aria-label={`Open ${post.author}`}>
          <Face handle={post.handle} author={post.author} />
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm">
            {post.author}
            {badge ? <span className="ml-2 text-xs tracking-widest text-gold uppercase">{badge}</span> : null}
          </p>
          <p className="text-xs text-faint">
            {post.tag} · {post.time}
          </p>
        </button>
        {post.handle !== "you" && (
          <button type="button" onClick={onFollow} className="h-9 rounded-full border border-line px-3 text-xs text-mute">
            {followed ? "In the room" : "Follow"}
          </button>
        )}
      </div>
      {post.image && <img src={post.image} alt="" className="max-h-[32rem] w-full object-cover" />}
      {post.video && (
        <video src={post.video} poster={post.poster} controls playsInline className="max-h-[32rem] w-full bg-ink object-cover" />
      )}
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed">{post.text}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onLike} className="inline-flex h-11 items-center gap-2 rounded-full px-2 text-sm" aria-pressed={liked}>
            <Heart className={`size-4 ${liked ? "fill-violet text-violet" : "text-mute"}`} />
            <span className="tabular-nums text-mute">{count}</span>
          </button>
          <button type="button" onClick={onOpenNote} className="inline-flex h-11 items-center gap-2 rounded-full px-2 text-sm text-mute">
            <MessageCircle className="size-4" />
            {notes.length}
          </button>
          {pocketLabel && (
            <>
              <button type="button" onClick={onRide} className={`inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm ${riding ? "text-gold" : "text-mute"}`}>
                <AudioLines className="size-4" />
                {riding ? "Riding" : pocketLabel}
              </button>
              <button type="button" onClick={onMake} className="inline-flex h-11 items-center rounded-full bg-violet px-4 text-sm text-ink">
                Make on it
              </button>
            </>
          )}
        </div>
        {notes.length > 0 && (
          <ul className="mt-2 space-y-1">
            {notes.slice(-3).map((n) => (
              <li key={n.id} className="text-sm text-mute">
                <span className="text-bone">{n.name}. </span>
                {n.text}
              </li>
            ))}
          </ul>
        )}
        {commenting && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
          >
            <input
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Say it plain"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm"
            />
            <button type="submit" className="h-11 rounded-full bg-violet px-4 text-sm text-ink">
              Send
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
