"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, BellOff, Clock, Calendar, Droplet, Sun, Moon, Sparkles, 
  Pill, TestTube, Package, AlertTriangle, Check, 
  Trash2, ChevronRight, Utensils, Dna, Fish, Leaf, Zap, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type UserSettings,
  type PeriodInfo,
  type Reminder,
  type SupplementItem,
  loadSettings,
  saveSettings,
  getPeriodInfo,
  getReminders,
  getCurrentTime,
  formatTime,
  parseTimeString,
  isOddDay,
  getDayOfWeek,
  getTimeStatus,
  getNextSlotIndex,
  getLowStockSupplements,
  consumeSupplements,
  setPeriodStartDate,
  getNotificationEnabled,
  setNotificationEnabled as saveNotificationEnabled,
} from "@/lib/supplements"

// ============================================================================
// 图标映射路由表
// ============================================================================
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun, moon: Moon, sparkles: Sparkles, droplet: Droplet, 
  pill: Pill, dna: Dna, fish: Fish, leaf: Leaf, zap: Zap, utensils: Utensils, clock: Clock,
}

function getIcon(iconName: string, className?: string) {
  const IconComponent = iconMap[iconName] || Pill
  return <IconComponent className={className} />
}

// ============================================================================
// 主程序组件
// ============================================================================
export default function SupplementReminder() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  const [currentDateStr, setCurrentDateStr] = useState('')
  const [isOdd, setIsOdd] = useState(true)
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default')
  const [lastNotifiedHour, setLastNotifiedHour] = useState(-1)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // 1. 初始化
  useEffect(() => {
    const loaded = loadSettings()
    setSettings(loaded)
    setNotificationEnabled(getNotificationEnabled())
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      new Notification(title, { body, tag: title, requireInteraction: false })
    } catch {}
  }, [notificationEnabled])

  // 2. 核心渲染与状态更新引擎
  const updateDisplay = useCallback(() => {
    if (!settings) return
    const now = new Date()
    const newReminders = getReminders(now, settings)
    const period = getPeriodInfo(now, settings)

    setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setCurrentDateStr(now.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' }))
    setIsOdd(isOddDay(now))
    setPeriodInfo(period)

    newReminders.forEach(reminder => {
      const status = getTimeStatus(reminder.time)
      if (status === 'active') {
        const current = getCurrentTime()
        const diff = current - reminder.time
        if (diff >= -0.033 && diff <= 0.008) {
          const currentHour = now.getHours()
          if (lastNotifiedHour !== currentHour) {
            sendNotification(`${reminder.label} 提醒喂药：`, reminder.items.map(s => s.name).join('、'))
            setLastNotifiedHour(currentHour)
          }
        }
      }
    })
    setReminders(newReminders)
  }, [settings, lastNotifiedHour, sendNotification])

  useEffect(() => {
    if (!settings) return
    updateDisplay()
    const interval = setInterval(updateDisplay, 1000)
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setLastNotifiedHour(-1)
        setHasScrolled(false)
        updateDisplay()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [settings, updateDisplay])

  // 3. 智能无感自适应焦点滚动
  useEffect(() => {
    if (reminders.length > 0 && !hasScrolled) {
      const nextIndex = getNextSlotIndex(reminders)
      const targetRef = cardRefs.current[nextIndex]
      if (targetRef) {
        const timer = setTimeout(() => {
          targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setHasScrolled(true)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [reminders, hasScrolled])

  const handleSaveSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }, [])

  const handleToggleNotification = async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        setNotificationEnabled(true)
        saveNotificationEnabled(true)
      }
    } else if (Notification.permission === 'granted') {
      const newValue = !notificationEnabled
      setNotificationEnabled(newValue)
      saveNotificationEnabled(newValue)
    }
  }

  const handleResetPeriod = () => {
    if (!settings) return
    const today = new Date()
    if (confirm(`确定将今天重置为新周期的「经期第一天」吗？\n系统将以此精准推算你接下来的两周黄金补铁期。`)) {
      const newSettings = setPeriodStartDate(settings, today)
      handleSaveSettings(newSettings)
      setLastNotifiedHour(-1)
    }
  }

  if (!settings || !periodInfo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse text-xs">底层模块导入链检验中...</div>
      </main>
    )
  }

  const lowStockSupplements = getLowStockSupplements(settings)

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-border">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Pill className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">补剂智能看板</h1>
          <p className="text-xs text-muted-foreground mt-0.5">时差排班与生理期两周闭环调配</p>
        </div>

        {/* Time Display */}
        <div className="text-center py-5 px-4">
          <div className="text-5xl font-light tracking-tight text-foreground tabular-nums">
            {currentTimeStr}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentDateStr}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              isOdd ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
            )}>
              {isOdd ? '单数日' : '双数日'}
            </span>
          </div>
        </div>

        {/* Period Card */}
        <div className={cn(
          "mx-4 rounded-xl p-3 border transition-all text-xs bg-card/40",
          periodInfo.inPeriod ? "border-rose-500/30 text-rose-600 dark:text-rose-400" :
          periodInfo.takeIron ? "border-amber-500/30 text-amber-600 dark:text-amber-400" :
          "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", 
              periodInfo.inPeriod ? "bg-rose-500" : periodInfo.takeIron ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <div className="flex-1">
              <p className="font-semibold">
                {periodInfo.inPeriod ? `经期中 (第 ${Math.floor(periodInfo.dayInCycle) + 1} 天)` :
                 periodInfo.takeIron ? `黄金吃铁期 (第 ${Math.floor(periodInfo.afterPeriod) + 1} 天)` : '补剂休整期'}
              </p>
              <p className="text-muted-foreground opacity-90 mt-0.5">
                {periodInfo.inPeriod ? '生理关怀已启动：自动隐藏维B以减缓胃肠刺激 ☕' :
                 periodInfo.takeIron ? '两周补铁窗口：双数日晚饭后将同步排班螯合铁+VC 🩸' :
                 `距离下次预计生理期还剩约 ${Math.floor(periodInfo.daysLeft)} 天`}
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockSupplements.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-medium">
                库存紧缺：{lowStockSupplements.map(s => s.name).join('、')}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-500 hover:bg-red-500/10" onClick={() => setInventoryOpen(true)}>
              去补货
            </Button>
          </div>
        )}

        {/* Reminders Body */}
        <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
          {reminders.map((reminder, index) => {
            const status = getTimeStatus(reminder.time)
            return (
              <Card 
                key={reminder.key}
                ref={el => { cardRefs.current[index] = el; }}
                className={cn(
                  "transition-all border-2",
                  status === 'active' && "border-primary bg-primary/5 shadow-md",
                  status === 'coming' && "border-amber-500/40 bg-amber-500/5",
                  status === 'passed' && "opacity-40 border-muted"
                )}
              >
                <CardContent className="p-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", 
                        status === 'active' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {getIcon(reminder.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <span className="font-semibold text-sm mr-1.5 tabular-nums">{formatTime(reminder.time)}</span>
                        <span className="text-muted-foreground">{reminder.label}</span>
                      </div>
                    </div>
                    {status === 'active' && <Badge className="text-[10px]">当前时段</Badge>}