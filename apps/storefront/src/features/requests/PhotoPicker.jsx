import { useEffect, useRef, useState } from "react";
import { uploadRequestImage } from "../../lib/media";

export const MAX_REQUEST_PHOTOS = 3;

let nextId = 1;

// Lets the buyer add up to 3 photos. Each photo uploads as soon as it's picked
// (compressed in the browser first); the parent receives the uploaded URLs.
export default function PhotoPicker({ onChange, onUploadingChange }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]); // { id, preview, url, status, error }
  const [error, setError] = useState("");

  const uploading = items.some((i) => i.status === "uploading");

  useEffect(() => {
    onChange?.(items.filter((i) => i.status === "done").map((i) => i.url));
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free object URLs on unmount.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  function update(id, patch) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function handleFiles(fileList) {
    setError("");
    const room = MAX_REQUEST_PHOTOS - items.length;
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    if (files.length > room) setError(`You can add up to ${MAX_REQUEST_PHOTOS} photos.`);

    for (const file of files.slice(0, room)) {
      const id = nextId++;
      setItems((prev) => [...prev, { id, preview: URL.createObjectURL(file), url: "", status: "uploading", error: "" }]);
      uploadRequestImage(file)
        .then((data) => update(id, { url: data.url, status: "done" }))
        .catch((err) => update(id, { status: "error", error: err.message || "Upload failed" }));
    }
  }

  function remove(id) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
    setError("");
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">Photos</span>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              "relative aspect-square overflow-hidden rounded-xl border bg-surface-2",
              item.status === "error" ? "border-red-400/40" : "border-line",
            ].join(" ")}
          >
            {item.status === "error" ? (
              <div className="flex h-full w-full items-start justify-center bg-red-400/10 pt-[22%] text-3xl">⚠️</div>
            ) : (
              <img src={item.preview} alt="" className="h-full w-full object-cover" />
            )}
            {item.status === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/70 text-xs font-semibold text-ink-2">
                Uploading…
              </div>
            ) : null}
            {item.status === "error" ? (
              <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-2 py-1 text-[11px] font-semibold leading-tight text-white">
                {item.error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-sm font-bold text-white transition hover:bg-slate-950"
            >
              ×
            </button>
          </div>
        ))}

        {items.length < MAX_REQUEST_PHOTOS ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong text-muted transition hover:border-sky-400 hover:bg-navy/30 hover:text-sky-200"
          >
            <span className="text-2xl">📷</span>
            <span className="mt-1 text-xs font-semibold">Add photo</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <span className="mt-1 block text-xs text-muted">
        {error || "Optional · up to 3 photos of the old part, its label or where it fits."}
      </span>
    </div>
  );
}
