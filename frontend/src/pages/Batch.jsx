import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import api, { formatMYR, formatPHP } from "../lib/api";
import { Upload, FileText, Download, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";

const TEMPLATE = `name,bank,account_number,amount_myr,reference
Juan Dela Cruz,BDO Unibank,0045 2219 8847,1500.00,INV-001
Maria Santos,BPI,0078 1122 3344,2300.50,INV-002
Jose Reyes,GCash,09171234567,500.00,
`;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || "").toString().trim().replace(/^"|"$/g, ""));
    return row;
  });
}

export default function Batch() {
  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setFilename(file.name);
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { toast.error("CSV is empty"); return; }
    if (rows.length > 30) { toast.error("Max 30 rows per batch"); return; }
    try {
      const { data } = await api.post("/batch/preview", { rows });
      setPreview(data);
      toast.success(`${data.valid_count}/${data.count} rows ready`);
    } catch {
      toast.error("Failed to parse CSV");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"] }, maxFiles: 1,
  });

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "splash-batch-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const submitBatch = async () => {
    setSubmitting(true);
    setTimeout(() => {
      toast.success(`${preview.valid_count} payouts submitted via FPX`);
      setPreview(null); setFilename(""); setSubmitting(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="batch-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Batch payouts</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>Pay up to 30 recipients with a single FPX transaction.</p>
      </div>

      <div className="rounded-xl p-4 flex gap-3 items-start" style={{ backgroundColor: "var(--processing-bg)", border: "1px solid var(--processing-border)" }}>
        <Package size={18} style={{ color: "var(--processing)" }} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed" style={{ color: "var(--processing)" }}>
          Upload a CSV with up to <span className="font-semibold">30 recipients</span>. We'll process them all at once with one FPX payment.
        </div>
      </div>

      <div
        {...getRootProps()}
        data-testid="dropzone"
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-16 px-6 transition cursor-pointer text-center"
        style={{
          borderColor: isDragActive ? "var(--indigo)" : "#CBD5E0",
          backgroundColor: isDragActive ? "rgba(67,56,202,0.05)" : "white",
        }}
      >
        <input {...getInputProps()} />
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(67,56,202,0.12)" }}>
          <Upload size={22} style={{ color: "var(--indigo)" }} />
        </div>
        <div className="text-base font-semibold">{isDragActive ? "Drop your CSV here" : "Drag CSV here or click to browse"}</div>
        <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>Max 30 rows · UTF-8 encoded</div>
        <button onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} data-testid="download-template" className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--indigo)" }}>
          <Download size={14} /> Download template
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--outline)" }}>
        <div className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: "var(--ink-3)" }}>CSV format</div>
        <pre className="mono text-xs overflow-x-auto p-3 rounded-md" style={{ backgroundColor: "#0A1E3F", color: "#E2E8F0" }}>
{`name,bank,account_number,amount_myr,reference
Juan Dela Cruz,BDO Unibank,0045 2219 8847,1500.00,INV-001
Maria Santos,BPI,0078 1122 3344,2300.50,INV-002`}
        </pre>
      </div>

      {preview && (
        <div className="bg-white rounded-xl border overflow-hidden animate-fade-up" style={{ borderColor: "var(--outline)" }} data-testid="batch-preview">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--outline)" }}>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <span className="text-sm font-medium">{filename}</span>
              <span className="text-xs px-2 py-0.5 rounded-full tabular-nums" style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}>
                {preview.valid_count}/{preview.count} valid
              </span>
            </div>
            <button onClick={() => { setPreview(null); setFilename(""); }} className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Clear</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--raised)" }}>
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Recipient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Bank</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Amount</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Receives</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--outline)" }}>
                    <td className="px-4 py-2.5">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-3)" }}>{r.bank}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMYR(r.amount_myr)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: r.valid ? "var(--success)" : "var(--ink-3)" }}>
                      {r.valid ? formatPHP(r.receive_php) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.valid ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
                          <CheckCircle2 size={12} /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--danger)" }}>
                          <AlertTriangle size={12} /> Invalid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)" }}>
            <div className="text-sm">
              <span style={{ color: "var(--ink-3)" }}>Total debit: </span>
              <span className="font-semibold tabular-nums">{formatMYR(preview.total_send_myr + preview.total_fee_myr)}</span>
              <span className="ml-3 text-xs tabular-nums" style={{ color: "var(--ink-3)" }}>
                (incl. {formatMYR(preview.total_fee_myr)} fees · 1 MYR = {preview.rate} PHP)
              </span>
            </div>
            <button
              data-testid="submit-batch"
              onClick={submitBatch}
              disabled={submitting || preview.valid_count === 0}
              className="rounded-lg px-5 py-2.5 font-medium text-white transition hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: "var(--success)" }}
            >
              {submitting ? "Submitting..." : `Submit ${preview.valid_count} payouts via FPX`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
