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

// ==================== 默认配置 ====================
// 根据用户配置：
// 模式一【吃铁的那两周】：
//   单数日：早-益生菌 | 中-橄榄油+水飞蓟+锌 | 晚-维C | 睡前-镁2+钙1
//   双数日：早-益生菌 | 中-磷虾油+D3K2+水飞蓟 | 晚-铁+维C | 睡前-镁2+钙1
// 模式二【不吃铁的那两周】：
//   单数日：同上
//   双数日：早-益生菌 | 中-磷虾油+D3K2+水飞蓟 | 晚-维C | 睡前-镁2+钙1

export const DEFAULT_SUPPLEMENTS: SupplementItem[] = [
  { id: 'probiotic', name: '钟根堂益生菌', icon: 'dna', color: 'bg-teal-100 text-teal-700 border-teal-200', inventory: 30, lowStockThreshold: 5, description: '肠道健康', dosage: 1 },
  { id: 'oliveoil', name: '鲜榨橄榄油', icon: 'droplets', color: 'bg-lime-100 text-lime-700 border-lime-200', inventory: 30, lowStockThreshold: 5, description: '1小勺', dosage: 1 },
  { id: 'silymarin', name: '水飞蓟', icon: 'leaf', color: 'bg-green-100 text-green-700 border-green-200', inventory: 60, lowStockThreshold: 10, description: '护肝', dosage: 1 },
  { id: 'zinc', name: '葡萄糖酸锌', icon: 'zap', color: 'bg-amber-100 text-amber-700 border-amber-200', inventory: 60, lowStockThreshold: 10, description: '免疫力', dosage: 1 },
  { id: 'krill', name: '磷虾油', icon: 'fish', color: 'bg-rose-100 text-rose-700 border-rose-200', inventory: 60, lowStockThreshold: 10, description: 'Omega-3脂肪酸', dosage: 1 },
  { id: 'vitd', name: 'CGN维D3+K2', icon: 'sun', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', inventory: 60, lowStockThreshold: 10, description: '钙吸收（用油带D3吸收翻倍）', dosage: 1 },
  { id: 'iron', name: 'CGN螯合铁', icon: 'droplet', color: 'bg-red-100 text-red-700 border-red-200', inventory: 30, lowStockThreshold: 5, description: '补血（维C助攻吸收）', dosage: 1 },
  { id: 'vitc', name: '维生素C', icon: 'sparkles', color: 'bg-orange-100 text-orange-700 border-orange-200', inventory: 90, lowStockThreshold: 15, description: '抗氧化', dosage: 1 },
  { id: 'magnesium', name: 'Swanson甘氨酸镁', icon: 'moon', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', inventory: 60, lowStockThreshold: 10, description: '助眠防便秘', dosage: 2 },
  { id: 'calcium', name: '纯柠檬酸钙', icon: 'pill', color: 'bg-sky-100 text-sky-700 border-sky-200', inventory: 60, lowStockThreshold: 10, description: '骨骼健康', dosage: 1 },
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
    // 早饭前：只吃益生菌
    morning: {
      oddDay: ['probiotic'],
      evenDay: ['probiotic'],
    },
    // 中饭后：
    // 单数日 - 橄榄油+水飞蓟+锌
    // 双数日 - 磷虾油+D3K2+水飞蓟
    lunch: {
      oddDay: ['oliveoil', 'silymarin', 'zinc'],
      evenDay: ['krill', 'vitd', 'silymarin'],
    },
    // 晚饭后（随麦片）：
    // 单数日 - 只有维C
    // 双数日（吃铁期）- 铁+维C
    // 双数日（不吃铁期）- 只有维C
    evening: {
      oddDay: ['vitc'],
      evenDay: ['vitc'], // 不吃铁期
      evenDayIronPeriod: ['iron', 'vitc'], // 吃铁期
    },
    // 睡前：镁2粒+钙1粒（每天固定）
    night: {
      oddDay: ['magnesium', 'calcium'],
      evenDay: ['magnesium', 'calcium'],
    },
  },
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

// ==================== 存储函数 ====================
export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  const saved = localStorage.getItem('supplementSettings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // 合并默认设置，确保新字段存在
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        supplements: parsed.supplements || DEFAULT_SETTINGS.supplements,
        slotSupplements: {
          ...DEFAULT_SETTINGS.slotSupplements,
          ...(parsed.slotSupplements || {}),
        },
        periodConfig: {
          ...DEFAULT_SETTINGS.periodConfig,
          ...(parsed.periodConfig || {}),
        },
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('supplementSettings', JSON.stringify(settings))
}

export function getPeriodStartDate(settings: UserSettings): Date {
  return new Date(settings.periodConfig.lastPeriodStart)
}

export function setPeriodStartDate(settings: UserSettings, date: Date): UserSettings {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return {
    ...settings,
    periodConfig: {
      ...settings.periodConfig,
      lastPeriodStart: dateStr,
    },
  }
}

// ==================== 经期计算 ====================
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
  const takeIron = !inPeriod && afterPeriod >= 0 && afterPeriod < ironDays

  return {
    inPeriod,
    takeIron,
    dayInCycle,
    afterPeriod,
    daysLeft: inPeriod ? periodDuration - dayInCycle : cycleLength - dayInCycle,
  }
}

// ==================== 时间状态 ====================
export type TimeStatus = 'active' | 'coming' | 'passed' | 'future'

export function getTimeStatus(target: number): TimeStatus {
  const current = getCurrentTime()
  const diff = current - target
  if (Math.abs(diff) < 0.008) return 'active'
  if (diff < 0 && diff > -0.167) return 'coming'
  if (diff > 0) return 'passed'
  return 'future'
}

// ==================== 获取下一个时段索引 ====================
export function getNextSlotIndex(reminders: Reminder[]): number {
  const current = getCurrentTime()
  
  for (let i = 0; i < reminders.length; i++) {
    if (reminders[i].time > current) {
      return i
    }
  }
  
  // 如果所有时段都过了，返回第一个（明天）
  return 0
}

// ==================== 补剂获取 ====================
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
    // 单数日
    supplementIds = slotConfig.oddDay
  } else {
    // 双数日
    if (slotKey === 'evening' && periodInfo.takeIron && slotConfig.evenDayIronPeriod) {
      // 晚饭后 + 吃铁期 = 铁+维C
      supplementIds = slotConfig.evenDayIronPeriod
    } else {
      // 其他情况用普通双数日配置
      supplementIds = slotConfig.evenDay
    }
  }
  
  return supplementIds
    .map(id => settings.supplements.find(s => s.id === id))
    .filter((s): s is SupplementItem => s !== undefined)
}

