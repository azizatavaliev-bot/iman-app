import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Zap,
  Heart,
  BookOpen,
  Trophy,
  MessageCircle,
  Mail,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function AboutApp() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl t-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">
            О приложении IMAN
          </h1>
          <p className="text-sm t-text-m mt-0.5">
            Ваш спутник на пути к Аллаху
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="glass-card p-6 relative overflow-hidden mb-5">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">IMAN App</h2>
          <p className="text-base t-text-s leading-relaxed">
            Приложение для мусульман, которое помогает укрепить веру, развить
            полезные исламские привычки и достичь духовного роста через
            геймификацию и систему мотивации.
          </p>
        </div>
      </div>

      {/* Для кого */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">
            Для кого это приложение?
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm t-text-s">
              <span className="font-medium text-white">Новичков</span> — которые
              только начинают изучать ислам
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm t-text-s">
              <span className="font-medium text-white">Практикующих</span> — кто
              хочет улучшить свои ибадаты
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm t-text-s">
              <span className="font-medium text-white">Всех мусульман</span> —
              кто стремится к духовному росту
            </p>
          </div>
        </div>
      </div>

      {/* Возможности */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">
            Основные возможности
          </h3>
        </div>
        <div className="space-y-3">
          {[
            {
              icon: BookOpen,
              title: "Намазы и Коран",
              desc: "Отслеживайте намазы, слушайте и читайте Коран",
              color: "text-emerald-400",
            },
            {
              icon: Target,
              title: "Привычки и цели",
              desc: "Развивайте исламские привычки с системой мотивации",
              color: "text-rose-400",
            },
            {
              icon: Trophy,
              title: "Уровни и достижения",
              desc: "Зарабатывайте очки и повышайте духовный уровень",
              color: "text-amber-400",
            },
            {
              icon: Heart,
              title: "Дуа и хадисы",
              desc: "Ежедневные хадисы, коллекция дуа и 99 имен Аллаха",
              color: "text-pink-400",
            },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl t-bg">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.color.replace("text-", "bg-")}/10`}
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-0.5">
                  {feature.title}
                </p>
                <p className="text-xs t-text-m">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Как начать */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-semibold text-white">Как начать?</h3>
        </div>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Настройте профиль",
              desc: "Укажите ваше имя и местоположение для точного времени намазов",
            },
            {
              step: "2",
              title: "Отмечайте намазы",
              desc: "Зарабатывайте очки за каждый совершённый намаз вовремя",
            },
            {
              step: "3",
              title: "Развивайте привычки",
              desc: "Читайте Коран, делайте азкары, слушайте хадисы",
            },
            {
              step: "4",
              title: "Растите духовно",
              desc: "Повышайте уровни и поддерживайте серию дней подряд",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                {item.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-0.5">
                  {item.title}
                </p>
                <p className="text-xs t-text-m">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Система мотивации */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">
            Система мотивации
          </h3>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm font-medium text-emerald-400 mb-1">
              Очки и уровни
            </p>
            <p className="text-xs t-text-m">
              Выполняйте ибадаты и зарабатывайте очки. Повышайте уровень от
              "Начинающий" до "Мутакки"
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm font-medium text-amber-400 mb-1">
              Серия дней подряд
            </p>
            <p className="text-xs t-text-m">
              Поддерживайте ежедневную практику и растите вашу серию. Побейте
              свой рекорд!
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm font-medium text-purple-400 mb-1">
              Статистика и прогресс
            </p>
            <p className="text-xs t-text-m">
              Отслеживайте ваш прогресс в намазах, чтении Корана и других
              привычках
            </p>
          </div>
        </div>
      </div>

      {/* Контакты */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-semibold text-white">
            Контакты и поддержка
          </h3>
        </div>
        <div className="space-y-3">
          <a
            href="https://t.me/ATAVALIEV"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl t-bg hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
          >
            <Mail className="w-5 h-5 text-sky-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Telegram</p>
              <p className="text-xs t-text-m">@ATAVALIEV</p>
            </div>
          </a>
          <a
            href="https://t.me/ATAVALIEV"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl t-bg hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
          >
            <Globe className="w-5 h-5 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">По всем вопросам</p>
              <p className="text-xs t-text-m">Пишите @ATAVALIEV</p>
            </div>
          </a>
        </div>

        <div className="mt-5 pt-4 border-t t-border text-center">
          <p className="text-xs t-text-f">
            Версия 1.0.0 • Сделано с ❤️ для уммы
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 text-center">
        <button
          onClick={() => navigate("/beginners")}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
        >
          Начать путешествие
        </button>
      </div>
    </div>
  );
}
