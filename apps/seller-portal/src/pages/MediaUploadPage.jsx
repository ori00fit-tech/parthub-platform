import { useState } from "react";

const API_BASE = "https://parthub-api.ori00fit-c96.workers.dev";

export default function MediaUploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error?.message || "Upload failed");
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload product media</h1>
        <p className="text-sm text-gray-500">
          Upload JPG, PNG, or WEBP images directly to R2.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
        />

        <button
          type="submit"
          disabled={uploading}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold">Upload complete</h2>
            <p className="text-sm text-gray-500">Use this URL when attaching images to a part.</p>
          </div>

          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Key:</span> {result.key}</p>
            <p><span className="font-semibold">Filename:</span> {result.filename}</p>
            <p><span className="font-semibold">Type:</span> {result.content_type}</p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3 text-sm break-all">
            {result.url}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img src={result.url} alt="Uploaded preview" className="w-full object-cover" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
