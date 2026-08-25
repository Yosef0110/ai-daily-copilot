import { useEffect, useState } from "react";
import "./Toast.css";

/**
 * Cara menggunakan toast:
 * 1. Pastikan di parent component terdapat state contoh:'const [showToast, setToastVisibility] = useState(true)';
 * 2. Selanjutnya tinggal taruh komponen toast di parent:
 *    <Toast type='success' visible={showToast} onClose={() => setToastVisibility(false)}> Informasi Toast </Toast>
 *
 * penjelasan props:
 * a. type hanya punya 4 string yaitu
 *    - success = warna hijau (success)
 *    - danger  = warna merah (error)
 *    - warning = warna kuning (warn)
 *    - info    = warna biru (info)
 * b. textnya tinggal taruh di dalam komponen
 */

interface toastProps {
  type?: "success" | "danger" | "warning" | "info";
  children: string;
  visible: boolean;
  onClose: () => void;
}

const Toast = ({ type = "info", children, visible, onClose }: toastProps) => {
  if (type != "success" && type != "danger" && type != "warning" && type != "info") {
    console.log('ToastBar Tidak punya tipe itu!')
    return;
  }

  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 400);
  };

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  let toastIcon;
  let toastInfo;

  if (type == "success") {
    toastInfo = "Success";
    toastIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={1.5}
        stroke="currentColor"
        className="size-6 toastIcon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    );
  } else if (type == "danger") {
    toastInfo = "Error";
    toastIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6 toastIcon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
    );
  } else if (type == "warning") {
    toastInfo = "Warning";
    toastIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6 toastIcon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
    );
  } else {
    toastInfo = "Info";
    toastIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6 toastIcon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        />
      </svg>
    );
  }

  if (!visible && !closing) return null;
  return (
    <>
      {
        <div
          className={`custom-alert alert alert-${type} ${closing ? "toast-closing" : "toast-show"} alert-dismissible fade show`}
          role="alert"
        >
          <div className="toastHeaderWrapper">
            {toastIcon}
            <strong>{toastInfo}</strong>
          </div>
          {children}
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="alert"
            onClick={handleClose}
            aria-label="Close"
          ></button>
        </div>
      }
    </>
  );
};

export default Toast;
