"use client";

import { useEffect, useRef, useState } from "react";
import "./UploadReceipts.css";

import { Toast } from "@/components/shared/toast";
import Button from "../Button/Button";
import FolderIcon from "../Icons/FolderIcon";
import CameraIcon from "../Icons/CameraIcon";

type ToastType = "success" | "danger" | "warning" | "info";

type ToastState = {
  visible: boolean;
  type: ToastType;
  message: string;
};

interface Props {
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
}

const MAX_FILE_SIZE_IMAGE = 5 * 1024 * 1024;
const MAX_FILE_SIZE_PDF = 10 * 1024 * 1024;
const MAX_FILE_SIZE_ZIP = 50 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const isImage = (file: File) => {
  return file.type.startsWith("image/");
};

const isPDF = (file: File) => {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
};

const isZIP = (file: File) => {
  const name = file.name.toLowerCase();

  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    name.endsWith(".zip")
  );
};

const getFileType = (file: File) => {
  if (isImage(file)) return "image";
  if (isPDF(file)) return "pdf";
  if (isZIP(file)) return "zip";

  return "unknown";
};

const AddProductPhoto = ({ onClose, onSubmit }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "info",
    message: "",
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({
      visible: true,
      type,
      message,
    });
  };

  const closeToast = () => {
    setToast((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  /*
   * Validasi ukuran file.
   */
  const validateFile = (file: File) => {
    const type = getFileType(file);

    if (type === "image" && file.size > MAX_FILE_SIZE_IMAGE) {
      showToast("warning", `${file.name} terlalu besar. Maksimal gambar 5 MB.`);

      return false;
    }

    if (type === "pdf" && file.size > MAX_FILE_SIZE_PDF) {
      showToast("warning", `${file.name} terlalu besar. Maksimal PDF 10 MB.`);

      return false;
    }

    if (type === "zip" && file.size > MAX_FILE_SIZE_ZIP) {
      showToast("warning", `${file.name} terlalu besar. Maksimal ZIP 50 MB.`);

      return false;
    }

    if (type === "unknown") {
      showToast(
        "warning",
        `${file.name} bukan file yang didukung. Gunakan gambar, PDF, atau ZIP.`,
      );

      return false;
    }

    return true;
  };

  /*
   * Menambahkan file dari input.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const validFiles = selectedFiles.filter(validateFile);

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const newPreviews = validFiles.map((file) => {
      if (isImage(file)) {
        return URL.createObjectURL(file);
      }

      return "";
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    /*
     * Kalau sebelumnya belum ada file,
     * pilih file pertama.
     */
    setSelectedIndex((prev) => {
      if (files.length === 0) {
        return 0;
      }

      return prev;
    });

    e.target.value = "";
  };

  /*
   * Menghapus file.
   */
  const handleRemoveFile = (index: number) => {
    const preview = previews[index];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));

    setPreviews((prev) => prev.filter((_, i) => i !== index));

    setSelectedIndex((prev) => {
      if (files.length <= 1) {
        return 0;
      }

      if (index < prev) {
        return prev - 1;
      }

      if (index === prev) {
        return Math.min(prev, files.length - 2);
      }

      return prev;
    });
  };

  /*
   * Kamera desktop.
   */
  const openDesktopCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("info", "Browser ini tidak mendukung akses kamera.");
      return;
    }

    try {
      setIsCameraReady(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error("Gagal membuka kamera:", error);

      showToast("danger", "Kamera tidak tersedia atau izin kamera ditolak.");
    }
  };

  /*
   * Menghentikan kamera.
   */
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStream(null);
    setShowCamera(false);
    setIsCameraReady(false);
  };

  /*
   * Mengambil foto dari kamera.
   */
  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showToast("info", "Kamera belum siap. Coba lagi.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const preview = URL.createObjectURL(file);

        setFiles((prev) => {
          const newIndex = prev.length;

          setSelectedIndex(newIndex);

          return [...prev, file];
        });

        setPreviews((prev) => [...prev, preview]);

        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  /*
   * Pilih kamera berdasarkan device.
   */
  const handleCamera = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    void openDesktopCamera();
  };

  /*
   * Membersihkan seluruh file.
   */
  const handleCancel = () => {
    previews.forEach((preview) => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    });

    setFiles([]);
    setPreviews([]);
    setSelectedIndex(0);

    stopCamera();
  };

  /*
   * Kirim file ke parent.
   *
   * Parent yang menentukan API/backend.
   */
  const handleSubmit = async () => {
    if (files.length === 0) {
      showToast("warning", "Silakan pilih minimal satu file.");

      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(files);

      /*
       * Kalau API parent berhasil,
       * modal bisa ditutup dari sini.
       */
      onClose();
    } catch (error) {
      console.error("Upload error:", error);

      showToast(
        "danger",
        error instanceof Error ? error.message : "Gagal mengunggah file.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Keyboard ESC.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      if (showCamera) {
        stopCamera();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, showCamera, cameraStream]);

  /*
   * Cleanup ketika component unmount.
   */
  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      });

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /*
   * Sambungkan MediaStream ke video.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !cameraStream) {
      return;
    }

    setIsCameraReady(false);

    video.srcObject = cameraStream;

    const handleLoadedMetadata = async () => {
      try {
        await video.play();

        setIsCameraReady(true);
      } catch (error) {
        console.error("Gagal menjalankan video:", error);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [cameraStream]);

  /*
   * File yang sedang dipilih.
   */
  const selectedFile = files[selectedIndex];

  return (
    <div className="formWrapper">
      {/* TOAST */}
      <Toast type={toast.type} visible={toast.visible} onClose={closeToast}>
        {toast.message}
      </Toast>

      {/* LOADING */}
      {isSubmitting && (
        <div className="loading-container">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
            role="status"
          />

          <span className="loading-text">Sedang mengunggah</span>
        </div>
      )}

      {/* HEADER */}
      <div className="formHeader">
        <div>
          <h2 className="mb-2 text-2xl font-semibold text-black">
            Upload Struk
          </h2>
        </div>

        <button
          type="button"
          className="formCloseButton"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          disabled={isSubmitting}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="formQuery">
        <div className="formBody">
          {/* INPUT FILE */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.pdf,.zip,application/zip,application/x-zip-compressed"
            multiple
            hidden
            disabled={isSubmitting}
            onChange={handleFileChange}
          />

          {/* INPUT CAMERA MOBILE */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={isSubmitting}
            onChange={handleFileChange}
          />

          {/* EMPTY STATE */}
          {!showCamera && files.length === 0 && (
            <div className="photoAddWrapper">
              <Button
                backgroundColor="#cffce7"
                color="#047857"
                className="btn-manual"
                icon={<FolderIcon width={25} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Tambahkan File
              </Button>

              <Button
                backgroundColor="#cfe3fe"
                color="#1D4ED8"
                className="btn-photo"
                icon={<CameraIcon width={25} />}
                onClick={handleCamera}
              >
                Ambil Foto
              </Button>
            </div>
          )}

          {/* CAMERA */}
          {showCamera && (
            <div className="cameraContainer">
              <h3 className="text-xl font-semibold text-black">Ambil Foto</h3>

              <div className="cameraPreview">
                <video ref={videoRef} autoPlay playsInline />
              </div>

              <div className="cameraActions">
                <button
                  type="button"
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  onClick={stopCamera}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                >
                  {isCameraReady ? "Ambil Foto" : "Menyiapkan Kamera..."}
                </button>
              </div>
            </div>
          )}

          {files.length > 0 && !showCamera && (
            <div className="photoPreviewWrapper">
              <div className="photoWrapper">
                {selectedFile &&
                  isImage(selectedFile) &&
                  previews[selectedIndex] && (
                    <img
                      src={previews[selectedIndex]}
                      alt={selectedFile.name}
                      onClick={() => setIsFullscreen(true)}
                    />
                  )}

                {selectedFile && isPDF(selectedFile) && (
                  <FileCard file={selectedFile} type="pdf" large />
                )}

                {selectedFile && isZIP(selectedFile) && (
                  <FileCard file={selectedFile} type="zip" large />
                )}
              </div>

              <div className="photoThumbnails">
                {files.map((file, index) => {
                  const isImage = file.type.startsWith("image/");
                  const isPdf = file.type === "application/pdf";
                  const isZip =
                    file.type === "application/zip" ||
                    file.type === "application/x-zip-compressed";

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className={`fileThumbnail ${
                        selectedIndex === index ? "selected" : ""
                      }`}
                    >
                      {isImage ? (
                        <img
                          src={previews[index]}
                          alt={`Thumbnail ${index + 1}`}
                          className="imageThumbnail"
                          onClick={() => setSelectedIndex(index)}
                        />
                      ) : (
                        <div
                          className="fileThumbnailCard"
                          onClick={() => setSelectedIndex(index)}
                        >
                          <div className="fileIcon">
                            {isPdf ? "PDF" : isZip ? "ZIP" : "FILE"}
                          </div>

                          <span
                            className="fileThumbnailName"
                            title={file.name}
                          >
                            {file.name}
                          </span>

                          <span className="fileThumbnailSize">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        className="fileThumbnailRemove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ADD MORE */}
              <div className="photoAddMore">
                <button
                  type="button"
                  className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  + Tambah File
                </button>

                <button
                  type="button"
                  className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  onClick={handleCamera}
                  disabled={isSubmitting}
                >
                  + Ambil Foto
                </button>
              </div>

              {/* FULLSCREEN IMAGE */}
              {isFullscreen && selectedFile && isImage(selectedFile) && (
                <div
                  className="imageFullscreen"
                  onClick={() => setIsFullscreen(false)}
                >
                  <img
                    src={previews[selectedIndex]}
                    alt={selectedFile.name}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* FOOTER */}
              <div className="formFooter formPhoto">
                <div>
                  <p className="fileInfo">
                    Jumlah File:
                    <span className="fileName"> {files.length}</span>
                  </p>

                  <p className="fileInfo truncate">
                    Nama File:
                    <span className="fileName"> {selectedFile?.name}</span>
                  </p>

                  <p className="fileInfo">
                    Ukuran:
                    <span className="fileName">
                      {" "}
                      {selectedFile ? formatFileSize(selectedFile.size) : "-"}
                    </span>
                  </p>

                  <p className="fileInfo">
                    Tipe:
                    <span className="fileName">
                      {" "}
                      {selectedFile
                        ? getFileType(selectedFile).toUpperCase()
                        : "-"}
                    </span>
                  </p>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Mengunggah.." : "Ya, gunakan file"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/*
 * Card untuk PDF / ZIP.
 */
function FileCard({
  file,
  type,
  large = false,
}: {
  file: File;
  type: "pdf" | "zip";
  large?: boolean;
}) {
  const isPdf = type === "pdf";

  return (
    <div
      className={`filePreview flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 ${
        large ? "h-full min-h-[250px] w-full" : "h-20 w-20"
      }`}
    >
      <FileIcon type={type} />

      {large && (
        <>
          <p className="fileName mt-4 max-w-[80%] truncate text-sm font-semibold text-slate-800">
            {file.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {isPdf ? "PDF Document" : "ZIP Archive"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatFileSize(file.size)}
          </p>
        </>
      )}
    </div>
  );
}

/*
 * Icon PDF / ZIP.
 */
function FileIcon({ type }: { type: "image" | "pdf" | "zip" | "unknown" }) {
  if (type === "pdf") {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600">
        PDF
      </div>
    );
  }

  if (type === "zip") {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-700">
        ZIP
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-500">
      FILE
    </div>
  );
}

export default AddProductPhoto;
