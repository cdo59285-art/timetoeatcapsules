// ==================== 类型定义 ====================
export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface SupplementItem {
  id: string
  name: string
  icon: string
  color: string
  inventory: number
  lowStockThreshold: number
  description?: string
  dosage?: number // 每次服用数量
}

export interface TimeSlotConfig {
  mon: number
  tue: number
  wed: number
  thu: number
  fri: number
  sat: number
  sun: number
}

export interface SlotSupplements {
  oddDay: string[]  // 单数日补剂ID
  evenDay: string[] // 双数日补剂ID
  evenDayIronPeriod?: string[] // 双数日吃铁期专用
}

export interface PeriodInfo {
  inPeriod: boolean
  takeIron: boolean
  dayInCycle: number
  afterPeriod: number
  daysLeft: number
}

export interface Reminder {
  label: string
  sublabel: string
  time: number
  items: SupplementItem[]
  key: string
  icon: string
  warnings: string[] // 新增警示语支持
}

export interface UserSettings {
  times: {
    morning: TimeSlotConfig
    lunch: TimeSlotConfig
    evening: number
    night: number
  }
  supplements: SupplementItem[]
  slotSupplements: {
    morning: SlotSupplements
    lunch: SlotSupplements
    evening: SlotSupplements
    night: SlotSupplements
  }
  periodConfig: {
    lastPeriodStart: string
    cycleLength: number
    periodDuration: number
    ironDays: number
  }
}

