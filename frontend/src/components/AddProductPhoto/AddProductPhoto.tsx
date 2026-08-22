import { useState, useRef, useEffect } from "react";
import "./AddProductPhoto.css";
import Toast from "../Toast/Toast.tsx";
import Button from "../Button/Button";
import FolderIcon from "../Icons/FolderIcon";
import CameraIcon from "../Icons/CameraIcon";

interface Props {
  onClose: () => void;
}

const AddProductPhoto = ({ onClose }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showToast, setToastVisibility] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    e.target.value = "";
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

        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));

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
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = () => {
    if (!photo) return;

    setIsSubmitting(true);

    console.log("File:", photo);
    console.log("Nama:", photo.name);
    console.log("Size:", photo.size);
    console.log("Type:", photo.type);

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
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [photoPreview, cameraStream]);

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
      {/* TOAST */}
      <Toast
        type="danger"
        visible={showToast}
        onClose={() => setToastVisibility(false)}
      >
        {toastMessage}
      </Toast>

      {/* LOADING */}
      <div className="loading-container" hidden={!isSubmitting}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <span className="loading-text">Sedang Bekerja</span>
      </div>

      {/* HEADER */}
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

      {/* MAIN */}
      <div className="formQuery">
        <div className="formBody">
          {!photoPreview && !showCamera && (
            <div className="container photoAddWrapper">
              {/* FILE */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />

              {/* MOBILE CAMERA */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleFileChange}
              />

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

          {photoPreview && (
            <div className="photoPreviewWrapper">
              <h3>Foto kamu:</h3>

              <div className="photoWrapper">
                <img
                  src={photoPreview}
                  alt="Preview produk"
                  onClick={() => setIsImageFullscreen(true)}
                />
              </div>

              {isImageFullscreen && (
                <div
                  className="imageFullscreen"
                  onClick={() => setIsImageFullscreen(false)}
                >
                  <img
                    src={photoPreview}
                    alt="Preview produk fullscreen"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div className="formFooter formPhoto">
                <div>
                  <p className="fileInfo">
                    Nama File: <span className="fileName">{photo?.name}</span>
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
