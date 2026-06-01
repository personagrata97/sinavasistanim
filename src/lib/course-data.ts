// SPL Düzey 3 - 12 Ders Sabit Verileri

export interface CourseInfo {
  name: string
  slug: string
  order: number
  description: string
  icon: string // emoji
  color: string // tailwind gradient
  estimatedPages: string
}

export const SPL_LEVEL_3_COURSES: CourseInfo[] = [
  {
    name: "Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları",
    slug: "sermaye-piyasasi-mevzuati",
    order: 1,
    description: "SPK mevzuatı, meslek kuralları, düzenleyici kurumlar ve yaptırımlar. Sermaye piyasasının temel hukuki çerçevesi.",
    icon: "Scale",
    color: "from-blue-600 to-indigo-700",
    estimatedPages: "300-500",
  },
  {
    name: "Sermaye Piyasası Araçları 1",
    slug: "sermaye-piyasasi-araclari-1",
    order: 2,
    description: "Pay (hisse) senetleri, yatırım fonları, varantlar ve yapılandırılmış ürünler.",
    icon: "BarChart3",
    color: "from-emerald-600 to-teal-700",
    estimatedPages: "200-350",
  },
  {
    name: "Sermaye Piyasası Araçları 2",
    slug: "sermaye-piyasasi-araclari-2",
    order: 3,
    description: "Borçlanma araçları (tahvil, bono), türev ürünler (vadeli işlem, opsiyon), repo ve ters repo.",
    icon: "TrendingUp",
    color: "from-cyan-600 to-blue-700",
    estimatedPages: "200-350",
  },
  {
    name: "Yatırım Kuruluşları",
    slug: "yatirim-kuruluslari",
    order: 4,
    description: "Aracı kurumlar, portföy yönetim şirketleri, yatırım ortaklıkları ve faaliyetleri.",
    icon: "Landmark",
    color: "from-violet-600 to-purple-700",
    estimatedPages: "150-250",
  },
  {
    name: "Finansal Piyasalar",
    slug: "finansal-piyasalar",
    order: 5,
    description: "Para ve sermaye piyasaları, borsa yapıları, piyasa mikroyapısı ve işlem mekanizmaları.",
    icon: "Globe",
    color: "from-sky-600 to-blue-700",
    estimatedPages: "150-250",
  },
  {
    name: "Takas, Saklama ve Operasyon İşlemleri",
    slug: "takas-saklama-operasyon",
    order: 6,
    description: "Takasbank, MKK, saklama hizmetleri, takas süreçleri ve operasyonel risk yönetimi.",
    icon: "RefreshCw",
    color: "from-amber-600 to-orange-700",
    estimatedPages: "150-250",
  },
  {
    name: "Finansal Yönetim ve Mali Analiz",
    slug: "finansal-yonetim-mali-analiz",
    order: 7,
    description: "Finansal tablolar analizi, oran analizi, nakit akışı, sermaye bütçelemesi ve değerleme.",
    icon: "CircleDollarSign",
    color: "from-green-600 to-emerald-700",
    estimatedPages: "200-350",
  },
  {
    name: "Ticaret Hukuku",
    slug: "ticaret-hukuku",
    order: 8,
    description: "Ticari işletme, şirketler hukuku, kıymetli evrak, iflas ve konkordato.",
    icon: "ScrollText",
    color: "from-rose-600 to-red-700",
    estimatedPages: "200-300",
  },
  {
    name: "Muhasebe ve Finansal Raporlama",
    slug: "muhasebe-finansal-raporlama",
    order: 9,
    description: "Genel muhasebe, dönen/duran varlıklar, gelir tablosu, bilanço ve UFRS standartları.",
    icon: "ClipboardList",
    color: "from-indigo-600 to-violet-700",
    estimatedPages: "250-400",
  },
  {
    name: "Genel Ekonomi",
    slug: "genel-ekonomi",
    order: 10,
    description: "Mikro ve makro ekonomi, para politikası, enflasyon, büyüme ve dış ticaret.",
    icon: "Globe2",
    color: "from-teal-600 to-cyan-700",
    estimatedPages: "150-250",
  },
  {
    name: "Temel Finans Matematiği ve Değerleme Yöntemleri",
    slug: "finans-matematigi-degerleme",
    order: 11,
    description: "Paranın zaman değeri, bugünkü değer, gelecek değer, tahvil değerleme ve portföy teorisi.",
    icon: "Calculator",
    color: "from-purple-600 to-fuchsia-700",
    estimatedPages: "150-250",
  },
  {
    name: "Kurumlarda ve Sermaye Piyasasında Vergilendirme",
    slug: "vergilendirme",
    order: 12,
    description: "Gelir vergisi, kurumlar vergisi, KDV, sermaye kazançları vergisi ve vergi muafiyetleri.",
    icon: "Receipt",
    color: "from-orange-600 to-red-700",
    estimatedPages: "150-250",
  },
]

// ==================== MASAK UYUM GÖREVLİSİ SINAVI ====================
// Resmi Kaynak: SPL (spl.com.tr) ve MASAK Tebliğ No:30
// Sınav: 2 Modül, toplam 100 soru (50+50), 5 şıklı çoktan seçmeli
// Süre: Modül başına 45 dakika (toplam 90 dk)
// Geçme: Her modülden en az 50 puan + genel ortalama en az 65 puan (çifte baraj)
// Yanlış doğruyu götürmez.

