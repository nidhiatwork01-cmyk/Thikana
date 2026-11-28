import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Lock,
  Unlock,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import {
  fetchBuddies,
  fetchMyBuddyRequests,
  updateBuddyRequestStatus,
  shareBuddyPhoneConsent,
  submitBuddyReview,
} from "../../lib/api";
import { BuddyCard } from "./BuddyCard";
import { HelpRequestModal } from "./HelpRequestModal";
import { BecomeBuddyModal } from "./BecomeBuddyModal";
import { ChatModal } from "../chat/ChatModal";

export const LocalBuddiesView: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"browse" | "my-requests">("browse");
  const [selectedLocality, setSelectedLocality] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedBuddyForRequest, setSelectedBuddyForRequest] = useState<any | null>(null);
  const [activeChatRequest, setActiveChatRequest] = useState<any | null>(null);
  const [isOptInModalOpen, setIsOptInModalOpen] = useState(false);

  // Review Modal State
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // 1. Fetch Buddies
  const { data: buddies = [], isLoading: isBuddiesLoading } = useQuery({
    queryKey: ["buddies", selectedLocality, selectedLanguage],
    queryFn: () =>
      fetchBuddies({
        locality: selectedLocality || undefined,
        language: selectedLanguage || undefined,
      }),
  });

  // 2. Fetch My Help Requests
  const { data: myRequests = [], isLoading: isRequestsLoading } = useQuery({
    queryKey: ["my-buddy-requests"],
    queryFn: fetchMyBuddyRequests,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBuddyRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-buddy-requests"] });
    },
  });

  const sharePhoneMutation = useMutation({
    mutationFn: ({ id, share }: { id: string; share: boolean }) =>
      shareBuddyPhoneConsent(id, share),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-buddy-requests"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, review }: { id: string; review: any }) =>
      submitBuddyReview(id, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-buddy-requests"] });
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
      setReviewRequestId(null);
      setReviewComment("");
    },
  });

  const localities = [
    "Madhapur",
    "Gachibowli",
    "Kondapur",
    "HITEC City",
    "Ameerpet",
    "Begumpet",
    "Kukatpally",
  ];

  return (
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* Top Banner & Tab Controls                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-[#E7E5E4] p-4 sm:p-5 shrink-0 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FDEEE9] text-[#D9532F]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1C1917] font-display">
                  Local Buddies Network
                </h1>
                <p className="text-xs text-[#78716C]">
                  Connect with verified locals living in Hyderabad who know real PG conditions, water supply, and fair prices.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "browse"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              Browse Buddies ({buddies.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my-requests")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "my-requests"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <span>My Requests</span>
              {myRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#D9532F] text-white text-[10px] flex items-center justify-center font-bold">
                  {myRequests.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOptInModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#D9532F] hover:bg-[#BF4321] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Become a Local Buddy</span>
          </button>
        </div>

        {/* Filter Chips (Browse Tab Only) */}
        {activeTab === "browse" && (
          <div className="max-w-6xl mx-auto flex items-center gap-2 mt-4 pt-3 border-t border-[#F3F1EC] overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedLocality("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                !selectedLocality
                  ? "bg-[#D9532F] text-white"
                  : "bg-[#FAF9F6] text-[#78716C] border border-[#E7E5E4]"
              }`}
            >
              All Localities
            </button>

            {localities.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocality(selectedLocality === loc ? "" : loc)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  selectedLocality === loc
                    ? "bg-[#D9532F] text-white"
                    : "bg-[#FAF9F6] text-[#78716C] border border-[#E7E5E4] hover:bg-[#F3F1EC]"
                }`}
              >
                {loc}
              </button>
            ))}

            <div className="h-4 w-px bg-[#E7E5E4] mx-1 shrink-0" />

            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF9F6] border border-[#E7E5E4] text-[#1C1917] shrink-0"
            >
              <option value="">Any Language</option>
              <option value="Telugu">Telugu</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
            </select>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Content Area                                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === "browse" ? (
            <div>
              {isBuddiesLoading ? (
                <div className="text-center py-12 text-xs text-[#78716C]">
                  Loading local buddies...
                </div>
              ) : buddies.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4] p-8 max-w-md mx-auto space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-[#FDEEE9] text-[#D9532F] flex items-center justify-center mx-auto">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#1C1917]">No Real Local Buddies Yet</h3>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    We removed all artificial profiles so you only connect with real Hyderabad residents. Live in Madhapur, Gachibowli, or HITEC City? Be the first to opt in!
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOptInModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#D9532F] hover:bg-[#BF4321] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Opt In as a Local Buddy</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buddies.map((buddy: any) => (
                    <BuddyCard
                      key={buddy.id}
                      buddy={buddy}
                      onRequestHelp={(b) => setSelectedBuddyForRequest(b)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* My Requests Tab */
            <div className="space-y-4">
              {isRequestsLoading ? (
                <div className="text-center py-12 text-xs text-[#78716C]">
                  Loading your requests...
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4] p-8 max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#FDEEE9] text-[#D9532F] flex items-center justify-center mx-auto text-xl font-bold">
                    💬
                  </div>
                  <h3 className="text-base font-bold text-[#1C1917]">No Active Help Requests</h3>
                  <p className="text-xs text-[#78716C]">
                    Browse our directory of verified Hyderabad residents and ask for advice on water supply, food quality, or room visits.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className="px-4 py-2 bg-[#D9532F] text-white rounded-xl text-xs font-bold"
                  >
                    Find a Local Buddy
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req: any) => {
                    const statusBadges: Record<string, string> = {
                      REQUESTED: "bg-blue-50 text-blue-700 border-blue-200",
                      ACCEPTED: "bg-amber-50 text-amber-700 border-amber-200",
                      IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
                      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      DECLINED: "bg-red-50 text-red-700 border-red-200",
                      CANCELLED: "bg-stone-50 text-stone-700 border-stone-200",
                    };

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border border-[#E7E5E4] p-4 sm:p-5 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                statusBadges[req.status] || "bg-stone-100"
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs text-[#78716C]">• {req.channel}</span>
                          </div>

                          <span className="text-xs font-bold text-[#1C1917]">
                            Agreed Fee: ₹{req.agreedFee} (Off-Platform UPI)
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[#1C1917]">
                            Buddy: {req.buddyName}
                          </h4>
                          <p className="text-xs text-[#78716C] mt-1 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E7E5E4]">
                            "{req.note}"
                          </p>
                        </div>

                        {/* Dual Consent Phone Number Reveal Card */}
                        <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            {req.isPhoneRevealed ? (
                              <Unlock className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-[#78716C]" />
                            )}
                            <div>
                              <span className="font-bold text-[#1C1917]">
                                Phone Privacy:{" "}
                                {req.isPhoneRevealed
                                  ? "Phone Numbers Revealed"
                                  : "Numbers Protected"}
                              </span>
                              <p className="text-[11px] text-[#78716C]">
                                {req.isPhoneRevealed
                                  ? `Buddy Phone: ${req.buddyPhone}`
                                  : req.seekerSharedPhone
                                  ? "You agreed to share. Waiting for buddy consent."
                                  : "Both parties must consent to exchange direct phone numbers."}
                              </p>
                            </div>
                          </div>

                          {!req.isPhoneRevealed && (
                            <button
                              type="button"
                              onClick={() =>
                                sharePhoneMutation.mutate({
                                  id: req.id,
                                  share: !req.seekerSharedPhone,
                                })
                              }
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                                req.seekerSharedPhone
                                  ? "bg-white text-stone-700 border-[#E7E5E4]"
                                  : "bg-[#D9532F] text-white border-[#D9532F]"
                              }`}
                            >
                              {req.seekerSharedPhone ? "Revoke Consent" : "Share My Number"}
                            </button>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F3F1EC] text-xs">
                          <span className="text-[11px] text-[#78716C]">
                            Target: {req.targetLocalities.join(", ")}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveChatRequest(req)}
                              className="px-3 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] text-[#1C1917] font-bold text-xs hover:border-[#D9532F] hover:text-[#D9532F] transition-colors flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#D9532F]" />
                              Chat
                            </button>

                            {req.status === "ACCEPTED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: req.id,
                                    status: "IN_PROGRESS",
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                              >
                                Start Session
                              </button>
                            )}

                            {req.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: req.id,
                                    status: "COMPLETED",
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                              >
                                Mark Completed
                              </button>
                            )}

                            {req.status === "COMPLETED" && !req.hasReview && (
                              <button
                                type="button"
                                onClick={() => setReviewRequestId(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-[#D9532F] text-white font-bold text-xs"
                              >
                                Leave Review ⭐
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Request Modal */}
      <HelpRequestModal
        buddy={selectedBuddyForRequest}
        isOpen={Boolean(selectedBuddyForRequest)}
        onClose={() => setSelectedBuddyForRequest(null)}
        onSuccess={() => {
          setActiveTab("my-requests");
          queryClient.invalidateQueries({ queryKey: ["my-buddy-requests"] });
        }}
      />

      {/* Review Modal */}
      <ChatModal
        isOpen={Boolean(activeChatRequest)}
        onClose={() => setActiveChatRequest(null)}
        request={activeChatRequest}
      />

      {reviewRequestId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] space-y-4">
            <h3 className="text-base font-bold text-[#1C1917]">Rate Your Buddy Interaction</h3>
            <p className="text-xs text-[#78716C]">
              Help others in the community by rating how useful and honest the buddy's advice was.
            </p>

            {/* Stars */}
            <div className="flex gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="text-2xl"
                >
                  {star <= reviewRating ? "⭐" : "☆"}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="e.g. Really helpful! Warned me about the water tanker issue in Madhapur and helped negotiate with the owner."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E7E5E4] text-xs focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewRequestId(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E4] text-xs font-bold text-[#78716C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  reviewMutation.mutate({
                    id: reviewRequestId,
                    review: {
                      rating: reviewRating,
                      tags: ["honest advice", "knows the area"],
                      comment: reviewComment || "Great local advice!",
                    },
                  })
                }
                className="flex-1 py-2 rounded-xl bg-[#D9532F] text-white text-xs font-bold"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Become a Local Buddy Opt-In Modal */}
      <BecomeBuddyModal
        isOpen={isOptInModalOpen}
        onClose={() => setIsOptInModalOpen(false)}
      />
    </div>
  );
};
