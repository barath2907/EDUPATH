import React from "react";
import { ShieldCheck, Database, Calendar, ExternalLink } from "lucide-react";
import { getTneaSyncStatus } from "../lib/tneaData";

export default function SyncStatusBanner({ compact = false }: { compact?: boolean }) {
  const sync = getTneaSyncStatus();

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
        <span className="font-medium">TNEA 2024-2025 Verified</span>
        <span className="text-emerald-400">•</span>
        <span className="text-emerald-700 font-mono text-[11px]">{sync.data_version}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#0f1e33] to-[#1a3154] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm sm:text-base text-slate-100">Centralized TNEA Intelligence Database</h4>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {sync.status}
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-1 flex items-center gap-3 flex-wrap">
            <span>Authority: <strong className="text-slate-100 font-medium">{sync.source_authority}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-amber-400" />
              Verified: <strong className="text-slate-100 font-medium">{sync.last_updated}</strong>
            </span>
            <span>•</span>
            <span>Version: <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px]">{sync.data_version}</code></span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
        <a
          href="https://www.tneaonline.org"
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          <span>Official Portal</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
