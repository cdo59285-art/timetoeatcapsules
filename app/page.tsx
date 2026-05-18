"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell, BellOff, Clock, Calendar, Droplet, Droplets, Sun, Moon, Sparkles,
  Pill, TestTube, Settings, Package, AlertTriangle, Check,
  Plus, Minus, ChevronRight, Utensils, Dna, Fish, Leaf, Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

// ==========================================
// 1. 类型定义与初始数据 (已拔除 CoQ10)
// ==========================================

export interface SupplementItem {
  id: string
  name: string
  dosage: string
  inventory: number
  lowStockThreshold: number
  icon: string
  color: string
  description?: string
  conflictsWith?: string[]
  holidayGroup?: "detox" | "bone" | "none"
}

export interface UserSettings {
  periodStartDate: string
  cycleLength: number
  periodLength: number
  ironDaysAfterPeriod: number
  supplements: SupplementItem[]
  times: {
    morning: Record<number, number>
    lunch: Record<number, number>
    evening: number
    night: number
  }
}

export interface PeriodInfo {
  inPeriod: boolean
  takeIron: boolean
  dayInCycle: number
  afterPeriod: number
  daysLeft: number
  isHolidayPeriod: boolean
}

export interface Reminder {
  key: string
  time: number
  label: string
  sublabel: string
  icon: string
  items: SupplementItem[]
  warnings: string[]
}

