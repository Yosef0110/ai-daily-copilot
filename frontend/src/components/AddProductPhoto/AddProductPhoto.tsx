import { useState, useRef, useEffect } from "react";
import "./AddProductPhoto.css";
import Toast from "../Toast/Toast.tsx";
import Button from "../Button/Button";
import FolderIcon from "../Icons/FolderIcon";
import CameraIcon from "../Icons/CameraIcon";

interface Props {
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const AddProductPhoto = ({ onClose }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showToast, setToastVisibility] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) return;

    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setToastMessage(`${file.name} terlalu besar. Maksimal 5 MB.`);

        setToastVisibility(true);

        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...validFiles]);

    setPhotoPreviews((prev) => [...prev, ...newPreviews]);

    if (photos.length === 0) {
      setSelectedIndex(0);
    }

    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    const previewToRemove = photoPreviews[index];

    if (previewToRemove) {
      URL.revokeObjectURL(previewToRemove);
    }

    setPhotos((prev) => prev.filter((_, i) => i !== index));

    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));

    setSelectedIndex((prev) => {
      if (prev > index) {
        return prev - 1;
      }

      if (prev === index) {
        return Math.max(0, prev - 1);
      }

      return prev;
    });
  };

  const openDesktopCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToastMessage("Browser ini tidak mendukung akses kamera.");

      setToastVisibility(true);
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

      setToastMessage("Kamera tidak tersedia atau izin kamera ditolak.");

      setToastVisibility(true);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setToastMessage("Kamera belum siap. Coba lagi.");

      setToastVisibility(true);
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

        const file = new File([blob], `product-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const preview = URL.createObjectURL(file);

        setPhotos((prev) => {
          const newIndex = prev.length;

          setSelectedIndex(newIndex);

          return [...prev, file];
        });

        setPhotoPreviews((prev) => [...prev, preview]);

        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

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

  const handleCamera = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    openDesktopCamera();
  };

  const handleCancel = () => {
    photoPreviews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    setPhotos([]);
    setPhotoPreviews([]);
    setSelectedIndex(0);
  };

  const handleSubmit = () => {
    if (photos.length === 0) return;

    setIsSubmitting(true);

    console.log("Semua foto:", photos);

    photos.forEach((photo, index) => {
      console.log(`Foto ${index + 1}:`, {
        name: photo.name,
        size: photo.size,
        type: photo.type,
      });
    });

    console.log("Foto utama:", photos[selectedIndex]);

    setTimeout(() => {
      setIsSubmitting(false);
    }, 5000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isImageFullscreen) {
        setIsImageFullscreen(false);
        return;
      }

      if (showCamera) {
        stopCamera();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImageFullscreen, showCamera, cameraStream]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

        console.log("Camera ready");

        console.log("Resolution:", {
          width: video.videoWidth,
          height: video.videoHeight,
        });
      } catch (error) {
        console.error("Gagal menjalankan video:", error);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [cameraStream]);

  return (
    <div className="formWrapper">
      <Toast
        type="danger"
        visible={showToast}
        onClose={() => setToastVisibility(false)}
      >
        {toastMessage}
      </Toast>
      <div className="loading-container" hidden={!isSubmitting}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <span className="loading-text">Sedang Bekerja</span>
      </div>
      <div className="formHeader">
        <div>
          <h2 className="mb-2">Foto Product</h2>
        </div>

        <div
          className="formCloseButton"
          onClick={() => {
            stopCamera();
            onClose();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="20px"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>
      <div className="formQuery">
        <div className="formBody">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileChange}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFileChange}
          />
          {!showCamera && photoPreviews.length === 0 && (
            <div className="container photoAddWrapper">
              <Button
                backgroundColor="#cffce7"
                color="#047857"
                className="btn-manual"
                icon={<FolderIcon width={25} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Tambahkan dengan File
              </Button>

              <Button
                backgroundColor="#cfe3fe"
                color="#1D4ED8"
                className="btn-photo"
                icon={<CameraIcon width={25} />}
                onClick={handleCamera}
              >
                Tambahkan dengan Foto
              </Button>
            </div>
          )}

          {showCamera && (
            <div className="cameraContainer">
              <h3>Ambil Foto</h3>

              <div className="cameraPreview">
                <video ref={videoRef} autoPlay playsInline />
              </div>

              <div className="cameraActions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={stopCamera}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                >
                  {isCameraReady ? "Ambil Foto" : "Menyiapkan Kamera..."}
                </button>
              </div>
            </div>
          )}

          {photoPreviews.length > 0 && !showCamera && (
            <div className="photoPreviewWrapper">
              <div className="photoWrapper">
                <img
                  src={photoPreviews[selectedIndex]}
                  alt={`Preview produk ${selectedIndex + 1}`}
                  onClick={() => setIsImageFullscreen(true)}
                />
              </div>

              <div className="photoThumbnails">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={preview}
                    className={`photoThumbnail ${
                      selectedIndex === index ? "selected" : ""
                    }`}
                  >
                    <img
                      src={preview}
                      alt={`Thumbnail ${index + 1}`}
                      onClick={() => setSelectedIndex(index)}
                    />

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>

              <div className="photoAddMore">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Tambah Foto
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleCamera}
                >
                  + Ambil Foto
                </button>
              </div>

              {isImageFullscreen && (
                <div
                  className="imageFullscreen"
                  onClick={() => setIsImageFullscreen(false)}
                >
                  <img
                    src={photoPreviews[selectedIndex]}
                    alt="Preview produk fullscreen"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div className="formFooter formPhoto">
                <div>
                  <p className="fileInfo">
                    Jumlah Foto:
                    <span className="fileName">{photos.length}</span>
                  </p>

                  <p className="fileInfo">
                    Ukuran Foto:
                    <span className="fileName">
                      {formatFileSize(photos[selectedIndex].size)}
                    </span>
                  </p>

                  <p className="fileInfo">
                    Foto Utama:
                    <span className="fileName">
                      {photos[selectedIndex]?.name}
                    </span>
                  </p>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleCancel}
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      Ya, gunakan foto
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

export default AddProductPhoto;
