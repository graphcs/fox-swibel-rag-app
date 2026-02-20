"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/utils/constants";

interface UploadFormProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: string;
  error: string | null;
}

export function UploadForm({
  onUpload,
  isUploading,
  progress,
  error,
}: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext as "pdf" | "docx")) {
      return "Only PDF and DOCX files are supported.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`;
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile]
  );

  const handleSubmit = () => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-zinc-500 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">
          Drop a PDF or DOCX file here
        </p>
        <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected file */}
      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <FileText className="h-5 w-5 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800">
              {selectedFile.name}
            </p>
            <p className="text-xs text-zinc-500">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
            }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && (
        <button
          onClick={handleSubmit}
          disabled={isUploading}
          className={cn(
            "w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors",
            "hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isUploading ? "Uploading..." : "Upload Document"}
        </button>
      )}

      {/* Progress / Error */}
      {progress && (
        <p className="text-center text-sm text-zinc-600">{progress}</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