// ==================== 默认配置 (已改正吸收冲突与强绑定) ====================
export const DEFAULT_SUPPLEMENTS: SupplementItem[] = [
  { id: 'probiotic', name: '钟根堂益生菌', icon: 'dna', color: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50', inventory: 30, lowStockThreshold: 5, description: '早饭前空腹服用', dosage: 1 },
  { id: 'oliveoil', name: '鲜榨橄榄油', icon: 'droplets', color: 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-900/50', inventory: 30, lowStockThreshold: 5, description: '1小勺', dosage: 1 },
  { id: 'silymarin', name: '水飞蓟', icon: 'leaf', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50', inventory: 60, lowStockThreshold: 10, description: '护肝', dosage: 1 },
  { id: 'zinc', name: '葡萄糖酸锌', icon: 'zap', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', inventory: 60, lowStockThreshold: 10, description: '隔天吃', dosage: 1 },
  { id: 'krill', name: '磷虾油', icon: 'fish', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50', inventory: 60, lowStockThreshold: 10, description: 'Omega-3脂肪酸', dosage: 1 },
  { id: 'vitd', name: 'CGN维D3+K2', icon: 'sun', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/50', inventory: 60, lowStockThreshold: 10, description: '钙吸收（用油带D3吸收翻倍）', dosage: 1 },
  { id: 'iron', name: 'CGN螯合铁', icon: 'droplet', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50', inventory: 30, lowStockThreshold: 5, description: '补血（维C助攻吸收）', dosage: 1 },
  { id: 'vitc', name: '维生素C', icon: 'sparkles', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50', inventory: 90, lowStockThreshold: 15, description: '抗氧化', dosage: 1 },
  { id: 'magnesium', name: 'Swanson甘氨酸镁', icon: 'moon', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50', inventory: 60, lowStockThreshold: 10, description: '助眠防便秘', dosage: 2 },
  { id: 'calcium', name: '纯柠檬酸钙', icon: 'pill', color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50', inventory: 60, lowStockThreshold: 10, description: '骨骼健康', dosage: 1 },
]

export const DEFAULT_SETTINGS: UserSettings = {
  times: {
    morning: { mon: 9.5, tue: 9.5, wed: 7.833, thu: 7.833, fri: 7.833, sat: 11.5, sun: 11.5 },
    lunch: { mon: 12.0, tue: 12.0, wed: 12.0, thu: 12.0, fri: 12.0, sat: 12.0, sun: 12.0 },
    evening: 16.0,
    night: 23.75,
  },
  supplements: DEFAULT_SUPPLEMENTS,
  slotSupplements: {
    morning: {
      oddDay: ['probiotic'],
      evenDay: ['probiotic'],
    },
    // 🔥 完美修正：双数日将【纯柠檬酸钙】移至中午，与【D3+K2】以及【磷虾油】强强强绑定！
    // 彻底利用鱼油的油脂带飞D3吸收，再用D3锁定柠檬酸钙！
    lunch: {
      oddDay: ['oliveoil', 'silymarin', 'zinc'],
      evenDay: ['krill', 'vitd', 'calcium', 'silymarin'], 
    },
    evening: {
      oddDay: ['vitc'],
      evenDay: ['vitc'], 
      evenDayIronPeriod: ['iron', 'vitc'], 
    },
    // 🔥 完美修正：睡前全面松绑！删去原有的钙，只留2粒甘氨酸镁。
    // 让镁与中午的钙拉开11小时时差，断绝一切竞争性抑制，吸收率拉满！
    night: {
      oddDay: ['magnesium'],
      evenDay: ['magnesium'],
    },
  },
  // 📊 完全对齐 12个月Apple健康PDF大数据：周期39天，经期6天，吃铁黄金窗口14天
  periodConfig: {
    lastPeriodStart: '2026-04-20',
    cycleLength: 39,
    periodDuration: 6,
    ironDays: 14,
  },
}

// ==================== 工具函数 ====================
export function getCurrentTime(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
}

export function formatTime(h: number): string {
  const hours = Math.floor(h)
  const minutes = Math.floor(Math.round((h % 1) * 60))
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + minutes / 60
}

export function getDayOfWeek(date: Date): DayOfWeek {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[date.getDay()]
}

export function isOddDay(date: Date): boolean {
  return date.getDate() % 2 === 1
}

export function getPeriodStartDate(settings: UserSettings): Date {
  return new Date(settings.periodConfig.lastPeriodStart)
}

// ==================== 精密经期周期计算 ====================
export function getPeriodInfo(date: Date, settings: UserSettings): PeriodInfo {
  const periodStart = getPeriodStartDate(settings)
  const { cycleLength, periodDuration, ironDays } = settings.periodConfig

  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const d2 = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate())

  const diffMs = d1.getTime() - d2.getTime()
  const daysSince = Math.floor(diffMs / 86400000)

  const dayInCycle = ((daysSince % cycleLength) + cycleLength) % cycleLength

  const inPeriod = dayInCycle < periodDuration
  const afterPeriod = dayInCycle - periodDuration
  // 吃铁期定义：非经期，且处于生理期结束后的两周内
  const takeIron = !inPeriod && afterPeriod >= 0 && afterPeriod < ironDays

  return {
    inPeriod,
    takeIron,
    dayInCycle,
    afterPeriod,
    daysLeft: inPeriod ? periodDuration - dayInCycle : cycleLength - dayInCycle,
  }
}

export function getTimeStatus(target: number): 'active' | 'coming' | 'passed' | 'future' {
  const current = getCurrentTime()
  const diff = current - target
  if (Math.abs(diff) < 0.25) return 'active'
  if (diff < 0) return 'coming'
  return 'passed'
}

export function getSupplementsForSlot(
  slotKey: 'morning' | 'lunch' | 'evening' | 'night',
  date: Date,
  settings: UserSettings
): SupplementItem[] {
  const odd = isOddDay(date)
  const periodInfo = getPeriodInfo(date, settings)
  const slotConfig = settings.slotSupplements[slotKey]
  
  let supplementIds: string[]
  
  if (odd) {
    supplementIds = slotConfig.oddDay
  } else {
    if (slotKey === 'evening' && periodInfo.takeIron && slotConfig.evenDayIronPeriod) {
      supplementIds = slotConfig.evenDayIronPeriod
    } else {
      supplementIds = slotConfig.evenDay
    }
  }
  
  return supplementIds
    .map(id => settings.supplements.find(s => s.id === id))
    .filter((s): s is SupplementItem => s !== undefined)
}

// 核心机制：汇总提醒并加载智能警示语，同时在生理期自动对脆弱器官实行保护减负
export function getReminders(date: Date, settings: UserSettings): Reminder[] {
  const dayOfWeek = getDayOfWeek(date)
  const periodInfo = getPeriodInfo(date, settings)

  const reminders: Reminder[] = [
    {
      label: '早饭前',
      sublabel: '空腹服用',
      time: settings.times.morning[dayOfWeek],
      items: getSupplementsForSlot('morning', date, settings),
      key: 'morning',
      icon: 'sun',
      warnings: []
    },
    {
      label: '中饭后',
      sublabel: '饱腹服用',
      time: settings.times.lunch[dayOfWeek],
      items: getSupplementsForSlot('lunch', date, settings),
      key: 'lunch',
      icon: 'utensils',
      warnings: !isOddDay(date) ? ['✨ 满足强绑定：纯柠檬酸钙已成功与 D3+K2 组合，并在磷虾油油脂下实现翻倍吸收。'] : []
    },
    {
      label: '晚饭后',
      sublabel: '伴随苹果麦片',
      time: settings.times.evening,
      items: getSupplementsForSlot('evening', date, settings),
      key: 'evening',
      icon: 'sparkles',
      warnings: []
    },
    {
      label: '睡前',
      sublabel: '空腹服用',
      time: settings.times.night,
      items: getSupplementsForSlot('night', date, settings),
      key: 'night',
      icon: 'moon',
      warnings: ['💡 绝杀冲突：甘氨酸镁已与中午的钙片拉开绝对时差，确保互不干扰，高效助眠。']
    }
  ]

  // 生理期全自动防御机制：如果是生理期，自动对钙、D3K2、镁进行降载隐藏，避免刺激肠胃
  return reminders.map(r => {
    if (periodInfo.inPeriod) {
      if (r.key === 'night') r.items = [] // 经期镁放假
      if (r.key === 'lunch') r.items = r.items.filter(i => !['calcium', 'vitd'].includes(i.id)) // 经期钙和D3放假
    }
    return r
  }).filter(r => r.items.length > 0)
}

// ==================== 库存管理中心 (完美支持最高 999 阈值) ====================
export function updateInventory(settings: UserSettings, supplementId: string, change: number): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s =>
      s.id === supplementId ? { ...s, inventory: Math.min(999, Math.max(0, s.inventory + change)) } : s
    ),
  }
}

// 🔥 核心改正：吃药打卡时，扣减【该补剂特有的 dosage 数量】（如甘氨酸镁一键打卡直接减 2，钙减 1）
export function consumeSupplements(settings: UserSettings, supplementIds: string[]): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s =>
      supplementIds.includes(s.id) ? { ...s, inventory: Math.max(0, s.inventory - (s.dosage || 1)) } : s
    ),
  }
}