export const MASAK_COURSES: CourseInfo[] = [
  {
    name: "MASAK Uyum Görevlisi Yetkilendirme Sınavı",
    slug: "masak-uyum-gorevlisi",
    order: 1,
    description: "Modül 1 (Hukuki Çerçeve) ve Modül 2 (Uyum Yönetimi) tüm konuları kapsar. Sınavda bu modüllerin hepsi çıkmaktadır.",
    icon: "ShieldCheck",
    color: "from-blue-600 to-indigo-700",
    estimatedPages: "150-250",
  }
]

// SPL Bilgi Sistemleri Bağımsız Denetim Lisansı
export const SPL_BD_COURSES: CourseInfo[] = [
  {
    name: "Dar Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları",
    slug: "bd-sermaye-piyasasi-mevzuati",
    order: 1,
    description: "Sermaye Piyasası Kanunu, ilgili tebliğler, kurumsal yönetim ilkeleri ve meslek kuralları.",
    icon: "Scale",
    color: "from-blue-600 to-indigo-700",
    estimatedPages: "200-350",
  },
  {
    name: "Bilgi Sistemleri Yönetimi ve Denetimi",
    slug: "bd-bilgi-sistemleri-yonetimi",
    order: 2,
    description: "Bilgi sistemleri stratejisi, yönetişim ilkeleri, denetim kavramları ve denetim faaliyetinin yürütülmesi.",
    icon: "Monitor",
    color: "from-violet-600 to-purple-700",
    estimatedPages: "200-350",
  },
  {
    name: "Bilgi Sistemleri Geliştirilmesi ve Uygulanması",
    slug: "bd-bilgi-sistemleri-gelistirme",
    order: 3,
    description: "Yazılım geliştirme yaşam döngüsü, proje yönetimi, test süreçleri ve uygulama kontrolleri.",
    icon: "Code",
    color: "from-cyan-600 to-blue-700",
    estimatedPages: "150-250",
  },
  {
    name: "Bilgi Sistemleri İşletimi",
    slug: "bd-bilgi-sistemleri-isletimi",
    order: 4,
    description: "Veri tabanı yönetimi, ağ altyapısı, iş sürekliliği, felaket kurtarma ve operasyonel süreçler.",
    icon: "Server",
    color: "from-emerald-600 to-teal-700",
    estimatedPages: "150-250",
  },
  {
    name: "Bilgi Sistemleri Güvenliği",
    slug: "bd-bilgi-sistemleri-guvenligi",
    order: 5,
    description: "Güvenlik prensipleri, risk yönetimi, siber güvenlik, erişim kontrolü ve kriptografi temelleri.",
    icon: "ShieldCheck",
    color: "from-red-600 to-rose-700",
    estimatedPages: "150-250",
  },
]

// ==================== SINAV YAPISI BİLGİLERİ ====================

export interface ExamConfig {
  totalQuestions: number
  durationMinutes: number
  passingScore: number
  moduleBarrier: number
  modules: { name: string; questionCount: number; durationMinutes: number; courses: string[] }[]
  negativeMarking: boolean
  choiceCount: number
  examType: string
}

export const MASAK_EXAM_CONFIG: ExamConfig = {
  totalQuestions: 100,
  durationMinutes: 90,     // 2 × 45dk
  passingScore: 65,        // Genel ortalama en az 65
  moduleBarrier: 50,       // Her modülden en az 50 puan
  modules: [
    {
      name: "Modül 1 — Hukuki Çerçeve",
      questionCount: 50,
      durationMinutes: 45,
      courses: ["masak-uyum-gorevlisi"]
    },
    {
      name: "Modül 2 — Uyum Yönetimi",
      questionCount: 50,
      durationMinutes: 45,
      courses: ["masak-uyum-gorevlisi"]
    }
  ],
  negativeMarking: false,
  choiceCount: 5,
  examType: "e-sınav"
}

export const SPL_EXAM_CONFIG: ExamConfig = {
  totalQuestions: 25,       // Ders başına 25 soru (resmi)
  durationMinutes: 45,      // Ders başına 45 dakika (resmi)
  passingScore: 60,         // Genel ortalama en az 60
  moduleBarrier: 50,        // Her dersten en az 50 puan
  modules: [
    {
      name: "SPL Düzey 3",
      questionCount: 25,
      durationMinutes: 45,
      courses: SPL_LEVEL_3_COURSES.map(c => c.slug)
    }
  ],
  negativeMarking: false,
  choiceCount: 5,
  examType: "e-sınav"
}

export const ALL_COURSES = [...SPL_LEVEL_3_COURSES, ...MASAK_COURSES, ...SPL_BD_COURSES]

export function getCourseBySlug(slug: string): CourseInfo | undefined {
  return ALL_COURSES.find(c => c.slug === slug)
}

export function getCourseByOrder(order: number): CourseInfo | undefined {
  // Not: Sadece SPL_LEVEL_3 için geriye dönük uyumluluk
  return SPL_LEVEL_3_COURSES.find(c => c.order === order)
}

export function getExamConfig(programSlug: string): ExamConfig | undefined {
  if (programSlug === "spl-duzey-3") return SPL_EXAM_CONFIG
  if (programSlug === "masak") return MASAK_EXAM_CONFIG
  if (programSlug === "spl-bagimsiz-denetim") return SPL_BD_EXAM_CONFIG
  return undefined
}

export const SPL_BD_EXAM_CONFIG: ExamConfig = {
  totalQuestions: 25,
  durationMinutes: 40,
  passingScore: 60,
  moduleBarrier: 50,
  modules: [
    {
      name: "SPL Bilgi Sistemleri Bağımsız Denetim",
      questionCount: 25,
      durationMinutes: 40,
      courses: SPL_BD_COURSES.map(c => c.slug)
    }
  ],
  negativeMarking: false,
  choiceCount: 5,
  examType: "e-sınav"
}