export function getReminders(date: Date, settings: UserSettings): Reminder[] {
  const dayOfWeek = getDayOfWeek(date)

  return [
    {
      label: '早饭前',
      sublabel: '空腹服用',
      time: settings.times.morning[dayOfWeek],
      items: getSupplementsForSlot('morning', date, settings),
      key: 'morning',
      icon: 'sun',
    },
    {
      label: '中饭后',
      sublabel: '饱腹服用',
      time: settings.times.lunch[dayOfWeek],
      items: getSupplementsForSlot('lunch', date, settings),
      key: 'lunch',
      icon: 'utensils',
    },
    {
      label: '晚饭后',
      sublabel: '伴随苹果麦片',
      time: settings.times.evening,
      items: getSupplementsForSlot('evening', date, settings),
      key: 'evening',
      icon: 'sparkles',
    },
    {
      label: '睡前',
      sublabel: '空腹服用',
      time: settings.times.night,
      items: getSupplementsForSlot('night', date, settings),
      key: 'night',
      icon: 'moon',
    },
  ]
}

// ==================== 库存管理 ====================
export function getLowStockSupplements(settings: UserSettings): SupplementItem[] {
  return settings.supplements.filter(s => s.inventory <= s.lowStockThreshold)
}

export function updateInventory(
  settings: UserSettings,
  supplementId: string,
  change: number
): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s =>
      s.id === supplementId
        ? { ...s, inventory: Math.max(0, s.inventory + change) }
        : s
    ),
  }
}

export function consumeSupplements(
  settings: UserSettings,
  supplementIds: string[]
): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s =>
      supplementIds.includes(s.id)
        ? { ...s, inventory: Math.max(0, s.inventory - (s.dosage || 1)) }
        : s
    ),
  }
}

// ==================== 通知设置 ====================
export function getNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('notifEnabled') !== 'false'
}

export function setNotificationEnabled(enabled: boolean): void {
  localStorage.setItem('notifEnabled', String(enabled))
}
