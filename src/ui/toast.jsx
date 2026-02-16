import { useEffect, useState } from "react";
import "../ui/ui.css";

let setToastState = null;
let toastQueue = [];

export function toast(message, type = "info") {
  if (typeof setToastState !== 'function') {
    // Queue the toast if container isn't mounted yet or state is invalid
    toastQueue.push({ message, type });
    
    // Try again in the next tick
    setTimeout(() => {
      if (setToastState && toastQueue.length > 0) {
        const queued = toastQueue.shift();
        toast(queued.message, queued.type);
      }
    }, 0);
    return;
  }

  const id = Date.now();

  setToastState((prev) => [...prev, { id, message, type }]);

  setTimeout(() => {
    setToastState((prev) => prev.filter((t) => t.id !== id));
  }, 3000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setToastState = setToasts;

    return () => {
      setToastState = null;
    };
  }, []);


  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
