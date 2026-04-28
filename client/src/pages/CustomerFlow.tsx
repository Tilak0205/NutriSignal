import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Minus, Plus, Star, ChevronRight, ChevronLeft, PartyPopper, Utensils, Loader2, X } from "lucide-react";
import { api } from "../lib/api";

type MenuItem = { id: string; name: string; price: number; description?: string; isAvailable?: boolean; images?: string[] };
type Category = { id: string; name: string; items: MenuItem[] };
type Restaurant = { id: string; name: string; logo?: string; brandPrimaryColor: string };
type Lightbox = { images: string[]; idx: number };

const QUESTIONS = [
  {
    key: "emotionalState", label: "What best describes you right now?", sub: "No wrong answers — just go with your gut",
    options: [
      { value: "cheerful", label: "Cheerful & upbeat", emoji: "😊" },
      { value: "calm", label: "Calm & peaceful", emoji: "😌" },
      { value: "restless", label: "Restless & on edge", emoji: "😤" },
      { value: "drained", label: "Drained & low", emoji: "😮‍💨" },
      { value: "indifferent", label: "Just... meh", emoji: "😶" },
    ],
  },
  {
    key: "dayContext", label: "How has your day been?", sub: "Just a quick check-in",
    options: [
      { value: "great-day", label: "Amazing day", emoji: "☀️" },
      { value: "normal-day", label: "Pretty normal", emoji: "🌤️" },
      { value: "long-day", label: "Long day, need a break", emoji: "🌙" },
      { value: "tough-day", label: "Rough one", emoji: "🌧️" },
      { value: "special-day", label: "Something special happened", emoji: "🌟" },
    ],
  },
  {
    key: "energy", label: "How charged are you?", sub: "Your energy level right now",
    options: [
      { value: "low", label: "Low", emoji: "🔋" },
      { value: "medium", label: "Medium", emoji: "⚡" },
      { value: "high", label: "High", emoji: "🔥" },
    ],
  },
  {
    key: "occasion", label: "What's the occasion?", sub: "Helps us set the right vibe",
    options: [
      { value: "casual", label: "Casual", emoji: "☕" },
      { value: "celebration", label: "Celebration", emoji: "🎉" },
      { value: "date", label: "Date", emoji: "💕" },
      { value: "business", label: "Business", emoji: "💼" },
      { value: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
    ],
  },
  {
    key: "cravings", label: "What sounds good right now?", sub: "Go with your gut feeling",
    options: [
      { value: "sweet", label: "Sweet", emoji: "🍰" },
      { value: "savory", label: "Savory", emoji: "🥩" },
      { value: "spicy", label: "Spicy", emoji: "🌶️" },
      { value: "light", label: "Light", emoji: "🥗" },
      { value: "heavy", label: "Heavy", emoji: "🍖" },
      { value: "comfort food", label: "Comfort", emoji: "🍲" },
    ],
  },
  {
    key: "dietaryPreference", label: "Dietary preference?", sub: "So we can filter for you",
    options: [
      { value: "none", label: "None", emoji: "🍽️" },
      { value: "vegetarian", label: "Vegetarian", emoji: "🥬" },
      { value: "vegan", label: "Vegan", emoji: "🌱" },
      { value: "gluten-free", label: "Gluten-free", emoji: "🌾" },
    ],
  },
];

type Step = "loading" | "welcome" | "questionnaire" | "menu" | "feedback" | "thanks";

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.2 } },
};

