import { useEffect, useState } from "react";
import "./ephinta-intro.css";

const APP_READY_EVENT = "ephinta:app-ready";

export default function EphintaIntro() {
  const [visible, setVisible] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const handleAppReady = () => setAppReady(true);
    if (document.documentElement.dataset.ephintaAppReady === "true") handleAppReady();
    window.addEventListener(APP_READY_EVENT, handleAppReady, { once: true });
    return () => window.removeEventListener(APP_READY_EVENT, handleAppReady);
  }, []);

  useEffect(() => {
    if (!visible || !appReady) return;
    setClosing(true);
    const timer = window.setTimeout(() => setVisible(false), 350);
    return () => window.clearTimeout(timer);
  }, [appReady, visible]);

  if (!visible) return null;
  return (
    <div
      className={`ephinta-intro${closing ? " ephinta-intro--closing" : ""}`}
      role="status"
      aria-label="Opening Dublu Vé Entertainments"
      data-ephinta-intro-splash="true"
      data-ephinta-intro-overlay="true"
    >
      <div className="ephinta-intro__logo" style={{ width: "auto", height: "auto", maxWidth: "90vw", color: "#fff", textAlign: "center" }}>
        <strong style={{ display: "block", fontSize: "clamp(34px, 8vw, 58px)", letterSpacing: "-0.05em" }}>Dublu Vé</strong>
        <span style={{ display: "block", marginTop: 8, fontSize: 11, letterSpacing: "0.28em" }}>ENTERTAINMENTS</span>
      </div>
    </div>
  );
}
