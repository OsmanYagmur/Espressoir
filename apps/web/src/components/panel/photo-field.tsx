"use client";

import { PHOTO_ALT_MAX_LENGTH, PHOTO_SOURCE_MAX_BYTES } from "@espressoir/core";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { format, t } from "@/lib/i18n";
import { smallMediaUrl } from "@/lib/media";

const p = t.photo;

export interface PhotoValue {
  path: string;
  width: number;
  height: number;
}

function problemText(kind: string): string {
  if (kind === "tooLarge") {
    return format(p.errors.tooLarge, { max: Math.round(PHOTO_SOURCE_MAX_BYTES / 1024 / 1024) });
  }
  return p.errors[kind as keyof typeof p.errors] ?? p.errors.failed;
}

/**
 * The picture of a tasting, inside the tasting form. Picking a file prepares it in the
 * browser and uploads it at once; the form then only carries where it went (hidden
 * fields), and saving the tasting attaches it. A picture that is uploaded but never saved
 * is just a stray file, removed here when another one replaces it and swept up otherwise.
 */
export function PhotoField({
  initial,
  initialAlt,
}: {
  initial: PhotoValue | null;
  initialAlt: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<PhotoValue | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What this visit uploaded: only those may be thrown away from here. The picture the
  // tasting already had stays until the tasting is saved without it.
  const fresh = useRef(new Set<string>());

  async function discard(path: string | undefined) {
    if (!path || !fresh.current.has(path)) return;
    fresh.current.delete(path);
    const { discardUploads } = await import("@/components/social/media-data");
    await discardUploads([path]);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { uploadTastingPhoto } = await import("@/components/social/media-data");
      const uploaded = await uploadTastingPhoto(file);
      fresh.current.add(uploaded.path);
      void discard(photo?.path);
      setPhoto(uploaded);
    } catch (failure) {
      setError(problemText((failure as { kind?: string }).kind ?? "failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const preview = photo ? smallMediaUrl(photo.path) : null;

  return (
    <fieldset className="grid gap-3">
      <legend className="label-caps text-muted-foreground">{p.label}</legend>
      <p className="font-mono text-xs text-muted-foreground">{p.hint}</p>

      <input type="hidden" name="photoPath" value={photo?.path ?? ""} />
      <input type="hidden" name="photoWidth" value={photo?.width ?? ""} />
      <input type="hidden" name="photoHeight" value={photo?.height ?? ""} />

      {photo && preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- already the right size
        <img
          src={preview}
          alt=""
          width={photo.width}
          height={photo.height}
          className="h-auto max-h-64 w-auto max-w-full border border-border bg-muted"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {/* The real control is the file input; the button only opens it. */}
        <input
          ref={input}
          id={`${id}-file`}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={photo ? p.replace : p.choose}
          disabled={busy}
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="h-10 px-4 font-mono text-xs uppercase"
          onClick={() => input.current?.click()}
        >
          {busy ? p.uploading : photo ? p.replace : p.choose}
        </Button>
        {photo && !busy ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-mono text-xs uppercase"
            onClick={() => {
              void discard(photo.path);
              setPhoto(null);
            }}
          >
            {p.remove}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {photo ? (
        <Field
          label={p.alt}
          htmlFor={`${id}-alt`}
          hint={format(p.altHint, { max: PHOTO_ALT_MAX_LENGTH })}
        >
          <Input
            id={`${id}-alt`}
            name="photoAlt"
            maxLength={PHOTO_ALT_MAX_LENGTH}
            defaultValue={initialAlt}
            autoComplete="off"
          />
        </Field>
      ) : null}
    </fieldset>
  );
}
