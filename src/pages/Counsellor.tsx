import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Volume2, VolumeX, ShieldCheck, Sparkles, Cpu, HelpCircle } from "lucide-react";
import PageFlow from "../components/PageFlow";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { EduPathAPI } from "../lib/apiClient";
import { counsellorSuggestions } from "../data/mockData";
import { counsellorAgent, type AgentResponse } from "../lib/counsellorAgent";
import { llmService, type LLMProviderType } from "../lib/llmService";
import { synthesizeSpeech, stopSpeech } from "../lib/ragCounsellor";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; year: number; page?: number; section?: string; url?: string }>;
  predictionResult?: any;
  category?: string;
  providerUsed?: string;
  modelUsed?: string;
};

function formatTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/** Lightweight inline markdown renderer for chat messages */
function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  let i = 0;

  const renderInline = (text: string, key: string): React.ReactElement => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return (
      <span key={key}>
        {parts.map((p, pi) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={pi} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
            : <span key={pi}>{p}</span>
        )}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-bold text-[#0f1e33] text-sm mt-3 mb-1 first:mt-0">{line.slice(3)}</h3>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-slate-800 text-xs mt-2 mb-0.5">{line.slice(4)}</h4>);
      i++; continue;
    }

    // Blockquote >
    if (line.startsWith("> ")) {
      elements.push(
        <div key={i} className="border-l-2 border-amber-400 pl-3 text-xs text-gray-500 italic my-1">
          {renderInline(line.slice(2), `bq-${i}`)}
        </div>
      );
      i++; continue;
    }

    // Table header |
    if (line.startsWith("|") && lines[i + 1]?.startsWith("|---")) {
      const headers = line.split("|").filter(Boolean).map(h => h.trim());
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").filter(Boolean).map(c => c.trim()));
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-2">
          <table className="text-xs w-full border-collapse">
            <thead><tr className="bg-slate-100">{headers.map((h, hi) => <th key={hi} className="px-2.5 py-1.5 text-left font-semibold text-slate-700 border border-slate-200">{renderInline(h, `th-${hi}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50">{row.map((cell, ci) => <td key={ci} className="px-2.5 py-1.5 border border-slate-200">{renderInline(cell, `td-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list •  or  -  or  *  or numbered 1.
    if (/^[•\-\*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const isBullet = /^[•\-\*]\s/.test(line);
      elements.push(
        <div key={i} className="flex gap-2 text-sm leading-snug ml-1 my-0.5">
          <span className="text-amber-500 shrink-0 mt-0.5">{isBullet ? "•" : line.match(/^(\d+\.)/)?.[1]}</span>
          <span>{renderInline(line.replace(/^[•\-\*\d+\.\s]+/, ""), `li-${i}`)}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line
    if (line.trim() === "") {
      if (elements.length > 0) elements.push(<div key={i} className="h-1" />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line, `p-${i}`)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

const COUNSELLOR_SUGGESTIONS_TA = [
  "டிஎன்இஏ கட்-ஆஃப் எவ்வாறு கணக்கிடப்படுகிறது?",
  "கேசிஜி தொழில்நுட்பக் கல்லூரி விவரங்கள் (1311)?",
  "எஸ்எஸ்என் மற்றும் பிஎஸ்ஜி கல்லூரிகளை ஒப்பிடவும்",
  "அப்வேர்ட் மூவ்மென்ட் (Upward Movement) எப்படி செயல்படும்?",
  "சான்றிதழ் சரிபார்ப்புக்கு தேவையான ஆவணங்கள் எவை?",
  "முதல் பட்டதாரி கட்டணச் சலுகை விவரங்கள் என்ன?",
];

export default function Counsellor() {
  const { user, profile, academicRecord: authAcademic, counsellingHistory, addCounsellingMessage } = useAuth();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [academicRecord, setAcademicRecord] = useState<any>(authAcademic);
  const [activeProvider, setActiveProvider] = useState<LLMProviderType>(llmService.getPrimaryProvider());
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>(
    i18n.language === "ta" ? COUNSELLOR_SUGGESTIONS_TA : counsellorSuggestions
  );
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Sync academic record
  useEffect(() => {
    if (authAcademic) {
      setAcademicRecord(authAcademic);
    } else if (user) {
      EduPathAPI.profile.get()
        .then(account => {
          if (account?.academicRecord) setAcademicRecord(account.academicRecord);
        })
        .catch(err => console.warn("Backend profile sync note:", err));
    }
  }, [authAcademic, user]);

  // Sync suggestions when user switches language
  useEffect(() => {
    if (messages.length <= 1) {
      setDynamicSuggestions(i18n.language === "ta" ? COUNSELLOR_SUGGESTIONS_TA : counsellorSuggestions);
    }
  }, [i18n.language, messages.length]);

  // Load prior counselling history or initial greeting
  useEffect(() => {
    if (counsellingHistory && counsellingHistory.length > 0) {
      setMessages(counsellingHistory.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : formatTime(),
      })));
    } else {
      const isTamil = i18n.language === "ta";
      setMessages([
        {
          role: "assistant",
          content: isTamil
            ? `வணக்கம் ${profile?.display_name || "மாணவரே"}! நான் உங்கள் EduPath AI TNEA ஆலோசகர் (AI Counsellor).\n\nடிஎன்இஏ (TNEA) பொறியியல் சேர்க்கை தொடர்பான அனைத்து கேள்விகளுக்கும் **தமிழ்**, **ஆங்கிலம்**, அல்லது **தங்கிலிஷ் (Tanglish)** மொழிகளில் நான் உங்களுக்கு வழிகாட்ட தயாராக உள்ளேன்:\n- கல்லூரி குறியீடுகள், கட்-ஆஃப் மற்றும் இடங்கள்\n- கவுன்சிலிங் நடைமுறைகள் மற்றும் சாய்ஸ் ஃபில்லிங் (Choice Filling)\n- மேல்நோக்கு இயக்கம் (Upward Movement) மற்றும் தற்காலிக ஒதுக்கீடு\n- 7.5% அரசுப் பள்ளி மற்றும் முதல் பட்டதாரி உதவித்தொகை\n\nஅனைத்து பதில்களும் அதிகாரப்பூர்வ TNEA ஆவணங்களின் அடிப்படையில் வழங்கப்படுகின்றன. உங்களுக்கு என்ன உதவி வேண்டும்? உங்கள் கேள்வியைக் கேளுங்கள்!`
            : `Hello ${profile?.display_name || "Aspirant"}! I am your EduPath AI Counsellor, an intelligent, conversational TNEA admissions assistant.\n\nI can answer broad TNEA questions in **English**, **Tamil (தமிழ்)**, or **Tanglish** — covering counselling rules, tentative allotment options, choice filling, upward movement, college codes, branch availability, cut-off calculations, and multi-year historical comparisons (2023, 2024, 2025).\n\nAll answers are grounded in our verified TNEA knowledge base and official database. How can I guide you today?`,
          timestamp: formatTime(),
          sources: [
            { title: "TNEA 2024 Information Brochure", year: 2024, page: 3, section: "General Instructions", url: "https://www.tneaonline.org" },
            { title: "EduPath Centralized TNEA Master Database", year: 2024, section: "461 Verified Institutions" }
          ],
        },
      ]);
    }
  }, [counsellingHistory, profile, i18n.language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleProviderToggle = () => {
    const next: LLMProviderType = activeProvider === "openai" ? "gemini" : "openai";
    setActiveProvider(next);
    llmService.setProvider(next);
  };

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg, timestamp: formatTime() };
    setMessages(m => [...m, userMsg]);
    setThinking(true);
    setLoading(true);

    // Show "thinking" phase for 3 seconds, then switch to generating
    const thinkingTimer = setTimeout(() => setThinking(false), 3000);

    await addCounsellingMessage({ role: "user", content: msg });

    try {
      // Build conversation history for multi-turn understanding
      const historyTurns = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Execute through Backend Counsellor API
      let agentResponse: AgentResponse;
      try {
        agentResponse = await EduPathAPI.counsellor.chat(msg, historyTurns);
      } catch (apiErr) {
        console.warn("Backend chat API fallback to agent direct:", apiErr);
        agentResponse = await counsellorAgent.processQuery(
          msg,
          historyTurns,
          {
            studentName: profile?.display_name,
            cutoff: academicRecord?.cutoff,
            maths: academicRecord?.maths,
            physics: academicRecord?.physics,
            chemistry: academicRecord?.chemistry,
            category: academicRecord?.category || profile?.category || "OC",
            preferredDistrict: profile?.preferred_district,
            preferredBranches: profile?.preferred_branches,
            isGovernmentSchool75Quota: profile?.is_government_school_quota,
            comparison_codes: profile?.comparison_codes,
          }
        );
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: agentResponse.answer,
        timestamp: formatTime(),
        sources: agentResponse.sources,
        predictionResult: agentResponse.predictionResult,
        category: agentResponse.intent,
        providerUsed: agentResponse.providerUsed,
        modelUsed: agentResponse.modelUsed,
      };

      setMessages(m => [...m, assistantMsg]);
      setLoading(false);
      setThinking(false);
      clearTimeout(thinkingTimer);

      if (agentResponse.suggestedFollowUps && agentResponse.suggestedFollowUps.length > 0) {
        setDynamicSuggestions(agentResponse.suggestedFollowUps);
      }

      await addCounsellingMessage({
        role: "assistant",
        content: agentResponse.answer,
        sources: agentResponse.sources as any,
      });

      if (voiceActive) {
        setIsSpeaking(true);
        synthesizeSpeech(agentResponse.answer, agentResponse.detectedLanguage === "ta" ? "ta-IN" : "en-IN");
      }
    } catch (err: any) {
      setLoading(false);
      setThinking(false);
      clearTimeout(thinkingTimer);
      const fallbackMsg: Message = {
        role: "assistant",
        content: "I'm temporarily unable to complete the request. Please ask your question again or check your query.",
        timestamp: formatTime(),
      };
      setMessages(m => [...m, fallbackMsg]);
    }
  };

  const toggleVoice = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    }
    setVoiceActive(!voiceActive);
  };

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto flex flex-col h-[calc(100dvh-140px)] lg:h-[calc(100vh-100px)]">
      <SyncStatusBanner compact />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 my-2 sm:my-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl sm:text-3xl text-[#0f1e33]">{t("counsellor.title")}</h1>
            <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-sans font-semibold border border-amber-200 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-600" />
              RAG + ML
            </span>
          </div>
          <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 truncate">
            English, தமிழ் & Tanglish · 461 Colleges Dataset
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* LLM Provider Switcher Badge */}
          <button
            onClick={handleProviderToggle}
            title="Click to toggle primary LLM Provider (Automatic fallback active)"
            className="flex items-center gap-1 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-amber-400 font-medium transition-all shadow-2xs"
          >
            <Cpu size={13} className="text-amber-500" />
            <span className="font-semibold text-slate-800 uppercase">{activeProvider}</span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
              Auto-Fallback
            </span>
          </button>

          {/* Voice Toggle */}
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border font-semibold transition-all ${
              voiceActive
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-amber-400"
            }`}
          >
            {voiceActive ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{voiceActive ? "Voice On" : "Voice Off"}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Context-Aware Follow-Up Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
        <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0 flex items-center gap-1">
          <HelpCircle size={11} /> Suggested:
        </span>
        {dynamicSuggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(s)}
            className="text-[11px] sm:text-xs bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-400 text-gray-700 hover:text-amber-800 px-2.5 py-1 rounded-full shrink-0 transition-all shadow-2xs font-medium"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 shadow-sm mb-2 sm:mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-[#0f1e33] text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#0f1e33] text-white rounded-tr-none shadow-sm"
                  : "bg-slate-50 border border-gray-200/80 text-gray-800 rounded-tl-none shadow-2xs"
              }`}
            >
              <MarkdownMessage content={m.content} />

              {/* ML Prediction Evidence Card */}
              {m.predictionResult && (
                <div className="mt-3 bg-white border border-amber-200 rounded-xl p-3 text-xs text-slate-800 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-500" />
                      Random Forest + XGBoost Model Analysis
                    </span>
                    <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {m.predictionResult.predictionScore}% Alignment
                    </span>
                  </div>
                  <p className="text-gray-600 leading-normal">{m.predictionResult.historicalFit}</p>
                  <p className="text-[11px] text-gray-400 italic">
                    Model v3.2.0 trained on official TNEA allotment datasets. Not an official allotment guarantee.
                  </p>
                </div>
              )}

              {/* Document Sources Attribution */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-gray-200/60 text-xs text-gray-500 space-y-1.5">
                  <div className="font-semibold text-gray-700 flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    Verified Official Grounding Sources:
                  </div>
                  {m.sources.map((src, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 text-[11px]">
                      <span>
                        • <strong>{src.title}</strong> ({src.year}) {src.page ? `· Page ${src.page}` : ""} {src.section ? `· ${src.section}` : ""}
                      </span>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline font-medium shrink-0 ml-2">
                          Doc Link →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={`text-[10px] mt-2 text-right ${m.role === "user" ? "text-slate-400" : "text-gray-400"}`}>
                {m.timestamp}
              </div>
            </div>

            {m.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {/* Thinking / Generating Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            {/* Bot avatar */}
            <div className="w-8 h-8 rounded-xl bg-[#0f1e33] text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
              <Bot size={18} />
            </div>

            <div className="max-w-[75%] rounded-2xl rounded-tl-none bg-slate-50 border border-gray-200/80 p-4 shadow-2xs">
              {thinking ? (
                /* Phase 1: Thinking (first 3 seconds) */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="text-base">🧠</span>
                    <span>AI Counsellor thinking...</span>
                  </div>
                  {/* Animated typing dots */}
                  <div className="flex items-center gap-1.5 h-5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '160ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '320ms' }} />
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Analysing your question · Retrieving TNEA knowledge base...</p>
                </div>
              ) : (
                /* Phase 2: Generating answer */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Sparkles size={13} className="text-amber-500 animate-pulse" />
                    <span>Generating verified answer...</span>
                  </div>
                  <div className="flex items-center gap-1 h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '240ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '360ms' }} />
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Grounding response with official TNEA data · RAG + ML models active...</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <div className="flex gap-2 bg-white rounded-2xl border border-gray-200 p-2 shadow-sm focus-within:border-amber-500 transition-all">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder={i18n.language === "ta" ? "TNEA பற்றிய கேள்விகளை தமிழில் கேட்கலாம்..." : "Ask any TNEA question in English, Tamil (தமிழ்), or Tanglish..."}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="bg-[#0f1e33] hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs shadow-2xs"
        >
          <span>Send</span>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
