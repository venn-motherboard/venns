"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  card_uid: string;
  timestamp: string;
  students: { student_name: string; student_number: string } | null;
};

const PAGE = 1000; // Supabase's default max rows per request

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id, card_uid, timestamp, students(student_name, student_number)")
      .order("timestamp", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data as unknown as Row[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleString();
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export default function LogsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAll()); setError(null); }
    catch (e) { setError(`Couldn't load records: ${(e as Error).message}`); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const lines = [["Student Name", "Student Number", "Date & Time"].map(csvCell).join(",")];
    rows.forEach((r) => lines.push([r.students?.student_name ?? "Unknown", r.students?.student_number ?? r.card_uid, fmt(r.timestamp)].map(csvCell).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); // BOM keeps Excel happy
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Attendance records <span className="text-sm font-normal text-slate-500">({rows.length})</span></h1>
        <button onClick={exportCsv} disabled={!rows.length} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">Export to CSV</button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error} <button onClick={load} className="underline">Retry</button></p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr><th className="p-3">Student Name</th><th className="p-3">Student No.</th><th className="p-3">Date & Time</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="p-4 text-slate-500">Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={3} className="p-4 text-slate-500">No attendance yet. Start the scanner to record taps.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium">{r.students?.student_name ?? "Unknown"}</td>
                <td className="p-3">{r.students?.student_number ?? r.card_uid}</td>
                <td className="whitespace-nowrap p-3">{fmt(r.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
