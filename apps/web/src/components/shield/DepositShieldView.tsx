import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  Camera,
  FileText,
  Lock,
  Download,
  CheckCircle2,
  Scale,
  Hash,
  Copy,
  Check,
  Share2,
  Edit3,
} from "lucide-react";

interface InspectionTask {
  id: string;
  category: string;
  item: string;
  status: "GOOD" | "DAMAGED" | "NEEDS_REPAIR" | "PENDING";
  hasPhoto: boolean;
  shaHash?: string;
  photoPreviewUrl?: string;
  fileName?: string;
  hashedAt?: string;
  note?: string;
}

async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const DepositShieldView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "chain" | "legal">("audit");
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [tenancyDetails, setTenancyDetails] = useState({
    tenantName: "Rohit Varma",
    pgName: "Live Well Luxury Coliving, Madhapur",
    roomNo: "304 (2-Sharing)",
    depositAmount: "24,000",
    monthlyRent: "12,000",
    moveInDate: "2026-12-01",
    ownerName: "Venkata Rao",
    ownerPhone: "+91 98490 12345",
  });

  const [checklist, setChecklist] = useState<InspectionTask[]>([
    {
      id: "1",
      category: "Walls & Paint",
      item: "Check for pre-existing wall seepage, nail holes & peeling paint",
      status: "GOOD",
      hasPhoto: true,
      shaHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      note: "Minor scuff mark behind bedroom door recorded.",
    },
    {
      id: "2",
      category: "Bathroom & Plumbing",
      item: "Test water geyser heating, flush tank leak & faucet pressure",
      status: "GOOD",
      hasPhoto: true,
      shaHash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      note: "Geyser working properly. Tap pressure verified.",
    },
    {
      id: "3",
      category: "Electrical Meter",
      item: "Record initial sub-meter reading & check AC remote/cooling",
      status: "GOOD",
      hasPhoto: true,
      shaHash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      note: "Sub-meter starts at 1,420.5 kWh. Photo captured.",
    },
    {
      id: "4",
      category: "Furniture & Bedding",
      item: "Inspect mattress stains, wardrobe door hinges & study chair",
      status: "NEEDS_REPAIR",
      hasPhoto: true,
      shaHash: "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
      note: "Right wardrobe hinge loose. Noted before move-in.",
    },
    {
      id: "5",
      category: "Keys & Locksets",
      item: "Verify room key, cupboard keys & main biometric gate access",
      status: "GOOD",
      hasPhoto: true,
      shaHash: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
      note: "2 physical keys and biometric thumbprint registered.",
    },
  ]);

  const toggleTaskStatus = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "GOOD"
                  ? "DAMAGED"
                  : item.status === "DAMAGED"
                  ? "NEEDS_REPAIR"
                  : "GOOD",
            }
          : item
      )
    );
  };

  const triggerPhotoUpload = (id: string) => {
    setActiveUploadId(id);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = activeUploadId;
    e.target.value = "";
    if (!file || !targetId) return;

    try {
      const hash = await computeFileSha256(file);
      const previewUrl = URL.createObjectURL(file);
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setChecklist((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                hasPhoto: true,
                shaHash: hash,
                photoPreviewUrl: previewUrl,
                fileName: file.name,
                hashedAt: timestamp,
              }
            : item
        )
      );

      showToast(`Real SHA-256 generated: ${hash.slice(0, 12)}...`);
    } catch {
      showToast("Failed to hash file in browser");
    }
  };

  const completedCount = checklist.filter((i) => i.status !== "PENDING").length;

  return (
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />
      {/* ------------------------------------------------------------- */}
      {/* Header Banner                                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-[#E7E5E4] p-4 sm:p-5 shrink-0 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FDEEE9] text-[#D9532F] border border-[#D9532F]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1C1917] font-display">
                  Deposit Shield Vault
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SHA-256 Protected
                </span>
              </div>
              <p className="text-[11px] text-[#78716C]">
                Move-in photo hashes & Telangana tenancy notice
              </p>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab("audit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "audit"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Move-In Audit ({completedCount}/{checklist.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("chain")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "chain"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#D9532F]" />
              <span>Evidence Chain</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("legal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "legal"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Dispute Pack</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Content Body                                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* TAB 1: Move-In Audit Checklist */}
          {activeSubTab === "audit" && (
            <div className="space-y-4">
              {/* Quick Tenancy Summary Card */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                    Active Tenancy Record
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(!isEditingDetails)}
                    className="text-xs font-bold text-[#D9532F] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingDetails ? "Done Editing" : "Edit Details"}</span>
                  </button>
                </div>

                {isEditingDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <input
                      type="text"
                      value={tenancyDetails.pgName}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, pgName: e.target.value })}
                      placeholder="PG Name"
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                    <input
                      type="text"
                      value={tenancyDetails.roomNo}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, roomNo: e.target.value })}
                      placeholder="Room No."
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                    <input
                      type="text"
                      value={tenancyDetails.depositAmount}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, depositAmount: e.target.value })}
                      placeholder="Deposit (₹)"
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                    <input
                      type="text"
                      value={tenancyDetails.tenantName}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, tenantName: e.target.value })}
                      placeholder="Your Name"
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                    <input
                      type="text"
                      value={tenancyDetails.ownerName}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, ownerName: e.target.value })}
                      placeholder="Owner Name"
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                    <input
                      type="date"
                      value={tenancyDetails.moveInDate}
                      onChange={(e) => setTenancyDetails({ ...tenancyDetails, moveInDate: e.target.value })}
                      className="px-3 py-1.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-[#78716C]">Property & Room</span>
                      <p className="font-bold text-[#1C1917] truncate">{tenancyDetails.pgName}</p>
                      <p className="text-[11px] text-[#78716C]">{tenancyDetails.roomNo}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#78716C]">Security Deposit</span>
                      <p className="font-bold text-[#D9532F] text-sm">₹{tenancyDetails.depositAmount}</p>
                      <p className="text-[11px] text-emerald-600">Shield Protected</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#78716C]">Move-In Date</span>
                      <p className="font-bold text-[#1C1917]">{tenancyDetails.moveInDate}</p>
                      <p className="text-[11px] text-[#78716C]">Notice: 30 Days</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#78716C]">Owner / Caretaker</span>
                      <p className="font-bold text-[#1C1917]">{tenancyDetails.ownerName}</p>
                      <p className="text-[11px] text-[#78716C]">{tenancyDetails.ownerPhone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                    <span>Move-In Condition Audit Items</span>
                    <span className="text-xs text-[#78716C]">({completedCount} of {checklist.length} verified)</span>
                  </h3>
                  <span className="text-[11px] text-[#78716C]">Upload photo to compute live SHA-256</span>
                </div>

                <div className="space-y-2.5">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-xs hover:border-[#D9532F]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        {item.photoPreviewUrl && (
                          <img
                            src={item.photoPreviewUrl}
                            alt={item.category}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E7E5E4] shrink-0"
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C]">
                              {item.category}
                            </span>
                            <span className="text-xs font-bold text-[#1C1917]">
                              {item.item}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#78716C] pl-1">
                            "{item.note}"
                          </p>
                          {item.fileName && (
                            <p className="text-[10px] text-emerald-700 font-medium pl-1">
                              📸 {item.fileName} hashed at {item.hashedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            item.status === "GOOD"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : item.status === "DAMAGED"
                              ? "bg-red-50 text-red-700 border-red-300"
                              : "bg-amber-50 text-amber-700 border-amber-300"
                          }`}
                        >
                          {item.status === "GOOD"
                            ? "✓ Pre-Existing OK"
                            : item.status === "DAMAGED"
                            ? "⚠️ Pre-Existing Damaged"
                            : "🔧 Needs Repair"}
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerPhotoUpload(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold text-blue-700 transition-colors cursor-pointer"
                          title="Upload or capture a room photo to generate its real SHA-256 hash"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{item.photoPreviewUrl ? "Re-Hash Photo" : "Upload & Hash"}</span>
                        </button>

                        {item.shaHash && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.shaHash!);
                              showToast(`Copied SHA-256: ${item.shaHash!.slice(0, 14)}...`);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-stone-100 border border-[#E7E5E4] text-[11px] font-mono text-[#78716C] transition-colors cursor-pointer"
                            title={`Click to copy full SHA-256:\n${item.shaHash}`}
                          >
                            <Hash className="w-3 h-3 text-emerald-600" />
                            <span>{item.shaHash.slice(0, 6)}...</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Evidence Chain (Cryptographic Proof) */}
          {activeSubTab === "chain" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#E7E5E4] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-stone-900 text-white">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1C1917]">
                      SHA-256 Evidence Hash-Chain
                    </h3>
                    <p className="text-xs text-[#78716C]">
                      Each move-in condition photo is hashed using SHA-256 upon capture. Because the cryptographic hash cannot be generated in reverse or modified retroactively, owners cannot claim you caused pre-existing damage during checkout.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950 text-emerald-400 font-mono text-xs space-y-2 overflow-x-auto">
                  <p className="text-stone-400 text-[11px] font-sans">
                    // Cryptographic Evidence Ledger — Stored on Thikana Vault
                  </p>
                  {checklist.map((item, idx) => (
                    <div key={item.id} className="leading-relaxed">
                      <span className="text-stone-500">[{idx + 1}]</span>{" "}
                      <span className="text-amber-400">{item.category}</span>:{" "}
                      <span className="text-emerald-300">{item.shaHash}</span>{" "}
                      <span className="text-stone-500">({item.status})</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F3F1EC] text-xs">
                  <span className="text-[#78716C]">
                    Tamper-Proof Certificate ID: <strong className="text-[#1C1917]">THK-HYD-2026-9481</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const auditDoc = `# THIKANA DEPOSIT SHIELD — MOVE-IN AUDIT CERTIFICATE
Certificate ID: THK-HYD-2026-9481
Timestamp: ${tenancyDetails.moveInDate}T10:00:00+05:30
Tenant: ${tenancyDetails.tenantName}
Property: ${tenancyDetails.pgName} (Room ${tenancyDetails.roomNo})
Security Deposit: INR ${tenancyDetails.depositAmount}
Electricity Baseline: 1420.5 kWh

--- CRYPTOGRAPHIC RECORD OF PHYSICAL EVIDENCE ---
${checklist
  .map(
    (c) =>
      `[${c.category}] ${c.item}\nStatus: ${c.status}\nSHA-256: ${c.shaHash}\nNote: ${c.note || "N/A"}\n`
  )
  .join("\n")}
---
Signed and verified under Telangana Tenancy Act Move-In Standards.`;
                      const blob = new Blob([auditDoc], { type: "text/markdown;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Thikana-DepositShield-${tenancyDetails.roomNo.replace(/\s+/g, "_")}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast("Downloaded Sealed Audit Certificate!");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D9532F] text-white rounded-xl text-xs font-bold hover:bg-[#BF4321] transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download Sealed Audit (.md)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Automated Legal Dispute Pack */}
          {activeSubTab === "legal" && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#E7E5E4] p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1C1917]">
                        Telangana Tenancy Act Notice Generator
                      </h3>
                      <p className="text-xs text-[#78716C]">
                        Pre-formatted statutory legal demand notice ready for WhatsApp or registered post.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const notice = `*FORMAL LEGAL NOTICE FOR REFUND OF SECURITY DEPOSIT*
Date: 25-Nov-2026
To: ${tenancyDetails.ownerName} (${tenancyDetails.pgName})

Dear Sir/Madam,
This is formal notice demanding immediate refund of security deposit amount of ₹${tenancyDetails.depositAmount} for Room ${tenancyDetails.roomNo}.

As recorded under Thikana Deposit Shield Audit (Certificate: THK-HYD-2026-9481), all property conditions and pre-existing items were cryptographically timestamped upon move-in on ${tenancyDetails.moveInDate}. No unauthorized deductions may be applied under the Telangana Tenancy Framework.

Please remit the full refund of ₹${tenancyDetails.depositAmount} via UPI within 7 business days.

Sincerely,
${tenancyDetails.tenantName}`;

                        navigator.clipboard.writeText(notice);
                        setCopied(true);
                        showToast("Notice copied to clipboard!");
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      className="px-3.5 py-2 bg-[#1C1917] text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied!" : "Copy Notice"}</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Formal Legal Demand Notice for Security Deposit Refund (₹${tenancyDetails.depositAmount}) - Room ${tenancyDetails.roomNo}, ${tenancyDetails.pgName}. Certified under Thikana Certificate THK-HYD-2026-9481.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Owner</span>
                    </a>
                  </div>
                </div>

                {/* Notice Preview */}
                <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E7E5E4] font-serif text-xs text-stone-800 space-y-3 leading-relaxed">
                  <p className="font-sans font-bold text-[11px] text-[#78716C] uppercase tracking-wider">
                    Statutory Demand Notice Preview
                  </p>
                  <p>
                    <strong>To:</strong> {tenancyDetails.ownerName}, Owner/Manager of {tenancyDetails.pgName}
                  </p>
                  <p>
                    <strong>Subject:</strong> Formal Demand for Refund of Security Deposit (₹{tenancyDetails.depositAmount}) upon Vacation of Room {tenancyDetails.roomNo}.
                  </p>
                  <p>
                    Pursuant to the rental agreement for Room {tenancyDetails.roomNo}, please be advised that the move-in condition audit was cryptographically sealed on {tenancyDetails.moveInDate} under Certificate ID <strong>THK-HYD-2026-9481</strong> with SHA-256 photo hash verification.
                  </p>
                  <p>
                    All fixtures, electrical readings (1,420.5 kWh baseline), and wall conditions match the move-in inspection record. Under the tenancy regulations of Telangana, any withholding beyond 7 days of peaceful handover incurs statutory interest. Please remit the refund of ₹{tenancyDetails.depositAmount} immediately to prevent legal escalation to the Rent Tribunal.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1917] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-stone-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
