"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  card_uid: string;
  timestamp: string;
  exported_at: string | null;
  students: { student_name: string; student_number: string } | null;
};
type Msg = { kind: "ok" | "err"; text: string } | null;

const PAGE = 1000;
const SELECT = "id, card_uid, timestamp, exported_at, students(student_name, student_number)";

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("attendance_logs")
      .select(SELECT)
      .order("timestamp", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data as unknown as Row[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleString();
const csvCell = (v: string) => '"' + v.replace(/"/g, '""') + '"';
const dayRange = (day: string) => {
  const s = new Date(day + "T00:00:00");
  const e = new Date(s);
  e.setDate(e.getDate() + 1);
  return [s.toISOString(), e.toISOString()];
};

export default function LogsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [autoDelete, setAutoDelete] = useState(false);
  const [day, setDay] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAll()); }
    catch (e) { setMsg({ kind: "err", text: "Couldn't load records: " + (e as Error).message }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setAutoDelete(localStorage.getItem("autoDeleteAfterExport") === "1"); }, []);

  const toggleAuto = (on: boolean) => {
    if (on && !window.confirm("After each CSV export, the exported records will be deleted from the database. Check that the file saved on your phone. Turn this on?")) return;
    setAutoDelete(on);
    localStorage.setItem("autoDeleteAfterExport", on ? "1" : "0");
  };

  const exportCsv = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await fetchAll();
      if (!data.length) { setMsg({ kind: "err", text: "There are no records to export." }); return; }
      const lines = [["Student Name", "Student Number", "Date & Time"].map(csvCell).join(",")];
      data.forEach((r) => lines.push([r.students?.student_name ?? "Unknown", r.students?.student_number ?? r.card_uid, fmt(r.timestamp)].map(csvCell).join(",")));
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "attendance-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(a.href);

      const cutoff = data[0].timestamp;
      const { error: e1 } = await supabase.from("attendance_logs")
        .update({ exported_at: new Date().toISOString() })
        .is("exported_at", null).lte("timestamp", cutoff);
      if (e1) throw e1;
      if (autoDelete) {
        const { error: e2 } = await supabase.from("attendance_logs")
          .delete().not("exported_at", "is", null).lte("timestamp", cutoff);
        if (e2) throw e2;
        setMsg({ kind: "ok", text: "Exported and deleted " + data.length + " records." });
      } else {
        setMsg({ kind: "ok", text: "Exported " + data.length + " records." });
      }
    } catch (e) {
      setMsg({ kind: "err", text: "Something went wrong: " + (e as Error).message });
    } finally {
      setBusy(false);
      await load();
    }
  };

  const deleteDay = async () => {
    if (!day) return;
    setMsg(null);
    const [start, end] = dayRange(day);
    const { count: total, error: e0 } = await supabase.from("attendance_logs")
      .select("id", { count: "exact", head: true }).gte("timestamp", start).lt("timestamp", end);
    if (e0) return setMsg({ kind: "err", text: "Couldn't check that day: " + e0.message });
    if (!total) return setMsg({ kind: "err", text: "There are no records on that day." });

    const { count: pending, error: e1 } = await supabase.from("attendance_logs")
      .select("id", { count: "exact", head: true }).gte("timestamp", start).lt("timestamp", end).is("exported_at", null);
    if (e1) return setMsg({ kind: "err", text: "Couldn't check that day: " + e1.message });
    if (pending) return setMsg({ kind: "err", text: pending + " record(s) on that day haven't been exported yet. Export to CSV first." });

    if (!window.confirm("Delete all " + total + " records on " + new Date(start).toLocaleDateString() + "? This can't be undone.")) return;
    const { error: e2 } = await supabase.from("attendance_logs").delete().gte("timestamp", start).lt("timestamp", end);
    if (e2) return setMsg({ kind: "err", text: "Couldn't delete: " + e2.message });
    setMsg({ kind: "ok", text: "Deleted " + total + " records." });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Attendance records <span className="text-sm font-normal text-slate-500">({rows.length})</span></h1>
        <button onClick={exportCsv} disabled={busy || !rows.length} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
          {busy ? "Exporting…" : "Export to CSV"}
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autoDelete} onChange={(e) => toggleAuto(e.target.checked)} className="h-4 w-4" />
          Delete records after exporting
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
          <button onClick={deleteDay} disabled={!day} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
            Delete this day
          </button>
          <span className="text-slate-500">Only works if the day was exported.</span>
        </div>
      </div>

      {msg && (
        <p role="alert" className={"rounded-lg p-3 text-sm " + (msg.kind === "ok"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300")}>{msg.text}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr><th className="p-3">Student Name</th><th className="p-3">Student No.</th><th className="p-3">Date & Time</th><th className="p-3">Exported</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="p-4 text-slate-500">Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={4} className="p-4 text-slate-500">No attendance yet. Start the scanner to record taps.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium">{r.students?.student_name ?? "Unknown"}</td>
                <td className="p-3">{r.students?.student_number ?? r.card_uid}</td>
                <td className="whitespace-nowrap p-3">{fmt(r.timestamp)}</td>
                <td className="p-3">{r.exported_at ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
