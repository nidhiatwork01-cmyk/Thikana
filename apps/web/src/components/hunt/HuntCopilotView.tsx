import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Plus,
  Navigation,
  CheckSquare,
  Sliders,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  Sparkles,
  Phone,
  Route,
  Shield,
  Droplets,
  Volume2,
} from "lucide-react";
import {
  fetchHuntItems,
  createHuntItem,
  updateHuntItem,
  deleteHuntItem,
  optimizeHuntRoute,
  scoreHuntItem,
} from "../../lib/api";
import { useCommuteStore } from "../../store/commuteStore";
import type { HuntItem, VisitPlanResult } from "@thikana/shared-types";

export const HuntCopilotView: React.FC = () => {
  const queryClient = useQueryClient();
  const { destination } = useCommuteStore();

  const [activeSubTab, setActiveSubTab] = useState<"items" | "route" | "weights">("items");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<HuntItem | null>(null);
  const [scoreResult, setScoreResult] = useState<{ item: any; score: number } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [routePlan, setRoutePlan] = useState<VisitPlanResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Form State for Adding External PG
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRent, setFormRent] = useState("9500");
  const [formPhone, setFormPhone] = useState("");
  const [formSource, setFormSource] = useState("");

  // Scoring Weights State
  const [weights, setWeights] = useState({
    commute: 0.25,
    price: 0.25,
    food: 0.15,
    cleanliness: 0.15,
    safety: 0.1,
    vibe: 0.1,
  });

  // Query: Fetch Hunt Items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hunt-items"],
    queryFn: fetchHuntItems,
  });

  // Mutation: Add Item
  const addMutation = useMutation({
    mutationFn: createHuntItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
      setIsAddModalOpen(false);
      setFormName("");
      setFormAddress("");
      setFormRent("9500");
      setFormPhone("");
      setFormSource("");
    },
  });

  // Mutation: Update Item
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateHuntItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
    },
  });

  // Mutation: Delete Item
  const deleteMutation = useMutation({
    mutationFn: deleteHuntItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      name: formName,
      address: formAddress,
      location: {
        lat: destination.lat + (Math.random() - 0.5) * 0.04,
        lng: destination.lng + (Math.random() - 0.5) * 0.04,
      },
      rent: Number(formRent) || 9500,
      phone: formPhone || undefined,
      sourceUrl: formSource || undefined,
    });
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const handleOptimizeRoute = async () => {
    if (items.length < 1) return;
    setIsOptimizing(true);
    try {
      const plan = await optimizeHuntRoute({
        startLocation: { lat: destination.lat, lng: destination.lng },
        huntItemIds: items.map((i: any) => i.id),
        dayStartTime: "10:00",
        minutesPerVisit: 45,
      });
      setRoutePlan(plan);
      setActiveSubTab("route");
      showNotification("success", `Optimized tour for ${items.length} PGs with 2-Opt TSP!`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to optimize route");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCalculateScore = async (itemId: string) => {
    const targetItem = items.find((i: any) => i.id === itemId);
    try {
      const res = await scoreHuntItem(itemId, weights);
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
      setScoreResult({ item: targetItem, score: res.score });
    } catch (err: any) {
      showNotification("error", err.message || "Failed to calculate score");
    }
  };

  const handleClearAllCandidates = async () => {
    if (!window.confirm("Remove all candidates from your Hunt Workspace?")) return;
    setIsOptimizing(true);
    try {
      for (const item of items) {
        await deleteHuntItem(item.id);
      }
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
      setRoutePlan(null);
      showNotification("success", "Hunt Workspace cleared");
    } catch (err: any) {
      showNotification("error", "Failed to clear candidates");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLoadSamplePgs = async () => {
    setIsOptimizing(true);
    try {
      const samplePgs = [
        {
          name: "Stanza Living Boston House",
          address: "Silicon Valley, Madhapur, Hyderabad",
          rent: 11500,
          phone: "+91 98490 11223",
          location: { lat: 17.4485, lng: 78.3842 },
          status: "VISIT_PLANNED",
        },
        {
          name: "Serene Coliving Suites",
          address: "Near Bio-Diversity Park, Gachibowli, Hyderabad",
          rent: 13000,
          phone: "+91 99887 22334",
          location: { lat: 17.4412, lng: 78.3685 },
          status: "VISIT_PLANNED",
        },
        {
          name: "Zolo Amber Luxury Stay",
          address: "Raghavendra Colony, Kondapur, Hyderabad",
          rent: 9500,
          phone: "+91 91234 56789",
          location: { lat: 17.4628, lng: 78.3582 },
          status: "SAVED",
        },
      ];

      for (const sp of samplePgs) {
        await createHuntItem(sp);
      }
      queryClient.invalidateQueries({ queryKey: ["hunt-items"] });
      showNotification("success", "Loaded 3 top Hyderabad PG candidates!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to load sample PGs");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* Top Banner & Control Bar                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-[#E7E5E4] p-4 sm:p-5 shrink-0 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FDEEE9] text-[#D9532F]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1C1917] font-display">
                  PG Hunt Copilot
                </h1>
                <p className="text-[11px] text-[#78716C]">
                  Shortlist, inspect & optimize your visit route
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {items.length === 0 && (
              <button
                type="button"
                onClick={handleLoadSamplePgs}
                disabled={isOptimizing}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Load 3 Sample PGs</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F3F1EC] text-[#1C1917] border border-[#E7E5E4] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4 text-[#D9532F]" />
              <span>Add External PG</span>
            </button>

            <button
              type="button"
              disabled={items.length < 1 || isOptimizing}
              onClick={handleOptimizeRoute}
              className="px-4 py-2 rounded-xl bg-[#D9532F] hover:bg-[#BF4321] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Route className="w-4 h-4" />
              <span>{isOptimizing ? "Optimizing..." : "Optimize Visit Day (TSP)"}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mt-4 pt-3 border-t border-[#F3F1EC]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("items")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSubTab === "items"
                  ? "bg-[#1C1917] text-white"
                  : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
              }`}
            >
              My Hunt Candidates ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("route")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                activeSubTab === "route"
                  ? "bg-[#1C1917] text-white"
                  : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
              }`}
            >
              <span>Visit Day Itinerary</span>
              {routePlan && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("weights")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                activeSubTab === "weights"
                  ? "bg-[#1C1917] text-white"
                  : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Scoring Weights</span>
            </button>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllCandidates}
              className="text-[11px] text-[#A8A29E] hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
              title="Clear all candidate PGs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear List</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating In-App Notification Toast */}
      {notification && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-red-900 text-white border-red-700"
          }`}
        >
          <span>{notification.type === "success" ? "✓" : "⚠"}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Tab Body                                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* TAB 1: Candidates List */}
          {activeSubTab === "items" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-xs text-[#78716C]">
                  Loading your hunt candidates...
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4] p-8 max-w-md mx-auto space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-[#FDEEE9] text-[#D9532F] flex items-center justify-center mx-auto text-xl font-bold">
                    🧭
                  </div>
                  <h3 className="text-base font-bold text-[#1C1917]">Your Hunt Workspace is Empty</h3>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Add PGs you found anywhere (broker WhatsApp chats, Google Maps links, or Thikana listings) to start planning your visits.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSamplePgs}
                      disabled={isOptimizing}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Sparkles className="w-4 h-4" /> Load 3 Sample Hyderabad PGs
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#D9532F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#BF4321]"
                    >
                      <Plus className="w-4 h-4" /> Add Your First PG
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item: any) => {
                    const statusColors: Record<string, string> = {
                      SAVED: "bg-stone-100 text-stone-700 border-stone-200",
                      VISIT_PLANNED: "bg-blue-50 text-blue-700 border-blue-200",
                      VISITED: "bg-amber-50 text-amber-700 border-amber-200",
                      OFFER_MADE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      REJECTED: "bg-red-50 text-red-700 border-red-200",
                    };

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#E7E5E4] p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        <div>
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                statusColors[item.status] || "bg-stone-100"
                              }`}
                            >
                              {item.status.replace("_", " ")}
                            </span>

                            {item.calculatedScore != null && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ⭐ {item.calculatedScore}/100
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-[#1C1917] mt-2 truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#78716C] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#D9532F]" />
                            <span className="truncate">{item.address}</span>
                          </p>

                          <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-[#F3F1EC]">
                            <div>
                              <span className="text-base font-extrabold font-display text-[#1C1917]">
                                ₹{item.rent.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-[#78716C]">/mo</span>
                            </div>

                            {item.phone && (
                              <a
                                href={`tel:${item.phone}`}
                                className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> {item.phone}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* On-Site Checklist Summary */}
                        <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E7E5E4] text-[11px] space-y-1">
                          <div className="flex justify-between text-[#78716C]">
                            <span>Water Pressure:</span>
                            <span className="font-semibold text-[#1C1917]">
                              {"★".repeat(item.checklist?.waterPressure || 3)} ({item.checklist?.waterPressure || 3}/5)
                            </span>
                          </div>
                          <div className="flex justify-between text-[#78716C]">
                            <span>Clean Smell:</span>
                            <span className="font-semibold text-[#1C1917]">
                              {item.checklist?.waterSmellClean ? "✅ Yes" : "❌ No"}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#78716C]">
                            <span>Curfew Policy:</span>
                            <span className="font-semibold text-[#1C1917]">
                              {item.checklist?.curfewTime || "None"}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F3F1EC]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectingItem(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#FAF9F6] hover:bg-[#F3F1EC] text-[#D9532F] border border-[#D9532F]/20 flex items-center gap-1"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Checklist</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCalculateScore(item.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF9F6] hover:bg-[#F3F1EC] text-[#1C1917] border border-[#E7E5E4]"
                              title="Calculate score based on personal weights"
                            >
                              Score
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                            title="Remove from Hunt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 2-Opt TSP Optimized Route Itinerary */}
          {activeSubTab === "route" && (
            <div className="space-y-6">
              {!routePlan ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4] p-8 max-w-md mx-auto space-y-3">
                  <Route className="w-10 h-10 text-[#D9532F] mx-auto" />
                  <h3 className="text-base font-bold text-[#1C1917]">No Route Generated Yet</h3>
                  <p className="text-xs text-[#78716C]">
                    Click the "Optimize Visit Day (TSP)" button to calculate the most efficient visiting order across all your shortlisted PGs.
                  </p>
                  <button
                    type="button"
                    onClick={handleOptimizeRoute}
                    className="px-4 py-2 rounded-xl bg-[#D9532F] text-white text-xs font-bold"
                  >
                    Run 2-Opt Optimization
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-2xs">
                      <span className="text-[11px] font-bold text-[#78716C] uppercase">Total Driving Distance</span>
                      <p className="text-xl font-black font-display text-[#1C1917] mt-0.5">
                        {routePlan.totalDistanceKm} km
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-2xs">
                      <span className="text-[11px] font-bold text-[#78716C] uppercase">Total Day Duration</span>
                      <p className="text-xl font-black font-display text-[#1C1917] mt-0.5">
                        {Math.floor(routePlan.totalTimeMinutes / 60)}h {routePlan.totalTimeMinutes % 60}m
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-2xs">
                      <span className="text-[11px] font-bold text-[#78716C] uppercase">Starting Point</span>
                      <p className="text-sm font-bold text-[#1C1917] truncate mt-1">
                        {destination.name.split(",")[0]} (10:00 AM)
                      </p>
                    </div>
                  </div>

                  {/* Step-by-Step Route Legs */}
                  <div className="bg-white rounded-2xl border border-[#E7E5E4] p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D9532F]" />
                      Optimized Visiting Schedule (2-Opt Minimum Travel Tour)
                    </h3>

                    <div className="relative border-l-2 border-[#D9532F] ml-3 pl-6 space-y-6">
                      {routePlan.timeline.map((stop, idx) => {
                        const leg = routePlan.legs[idx];

                        return (
                          <div key={stop.huntItemId} className="relative space-y-2">
                            {/* Marker dot */}
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-3 border-[#D9532F]" />

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div>
                                <span className="text-xs font-extrabold text-[#D9532F]">
                                  Stop {idx + 1}: {stop.arrivalTime} – {stop.departureTime}
                                </span>
                                <h4 className="text-sm font-bold text-[#1C1917]">{stop.name}</h4>
                              </div>

                              {leg && (
                                <a
                                  href={leg.googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDEEE9] text-[#D9532F] font-bold text-xs hover:bg-[#D9532F] hover:text-white transition-colors shrink-0"
                                >
                                  <span>Navigate in Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {leg && (
                              <p className="text-xs text-[#78716C] bg-[#FAF9F6] p-2 rounded-lg border border-[#E7E5E4]">
                                🏍️ Travel Leg: ~{leg.travelMinutes} mins ({leg.distanceKm} km from {leg.fromName.split(",")[0]})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Scoring Weights Matrix */}
          {activeSubTab === "weights" && (
            <div className="bg-white rounded-3xl border border-[#E7E5E4] p-6 max-w-2xl mx-auto shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D9532F]" />
                  Personal Decision Weights
                </h3>
                <p className="text-xs text-[#78716C] mt-1">
                  Adjust what matters to you when ranking prospective PGs. Thikana computes a personalized 0-100 suitability score for each accommodation based on your real on-site inspection data.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { key: "commute", label: "Commute Proximity & Road Quality", icon: Navigation },
                  { key: "price", label: "Budget & Deposit Fairness", icon: Sparkles },
                  { key: "cleanliness", label: "Water Pressure & Room Cleanliness", icon: Droplets },
                  { key: "safety", label: "CCTV, Biometric & Visitor Flexibility", icon: Shield },
                  { key: "vibe", label: "Noise Levels & WiFi Quality", icon: Volume2 },
                ].map((crit) => {
                  const val = (weights as any)[crit.key];
                  const Icon = crit.icon;

                  return (
                    <div key={crit.key} className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-[#D9532F]" />
                          {crit.label}
                        </span>
                        <span className="font-extrabold text-[#D9532F]">{Math.round(val * 100)}%</span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={val}
                        onChange={(e) =>
                          setWeights({ ...weights, [crit.key]: parseFloat(e.target.value) })
                        }
                        className="w-full accent-[#D9532F] cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Modal: Add External PG                                        */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] space-y-4 animate-scale-up">
            <h3 className="text-base font-bold text-[#1C1917]">Add PG to Hunt Workspace</h3>
            <p className="text-xs text-[#78716C]">
              Paste details from your broker WhatsApp message or Google Maps pin.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                  PG / Coliving Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Luxury PG"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none focus:border-[#D9532F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                  Locality / Landmark Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Botanical Garden Road, Kondapur"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none focus:border-[#D9532F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formRent}
                    onChange={(e) => setFormRent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none focus:border-[#D9532F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none focus:border-[#D9532F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                  Google Maps / WhatsApp URL
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none focus:border-[#D9532F]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E7E5E4] text-xs font-bold text-[#78716C] hover:bg-[#F3F1EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#D9532F] text-white text-xs font-bold hover:bg-[#BF4321]"
                >
                  {addMutation.isPending ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: On-Site Inspection Checklist                           */}
      {/* ------------------------------------------------------------- */}
      {inspectingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] p-6 shadow-2xl border border-[#E7E5E4] space-y-4 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">On-Site Inspection Checklist</h3>
                <p className="text-xs text-[#78716C]">{inspectingItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="text-stone-400 hover:text-[#1C1917]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status */}
              <div>
                <label className="block font-bold text-[#78716C] uppercase mb-1">
                  Visit Stage
                </label>
                <select
                  value={inspectingItem.status}
                  onChange={(e) =>
                    setInspectingItem({ ...inspectingItem, status: e.target.value as any })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6] font-semibold"
                >
                  <option value="SAVED">Saved</option>
                  <option value="VISIT_PLANNED">Visit Planned</option>
                  <option value="VISITED">Visited & Inspected</option>
                  <option value="OFFER_MADE">Offer Made / Token Paid</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Water Pressure */}
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E5E4]">
                <div className="flex justify-between font-bold mb-1">
                  <span>Water Pressure (Bathroom Tap)</span>
                  <span className="text-[#D9532F]">{inspectingItem.checklist.waterPressure}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={inspectingItem.checklist.waterPressure}
                  onChange={(e) =>
                    setInspectingItem({
                      ...inspectingItem,
                      checklist: {
                        ...inspectingItem.checklist,
                        waterPressure: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[#D9532F]"
                />
              </div>

              {/* Water Smell Clean */}
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E5E4] flex items-center justify-between">
                <span className="font-bold">Water Odor (Clean, No Rust/Sulfur Smell)</span>
                <input
                  type="checkbox"
                  checked={inspectingItem.checklist.waterSmellClean}
                  onChange={(e) =>
                    setInspectingItem({
                      ...inspectingItem,
                      checklist: {
                        ...inspectingItem.checklist,
                        waterSmellClean: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-[#D9532F]"
                />
              </div>

              {/* Traffic Noise Level */}
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E5E4]">
                <div className="flex justify-between font-bold mb-1">
                  <span>Peacefulness (1 = Loud traffic, 5 = Peaceful)</span>
                  <span className="text-[#D9532F]">{inspectingItem.checklist.trafficNoiseLevel}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={inspectingItem.checklist.trafficNoiseLevel}
                  onChange={(e) =>
                    setInspectingItem({
                      ...inspectingItem,
                      checklist: {
                        ...inspectingItem.checklist,
                        trafficNoiseLevel: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[#D9532F]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-[#78716C] uppercase mb-1">
                  On-Site Inspection Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Owner asked for 2 months deposit. Room has good sunlight. Washing machine on 3rd floor."
                  value={inspectingItem.checklist.notes}
                  onChange={(e) =>
                    setInspectingItem({
                      ...inspectingItem,
                      checklist: {
                        ...inspectingItem.checklist,
                        notes: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E7E5E4] text-xs font-bold text-[#78716C]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateMutation.mutate({
                      id: inspectingItem.id,
                      input: {
                        status: inspectingItem.status,
                        checklist: inspectingItem.checklist,
                      },
                    });
                    setInspectingItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#D9532F] text-white text-xs font-bold"
                >
                  Save Inspection Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: In-App Score Breakdown Modal                          */}
      {/* ------------------------------------------------------------- */}
      {scoreResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E5E4] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F3F1EC] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-lg font-bold">⭐</span>
                <div>
                  <h3 className="text-base font-extrabold text-[#1C1917] font-display">Candidate Score</h3>
                  <p className="text-[11px] text-[#78716C] truncate max-w-[200px]">{scoreResult.item?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScoreResult(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Score Ring / Gauge */}
            <div className="text-center py-2 bg-[#FAF9F6] rounded-2xl border border-[#E7E5E4]">
              <span
                className={`text-4xl font-black font-display ${
                  scoreResult.score >= 80
                    ? "text-emerald-600"
                    : scoreResult.score >= 60
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {scoreResult.score}
              </span>
              <span className="text-lg font-bold text-stone-400">/100</span>
              <p className="text-xs font-bold mt-1 text-[#1C1917]">
                {scoreResult.score >= 80
                  ? "🌟 Excellent Match for your commute & budget"
                  : scoreResult.score >= 60
                  ? "👍 Balanced Option (Minor compromises)"
                  : "⚠️ High Compromise (Re-evaluate requirements)"}
              </p>
            </div>

            {/* Weights Breakdown List */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-[#78716C] uppercase text-[10px] tracking-wider">
                Evaluated with your Custom Weights
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Commute Proximity ({Math.round(weights.commute * 100)}%)</span>
                  <span className="font-bold text-stone-800">Evaluated</span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D9532F] h-full rounded-full"
                    style={{ width: `${Math.min(100, scoreResult.score + 5)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-stone-600 pt-1">
                  <span>Rent & Deposit ({Math.round(weights.price * 100)}%)</span>
                  <span className="font-bold text-stone-800">Evaluated</span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(30, scoreResult.score - 10))}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-stone-600 pt-1">
                  <span>Inspection Checklist ({Math.round((weights.cleanliness + weights.food) * 100)}%)</span>
                  <span className="font-bold text-stone-800">
                    {scoreResult.item?.checklist ? "Inspected" : "Default (3/5)"}
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, scoreResult.score)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#F3F1EC]">
              <button
                type="button"
                onClick={() => {
                  if (scoreResult.item?.id) {
                    updateMutation.mutate({
                      id: scoreResult.item.id,
                      input: { status: "OFFER_MADE" },
                    });
                  }
                  setScoreResult(null);
                  showNotification("success", "Marked status as Offer Made!");
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Mark Offer Made
              </button>
              <button
                type="button"
                onClick={() => setScoreResult(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
