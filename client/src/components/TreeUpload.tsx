import { useRef, useState } from "react";
import type { Lang } from "../../../shared/types";
import { t } from "../lib/i18n";

const MAX_BYTES = 20 * 1024 * 1024;
// WeatherAI's analyze endpoint rejects some formats (e.g. AVIF) with
// "unsupported_type". Gate client-side so an unsupported file never burns one
// of the 5 monthly tree analyses.
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPTED.join(",");

/** Drag-and-drop image picker with a 20MB client-side guard + optional metadata. */
export function TreeUpload({
  lang,
  loading,
  onAnalyze,
}: {
  lang: Lang;
  loading: boolean;
  onAnalyze: (file: File, fields: Record<string, string>) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [county, setCounty] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(f: File | undefined) {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      return setErr("Unsupported format. Please use JPG, PNG, or WebP (AVIF/HEIC aren't accepted).");
    }
    if (f.size > MAX_BYTES) return setErr("Image exceeds the 20MB limit.");
    setErr(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div className="card upload">
      <div
        className={`dropzone${dragging ? " drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {preview ? (
          <img src={preview} alt="preview" className="preview" />
        ) : (
          <p className="muted">{t("uploadHint", lang)}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => accept(e.target.files?.[0] ?? undefined)}
        />
      </div>

      <div className="upload-fields">
        <input placeholder="County (optional)" value={county} onChange={(e) => setCounty(e.target.value)} />
        <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {err && <p className="error-text">{err}</p>}

      <button
        className="primary"
        disabled={!file || loading}
        onClick={() => file && onAnalyze(file, { county, notes })}
      >
        {loading ? t("analyzing", lang) : t("analyze", lang)}
      </button>
    </div>
  );
}
