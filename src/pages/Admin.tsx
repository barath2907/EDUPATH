import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload, FileText, CheckCircle, AlertCircle, Download,
  Database, RefreshCw, ChevronDown, ChevronUp, X,
  Clock, Table, ShieldCheck, RotateCcw, Sparkles
} from "lucide-react";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { fetchImportBatches, triggerRAGReindexing, rollbackImportBatch, type ImportBatchRecord } from "../lib/adminPipeline";
import {
  validateImportRows, validateMasterRows, validateOfficialSourceUrl,
  downloadTemplate, downloadMasterTemplate,
  type ValidationResult, type MasterValidationResult, type RawRow,
} from "../lib/importValidator";

type Step = "upload" | "preview" | "importing" | "done";
type ImportKind = "master" | "cutoff";

export default function Admin() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importKind, setImportKind] = useState<ImportKind>("master");
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [dataYear, setDataYear] = useState(new Date().getFullYear());
  const [validation, setValidation] = useState<ValidationResult | MasterValidationResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState("https://static.tneaonline.org/docs/cutoff_2024.csv");
  const [sourceDocument, setSourceDocument] = useState("Official TNEA 2024 Allotment Data");
  const [dataVersion, setDataVersion] = useState("v3.2.0");
  const [importError, setImportError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatchRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [ragStatusMsg, setRagStatusMsg] = useState("");

  useEffect(() => {
    setLoadingHistory(true);
    fetchImportBatches().then(data => {
      setHistory(data);
      setLoadingHistory(false);
    });
  }, [step]);

  function parseRows(raw: RawRow[]) {
    const res = importKind === "master" ? validateMasterRows(raw) : validateImportRows(raw);
    setValidation(res);
    setStep("preview");
  }

  function handleFile(file: File) {
    setFileName(file.name);
    if (file.name.endsWith(".csv")) {
      Papa.parse<RawRow>(file, {
        header: true, skipEmptyLines: true,
        complete: (result) => parseRows(result.data),
      });
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
        parseRows(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Supported formats: CSV, XLSX, XLS.");
    }
  }

  const handleReindex = async () => {
    setReindexing(true);
    const res = await triggerRAGReindexing();
    setReindexing(false);
    setRagStatusMsg(res.message);
    setTimeout(() => setRagStatusMsg(""), 4000);
  };

  const handleRollback = async (id: number) => {
    if (confirm(`Are you sure you want to rollback import batch #${id}?`)) {
      const res = await rollbackImportBatch(id);
      alert(res.message);
      setHistory(await fetchImportBatches());
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SyncStatusBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1">TNEA Admin Data Pipeline</h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            Import, validate, preview, approve, rollback, and re-index centralized TNEA intelligence datasets.
          </p>
        </div>

        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="bg-[#0f1e33] hover:bg-slate-800 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Sparkles size={15} className="text-amber-400" />
          <span>{reindexing ? "Re-indexing Vector Store..." : "Re-index RAG Vector Store"}</span>
        </button>
      </div>

      {ragStatusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" />
          {ragStatusMsg}
        </div>
      )}

      {/* File Upload Box */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-semibold text-sm text-[#0f1e33]">Official Dataset Batch Upload</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setImportKind("master")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                importKind === "master" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              College Master
            </button>
            <button
              onClick={() => setImportKind("cutoff")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                importKind === "cutoff" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Cutoff History
            </button>
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <Upload size={32} className="mx-auto text-amber-500 mb-2" />
          <p className="text-sm font-semibold text-gray-800">Click or drag CSV / Excel file here</p>
          <p className="text-xs text-gray-500 mt-1">Upload verified official TNEA datasets matching schema specifications</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </div>
      </div>

      {/* Batch History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-semibold text-sm text-[#0f1e33]">Import Batch Audit Trail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2.5">ID</th>
                <th className="p-2.5">Filename</th>
                <th className="p-2.5">Year</th>
                <th className="p-2.5">Records</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Imported At</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-amber-800">#{b.id}</td>
                  <td className="p-2.5 font-medium text-slate-800">{b.filename}</td>
                  <td className="p-2.5">{b.data_year}</td>
                  <td className="p-2.5 font-mono">{b.records_imported} / {b.records_total}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      b.status === "approved" || b.status === "complete" ? "bg-emerald-100 text-emerald-800" :
                      b.status === "rolled_back" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-gray-500">{new Date(b.imported_at).toLocaleDateString()}</td>
                  <td className="p-2.5 text-right">
                    {b.status !== "rolled_back" && (
                      <button
                        onClick={() => handleRollback(b.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                      >
                        <RotateCcw size={12} />
                        Rollback
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
