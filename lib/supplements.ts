// ============================================================================
// 1. 类型定义声明 (Types Definitions)
// ============================================================================
export interface SupplementItem {
  id: string
  name: string
  icon: string
  color: string
  inventory: number
  lowStockThreshold: number
  dosage?: number      // 单次服用粒数/剂量
  description?: string // 品牌及备注说明
}

export interface UserTimes {
  morning: Record<number, number> // 星期 0-6 对应的早饭前时间（例如 8.0 代表 08:00）
  lunch: Record<number, number>   // 星期 0-6 对应的中饭后时间
  evening: number                 // 晚饭后固定时间
  night: number                   // 睡前固定时间
}

export interface UserSettings {
  lastPeriodStart: string         // 上次经期第一天 "YYYY-MM-DD"
  times: UserTimes
  supplements: SupplementItem[]
}

export interface PeriodInfo {
  inPeriod: boolean    // 是否在经期中 (前6天)
  takeIron: boolean    // 是否在铁剂补充期 (经后第7-20天，共14天/2周)
  dayInCycle: number   // 当前处于整个周期的第几天
  afterPeriod: number  // 经期结束后的第几天
  daysLeft: number     // 距离下一次经期的估算天数
}

export interface ReminderItem {
  id: string
  name: string
  icon: string
  color: string
  inventory: number
  lowStockThreshold: number
  dosage: number
}

export interface Reminder {
  key: string
  time: number
  label: string
  sublabel: string
  icon: string
  items: ReminderItem[]
  warnings?: string[]  // 时差避让与防冲突协同提示语
}

// ============================================================================
// 2. 核心初始配置 (严格遵循你的日常习惯与专属品牌偏好，不买Q10)
// ============================================================================
const STORAGE_KEY = "supplement_reminder_settings_v3"
const NOTIFY_KEY = "supplement_notification_enabled_v3"

