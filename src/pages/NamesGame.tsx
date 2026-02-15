import { useState, useEffect, useCallback } from 'react'
import { Check, X, ChevronLeft, ChevronRight, Award, RotateCcw, Star } from 'lucide-react'
import { NAMES_OF_ALLAH } from '../data/names'
import { storage, POINTS } from '../lib/storage'

// ---- Types ----

type Tab = 'cards' | 'quiz' | 'all'

interface QuizQuestion {
  nameIndex: number
  options: string[]
  correctIndex: number
}

// ---- Helpers ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestion(excludeIndices: number[] = []): QuizQuestion {
  const available = NAMES_OF_ALLAH.map((_, i) => i).filter(
    (i) => !excludeIndices.includes(i)
  )
  const nameIndex =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : Math.floor(Math.random() * 99)

  const correctAnswer = NAMES_OF_ALLAH[nameIndex].russian

  // Pick 3 wrong answers (distinct from correct)
  const wrongPool = NAMES_OF_ALLAH.filter((_, i) => i !== nameIndex)
  const shuffledWrong = shuffle(wrongPool).slice(0, 3)
  const options = shuffle([
    correctAnswer,
    ...shuffledWrong.map((n) => n.russian),
  ])

  return {
    nameIndex,
    options,
    correctIndex: options.indexOf(correctAnswer),
  }
}

const QUIZ_LENGTH = 10
const TIMER_SECONDS = 15

// ============================================================
// Main Component
// ============================================================