export default function CustomerFlow() {
  const { tableUuid = "" } = useParams();
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableNumber, setTableNumber] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({
    emotionalState: "", dayContext: "", energy: "", occasion: "", cravings: "", dietaryPreference: "",
  });
  const [menu, setMenu] = useState<Category[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);

  const accent = restaurant?.brandPrimaryColor ?? "#0ea5e9";

  useEffect(() => {
    (async () => {
      try {
        const { data: td } = await api.get(`/customer/table/${tableUuid}`);
        const { data: sess } = await api.post("/customer/session", { tableId: td.tableId });
        setSessionId(sess.id);
        setRestaurantId(td.restaurant.id);
        setRestaurant(td.restaurant);
        setTableNumber(td.tableNumber);
        setStep("welcome");
      } catch {
        setError("This table link is invalid or expired.");
      }
    })();
  }, [tableUuid]);

  // Close lightbox on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitQuestionnaire = async () => {
    setSubmitting(true);
    await api.post("/customer/questionnaire", { sessionId, ...form });
    const { data } = await api.get(`/customer/menu/${restaurantId}`);
    setMenu(data);
    setSubmitting(false);
    setStep("menu");
  };

  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const cartCount = cartItems.reduce((s, [, q]) => s + q, 0);
  const allItems = useMemo(() => menu.flatMap((c) => c.items), [menu]);
  const total = useMemo(() => allItems.reduce((s, i) => s + i.price * (cart[i.id] ?? 0), 0), [allItems, cart]);

  const add = (id: string) => setCart((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
  const remove = (id: string) => setCart((s) => {
    const n = (s[id] ?? 0) - 1;
    if (n <= 0) { const { [id]: _, ...rest } = s; return rest; }
    return { ...s, [id]: n };
  });

  const openLightbox = (images: string[], idx: number) => setLightbox({ images, idx });
  const lightboxPrev = () => setLightbox(lb => lb ? { ...lb, idx: (lb.idx - 1 + lb.images.length) % lb.images.length } : null);
  const lightboxNext = () => setLightbox(lb => lb ? { ...lb, idx: (lb.idx + 1) % lb.images.length } : null);

  const placeOrder = async () => {
    if (cartCount === 0) return;
    setSubmitting(true);
    const items = cartItems.map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    await api.post("/customer/order", { sessionId, items });
    setSubmitting(false);
    setStep("feedback");
  };

  const submitFeedback = async () => {
    if (rating > 0) await api.post("/customer/feedback", { sessionId, rating, comment: comment || undefined });
    setStep("thanks");
  };

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">😕</div>
          <h2 className="text-lg font-semibold text-slate-800">Oops</h2>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="space-y-2 w-36 text-center">
            <div className="h-3 bg-slate-200 rounded-full animate-pulse mx-auto w-3/4" />
            <div className="h-2.5 bg-slate-200 rounded-full animate-pulse mx-auto w-1/2" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-200/60">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: accent }}>
              {restaurant?.name?.charAt(0) ?? "N"}
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm leading-tight">{restaurant?.name}</div>
              <div className="text-[11px] text-slate-400">Table {tableNumber}</div>
            </div>
          </div>
          {step === "menu" && cartCount > 0 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
              <ShoppingBag className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ background: accent }}>{cartCount}</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div key="welcome" {...pageVariants} className="flex flex-col items-center text-center pt-12">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
              >
                <Utensils className="w-10 h-10" />
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to {restaurant?.name}</h1>
              <p className="text-slate-500 mb-8 max-w-xs">Answer a few quick questions so we can make your visit perfect.</p>
              <button
                onClick={() => setStep("questionnaire")}
                className="w-full max-w-xs py-3.5 rounded-xl text-white font-semibold text-base shadow-lg shadow-sky-200/50 transition-transform active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
              >
                Let's Go
              </button>
            </motion.div>
          )}

          {step === "questionnaire" && (
            <motion.div key={`q-${qIdx}`} {...pageVariants}>
              <div className="flex gap-1.5 mb-6">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="h-1 rounded-full flex-1 transition-all duration-300" style={{ background: i <= qIdx ? accent : "#e2e8f0" }} />
                ))}
              </div>

              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-800">{QUESTIONS[qIdx].label}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{QUESTIONS[qIdx].sub}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-5">
                {QUESTIONS[qIdx].options.map((opt) => {
                  const selected = form[QUESTIONS[qIdx].key] === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setForm((s) => ({ ...s, [QUESTIONS[qIdx].key]: opt.value }))}
                      className={`relative flex flex-col items-center gap-1 py-4 px-3 rounded-xl border-2 transition-all duration-200 ${
                        selected ? "border-sky-400 bg-sky-50 shadow-md shadow-sky-100" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                      style={selected ? { borderColor: accent, backgroundColor: `${accent}10` } : {}}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className={`text-sm font-medium ${selected ? "text-slate-800" : "text-slate-600"}`}>{opt.label}</span>
                      {selected && (
                        <motion.div layoutId="check" className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ background: accent }}>✓</motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-8">
                {qIdx > 0 && (
                  <button onClick={() => setQIdx((i) => i - 1)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium transition-colors hover:bg-slate-50">
                    Back
                  </button>
                )}
                <button
                  disabled={!form[QUESTIONS[qIdx].key] || submitting}
                  onClick={() => { if (qIdx < QUESTIONS.length - 1) setQIdx((i) => i + 1); else submitQuestionnaire(); }}
                  className="flex-1 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: form[QUESTIONS[qIdx].key] ? accent : "#94a3b8" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : qIdx < QUESTIONS.length - 1 ? <>Next <ChevronRight className="w-4 h-4" /></> : "See Menu"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "menu" && (
            <motion.div key="menu" {...pageVariants}>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Menu</h2>
              <p className="text-sm text-slate-400 mb-4">Tap + to add items to your order</p>

              {menu.length === 0 && <p className="text-slate-400 text-center py-10">No items available right now.</p>}

              {menu.map((cat) => (
                <div key={cat.id} className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">{cat.name}</h3>
                  <div className="space-y-2">
                    {cat.items.filter((i) => i.isAvailable !== false).map((item) => {
                      const qty = cart[item.id] ?? 0;
                      const hasImages = item.images && item.images.length > 0;
                      return (
                        <motion.div key={item.id} layout className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-3 p-3.5">
                            {hasImages && (
                              <button
                                onClick={() => openLightbox(item.images!, 0)}
                                className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-100 active:scale-95 transition-transform"
                              >
                                <img src={item.images![0]} alt={item.name} className="w-full h-full object-cover" />
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                              {item.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</div>}
                              <div className="font-bold text-sm mt-1" style={{ color: accent }}>£{item.price.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {qty > 0 && (
                                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} className="flex items-center gap-1.5">
                                  <button onClick={() => remove(item.id)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-sm font-bold w-5 text-center">{qty}</span>
                                </motion.div>
                              )}
                              <button onClick={() => add(item.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm transition-transform active:scale-90" style={{ background: accent }}>
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {item.images && item.images.length > 1 && (
                            <div className="flex gap-1.5 px-3.5 pb-3 overflow-x-auto">
                              {item.images.slice(1).map((img, idx) => (
                                <button key={idx} onClick={() => openLightbox(item.images!, idx + 1)} className="shrink-0 active:scale-95 transition-transform">
                                  <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-white/0 pt-10">
                    <button
                      onClick={placeOrder}
                      disabled={submitting}
                      className="w-full max-w-lg mx-auto flex items-center justify-between py-3.5 px-5 rounded-xl text-white font-semibold shadow-lg transition-transform active:scale-[0.98] disabled:opacity-80"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                    >
                      <span className="flex items-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        {submitting ? "Placing order..." : `Place Order (${cartCount})`}
                      </span>
                      <span className="font-bold">£{total.toFixed(2)}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="h-24" />
            </motion.div>
          )}

          {step === "feedback" && (
            <motion.div key="feedback" {...pageVariants} className="flex flex-col items-center text-center pt-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <span className="text-3xl">🎉</span>
              </motion.div>
              <h2 className="text-xl font-bold text-slate-800">Order placed!</h2>
              <p className="text-slate-400 text-sm mt-1 mb-6">While you wait, how was your experience?</p>
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button key={n} whileTap={{ scale: 1.3 }} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(n)} className="p-1">
                    <Star className="w-8 h-8 transition-colors" fill={n <= (hoverRating || rating) ? "#f59e0b" : "none"} stroke={n <= (hoverRating || rating) ? "#f59e0b" : "#cbd5e1"} />
                  </motion.button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us more... (optional)"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 mb-4" />
              <button onClick={submitFeedback} className="w-full py-3 rounded-xl text-white font-semibold transition-transform active:scale-[0.97]" style={{ background: accent }}>
                {rating > 0 ? "Submit Feedback" : "Skip"}
              </button>
            </motion.div>
          )}

          {step === "thanks" && (
            <motion.div key="thanks" {...pageVariants} className="flex flex-col items-center text-center pt-16">
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5 }}>
                <PartyPopper className="w-16 h-16 mb-4" style={{ color: accent }} />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Thank you!</h2>
              <p className="text-slate-500 max-w-xs">Your order is on its way to the kitchen. Sit back, relax, and enjoy your meal.</p>
              <div className="mt-8 px-5 py-3 rounded-xl bg-slate-100 text-slate-500 text-sm">
                Table {tableNumber} • {restaurant?.name}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightbox.idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  src={lightbox.images[lightbox.idx]}
                  alt=""
                  className="w-full rounded-2xl object-contain max-h-[65vh]"
                />
              </AnimatePresence>

              {/* Navigation arrows */}
              {lightbox.images.length > 1 && (
                <>
                  <button
                    onClick={lightboxPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={lightboxNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dots */}
                  <div className="flex justify-center gap-1.5 mt-4">
                    {lightbox.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setLightbox(lb => lb ? { ...lb, idx: i } : null)}
                        className={`rounded-full transition-all ${i === lightbox.idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Counter */}
              {lightbox.images.length > 1 && (
                <div className="absolute -top-10 left-0 text-white/60 text-sm font-medium">
                  {lightbox.idx + 1} / {lightbox.images.length}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
