/**
 * Саваб-коин — иконка "С" в кружочке.
 * Используется вместо XP/баллов/очков по всему приложению.
 */
export default function SawabCoin({ size = 16, className = "" }: { size?: number; className?: string }) {
  const fontSize = Math.round(size * 0.6);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-black shrink-0 shadow-sm shadow-amber-500/30 ${className}`}
      style={{ width: size, height: size, fontSize, lineHeight: 1 }}
      title="Саваб-коин"
    >
      С
    </span>
  );
}