export default function NamesGame() {
  const [activeTab, setActiveTab] = useState<Tab>('cards')
  const [learned, setLearned] = useState<number[]>([])
  const [quizHighScore, setQuizHighScore] = useState(0)

  // Load progress on mount
  useEffect(() => {
    const progress = storage.getNamesProgress()
    setLearned(progress.learned)
    setQuizHighScore(progress.quizHighScore)
  }, [])

  const handleMarkLearned = useCallback((nameId: number) => {
    const progress = storage.markNameLearned(nameId)
    storage.addPoints(POINTS.NAMES_QUIZ)
    setLearned([...progress.learned])
  }, [])

  const handleUnmarkLearned = useCallback((nameId: number) => {
    const progress = storage.getNamesProgress()
    const updated = progress.learned.filter((id) => id !== nameId)
    storage.updateNamesProgress({ learned: updated })
    setLearned(updated)
  }, [])

  const handleQuizHighScore = useCallback((score: number) => {
    const progress = storage.updateNamesProgress({ quizHighScore: score })
    setQuizHighScore(progress.quizHighScore)
  }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cards', label: 'Карточки' },
    { key: 'quiz', label: 'Викторина' },
    { key: 'all', label: 'Все имена' },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          99 Имён Аллаха
        </h1>
        <p className="text-emerald-400/70 text-center text-sm">
          Асма уль-Хусна
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 rounded-xl glass">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'cards' && (
          <FlashcardsTab
            learned={learned}
            onMarkLearned={handleMarkLearned}
            onUnmarkLearned={handleUnmarkLearned}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizTab
            highScore={quizHighScore}
            onNewHighScore={handleQuizHighScore}
          />
        )}
        {activeTab === 'all' && (
          <AllNamesTab
            learned={learned}
            onMarkLearned={handleMarkLearned}
            onUnmarkLearned={handleUnmarkLearned}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab 1: Flashcards
// ============================================================

function FlashcardsTab({
  learned,
  onMarkLearned,
  onUnmarkLearned,
}: {
  learned: number[]
  onMarkLearned: (id: number) => void
  onUnmarkLearned: (id: number) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipAnim, setFlipAnim] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const name = NAMES_OF_ALLAH[currentIndex]
  const isLearned = learned.includes(name.id)

  const goTo = useCallback(
    (index: number) => {
      setFlipAnim(true)
      setTimeout(() => {
        setCurrentIndex(
          ((index % NAMES_OF_ALLAH.length) + NAMES_OF_ALLAH.length) %
            NAMES_OF_ALLAH.length
        )
        setFlipAnim(false)
      }, 150)
    },
    []
  )

  const prev = () => goTo(currentIndex - 1)
  const next = () => goTo(currentIndex + 1)

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (Math.abs(diff) > 60) {
      diff > 0 ? prev() : next()
    }
    setTouchStart(null)
  }

  return (
    <div className="px-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">
          {learned.length}/99 выучено
        </span>
        <div className="flex-1 mx-3 h-2 rounded-full t-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${(learned.length / 99) * 100}%` }}
          />
        </div>
        <span className="text-emerald-400 text-sm font-medium">
          {Math.round((learned.length / 99) * 100)}%
        </span>
      </div>

      {/* Card */}
      <div
        className={`glass-card relative p-8 min-h-[380px] flex flex-col items-center justify-center transition-all duration-300 ${
          flipAnim ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Learned badge */}
        {isLearned && (
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
        )}

        {/* Number */}
        <div className="text-gray-500 text-sm mb-2">
          {name.id} / 99
        </div>

        {/* Arabic */}
        <div className="arabic-text text-5xl text-amber-400 mb-6 select-none leading-relaxed">
          {name.arabic}
        </div>

        {/* Transliteration */}
        <div className="text-xl text-white font-semibold mb-2">
          {name.transliteration}
        </div>

        {/* Russian meaning */}
        <div className="text-lg text-emerald-400 mb-3">{name.russian}</div>

        {/* Description */}
        <div className="text-gray-400 text-sm text-center leading-relaxed max-w-sm">
          {name.meaning}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prev}
          className="w-12 h-12 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {isLearned ? (
          <button
            onClick={() => onUnmarkLearned(name.id)}
            className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-2 active:scale-95 transition-all"
          >
            <Check className="w-5 h-5" />
            Выучено
          </button>
        ) : (
          <button
            onClick={() => onMarkLearned(name.id)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          >
            <Star className="w-5 h-5" />
            Выучил
          </button>
        )}

        <button
          onClick={next}
          className="w-12 h-12 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Jump */}
      <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
        {Array.from({ length: 10 }, (_, i) => {
          const start = i * 10
          const end = Math.min(start + 9, 98)
          const rangeCount = NAMES_OF_ALLAH.slice(start, end + 1).filter((n) =>
            learned.includes(n.id)
          ).length
          const total = end - start + 1
          return (
            <button
              key={i}
              onClick={() => goTo(start)}
              className={`text-xs px-2 py-1 rounded-md transition-all ${
                currentIndex >= start && currentIndex <= end
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : rangeCount === total
                  ? 'bg-emerald-500/10 text-emerald-500/60'
                  : 't-bg text-gray-500 hover:text-gray-400'
              }`}
            >
              {start + 1}-{end + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Tab 2: Quiz
// ============================================================

function QuizTab({
  highScore,
  onNewHighScore,
}: {
  highScore: number
  onNewHighScore: (score: number) => void
}) {
  const [phase, setPhase] = useState<'start' | 'playing' | 'results'>('start')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const [shakeWrong, setShakeWrong] = useState(false)
  const [streak, setStreak] = useState(0)

  // Generate quiz questions
  const startQuiz = useCallback(() => {
    const usedIndices: number[] = []
    const qs: QuizQuestion[] = []
    for (let i = 0; i < QUIZ_LENGTH; i++) {
      const q = generateQuestion(usedIndices)
      usedIndices.push(q.nameIndex)
      qs.push(q)
    }
    setQuestions(qs)
    setQuestionIndex(0)
    setScore(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTimer(TIMER_SECONDS)
    setStreak(0)
    setPhase('playing')
  }, [])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing' || selectedAnswer !== null) return
    if (timer <= 0) {
      // Time's up - treat as wrong answer
      handleAnswer(-1)
      return
    }
    const interval = setInterval(() => {
      setTimer((t) => t - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, timer, selectedAnswer])

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (selectedAnswer !== null) return
      const q = questions[questionIndex]
      const correct = optionIndex === q.correctIndex

      setSelectedAnswer(optionIndex)
      setIsCorrect(correct)

      if (correct) {
        const points = POINTS.NAMES_QUIZ
        setScore((s) => s + points)
        setStreak((s) => s + 1)
        storage.addPoints(points)
      } else {
        setShakeWrong(true)
        setStreak(0)
        setTimeout(() => setShakeWrong(false), 500)
      }

      // Move to next question after delay
      setTimeout(() => {
        if (questionIndex + 1 >= QUIZ_LENGTH) {
          const finalScore = correct ? score + POINTS.NAMES_QUIZ : score
          onNewHighScore(finalScore)
          setPhase('results')
        } else {
          setQuestionIndex((i) => i + 1)
          setSelectedAnswer(null)
          setIsCorrect(null)
          setTimer(TIMER_SECONDS)
        }
      }, 1200)
    },
    [selectedAnswer, questions, questionIndex, score, onNewHighScore]
  )

  // ---- Start Screen ----
  if (phase === 'start') {
    return (
      <div className="px-4 flex flex-col items-center">
        <div className="glass-card p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Викторина</h2>
          <p className="text-gray-400 text-sm mb-6">
            Проверьте свои знания 99 Имён Аллаха. {QUIZ_LENGTH} вопросов,{' '}
            {TIMER_SECONDS} секунд на ответ.
          </p>

          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
              <span className="text-sm font-medium">
                Лучший результат: {highScore}
              </span>
            </div>
          )}

          <button
            onClick={startQuiz}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
          >
            Начать
          </button>
        </div>
      </div>
    )
  }

  // ---- Results Screen ----
  if (phase === 'results') {
    const maxPossible = QUIZ_LENGTH * POINTS.NAMES_QUIZ
    const percentage = Math.round((score / maxPossible) * 100)
    const isNewRecord = score >= highScore && score > 0

    return (
      <div className="px-4 flex flex-col items-center animate-fade-in">
        <div className="glass-card p-8 w-full max-w-sm text-center">
          {isNewRecord && (
            <div className="mb-4 py-2 px-4 rounded-full bg-amber-500/15 text-amber-400 text-sm font-medium inline-flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400" />
              Новый рекорд!
            </div>
          )}

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              percentage >= 70
                ? 'bg-emerald-500/20 glow-green'
                : percentage >= 40
                ? 'bg-amber-500/20 glow-gold'
                : 'bg-red-500/20'
            }`}
          >
            <span className="text-3xl font-bold text-white">{percentage}%</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {percentage >= 90
              ? 'Превосходно!'
              : percentage >= 70
              ? 'Отлично!'
              : percentage >= 50
              ? 'Хорошо!'
              : 'Продолжайте учить!'}
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            Вы набрали{' '}
            <span className="text-emerald-400 font-semibold">{score}</span> из{' '}
            <span className="text-gray-300">{maxPossible}</span> баллов
          </p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Math.round(score / POINTS.NAMES_QUIZ)}
              </div>
              <div className="text-xs text-gray-500">Верных</div>
            </div>
            <div className="w-px h-10 t-bg" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {QUIZ_LENGTH - Math.round(score / POINTS.NAMES_QUIZ)}
              </div>
              <div className="text-xs text-gray-500">Ошибок</div>
            </div>
            <div className="w-px h-10 t-bg" />
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                {highScore}
              </div>
              <div className="text-xs text-gray-500">Рекорд</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('start')}
              className="flex-1 py-3 rounded-xl glass text-gray-300 font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Меню
            </button>
            <button
              onClick={startQuiz}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              Ещё раз
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Playing Screen ----
  const currentQ = questions[questionIndex]
  const currentName = NAMES_OF_ALLAH[currentQ.nameIndex]
  const timerPct = (timer / TIMER_SECONDS) * 100

  return (
    <div className="px-4">
      {/* Top Bar: Score + Question Counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-lg">{score}</span>
          <span className="text-gray-500 text-sm">баллов</span>
        </div>
        <div className="text-gray-400 text-sm">
          {questionIndex + 1} / {QUIZ_LENGTH}
        </div>
        {streak >= 2 && (
          <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
            <Star className="w-4 h-4 fill-amber-400" />
            x{streak}
          </div>
        )}
      </div>

      {/* Timer Bar */}
      <div className="w-full h-1.5 rounded-full t-bg mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 linear ${
            timer <= 5 ? 'bg-red-500' : timer <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Question Card */}
      <div
        className={`glass-card p-8 text-center mb-6 transition-transform duration-300 ${
          shakeWrong ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
        style={
          shakeWrong
            ? {
                animation: 'shake 0.5s ease-in-out',
              }
            : undefined
        }
      >
        <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider">
          Что означает это имя?
        </p>
        <div className="arabic-text text-5xl text-amber-400 mb-4 select-none">
          {currentName.arabic}
        </div>
        <div className="text-gray-400 text-sm">{currentName.transliteration}</div>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 gap-3">
        {currentQ.options.map((option, i) => {
          let btnClass = 'glass text-gray-200 hover:t-bg active:scale-[0.97]'

          if (selectedAnswer !== null) {
            if (i === currentQ.correctIndex) {
              btnClass =
                'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
            } else if (i === selectedAnswer && !isCorrect) {
              btnClass =
                'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30'
            } else {
              btnClass = 'glass text-gray-500 opacity-50'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selectedAnswer !== null}
              className={`p-4 rounded-xl text-left font-medium transition-all duration-300 border border-transparent ${btnClass}`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                    selectedAnswer !== null && i === currentQ.correctIndex
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : selectedAnswer !== null &&
                        i === selectedAnswer &&
                        !isCorrect
                      ? 'bg-red-500/30 text-red-300'
                      : 't-bg text-gray-400'
                  }`}
                >
                  {selectedAnswer !== null && i === currentQ.correctIndex ? (
                    <Check className="w-4 h-4" />
                  ) : selectedAnswer !== null &&
                    i === selectedAnswer &&
                    !isCorrect ? (
                    <X className="w-4 h-4" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span>{option}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Inline keyframes for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-4px); }
          30%, 70% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// Tab 3: All Names Grid
// ============================================================

function AllNamesTab({
  learned,
  onMarkLearned,
  onUnmarkLearned,
}: {
  learned: number[]
  onMarkLearned: (id: number) => void
  onUnmarkLearned: (id: number) => void
}) {
  const [selectedName, setSelectedName] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredNames = NAMES_OF_ALLAH.filter((name) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      name.transliteration.toLowerCase().includes(q) ||
      name.russian.toLowerCase().includes(q) ||
      name.arabic.includes(searchQuery) ||
      String(name.id).includes(q)
    )
  })

  const selected = selectedName !== null ? NAMES_OF_ALLAH.find((n) => n.id === selectedName) : null

  return (
    <div className="px-4">
      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Поиск по имени..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-xl glass bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="text-gray-400">
          Выучено:{' '}
          <span className="text-emerald-400 font-medium">{learned.length}</span>{' '}
          / 99
        </span>
        <span className="text-gray-500">
          {filteredNames.length !== 99 && `Найдено: ${filteredNames.length}`}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {filteredNames.map((name) => {
          const isLearned = learned.includes(name.id)
          return (
            <button
              key={name.id}
              onClick={() => setSelectedName(name.id)}
              className={`relative p-3 rounded-xl text-center transition-all duration-200 active:scale-95 ${
                isLearned
                  ? 'glass border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'glass'
              }`}
            >
              {isLearned && (
                <div className="absolute top-1.5 right-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
              )}
              <div className="text-gray-500 text-[10px] mb-0.5">
                {name.id}
              </div>
              <div className="arabic-text text-lg text-amber-400 leading-tight mb-1">
                {name.arabic}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {name.transliteration}
              </div>
            </button>
          )
        })}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedName(null)}
        >
          <div
            className="glass-card p-8 w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedName(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full t-bg flex items-center justify-center text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              {/* Number */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
                {selected.id}
              </div>

              {/* Arabic */}
              <div className="arabic-text text-5xl text-amber-400 mb-4 select-none">
                {selected.arabic}
              </div>

              {/* Transliteration */}
              <div className="text-xl text-white font-semibold mb-2">
                {selected.transliteration}
              </div>

              {/* Russian */}
              <div className="text-lg text-emerald-400 mb-4">
                {selected.russian}
              </div>

              {/* Meaning */}
              <div className="text-gray-400 text-sm leading-relaxed mb-6">
                {selected.meaning}
              </div>

              {/* Learn/Unlearn button */}
              {learned.includes(selected.id) ? (
                <button
                  onClick={() => {
                    onUnmarkLearned(selected.id)
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Check className="w-5 h-5" />
                  Выучено
                </button>
              ) : (
                <button
                  onClick={() => {
                    onMarkLearned(selected.id)
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Star className="w-5 h-5" />
                  Выучил
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