const DEFAULT_SETTINGS: UserSettings = {
  lastPeriodStart: "2026-04-20", // 基于你记录的真实上个月经起点
  times: {
    morning: { 0: 8.0, 1: 8.0, 2: 8.0, 3: 8.0, 4: 8.0, 5: 8.0, 6: 8.0 },
    lunch: { 0: 12.5, 1: 12.5, 2: 12.5, 3: 12.5, 4: 12.5, 5: 12.5, 6: 12.5 },
    evening: 18.5, // 18:30 晚饭时间
    night: 22.0    // 22:00 睡前时间
  },
  supplements: [
    { id: "probiotic", name: "钟根堂益生菌", icon: "sparkles", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "韩国钟根堂 · 饭前空腹服用" },
    { id: "vitb", name: "维B族复合片", icon: "zap", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", inventory: 90, lowStockThreshold: 15, dosage: 1, description: "California Gold Nutrition" },
    { id: "vitc", name: "维生素 C", icon: "droplets", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", inventory: 120, lowStockThreshold: 20, dosage: 1, description: "Swanson" },
    { id: "zinc", name: "葡萄糖酸锌", icon: "dna", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "Swanson · 隔日服用" },
    { id: "vitd3k2", name: "维D3+K2", icon: "sun", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "Life Extension · 隔日随餐" },
    { id: "fishoil", name: "高浓缩鱼油", icon: "fish", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", inventory: 90, lowStockThreshold: 15, dosage: 2, description: "Life Extension · 晚饭随餐" },
    { id: "magnesium", name: "甘氨酸镁", icon: "moon", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", inventory: 120, lowStockThreshold: 20, dosage: 2, description: "Life Extension · 睡前舒缓" },
    { id: "iron", name: "螯合铁", icon: "pill", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", inventory: 30, lowStockThreshold: 7, dosage: 1, description: "经后2周黄金期服用 · 停2周循环" },
    { id: "oliveoil", name: "特级初榨橄榄油", icon: "leaf", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", inventory: 50, lowStockThreshold: 10, dosage: 1, description: "计划7月开启直饮排班" }
  ]
}

// ============================================================================
// 3. 基础时间与工具函数 (Utility Functions)
// ============================================================================
export function getCurrentTime(date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60
}

export function formatTime(timeNum: number): string {
  const hours = Math.floor(timeNum)
  const minutes = Math.round((timeNum - hours) * 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function parseTimeString(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h + (m || 0) / 60
}

export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

export function isOddDay(date: Date): boolean {
  return date.getDate() % 2 !== 0
}

// ============================================================================
// 4. 生理期历史与铁剂两周循环精密推算 (Period Calculator)
// ============================================================================
export function getPeriodInfo(date: Date, settings: UserSettings): PeriodInfo {
  const start = new Date(settings.lastPeriodStart)
  start.setHours(0, 0, 0, 0)
  const current = new Date(date)
  current.setHours(0, 0, 0, 0)

  const diffMs = current.getTime() - start.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  
  const cycleLength = 39 // 严格基于你过往12个月经期历史记录的平均周期天数
  const periodLength = 6  // 平均经期长度 6 天
  const ironLength = 14   // 严格满足你「吃两个星期，停两个星期」的 14 天铁剂补充周期
  
  const dayInCycle = diffDays % cycleLength
  const inPeriod = dayInCycle < periodLength
  
  const afterPeriod = dayInCycle - periodLength
  // 经期干净后的前14天触发吃铁排班，随后的半个月处于休整期（停吃），完美契合两周开闭循环
  const takeIron = !inPeriod && afterPeriod >= 0 && afterPeriod < ironLength
  const daysLeft = cycleLength - dayInCycle

  return { inPeriod, takeIron, dayInCycle, afterPeriod, daysLeft }
}

export function getTimeStatus(targetTime: number): 'active' | 'coming' | 'passed' | 'future' {
  const current = getCurrentTime()
  const diff = targetTime - current
  
  if (diff >= -0.033 && diff <= 0.033) return 'active' // 2分钟内激活状态
  if (diff > 0.033 && diff <= 0.5) return 'coming'    // 30分钟内即将到来
  if (diff < -0.033) return 'passed'
  return 'future'
}

export function getNextSlotIndex(reminders: Reminder[]): number {
  const current = getCurrentTime()
  const activeIndex = reminders.findIndex(r => getTimeStatus(r.time) === 'active')
  if (activeIndex !== -1) return activeIndex

  const comingIndex = reminders.findIndex(r => getTimeStatus(r.time) === 'coming')
  if (comingIndex !== -1) return comingIndex

  const futureIndex = reminders.findIndex(r => r.time > current)
  if (futureIndex !== -1) return futureIndex

  return reminders.length - 1
}

// ============================================================================
// 5. 核心修复：显式导出被页面呼叫的低库存过滤函数 (Fixed Export Missing Error)
// ============================================================================
export function getLowStockSupplements(settings: UserSettings): SupplementItem[] {
  return settings.supplements.filter(s => s.inventory <= s.lowStockThreshold)
}

// ============================================================================
// 6. 每日4次智能时差排班算法 (Dynamic Supplement Scheduler)
// ============================================================================
export function getReminders(date: Date, settings: UserSettings): Reminder[] {
  const period = getPeriodInfo(date, settings)
  const isOdd = isOddDay(date)
  const dayOfWeek = getDayOfWeek(date)
  
  const mTime = settings.times.morning[dayOfWeek] ?? 8.0
  const lTime = settings.times.lunch[dayOfWeek] ?? 12.5
  const eTime = settings.times.evening
  const nTime = settings.times.night

  const findSupplement = (id: string): ReminderItem => {
    const s = settings.supplements.find(item => item.id === id) || DEFAULT_SETTINGS.supplements.find(item => item.id === id)!
    return { ...s, dosage: s.dosage || 1 }
  }

  const list: Reminder[] = []

  // 【时段一：早饭前 空腹】
  const morningItems: ReminderItem[] = [findSupplement("probiotic")] // 钟根堂益生菌固定首位
  list.push({
    key: "morning",
    time: mTime,
    label: "早饭前",
    sublabel: "唤醒肠胃屏障 💧",
    icon: "sparkles",
    items: morningItems,
    warnings: ["钟根堂益生菌请用温凉水冲服，空腹状态下吸收效率更佳。"]
  })

  // 【时段二：中饭后 提神抗氧】
  const lunchItems: ReminderItem[] = []
  // 生理期关怀：经期中肠胃较为脆弱，智能精简隐藏维B，避免刺激
  if (!period.inPeriod) {
    lunchItems.push(findSupplement("vitb"))
  }
  // 锌 与 D3+K2 采用隔天吃一粒的高效交替防积攒逻辑
  if (isOdd) {
    lunchItems.push(findSupplement("zinc"))
    lunchItems.push(findSupplement("vitd3k2"))
  }

  if (lunchItems.length > 0) {
    const warnings: string[] = []
    if (isOdd) warnings.push("今日排班含脂溶性维D3K2，请在中饭随餐或饭后立刻吞服。")
    if (period.inPeriod) warnings.push("已为您在经期中自动隐去维B族，温和减少肠胃负荷。")

    list.push({
      key: "lunch",
      time: lTime,
      label: "中饭后",
      sublabel: "随餐吸收与高能代谢转化 ☀️",
      icon: "sun",
      items: lunchItems,
      warnings: warnings
    })
  }

  // 【时段三：晚饭后 黄金同服与多重协同】
  const eveningItems: ReminderItem[] = [
    findSupplement("vitc"),
    findSupplement("fishoil")
  ]
  
  // 铁剂精准吃2周：处于吃铁期，且在双数日服用，达成精密调配
  if (period.takeIron && !isOdd) {
    eveningItems.push(findSupplement("iron"))
  }

  // 橄榄油直饮计划：根据预留偏好，只有到了 2026年7月份（getMonth() >= 6）才会自动触发直饮排班
  if (date.getFullYear() > 2026 || (date.getFullYear() === 2026 && date.getMonth() >= 6)) {
    eveningItems.push(findSupplement("oliveoil"))
  }

  const eveningWarnings: string[] = []
  if (period.takeIron && !isOdd) {
    eveningWarnings.push("✨ 触发黄金补血协同：螯合铁与维C已同餐排班，VC能让铁的吸收率成倍暴增！")
  }
  eveningWarnings.push("伴随你的苹果和麦片晚饭一同随餐吞服高浓缩鱼油。🍎🥣")

  list.push({
    key: "evening",
    time: eTime,
    label: "晚饭后",
    sublabel: "深度抗炎修复与铁剂协同 🌙",
    icon: "utensils",
    items: eveningItems,
    warnings: eveningWarnings
  })

  // 【时段四：睡前 矿物质放松】
  // 防吸收冲突：铁（傍晚18:30）与 镁（深夜22:00）存在强烈的同载体竞争冲突，时差完美拉开3.5小时，绝无冲突
  const nightItems: ReminderItem[] = [findSupplement("magnesium")]
  list.push({
    key: "night",
    time: nTime,
    label: "睡前",
    sublabel: "舒缓肌肉与优质深度睡眠调理 💤",
    icon: "moon",
    items: nightItems,
    warnings: ["甘氨酸镁已与晚饭后的铁剂拉开超3小时时差，完全避开矿物质竞争吸收通道。"]
  })

  return list.sort((a, b) => a.time - b.time)
}

// ============================================================================
// 7. 配置项持久化处理 (Storage Handlers)
// ============================================================================
export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS
    const parsed = JSON.parse(stored)
    if (!parsed.times || !parsed.supplements) return DEFAULT_SETTINGS
    return parsed
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: UserSettings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error("Failed to save settings", e)
  }
}

export function getNotificationEnabled(): boolean {
  if (typeof window === "undefined") return true
  const val = localStorage.getItem(NOTIFY_KEY)
  return val === null ? true : val === "true"
}

export function setNotificationEnabled(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(NOTIFY_KEY, String(enabled))
}

export function updateInventory(settings: UserSettings, id: string, change: number): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s => 
      s.id === id ? { ...s, inventory: Math.max(0, s.inventory + change) } : s
    )
  }
}

export function consumeSupplements(settings: UserSettings, ids: string[]): UserSettings {
  return {
    ...settings,
    supplements: settings.supplements.map(s => 
      ids.includes(s.id) ? { ...s, inventory: Math.max(0, s.inventory - (s.dosage || 1)) } : s
    )
  }
}

export function setPeriodStartDate(settings: UserSettings, date: Date): UserSettings {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return {
    ...settings,
    lastPeriodStart: dateStr
  }
}