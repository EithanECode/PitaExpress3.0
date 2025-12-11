"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PitaLogo from "@/components/ui/common/PitaLogo";

// Simple loader overlay that shows the app logo for ~1s on route changes.
// Modern look with smooth fade/scale and a subtle progress bar.
export default function RouteLoader() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const prevKey = useRef<string>("");

  // Helper to clear existing timer
  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Build a key including query string to detect changes even on same path
    const key = pathname + "?" + search.toString();
    if (prevKey.current === "") {
      prevKey.current = key;
      return;
    }

    // On route change: show loader for 1s
    setVisible(true);
    clearTimer();
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 1000);

    prevKey.current = key;

    return () => clearTimer();
  }, [pathname, search]);

  return (
    <>
      {visible && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-6 animate-scale-in">
            <div className="relative flex items-center justify-center">
              {/* Spinning ring */}
              <div className="absolute inset-[-8px] rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin-slow" />
              {/* Logo */}
              <div className="relative w-16 h-16 z-10 flex items-center justify-center">
                <PitaLogo size="lg" animated={false} className="!w-full !h-full" />
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-40 h-1.5 bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-orange-500 animate-progress" />
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(100%); }
        }
        .animate-fade-in { animation: fadeIn 0.18s ease-out; }
        .animate-scale-in { animation: scaleIn 0.24s ease-out; }
        .animate-spin-slow { animation: spinSlow 1.2s linear infinite; }
        .animate-progress { animation: progress 1s ease-in-out infinite; }
      `}</style>
    </>
  );
}
