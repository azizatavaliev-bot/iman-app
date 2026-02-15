import { useState, useEffect } from 'react'
import { Compass, Navigation, MapPin, ChevronLeft } from 'lucide-react'
import { getQiblaDirection } from '../lib/api'
import { storage } from '../lib/storage'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KAABA_LAT = 21.4225
const KAABA_LNG = 39.8262

interface CityPreset {
  name: string
  lat: number
  lng: number
}

const CITY_PRESETS: CityPreset[] = [
  { name: 'Бишкек', lat: 42.8746, lng: 74.5698 },
  { name: 'Москва', lat: 55.7558, lng: 37.6173 },
  { name: 'Стамбул', lat: 41.0082, lng: 28.9784 },
  { name: 'Алматы', lat: 43.2220, lng: 76.8512 },
  { name: 'Ташкент', lat: 41.2995, lng: 69.2401 },
]

// ---------------------------------------------------------------------------
// Haversine Distance (km)
// ---------------------------------------------------------------------------

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ---------------------------------------------------------------------------
// Format distance for display
// ---------------------------------------------------------------------------

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`
  if (km < 100) return `${km.toFixed(1)} км`
  return `${Math.round(km).toLocaleString('ru-RU')} км`
}

// ---------------------------------------------------------------------------
// Compass SVG Component
// ---------------------------------------------------------------------------

function CompassRose({
  qiblaDeg,
  heading,
  size = 300,
}: {
  qiblaDeg: number
  heading: number | null
  size?: number
}) {
  const center = size / 2
  const outerR = size / 2 - 8
  const innerR = outerR - 30
  const tickR = outerR - 4
  const labelR = outerR - 18

  // The entire compass rotates opposite to device heading
  // so that N always points to true north
  const compassRotation = heading !== null ? -heading : 0

  // Qibla arrow always points at the correct bearing on the dial
  const qiblaAngle = qiblaDeg

  // Cardinal directions
  const cardinals = [
    { label: 'С', angle: 0, color: '#ef4444' },
    { label: 'В', angle: 90, color: '#ffffff99' },
    { label: 'Ю', angle: 180, color: '#ffffff99' },
    { label: 'З', angle: 270, color: '#ffffff99' },
  ]

  // Generate tick marks every 5 degrees
  const ticks: { angle: number; major: boolean }[] = []
  for (let i = 0; i < 360; i += 5) {
    ticks.push({ angle: i, major: i % 30 === 0 })
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-2xl"
      >
        <defs>
          {/* Compass face gradient */}
          <radialGradient id="compassFace" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Gold gradient for Qibla arrow */}
          <linearGradient id="qiblaGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Emerald glow gradient */}
          <radialGradient id="emeraldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </radialGradient>

          {/* Drop shadow filter for the qibla indicator */}
          <filter id="qiblaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="#f59e0b" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Red glow for north */}
          <filter id="northGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feFlood floodColor="#ef4444" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rotating group: entire compass dial */}
        <g
          transform={`rotate(${compassRotation} ${center} ${center})`}
          style={{ transition: heading !== null ? 'transform 0.3s ease-out' : 'none' }}
        >
          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={outerR}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          />

          {/* Compass face */}
          <circle
            cx={center}
            cy={center}
            r={outerR - 1}
            fill="url(#compassFace)"
          />

          {/* Inner decorative ring */}
          <circle
            cx={center}
            cy={center}
            r={innerR}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Tick marks */}
          {ticks.map(({ angle, major }) => {
            const rad = (angle * Math.PI) / 180
            const startR = major ? tickR - 12 : tickR - 6
            const x1 = center + startR * Math.sin(rad)
            const y1 = center - startR * Math.cos(rad)
            const x2 = center + tickR * Math.sin(rad)
            const y2 = center - tickR * Math.cos(rad)

            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={major ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
              />
            )
          })}

          {/* Cardinal direction labels */}
          {cardinals.map(({ label, angle, color }) => {
            const rad = (angle * Math.PI) / 180
            const x = center + labelR * Math.sin(rad)
            const y = center - labelR * Math.cos(rad)

            return (
              <text
                key={label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize="16"
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
                filter={angle === 0 ? 'url(#northGlow)' : undefined}
              >
                {label}
              </text>
            )
          })}

          {/* North indicator triangle */}
          <polygon
            points={`${center},${center - outerR + 2} ${center - 6},${center - outerR + 14} ${center + 6},${center - outerR + 14}`}
            fill="#ef4444"
            filter="url(#northGlow)"
          />

          {/* Qibla direction indicator (gold arrow) */}
          <g
            transform={`rotate(${qiblaAngle} ${center} ${center})`}
            filter="url(#qiblaGlow)"
          >
            {/* Qibla line */}
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - innerR + 10}
              stroke="url(#qiblaGold)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Qibla arrowhead */}
            <polygon
              points={`${center},${center - innerR + 2} ${center - 8},${center - innerR + 18} ${center + 8},${center - innerR + 18}`}
              fill="url(#qiblaGold)"
            />

            {/* Kaaba icon at the tip */}
            <rect
              x={center - 7}
              y={center - innerR - 8}
              width="14"
              height="14"
              rx="2"
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth="1"
            />
            <text
              x={center}
              y={center - innerR - 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1e293b"
              fontSize="9"
              fontWeight="bold"
            >
              Ka
            </text>
          </g>

          {/* Center dot */}
          <circle cx={center} cy={center} r="6" fill="#10b981" opacity="0.8" />
          <circle cx={center} cy={center} r="3" fill="#fff" opacity="0.9" />
        </g>

        {/* Fixed outer accent ring (does not rotate) */}
        <circle
          cx={center}
          cy={center}
          r={outerR + 4}
          fill="none"
          stroke="rgba(16,185,129,0.15)"
          strokeWidth="1"
        />

        {/* Fixed top pointer showing current heading direction */}
        <polygon
          points={`${center},4 ${center - 8},20 ${center + 8},20`}
          fill="#10b981"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Qibla Page Component
// ---------------------------------------------------------------------------

export default function Qibla() {
  // State
  const [qiblaDeg, setQiblaDeg] = useState<number | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [cityName, setCityName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasOrientation, setHasOrientation] = useState(false)
  const [orientationRequested, setOrientationRequested] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)

  // ---------- Load coordinates from profile or geolocation ----------
  useEffect(() => {
    const profile = storage.getProfile()

    if (profile.lat && profile.lng) {
      setCoords({ lat: profile.lat, lng: profile.lng })
      setCityName(profile.city || '')
      return
    }

    // Try browser geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          // Geolocation denied or unavailable -- show city picker
          setShowCityPicker(true)
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setShowCityPicker(true)
      setLoading(false)
    }
  }, [])

  // ---------- Fetch Qibla direction when coords are available ----------
  useEffect(() => {
    if (!coords) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getQiblaDirection(coords!.lat, coords!.lng)
        if (cancelled) return
        setQiblaDeg(data.direction)
      } catch (err) {
        console.error('Failed to load Qibla direction:', err)
        if (!cancelled) setError('Не удалось загрузить направление Киблы')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [coords])

  // ---------- Device Orientation ----------
  useEffect(() => {
    function handleOrientation(e: DeviceOrientationEvent) {
      // webkitCompassHeading is available on iOS Safari
      const compassHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading

      if (compassHeading !== undefined && compassHeading !== null) {
        setHeading(compassHeading)
        setHasOrientation(true)
      } else if (e.alpha !== null && e.alpha !== undefined) {
        // Android: alpha is the compass heading (degrees from north)
        // alpha goes 0-360, but counts counterclockwise on some devices
        // For most Android browsers, heading = 360 - alpha
        const h = e.absolute ? (360 - e.alpha) % 360 : e.alpha
        setHeading(h)
        setHasOrientation(true)
      }
    }

    // Check if DeviceOrientationEvent is available and needs permission (iOS 13+)
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }

    if (DOE && typeof DOE.requestPermission === 'function') {
      // iOS 13+ requires explicit permission
      if (orientationRequested) {
        DOE.requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true)
            }
          })
          .catch(() => {
            // Permission denied
          })
      }
    } else if ('DeviceOrientationEvent' in window) {
      // Non-iOS or older iOS -- just add listener
      window.addEventListener('deviceorientation', handleOrientation, true)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [orientationRequested])

  // Auto-request on non-iOS devices
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (!DOE || typeof DOE.requestPermission !== 'function') {
      setOrientationRequested(true)
    }
  }, [])

  // ---------- Handle city selection ----------
  function selectCity(city: CityPreset) {
    setCoords({ lat: city.lat, lng: city.lng })
    setCityName(city.name)
    setShowCityPicker(false)

    // Save to profile
    storage.setProfile({ lat: city.lat, lng: city.lng, city: city.name })
  }

  // ---------- Computed values ----------
  const distanceToKaaba =
    coords ? haversineDistance(coords.lat, coords.lng, KAABA_LAT, KAABA_LNG) : null

  // The visual qibla bearing on the compass dial
  // If we have device heading, the compass rotates so the arrow stays correct
  const displayDeg = qiblaDeg !== null ? qiblaDeg : 0

  // Requires iOS permission?
  const DOE = typeof window !== 'undefined'
    ? (window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>
      })
    : null
  const needsIOSPermission = DOE && typeof DOE.requestPermission === 'function'

  // ---------- JSX ----------
  return (
    <div className="min-h-screen pb-24 px-4 pt-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center
                     text-white/70 hover:text-white transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Кибла</h1>
          <p className="text-xs text-white/40">Направление к Каабе</p>
        </div>
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-emerald-400">
          <Compass className="w-5 h-5" />
        </div>
      </div>

      {/* City Picker Fallback */}
      {showCityPicker && !coords && (
        <div className="glass-card p-5 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-400/70 text-xs font-medium uppercase tracking-widest mb-4">
            <MapPin size={14} />
            <span>Выберите город</span>
          </div>
          <p className="text-sm t-text-m mb-4">
            Не удалось определить местоположение. Выберите ближайший город:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CITY_PRESETS.map((city) => (
              <button
                key={city.name}
                onClick={() => selectCity(city)}
                className="glass p-3 rounded-xl text-sm t-text font-medium
                           hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300
                           border t-border-s transition-all duration-200 active:scale-95"
              >
                <MapPin size={14} className="inline mr-1.5 text-emerald-400/60" />
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && coords && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white/40 text-sm">Определяю направление Киблы...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card p-4 mb-6 border-red-500/30 animate-fade-in">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Main Compass */}
      {!loading && qiblaDeg !== null && (
        <>
          {/* Compass */}
          <div className="flex flex-col items-center mb-6 animate-fade-in">
            {/* Degree Display */}
            <div className="glass-card px-5 py-2 mb-5 flex items-center gap-2">
              <Navigation
                size={16}
                className="text-amber-400"
                style={{ transform: `rotate(${displayDeg}deg)` }}
              />
              <span className="text-xl font-mono font-bold text-white tabular-nums">
                {qiblaDeg.toFixed(1)}°
              </span>
            </div>

            {/* Compass Rose */}
            <div className="relative">
              {/* Ambient glow behind compass */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(245,158,11,0.06) 40%, transparent 70%)',
                  filter: 'blur(30px)',
                  transform: 'scale(1.3)',
                }}
              />
              <CompassRose
                qiblaDeg={displayDeg}
                heading={heading}
                size={280}
              />
            </div>

            {/* Orientation status */}
            {hasOrientation ? (
              <p className="text-xs text-emerald-400/60 mt-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Компас активен
              </p>
            ) : (
              <p className="text-xs t-text-f mt-4">
                Поверните устройство для калибровки
              </p>
            )}
          </div>

          {/* Kaaba Info Card */}
          <div className="glass-card p-5 mb-4 animate-fade-in relative overflow-hidden">
            {/* Decorative gold glow */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2 text-amber-400/70 text-xs font-medium uppercase tracking-widest mb-4">
              <Navigation size={14} />
              <span>Направление Киблы</span>
            </div>

            <div className="space-y-3">
              {/* Direction */}
              <div className="flex items-center justify-between">
                <span className="text-sm t-text-m">Направление</span>
                <span className="text-sm font-mono font-semibold text-white">
                  {qiblaDeg.toFixed(1)}°
                </span>
              </div>

              {/* Distance */}
              {distanceToKaaba !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm t-text-m">Расстояние до Каабы</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatDistance(distanceToKaaba)}
                  </span>
                </div>
              )}

              {/* City */}
              {cityName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm t-text-m">Город</span>
                  <span className="text-sm font-semibold t-text flex items-center gap-1.5">
                    <MapPin size={12} className="text-emerald-400/60" />
                    {cityName}
                  </span>
                </div>
              )}

              {/* Coordinates */}
              {coords && (
                <div className="flex items-center justify-between pt-2 border-t t-border">
                  <span className="text-xs t-text-f">Координаты</span>
                  <span className="text-xs font-mono t-text-f">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* iOS Permission Request */}
          {needsIOSPermission && !hasOrientation && !orientationRequested && (
            <div className="glass-card p-5 mb-4 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400/70 text-xs font-medium uppercase tracking-widest mb-3">
                <Compass size={14} />
                <span>Компас устройства</span>
              </div>
              <p className="text-sm t-text-m mb-4">
                Разрешите доступ к компасу устройства, чтобы стрелка Киблы
                автоматически указывала правильное направление при повороте телефона.
              </p>
              <button
                onClick={() => setOrientationRequested(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold
                           bg-emerald-500/20 border border-emerald-500/40 text-emerald-300
                           hover:bg-emerald-500/30 transition-all duration-200 active:scale-95"
              >
                Включить компас
              </button>
            </div>
          )}

          {/* Manual Guidance (no orientation available) */}
          {!hasOrientation && orientationRequested && (
            <div className="glass-card p-5 mb-4 animate-fade-in">
              <div className="flex items-center gap-2 t-text-m text-xs font-medium uppercase tracking-widest mb-3">
                <Compass size={14} />
                <span>Ручной режим</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                Компас устройства недоступен. Чтобы найти Киблу вручную:
              </p>
              <ol className="text-sm t-text-m mt-3 space-y-2 list-decimal list-inside">
                <li>Определите север (используйте физический компас или приложение)</li>
                <li>
                  Повернитесь на{' '}
                  <span className="text-amber-400 font-semibold font-mono">
                    {qiblaDeg.toFixed(1)}°
                  </span>{' '}
                  по часовой стрелке от севера
                </li>
                <li>Это и будет направление Киблы</li>
              </ol>
            </div>
          )}

          {/* Change City */}
          <button
            onClick={() => setShowCityPicker((v) => !v)}
            className="glass-card p-3 w-full text-center text-sm text-white/40
                       hover:t-text-s transition-colors animate-fade-in"
          >
            <MapPin size={14} className="inline mr-1.5" />
            Изменить местоположение
          </button>

          {/* City Picker (inline toggle) */}
          {showCityPicker && coords && (
            <div className="glass-card p-4 mt-3 animate-fade-in">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
                Выберите город
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => selectCity(city)}
                    className={`glass p-2.5 rounded-xl text-sm font-medium
                      border transition-all duration-200 active:scale-95
                      ${
                        cityName === city.name
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 't-border-s t-text-s hover:t-bg hover:t-text'
                      }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
