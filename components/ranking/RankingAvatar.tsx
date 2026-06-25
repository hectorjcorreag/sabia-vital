"use client";

import { useEffect, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { initialsOf, normalizeUrl } from "./rankingUtils";

type Props = {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: "xl" | "2xl" | "3xl" | "full";
  className?: string;
};

function isDownloadUrl(value: string) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

function looksLikeStoragePath(value: string) {
  if (!value) return false;
  if (isDownloadUrl(value)) return false;

  return value.includes("/");
}

export function RankingAvatar({
  src,
  name,
  size = "md",
  rounded = "2xl",
  className = "",
}: Props) {
  const [error, setError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function resolveImage() {
      const cleanSrc = normalizeUrl(src);

      setError(false);
      setResolvedSrc("");

      if (!cleanSrc) return;

      if (!looksLikeStoragePath(cleanSrc)) {
        setResolvedSrc(cleanSrc);
        return;
      }

      try {
        setLoading(true);

        const url = await getDownloadURL(ref(storage, cleanSrc));

        if (alive) {
          setResolvedSrc(url);
        }
      } catch (err) {
        console.warn("No se pudo resolver imagen del ranking:", {
          src: cleanSrc,
          name,
          error: err,
        });

        if (alive) {
          setError(true);
          setResolvedSrc("");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    resolveImage();

    return () => {
      alive = false;
    };
  }, [src, name]);

  return (
    <div
      className={[
        "shrink-0 overflow-hidden border border-black/10 bg-black/[0.04]",
        sizeClass(size),
        roundedClass(rounded),
        className,
      ].join(" ")}
      title={resolvedSrc || src || name}
    >
      {resolvedSrc && !error ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onLoad={() => setError(false)}
          onError={() => {
            console.warn("La imagen no pudo mostrarse:", {
              src,
              resolvedSrc,
              name,
            });
            setError(true);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-black text-black/45">
          {loading ? "..." : initialsOf(name)}
        </div>
      )}
    </div>
  );
}

function sizeClass(size: Props["size"]) {
  switch (size) {
    case "sm":
      return "h-9 w-9";
    case "lg":
      return "h-14 w-14";
    case "xl":
      return "h-20 w-20";
    case "md":
    default:
      return "h-11 w-11";
  }
}

function roundedClass(rounded: Props["rounded"]) {
  switch (rounded) {
    case "xl":
      return "rounded-xl";
    case "3xl":
      return "rounded-3xl";
    case "full":
      return "rounded-full";
    case "2xl":
    default:
      return "rounded-2xl";
  }
}