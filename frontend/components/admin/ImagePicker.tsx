"use client";
import { useRef, useState } from "react";
import { Link, Upload, FolderOpen, X } from "lucide-react";
import { listS3Images, uploadImageToS3 } from "@/lib/api";
import Image from "next/image"; // used for URL preview only

type Mode = "url" | "s3" | "upload";

interface Props {
  value: string;
  onChange: (url: string) => void;
  inputCls: string;
}

export default function ImagePicker({ value, onChange, inputCls }: Props) {
  const [mode, setMode] = useState<Mode>("url");
  const [s3Images, setS3Images] = useState<{ key: string; url: string; name: string }[] | null>(null);
  const [loadingS3, setLoadingS3] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openS3 = async () => {
    setMode("s3");
    if (s3Images) return;
    setLoadingS3(true);
    try {
      const imgs = await listS3Images();
      setS3Images(imgs);
    } finally {
      setLoadingS3(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageToS3(file);
      onChange(url);
      setMode("url");
      setS3Images(null); // refresh next time
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const tabCls = (m: Mode) =>
    `flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
      mode === m
        ? "bg-brand-accent border-brand-accent text-white"
        : "border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent bg-brand-surface"
    }`;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => setMode("url")} className={tabCls("url")}>
          <Link size={12} /> URL
        </button>
        <button type="button" onClick={openS3} className={tabCls("s3")}>
          <FolderOpen size={12} /> S3
        </button>
        <button type="button" onClick={() => { setMode("upload"); fileRef.current?.click(); }} className={tabCls("upload")} disabled={uploading}>
          <Upload size={12} /> {uploading ? "מעלה..." : "העלאה"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      )}

      {/* S3 browser */}
      {mode === "s3" && (
        <div className="border border-brand-border rounded-xl overflow-hidden">
          {loadingS3 ? (
            <div className="text-center text-brand-muted py-6 text-sm animate-pulse">טוען תמונות...</div>
          ) : !s3Images?.length ? (
            <div className="text-center text-brand-muted py-6 text-sm">אין תמונות בתיקייה</div>
          ) : (
            <div className="flex flex-col max-h-48 overflow-y-auto divide-y divide-brand-border">
              {s3Images.map((img) => (
                <button
                  key={img.key}
                  type="button"
                  onClick={() => { onChange(img.url); setMode("url"); }}
                  className={`text-right text-sm px-3 py-2.5 hover:bg-brand-bg transition-colors truncate min-h-[2.5rem] ${
                    value === img.url ? "text-brand-accent font-semibold" : "text-brand-text"
                  }`}
                >
                  {value === img.url ? "✓ " : ""}{img.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {value && mode === "url" && (
        <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-brand-border">
          <Image src={value} alt="preview" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 left-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
