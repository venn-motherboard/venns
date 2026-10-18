export type ToastData = { kind: "ok" | "err"; msg: string } | null;

export default function Toast({ t }: { t: ToastData }) {
  if (!t) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-2xl p-6 text-center text-2xl font-bold text-white shadow-2xl ${
        t.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"
      }`}
    >
      {t.msg}
    </div>
  );
}
