"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNfc } from "@/hooks/useNfc";

type Student = { card_uid: string; student_name: string; student_number: string };
const field = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900";

function RegisterModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { status, error: nfcError, start, stop } = useNfc(useCallback((u: string) => { setUid(u); stop(); }, []));
  useEffect(() => stop, [stop]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return setError("Tap a card first to capture its UID.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("students").insert({ card_uid: uid, student_name: name.trim(), student_number: number.trim() });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "That card or student number is already registered." : `Couldn't save: ${error.message}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <form onSubmit={save} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2 className="text-lg font-bold">Register new student</h2>
        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center dark:border-slate-700">
          <p className="font-mono text-sm">{uid || "No card captured yet"}</p>
          <button type="button" onClick={start} disabled={status === "active" || status === "starting"}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {status === "active" ? "Waiting for tap…" : uid ? "Scan a different card" : "Tap card to scan"}
          </button>
          {nfcError && <p role="alert" className="mt-2 text-sm text-rose-600">{nfcError}</p>}
        </div>
        <input className={field} required placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} required placeholder="Student number" value={number} onChange={(e) => setNumber(e.target.value)} />
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 py-3 dark:border-slate-700">Cancel</button>
          <button disabled={busy} className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save student"}</button>
        </div>
      </form>
    </div>
  );
}

export default function StudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("students").select("*").order("student_name");
    if (error) setError(`Couldn't load students: ${error.message}`);
    else { setRows(data as Student[]); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Students <span className="text-sm font-normal text-slate-500">({rows.length})</span></h1>
        <button onClick={() => setOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500">Register New Student</button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error} <button onClick={load} className="underline">Retry</button></p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr><th className="p-3">Name</th><th className="p-3">Student No.</th><th className="p-3">Card UID</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="p-4 text-slate-500">Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={3} className="p-4 text-slate-500">No students yet. Register the first one.</td></tr>
            : rows.map((s) => (
              <tr key={s.card_uid} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium">{s.student_name}</td>
                <td className="p-3">{s.student_number}</td>
                <td className="p-3 font-mono text-xs">{s.card_uid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <RegisterModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}
