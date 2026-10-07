"use client";

import { useEffect, useState } from "react";

export default function VUEWELaunchPolishRuntime() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const syncConnection = () => setOffline(!navigator.onLine);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  return (
    <>
      {offline && (
        <div className="vueweOfflineNotice" role="status">
          <b>VUEWE is offline</b>
          <span>Reconnect to post, call, message or refresh live content.</span>
        </div>
      )}

      <style jsx global>{`
        html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
        body{min-height:100dvh;overscroll-behavior-x:none}
        button,a,[role="button"]{-webkit-tap-highlight-color:transparent}
        button:not(:disabled),a[href],[role="button"]{touch-action:manipulation}
        img,video{max-width:100%}
        .vueweRouteProgress,.vueweRouteVeil{display:none!important}
        .vueweOfflineNotice{position:fixed;z-index:1000008;top:max(10px,env(safe-area-inset-top));left:50%;width:min(520px,calc(100vw - 24px));display:grid;gap:2px;transform:translateX(-50%);padding:10px 14px;border:1px solid rgba(255,181,71,.28);border-radius:16px;color:#fff;background:rgba(19,13,5,.95);box-shadow:0 18px 46px rgba(0,0,0,.35);text-align:center}
        .vueweOfflineNotice b{font-size:11px}
        .vueweOfflineNotice span{color:rgba(255,255,255,.55);font-size:8px;line-height:1.35}
        @media(max-width:720px){
          main[data-utv-page]:not([data-utv-page="live"]):not([data-utv-page="walkie"]){padding-bottom:max(78px,calc(66px + env(safe-area-inset-bottom)))!important}
          input,textarea,select{font-size:max(16px,1em)}
        }
      `}</style>
    </>
  );
}
