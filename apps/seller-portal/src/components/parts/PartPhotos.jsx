import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { mediaUrl } from "../../lib/requests";
import { uploadPartPhoto } from "../../lib/photos";
import { useT } from "../../i18n";

const MAX_PHOTOS = 8;

// Photos of an existing part: add (several at once), choose the main one, remove.
export default function PartPhotos({ partId }) {
  const t = useT();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function load() {
    try {
      const res = await api.get(`/api/v1/marketplace/parts/${partId}/images`);
      setPhotos(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [partId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(fileList) {
    setError("");
    const files = [...fileList].slice(0, Math.max(0, MAX_PHOTOS - photos.length - uploading));
    if (fileList.length > files.length) setError(t("You can add up to {n} photos.", { n: MAX_PHOTOS }));
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const url = await uploadPartPhoto(file);
        await api.post(`/api/v1/marketplace/parts/${partId}/images`, {
          url,
          sort_order: photos.length + 1,
          is_featured: photos.length === 0,
        });
      } catch (err) {
        setError(err?.message || t("Upload failed"));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    load();
  }

  async function makeMain(id) {
    setError("");
    try {
      await api.put(`/api/v1/marketplace/parts/${partId}/images/${id}/feature`, {});
      load();
    } catch (err) {
      setError(err?.message || "");
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.delete(`/api/v1/marketplace/parts/${partId}/images/${id}`);
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      setError(err?.message || "");
    }
  }

  return (
    <section id="photos" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Photos")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("Up to {n} photos. The first one is the main photo. Listings with real photos get far more clicks.", { n: MAX_PHOTOS })}
      </p>
      {error ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {loading ? <div className="aspect-square animate-pulse rounded-2xl bg-gray-100" /> : null}
        {photos.map((photo, i) => (
          <figure key={photo.id} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img src={mediaUrl(photo.url)} alt="" className="aspect-square w-full object-cover" />
            {i === 0 ? (
              <span className="absolute start-1.5 top-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{t("Main")}</span>
            ) : null}
            <div className="flex border-t border-gray-200 bg-white text-xs font-semibold">
              {i > 0 ? (
                <button type="button" onClick={() => makeMain(photo.id)} className="flex-1 py-2 text-blue-700 hover:bg-blue-50">
                  {t("Make main")}
                </button>
              ) : null}
              <button type="button" onClick={() => remove(photo.id)} className="flex-1 py-2 text-red-700 hover:bg-red-50" aria-label={t("Remove photo")}>
                {t("Remove")}
              </button>
            </div>
          </figure>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
            {t("Uploading…")}
          </div>
        ))}
        {!loading && photos.length + uploading < MAX_PHOTOS ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <span className="text-2xl" aria-hidden="true">📷</span>
            {t("Add photos")}
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files || []);
          e.target.value = "";
        }}
      />
    </section>
  );
}
