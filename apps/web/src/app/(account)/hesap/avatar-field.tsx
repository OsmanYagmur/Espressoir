"use client";

import { PHOTO_SOURCE_MAX_BYTES } from "@espressoir/core";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { format, t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";

import { setAvatar } from "./actions";

const p = t.photo;
const a = p.avatar;

function problemText(kind: string): string {
  if (kind === "tooLarge") {
    return format(p.errors.tooLarge, { max: Math.round(PHOTO_SOURCE_MAX_BYTES / 1024 / 1024) });
  }
  return p.errors[kind as keyof typeof p.errors] ?? p.errors.failed;
}

/**
 * The member's profile picture. Picking a file crops it to a square in the browser,
 * uploads it and makes it the profile picture in one go: there is nothing else to save.
 */
export function AvatarField({
  initialPath,
  username,
}: {
  initialPath: string | null;
  username: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const { uploadAvatar, discardUploads } = await import("@/components/social/media-data");
      const uploaded = await uploadAvatar(file);
      const result = await setAvatar(uploaded.path);
      if (result.ok) {
        setPath(uploaded.path);
        setMessage({ text: a.saved, error: false });
      } else {
        // Uploaded but refused: do not leave the file lying about.
        await discardUploads([uploaded.path]);
        setMessage({ text: result.message, error: true });
      }
    } catch (failure) {
      setMessage({
        text: problemText((failure as { kind?: string }).kind ?? "failed"),
        error: true,
      });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await setAvatar(null);
      if (result.ok) {
        setPath(null);
        setMessage({ text: a.removed, error: false });
      } else {
        setMessage({ text: result.message, error: true });
      }
    } catch {
      setMessage({ text: p.errors.failed, error: true });
    } finally {
      setBusy(false);
    }
  }

  // A file picked before the page had finished loading (a slow phone, a quick hand) sits
  // in the input without anyone having heard about it: take it up once the page is live.
  useEffect(() => {
    const early = input.current?.files?.[0];
    if (early) void Promise.resolve().then(() => pick(early));
    // Once, when the page comes alive.
  }, []);

  const src = path ? mediaUrl(path) : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="type-meta">{a.hint}</p>
      <div className="flex flex-wrap items-center gap-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- already the right size
          <img
            src={src}
            alt={format(p.avatarAlt, { username })}
            width={96}
            height={96}
            className="size-24 rounded-full bg-sunk object-cover"
          />
        ) : (
          <p className="type-meta">{a.none}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={path ? a.replace : a.choose}
            disabled={busy}
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? p.uploading : path ? a.replace : a.choose}
          </Button>
          {path && !busy ? (
            <Button type="button" variant="secondary" onClick={() => void remove()}>
              {a.remove}
            </Button>
          ) : null}
        </div>
      </div>
      {message ? (
        <p
          role={message.error ? "alert" : "status"}
          className={message.error ? "text-sm font-medium text-danger" : "type-meta"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
