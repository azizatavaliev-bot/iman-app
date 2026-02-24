import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Calculator,
  History,
  BookOpen,
  Check,
  Coins,
  CircleDollarSign,
  Gem,
  TrendingUp,
  Briefcase,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Info,
} from "lucide-react";
import { storage, POINTS } from "../lib/storage";
import type { ZakatAssets, ZakatHistoryEntry } from "../lib/storage";
import { trackAction } from "../lib/analytics";
import { hapticSuccess } from "../lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Tab = "calculator" | "history" | "info";

// Gold nisab = 85 grams. Approximate price per gram in USD
const GOLD_PRICE_PER_GRAM = 65; // ~$5,525 for 85g (conservative estimate)
const SILVER_PRICE_PER_GRAM = 0.83; // ~$494 for 595g
const DEFAULT_NISAB = 85 * GOLD_PRICE_PER_GRAM; // gold-based nisab in USD
const ZAKAT_RATE = 0.025; // 2.5%

interface AssetField {
  key: keyof ZakatAssets;
  label: string;
  icon: typeof Coins;
  placeholder: string;
  hint: string;
  isDebt?: boolean;
}

const ASSET_FIELDS: AssetField[] = [
  { key: "cash", label: "Наличные", icon: Coins, placeholder: "0", hint: "Деньги дома и в кошельке" },
  { key: "savings", label: "Банковские счета", icon: PiggyBank, placeholder: "0", hint: "Вклады, карты, накопительные счета" },
  { key: "gold_grams", label: "Золото (граммы)", icon: Gem, placeholder: "0", hint: "Ювелирные изделия, слитки, монеты" },
  { key: "silver_grams", label: "Серебро (граммы)", icon: Gem, placeholder: "0", hint: "Серебряные изделия, слитки" },
  { key: "investments", label: "Инвестиции", icon: TrendingUp, placeholder: "0", hint: "Акции, облигации, крипто, фонды" },
  { key: "business", label: "Бизнес-активы", icon: Briefcase, placeholder: "0", hint: "Товары на продажу, оборотные средства" },
  { key: "debts_owed_to_you", label: "Долги вам", icon: ArrowDownLeft, placeholder: "0", hint: "Деньги, которые вам должны вернуть" },
  { key: "debts_you_owe", label: "Ваши долги", icon: ArrowUpRight, placeholder: "0", hint: "Деньги, которые вы должны", isDebt: true },
];

