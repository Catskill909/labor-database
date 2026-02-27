import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageDropzoneProps {
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // bytes
}

export default function ImageDropzone({
  files,
  setFiles,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
}: ImageDropzoneProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = [...files, ...accepted].slice(0, maxFiles);
    setFiles(newFiles);

    // Generate previews
    const newPreviews: string[] = [];
    for (const file of newFiles) {
      newPreviews.push(URL.createObjectURL(file));
    }
    // Revoke old preview URLs
    for (const url of previews) {
      URL.revokeObjectURL(url);
    }
    setPreviews(newPreviews);
  }, [files, setFiles, maxFiles, previews]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize,
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
  });

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : files.length >= maxFiles
              ? 'border-gray-700 bg-white/2 cursor-not-allowed opacity-50'
              : 'border-white/15 hover:border-white/30 hover:bg-white/5'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={28} className={`mx-auto mb-2 ${isDragActive ? 'text-blue-400' : 'text-gray-500'}`} />
        <p className="text-sm text-gray-300">
          {isDragActive ? 'Drop images here...' : 'Drag & drop images here, or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPEG, PNG, WebP &bull; Max {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>

      {/* File rejections */}
      {fileRejections.length > 0 && (
        <p className="text-xs text-red-400">
          {fileRejections[0].errors[0]?.message || 'File rejected'}
        </p>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((url, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden bg-black/20 aspect-square">
              <img
                src={url}
                alt={files[i]?.name || 'Preview'}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
              >
                <X size={12} className="text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-[10px] text-gray-300 truncate">{files[i]?.name}</p>
              </div>
            </div>
          ))}
          {files.length < maxFiles && (
            <div
              {...getRootProps()}
              className="flex items-center justify-center rounded-lg border-2 border-dashed border-white/10 aspect-square cursor-pointer hover:border-white/20 hover:bg-white/5 transition-colors"
            >
              <ImageIcon size={20} className="text-gray-600" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
