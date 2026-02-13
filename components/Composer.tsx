import React, { useState, useRef } from 'react';
import { Image, Send, X } from 'lucide-react';
import { storage, auth } from '../lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, UploadResult } from 'firebase/storage';

interface ComposerProps {
  onPost: (content: string, attachments?: string[]) => Promise<void> | void;
  placeholder?: string;
}

const Composer: React.FC<ComposerProps> = ({ onPost, placeholder }) => {
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFileError(null);
    if (f) {
      const MAX = 5 * 1024 * 1024; // 5MB matches storage.rules
      if (f.size > MAX) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFileError('Arquivo muito grande. Máx 5MB.');
        return;
      }
      // only allow images
      if (!f.type.startsWith('image/')) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFileError('Tipo inválido — envie apenas imagens.');
        return;
      }
    }
    setFile(f);
  };

  const resizeImage = (file: File, maxSize = 1200, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = width / height;
          if (ratio > 1) {
            width = maxSize;
            height = Math.round(maxSize / ratio);
          } else {
            height = maxSize;
            width = Math.round(maxSize * ratio);
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('Image resize failed'));
              return;
            }
            resolve(blob);
          },
          file.type || 'image/jpeg',
          quality,
        );
      };
      img.onerror = (err: any) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    try {
      setIsPosting(true);

      const attachments: string[] = [];
      if (file) {
        // resize image before upload
        const resizedBlob = await resizeImage(file, 1200, 0.85);
        const currentUser = auth.currentUser;
        const path = `community_posts/attachments/${Date.now()}_${file.name}`;
        const r = storageRef(storage, path);

        const uploadSnapshot: any = await new Promise((resolve, reject) => {
          const metadata = currentUser
            ? { customMetadata: { authorId: currentUser.uid }, contentType: resizedBlob.type }
            : { contentType: resizedBlob.type };
          const task = uploadBytesResumable(r, resizedBlob, metadata as any);
          task.on(
            'state_changed',
            null,
            (err) => reject(err),
            () => resolve(task.snapshot),
          );
        });
        const url = await getDownloadURL((uploadSnapshot as any).ref);
        attachments.push(url);
      }
      console.debug('[Composer] creating post, attachments:', attachments);
      await onPost(text.trim(), attachments.length ? attachments : undefined);
      console.debug('[Composer] onPost resolved successfully');
      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      try { window && console.log('[Composer] Post publicado com sucesso'); } catch {}
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder || 'Compartilhe algo com a comunidade...'}
        className="w-full min-h-[80px] resize-none p-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <label className="flex items-center gap-2 text-slate-500 hover:text-slate-700 cursor-pointer">
            <Image size={16} />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
            <span>{file ? file.name : 'Anexar imagem'}</span>
            {file && (
              <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </label>
          {fileError && <div className="text-rose-600 text-sm ml-2">{fileError}</div>}
        </div>
        <div>
          <button
            type="submit"
            disabled={isPosting || (!text.trim() && !file)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${isPosting ? 'bg-slate-300 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            <Send size={14} /> {isPosting ? 'Enviando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default Composer;
