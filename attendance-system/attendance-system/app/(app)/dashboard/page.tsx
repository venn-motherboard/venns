"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNfc } from "@/hooks/useNfc";
import Toast, { ToastData } from "@/components/Toast";
import { getSoundOn, saveSoundOn, unlockSound, playSuccess, playError } from "@/lib/sound";

export default function Dashboard() {
  const [toast, setToast] = useState<ToastData>(null);
  const [count, setCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const last = useRef({ uid: "", at: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setSoundOn(getSoundOn()); }, []);

  const show = useCallback((t: ToastData) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const onTag = useCallback(async (uid: string) => {
    const now = Date.now();
    if (last.current.uid === uid && now - last.current.at < 4000) return;
    last.current = { uid, at: now };

    const { data: student, error: e1 } = await supabase
      .from("students").select("student_name").eq("card_uid", uid).maybeSingle();
    if (e1) { playError(); return show({ kind: "err", msg: "Database error: " + e1.message }); }
    if (!student) { playError(); return show({ kind: "err", msg: "Unregistered card (" + uid + ")" }); }

    const { error: e2 } = await supabase.from("attendance_logs").insert({ card_uid: uid });
    if (e2) { playError(); return show({ kind: "err", msg: "Couldn't save attendance: " + e2.message }); }
    setCount((c) => c + 1);
    playSuccess();
    show({ kind: "ok", msg: "Present: " + student.student_name });
  }, [show]);

  const { status, error, start, stop } = useNfc(onTag);
  const active = status === "active";

  const tone = active
    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
    : status === "error"
    ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950"
    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

  return (
    <div className="space-y-4">
      <Toast t={toast} />
      <section className={"rounded-2xl border p-6 text-center " + tone}>
        <p className="text-xl font-semibold">
          {active ? "Scanner Active: Ready for Tap" : status === "starting" ? "Starting scanner…" : "Scanner is off"}
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {active && <p className="mt-2 text-sm text-slate-500">{count} recorded this session</p>}
      </section>

      <button
        onClick={() => { unlockSound(); if (active) stop(); else start(); }}
        disabled={status === "starting"}
        className={"w-full rounded-2xl py-5 text-lg font-bold text-white shadow disabled:opacity-60 " + (active ? "bg-slate-700 hover:bg-slate-600" : "bg-indigo-600 hover:bg-indigo-500")}
      >
        {active ? "Stop Scanner" : "Start Attendance Scanner"}
      </button>

      <label className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => { setSoundOn(e.target.checked); saveSoundOn(e.target.checked); }}
          className="h-4 w-4"
        />
        Sound and vibration
      </label>
    </div>
  );
}