const RECIPIENTS = [
  { emoji: "1️⃣", title: "Бедные (аль-фукара)", desc: "Те, у кого нет средств для основных нужд" },
  { emoji: "2️⃣", title: "Нуждающиеся (аль-масакин)", desc: "Те, чей доход не покрывает базовые потребности" },
  { emoji: "3️⃣", title: "Сборщики закята", desc: "Работники, занимающиеся сбором и распределением" },
  { emoji: "4️⃣", title: "Новообращённые (муалляфат аль-кулюб)", desc: "Те, чьи сердца склоняются к Исламу" },
  { emoji: "5️⃣", title: "Освобождение рабов", desc: "Помощь в освобождении от рабства/долгового рабства" },
  { emoji: "6️⃣", title: "Должники (аль-гаримин)", desc: "Те, кто не может выплатить свои долги" },
  { emoji: "7️⃣", title: "На пути Аллаха (фи сабилиллях)", desc: "Расходы на благие дела и защиту Ислама" },
  { emoji: "8️⃣", title: "Путники (ибн ас-сабиль)", desc: "Странники, оказавшиеся без средств в пути" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}

function formatDate(dateStr: string): string {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function calculateTotalAssets(assets: ZakatAssets): number {
  const goldValue = assets.gold_grams * GOLD_PRICE_PER_GRAM;
  const silverValue = assets.silver_grams * SILVER_PRICE_PER_GRAM;
  return (
    assets.cash +
    assets.savings +
    goldValue +
    silverValue +
    assets.investments +
    assets.business +
    assets.debts_owed_to_you -
    assets.debts_you_owe
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zakat() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("calculator");
  const [assets, setAssets] = useState<ZakatAssets>(() => storage.getZakatAssets());
  const [history, setHistory] = useState<ZakatHistoryEntry[]>(() => storage.getZakatHistory());
  const [saved, setSaved] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const totalAssets = useMemo(() => calculateTotalAssets(assets), [assets]);
  const meetsNisab = totalAssets >= DEFAULT_NISAB;
  const zakatAmount = meetsNisab ? totalAssets * ZAKAT_RATE : 0;

  const updateField = useCallback((key: keyof ZakatAssets, value: string) => {
    const num = parseFloat(value) || 0;
    setAssets((prev) => {
      const updated = { ...prev, [key]: Math.max(0, num) };
      storage.setZakatAssets(updated);
      return updated;
    });
  }, []);

  const saveCalculation = useCallback(() => {
    if (totalAssets <= 0) return;
    const entry = storage.addZakatEntry({
      date: todayKey(),
      totalAssets,
      zakatAmount,
      nisabUsed: DEFAULT_NISAB,
      assets: { ...assets },
      paid: false,
    });
    setHistory((prev) => [entry, ...prev]);
    setSaved(true);
    hapticSuccess();
    trackAction("zakat_calculated", { totalAssets, zakatAmount, meetsNisab });
    setTimeout(() => setSaved(false), 2000);
  }, [totalAssets, zakatAmount, assets, meetsNisab]);

  const togglePaid = useCallback((id: string) => {
    storage.markZakatPaid(id);
    setHistory(storage.getZakatHistory());
    hapticSuccess();
  }, []);

  const yearTotal = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return history
      .filter((e) => e.date.startsWith(year) && e.paid)
      .reduce((sum, e) => sum + e.zakatAmount, 0);
  }, [history]);

  // ---- RENDER ----
  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <ChevronLeft size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Калькулятор закята
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Рассчитайте обязательный закят
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--bg-tertiary)" }}>
        {([
          { key: "calculator" as Tab, label: "Калькулятор", icon: Calculator },
          { key: "history" as Tab, label: "История", icon: History },
          { key: "info" as Tab, label: "О закяте", icon: BookOpen },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              tab === key
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "calculator" && (
        <CalculatorTab
          assets={assets}
          totalAssets={totalAssets}
          meetsNisab={meetsNisab}
          zakatAmount={zakatAmount}
          saved={saved}
          currency={currency}
          setCurrency={setCurrency}
          updateField={updateField}
          saveCalculation={saveCalculation}
        />
      )}
      {tab === "history" && (
        <HistoryTab history={history} yearTotal={yearTotal} currency={currency} togglePaid={togglePaid} />
      )}
      {tab === "info" && <InfoTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calculator Tab
// ---------------------------------------------------------------------------

function CalculatorTab({
  assets,
  totalAssets,
  meetsNisab,
  zakatAmount,
  saved,
  currency,
  setCurrency,
  updateField,
  saveCalculation,
}: {
  assets: ZakatAssets;
  totalAssets: number;
  meetsNisab: boolean;
  zakatAmount: number;
  saved: boolean;
  currency: string;
  setCurrency: (c: string) => void;
  updateField: (key: keyof ZakatAssets, value: string) => void;
  saveCalculation: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Currency selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Валюта:</span>
        {["USD", "KGS", "RUB", "KZT"].map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currency === c
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-white/30"
            }`}
            style={currency !== c ? { background: "var(--bg-tertiary)" } : {}}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Nisab info */}
      <div className="glass-card p-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Info size={16} className="text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Нисаб (минимальный порог)
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            85г золота ~ {formatCurrency(DEFAULT_NISAB)} {currency}. Если ваши активы ниже нисаба, закят не обязателен.
          </p>
        </div>
      </div>

      {/* Asset fields */}
      <div className="space-y-3">
        {ASSET_FIELDS.map(({ key, label, icon: Icon, placeholder, hint, isDebt }) => (
          <div key={key} className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDebt ? "bg-red-500/10" : "bg-emerald-500/10"
              }`}>
                <Icon size={14} className={isDebt ? "text-red-400" : "text-emerald-400"} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {label}
                  {isDebt && <span className="text-red-400 ml-1">(вычитается)</span>}
                </p>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder={placeholder}
                value={assets[key] || ""}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full py-2.5 px-3 pr-12 rounded-xl text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-secondary)",
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
                {key === "gold_grams" || key === "silver_grams" ? "г" : currency}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Result card */}
      <div className={`glass-card p-5 text-center space-y-3 ${meetsNisab ? "border border-emerald-500/20" : ""}`}>
        <div className="flex items-center justify-center gap-2">
          <CircleDollarSign size={20} className={meetsNisab ? "text-emerald-400" : "text-white/30"} />
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Общие активы
          </span>
        </div>
        <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {formatCurrency(totalAssets)} {currency}
        </p>

        {meetsNisab ? (
          <>
            <div className="h-px" style={{ background: "var(--border-secondary)" }} />
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ваш закят (2.5%)</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">
                {formatCurrency(zakatAmount)} {currency}
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-amber-400">
            Активы ниже нисаба. Закят не обязателен.
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={saveCalculation}
        disabled={totalAssets <= 0 || saved}
        className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] ${
          saved
            ? "bg-emerald-500/20 text-emerald-400"
            : totalAssets > 0
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30"
              : "bg-white/5 text-white/20 cursor-not-allowed"
        }`}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-2">
            <Check size={16} /> Сохранено! +{POINTS.ZAKAT_LOGGED} баллов
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles size={16} /> Сохранить расчёт
          </span>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function HistoryTab({
  history,
  yearTotal,
  currency,
  togglePaid,
}: {
  history: ZakatHistoryEntry[];
  yearTotal: number;
  currency: string;
  togglePaid: (id: string) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <History size={40} className="mx-auto text-white/10 mb-3" />
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Пока нет записей
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Рассчитайте закят, и он появится здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Year summary */}
      <div className="glass-card p-4 text-center border border-emerald-500/20">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Оплачено за {new Date().getFullYear()} год
        </p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">
          {formatCurrency(yearTotal)} {currency}
        </p>
      </div>

      {/* History list */}
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatDate(entry.date)}
              </span>
              <button
                onClick={() => !entry.paid && togglePaid(entry.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  entry.paid
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400 active:scale-95"
                }`}
              >
                {entry.paid ? "Оплачено" : "Отметить оплату"}
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Активы: {formatCurrency(entry.totalAssets)} {currency}
              </span>
              <span className="text-lg font-bold text-emerald-400">
                {formatCurrency(entry.zakatAmount)} {currency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info Tab
// ---------------------------------------------------------------------------

function InfoTab() {
  return (
    <div className="space-y-4">
      {/* What is Zakat */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>🕌</span> Что такое закят?
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Закят — один из пяти столпов Ислама. Это обязательная милостыня, которую мусульманин выплачивает раз в год с накопленного имущества. Размер закята составляет 2.5% от стоимости имущества, превышающего нисаб.
        </p>
      </div>

      {/* Conditions */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>📋</span> Условия обязательности
        </h3>
        <div className="space-y-2">
          {[
            { title: "Нисаб", desc: "Имущество должно достигнуть нисаба — эквивалент 85г золота" },
            { title: "Хавль (год)", desc: "Имущество должно находиться во владении не менее одного лунного года" },
            { title: "Полное владение", desc: "Имущество должно полностью принадлежать вам" },
            { title: "Свобода от долгов", desc: "Долги вычитаются из общей суммы активов" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8 Recipients */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>🤲</span> 8 категорий получателей закята
        </h3>
        <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
          Сура Ат-Тауба (9:60)
        </p>
        <div className="space-y-2.5">
          {RECIPIENTS.map((r) => (
            <div key={r.title} className="flex items-start gap-2.5">
              <span className="text-sm">{r.emoji}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{r.title}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div className="glass-card p-4 space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>🧮</span> Формула расчёта
        </h3>
        <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg-tertiary)" }}>
          <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            (Активы - Долги) &times; 2.5% = Закят
          </p>
        </div>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Активы включают: наличные, банковские счета, золото, серебро, инвестиции, товары для бизнеса и долги, которые вам должны вернуть.
        </p>
      </div>
    </div>
  );
}