// 默认补剂配置：已完全移除 CoQ10
const DEFAULT_SUPPLEMENTS: SupplementItem[] = [
  { id: "probiotics", name: "益生菌", dosage: "1条", inventory: 30, lowStockThreshold: 7, icon: "droplet", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", description: "空腹服用", holidayGroup: "detox" },
  { id: "milk_thistle", name: "水飞蓟", dosage: "1粒", inventory: 60, lowStockThreshold: 10, icon: "leaf", color: "bg-green-500/10 text-green-500 border-green-500/20", description: "护肝调理", holidayGroup: "detox" },
  { id: "fish_oil", name: "磷虾油", dosage: "2粒", inventory: 120, lowStockThreshold: 20, icon: "fish", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", description: "随餐抗炎" },
  { id: "magnesium", name: "甘氨酸镁", dosage: "1粒", inventory: 90, lowStockThreshold: 15, icon: "moon", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", description: "助眠肌肉放松", conflictsWith: ["calcium"], holidayGroup: "bone" },
  { id: "d3_k2", name: "D3 + K2", dosage: "1粒", inventory: 60, lowStockThreshold: 10, icon: "sun", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", description: "骨骼健康对表", holidayGroup: "bone" },
  { id: "iron", name: "铁剂", dosage: "1粒", inventory: 30, lowStockThreshold: 5, icon: "zap", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", description: "双数日晚饭后服用", conflictsWith: ["calcium", "magnesium"] },
]

const DEFAULT_SETTINGS: UserSettings = {
  periodStartDate: new Date().toISOString().split("T")[0],
  cycleLength: 28,
  periodLength: 5,
  ironDaysAfterPeriod: 10,
  supplements: DEFAULT_SUPPLEMENTS,
  times: {
    morning: { 0: 8.0, 1: 8.0, 2: 8.0, 3: 8.0, 4: 8.0, 5: 9.0, 6: 9.0 },
    lunch: { 0: 12.5, 1: 12.5, 2: 12.5, 3: 12.5, 4: 12.5, 5: 13.0, 6: 13.0 },
    evening: 18.5,
    night: 22.0
  }
}

// ==========================================
// 2. 工具函数
// ==========================================

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const stored = localStorage.getItem("supplement_settings_v3")
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS
}

function saveSettings(settings: UserSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem("supplement_settings_v3", JSON.stringify(settings))
  }
}

function getPeriodInfo(date: Date, settings: UserSettings): PeriodInfo {
  const start = new Date(settings.periodStartDate)
  const diffTime = date.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  const currentCycleDay = ((diffDays % settings.cycleLength) + settings.cycleLength) % settings.cycleLength
  
  const inPeriod = currentCycleDay < settings.periodLength
  const afterPeriod = currentCycleDay - settings.periodLength
  const takeIron = !inPeriod && afterPeriod >= 0 && afterPeriod < settings.ironDaysAfterPeriod
  const daysLeft = settings.cycleLength - currentCycleDay

  const totalCyclesPassed = Math.floor(diffDays / settings.cycleLength)
  const isThirdMonth = totalCyclesPassed > 0 && (totalCyclesPassed + 1) % 3 === 0
  const isHolidayPeriod = isThirdMonth && !inPeriod && !takeIron

  return { inPeriod, takeIron, dayInCycle: currentCycleDay, afterPeriod, daysLeft, isHolidayPeriod }
}

function getReminders(date: Date, settings: UserSettings): Reminder[] {
  const periodInfo = getPeriodInfo(date, settings)
  const isOdd = date.getDate() % 2 !== 0
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const morningTime = settings.times.morning[dayOfWeek] || 8.0
  const lunchTime = settings.times.lunch[dayOfWeek] || 12.5
  const eveningTime = settings.times.evening
  const nightTime = settings.times.night

  const reminders: Reminder[] = []

  // 1. 早饭前
  const morningItems = settings.supplements.filter(s => s.id === "probiotics" && (!periodInfo.isHolidayPeriod || s.holidayGroup !== "detox"))
  if (morningItems.length > 0) {
    reminders.push({
      key: "morning",
      time: morningTime,
      label: "早饭前",
      sublabel: "开启晨间吸收通道",
      icon: "sun",
      items: morningItems,
      warnings: ["💡 益生菌空腹吃完后，建议等待 15-30 分钟再吃早饭，效果最佳。"]
    })
  }

  // 2. 中饭后
  const lunchItems = settings.supplements.filter(s => ["fish_oil", "milk_thistle"].includes(s.id))
    .filter(s => !(periodInfo.isHolidayPeriod && s.holidayGroup === "detox"))
  
  if (lunchItems.length > 0) {
    reminders.push({
      key: "lunch",
      time: lunchTime,
      label: "中饭后",
      sublabel: "随餐抗炎与脂溶性吸收",
      icon: "utensils",
      items: lunchItems,
      warnings: []
    })
  }

  // 3. 晚饭后
  const eveningItems: SupplementItem[] = []
  const eveningWarnings: string[] = []

  if (periodInfo.takeIron && !isOdd) {
    const ironItem = settings.supplements.find(s => s.id === "iron")
    if (ironItem) eveningItems.push(ironItem)
  }

  const d3Item = settings.supplements.find(s => s.id === "d3_k2")
  const skipBone = isWeekend || periodInfo.inPeriod
  if (d3Item && !skipBone) eveningItems.push(d3Item)

  if (eveningItems.length > 0) {
    reminders.push({
      key: "evening",
      time: eveningTime,
      label: "晚饭后",
      sublabel: periodInfo.takeIron ? "今日双数日，触发铁剂补给" : "常规随餐补充",
      icon: "sparkles",
      items: eveningItems,
      warnings: eveningWarnings
    })
  }

  // 4. 睡前
  const nightItems = settings.supplements.filter(s => s.id === "magnesium" && !(isWeekend || periodInfo.inPeriod))
  if (nightItems.length > 0) {
    reminders.push({
      key: "night",
      time: nightTime,
      label: "睡前",
      sublabel: "放松神经，静享睡眠",
      icon: "moon",
      items: nightItems,
      warnings: []
    })
  }

  return reminders.sort((a, b) => a.time - b.time)
}

function formatTime(timeFloat: number): string {
  const hours = Math.floor(timeFloat)
  const minutes = Math.round((timeFloat - hours) * 60)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function getTimeStatus(reminderTime: number): "passed" | "active" | "coming" {
  const now = new Date()
  const current = now.getHours() + now.getMinutes() / 60
  const diff = current - reminderTime
  if (diff >= 0 && diff < 0.5) return "active"
  if (diff >= 0.5) return "passed"
  return "coming"
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun, moon: Moon, sparkles: Sparkles, droplet: Droplet, 
  droplets: Droplets, pill: Pill, leaf: Leaf, zap: Zap, utensils: Utensils, fish: Fish
}

function getIcon(iconName: string, className?: string) {
  const IconComponent = iconMap[iconName] || Pill
  return <IconComponent className={className} />
}

// ==========================================
// 3. 主界面组件
// ==========================================

export default function SupplementReminder() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [currentTimeStr, setCurrentTimeStr] = useState("")
  const [currentDateStr, setCurrentDateStr] = useState("")
  const [isOddDay, setIsOddDay] = useState(true)
  const [reminders, setReminders] = useState<Reminder[]>([])

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const updateDisplay = useCallback(() => {
    if (!settings) return
    const now = new Date()
    setCurrentTimeStr(now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }))
    setCurrentDateStr(now.toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" }))
    setIsOddDay(now.getDate() % 2 !== 0)
    setReminders(getReminders(now, settings))
  }, [settings])

  useEffect(() => {
    updateDisplay()
    const interval = setInterval(updateDisplay, 1000)
    return () => clearInterval(interval)
  }, [updateDisplay])

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const handleConsume = (itemIds: string[]) => {
    if (!settings) return
    const updated = settings.supplements.map(sup => {
      if (itemIds.includes(sup.id)) {
        return { ...sup, inventory: Math.max(0, sup.inventory - 1) }
      }
      return sup
    })
    handleSaveSettings({ ...settings, supplements: updated })
  }

  if (!settings) return <div className="text-center py-20 text-muted-foreground">加载中...</div>
  const periodInfo = getPeriodInfo(new Date(), settings)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/50 dark:bg-zinc-900/50">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl shadow-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
        
        {/* 顶部时钟与日期 */}
        <div className="p-6 text-center border-b dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="text-5xl font-light tracking-tight tabular-nums text-slate-900 dark:text-zinc-50">{currentTimeStr}</div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentDateStr}</span>
            <span className={cn("px-2 py-0.5 rounded-full font-medium text-[11px]", isOddDay ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400")}>
              {isOddDay ? "单数日" : "双数日"}
            </span>
          </div>
        </div>

        {/* 周期大假状态看板 */}
        <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/30 border-b dark:border-zinc-800">
          <div className={cn("p-3.5 rounded-xl border flex flex-col gap-1.5", 
            periodInfo.isHolidayPeriod ? "bg-teal-50/50 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30" :
            periodInfo.inPeriod ? "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30" : "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30"
          )}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", periodInfo.isHolidayPeriod ? "bg-teal-500" : periodInfo.inPeriod ? "bg-rose-500" : "bg-indigo-500")} />
                {periodInfo.isHolidayPeriod ? "💊 器官休整大假周" : periodInfo.inPeriod ? "经期保护中" : "常规调理期"}
              </span>
              <span className="text-xs text-muted-foreground">距离下次经期约 {Math.ceil(periodInfo.daysLeft)} 天</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {periodInfo.isHolidayPeriod ? "✨ 已连续服用满3个月！当前正值不吃铁的2周，水飞蓟和益生菌已同步自动停服放假，恢复肠道群系活力。" : 
               periodInfo.inPeriod ? "🩸 生理期中，系统已自动隐藏铁剂，避免肠胃负担。" : 
               `当前处于后期调理，双数日晚间将精准提示铁剂补充。周末与生理期会自动停用骨骼组（镁/D3）。`}
            </p>
          </div>
        </div>

        {/* 提醒任务流 */}
        <ScrollArea className="h-[360px] p-4 bg-white dark:bg-zinc-950">
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const status = getTimeStatus(reminder.time)
              return (
                <Card key={reminder.key} className={cn("transition-all border shadow-none", 
                  status === "active" ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10" : "border-slate-100 dark:border-zinc-800"
                )}>
                  <CardContent className="p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg", status === "active" ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-muted-foreground")}>
                          {getIcon(reminder.icon, "w-4 h-4")}
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            {formatTime(reminder.time)}
                            <span className="text-xs font-normal text-muted-foreground">({reminder.label})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{reminder.sublabel}</div>
                        </div>
                      </div>
                      {status === "active" ? (
                        <Button size="sm" onClick={() => handleConsume(reminder.items.map(i=>i.id))} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5">
                          <Check className="w-3.5 h-3.5 mr-1" /> 已服
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{status === "passed" ? "已过时段" : "等待中"}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {reminder.items.map(item => (
                        <div key={item.id} className={cn("px-2 py-1 rounded-md text-xs border flex items-center gap-1", item.color)}>
                          <span>{item.name}</span>
                          <span className="opacity-70 text-[10px]">[{item.dosage}]</span>
                        </div>
                      ))}
                    </div>

                    {reminder.warnings.map((warn, idx) => (
                      <div key={idx} className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>

        {/* 底部控制中心入口 */}
        <div className="p-4 border-t dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full h-10 text-xs rounded-xl">
                <Package className="w-4 h-4 mr-1.5 text-indigo-500" /> 控制中心（库存余量微调）
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] p-6 focus-visible:outline-none dark:bg-zinc-950 border-t dark:border-zinc-800">
              <SheetHeader className="border-b pb-4 dark:border-zinc-800">
                <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                  <Settings className="w-4 h-4 text-indigo-500" /> 库存余量微调中心
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="h-[calc(100%-40px)] mt-4 pr-2">
                <div className="space-y-4 pb-12">
                  {settings.supplements.map((supplement) => {
                    const isLow = supplement.inventory <= supplement.lowStockThreshold
                    return (
                      <div key={supplement.id} className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col gap-3">
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{supplement.name} <span className="text-xs text-muted-foreground">({supplement.dosage})</span></span>
                          {isLow && <span className="text-rose-500 text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 库存见底</span>}
                        </div>

                        {/* 修改点：将原版原装组件范围扩展，支持 999 自由变动 */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-lg">
                          <div className="flex items-center gap-1 flex-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 rounded-md bg-white dark:bg-zinc-800"
                              onClick={() => {
                                const updated = settings.supplements.map(s => s.id === supplement.id ? { ...s, inventory: Math.max(0, s.inventory - 1) } : s)
                                handleSaveSettings({ ...settings, supplements: updated })
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            {/* 进度条上限提高到 999 渲染 */}
                            <Progress value={(supplement.inventory / 999) * 100} className="h-2 flex-1" />
                            
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 rounded-md bg-white dark:bg-zinc-800"
                              onClick={() => {
                                const updated = settings.supplements.map(s => s.id === supplement.id ? { ...s, inventory: Math.min(999, s.inventory + 1) } : s)
                                handleSaveSettings({ ...settings, supplements: updated })
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* 数字键盘输入框上限解锁至 999 */}
                          <Input 
                            type="number"
                            value={supplement.inventory}
                            max={999}
                            min={0}
                            onChange={(e) => {
                              const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0))
                              const updated = settings.supplements.map(s => s.id === supplement.id ? { ...s, inventory: val } : s)
                              handleSaveSettings({ ...settings, supplements: updated })
                            }}
                            className="h-8 w-20 text-center text-sm font-semibold tabular-nums"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </main>
  )
}