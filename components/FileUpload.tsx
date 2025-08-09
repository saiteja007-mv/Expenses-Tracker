'use client';
import { useRef, useState } from 'react';

export default function FileUpload({ user, onUploaded }: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('user_id', user.id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
    if (res.url) onUploaded(res.url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} />
      {uploading && <span className="text-sm text-neutral-500">Uploading…</span>}
    </div>
  );
} 