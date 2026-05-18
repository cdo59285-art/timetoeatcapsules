"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, BellOff, Clock, Calendar, Droplet, Droplets, Sun, Moon, Sparkles, 
  Pill, TestTube, Package, AlertTriangle, Check, 
  Plus, Minus, ChevronRight, Utensils, Dna, Fish, Leaf, Zap, Info
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
  updateInventory,
  consumeSupplements,
  setPeriodStartDate,
  getNotificationEnabled,
  setNotificationEnabled as saveNotificationEnabled,
} from "@/lib/supplements"

// ==================== Icon Map ====================
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  moon: Moon,
  sparkles: Sparkles,
  droplet: Droplet,
  droplets: Droplets,
  pill: Pill,
  dna: Dna,
  fish: Fish,
  leaf: Leaf,
  zap: Zap,
  utensils: Utensils,
  clock: Clock,
}

function getIcon(iconName: string, className?: string) {
  const IconComponent = iconMap[iconName] || Pill
  return <IconComponent className={className} />
}

// ==================== Components ====================
function TimeDisplay({ time, date, isOdd }: { time: string; date: string; isOdd: boolean }) {
  return (
    <div className="text-center py-6 px-4">
      <div className="text-5xl font-light tracking-tight text-foreground tabular-nums">
        {time}
      </div>
      <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{date}</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          isOdd ? "bg-primary/10 text-primary" : "bg-warning/20 text-warning-foreground"
        )}>
          {isOdd ? '单数日' : '双数日'}
        </span>
      </div>
    </div>
  )
}

function PeriodStatusCard({ periodInfo }: { periodInfo: PeriodInfo }) {
  const getStatusConfig = () => {
    if (periodInfo.inPeriod) {
      return {
        title: '经期中',
        subtitle: `今日第 ${Math.floor(periodInfo.dayInCycle) + 1} 天`,
        description: '生理期关怀：已为您智能精简隐藏部分补剂，避免刺激肠胃 ☕',
        color: 'bg-destructive/10 border-destructive/20',
        textColor: 'text-destructive',
        dotColor: 'bg-destructive'
      }
    } else if (periodInfo.takeIron) {
      return {
        title: '铁剂期',
        subtitle: `经后第 ${Math.floor(periodInfo.afterPeriod) + 1} 天`,
        description: '黄金补血窗口：双数日晚饭后会自动为您排班 螯合铁+维C',
        color: 'bg-warning/10 border-warning/20',
        textColor: 'text-warning-foreground',
        dotColor: 'bg-warning'
      }
    } else {
      return {
        title: '休整期',
        subtitle: `距离下次经期`,
        description: `约 ${Math.floor(periodInfo.daysLeft)} 天`,
        color: 'bg-success/10 border-success/20',
        textColor: 'text-success',
        dotColor: 'bg-success'
      }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={cn("mx-4 rounded-xl p-4 border transition-all", config.color)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-2.5 h-2.5 rounded-full", config.dotColor)} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold", config.textColor)}>{config.title}</span>
            <span className="text-sm text-muted-foreground">{config.subtitle}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'coming' | 'passed' | 'future' }) {
  if (status === 'active') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground animate-pulse">
        现在
      </span>
    )
  }
  if (status === 'coming') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning-foreground">
        即将
      </span>
    )
  }
  if (status === 'passed') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        已过
      </span>
    )
  }
  return null
}

function ReminderCard({ 
  reminder, 
  index,
  onConsume,
  cardRef 
}: { 
  reminder: Reminder
  index: number
  onConsume: (ids: string[]) => void
  cardRef?: (node: HTMLDivElement | null) => void
}) {
  const status = getTimeStatus(reminder.time)
  const isActive = status === 'active'
  const isComing = status === 'coming'
  const isPassed = status === 'passed'

  const handleConsume = () => {
    const ids = reminder.items.map(i => i.id)
    onConsume(ids)
  }

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "transition-all duration-300 border-2 animate-fade-in-up",
        isActive && "border-primary bg-primary/5 shadow-lg shadow-primary/10",
        isComing && "border-warning bg-warning/5",
        isPassed && "opacity-50 border-muted",
        !isActive && !isComing && !isPassed && "border-border hover:border-primary/30"
      )} 
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {getIcon(reminder.icon, "w-5 h-5")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-semibold tabular-nums",
                  isActive ? "text-primary" : isPassed ? "text-muted-foreground" : "text-foreground"
                )}>
                  {formatTime(reminder.time)}
                </span>
                {isActive && <Bell className="w-4 h-4 text-primary animate-bell-ring" />}
              </div>
              <p className="text-sm text-muted-foreground">{reminder.label}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        
        {/* 展现补剂和各自特有的 dosage 服用量 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {reminder.items.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                item.color,
                isActive && "ring-1 ring-primary/20",
                item.inventory <= item.lowStockThreshold && "ring-2 ring-destructive/50"
              )}
            >
              {getIcon(item.icon, "w-3.5 h-3.5")}
              <span>{item.name}</span>
              <span className="opacity-80 font-bold text-[10px]">
                {item.dosage && item.dosage > 1 ? `${item.dosage}粒` : item.id === 'probiotic' || item.id === 'oliveoil' ? '1条/勺' : '1粒'}
              </span>
              {item.inventory <= item.lowStockThreshold && (
                <AlertTriangle className="w-3 h-3 text-destructive" />
              )}
            </div>
          ))}
        </div>

        {/* 渲染防冲突提示语 */}
        {reminder.warnings && reminder.warnings.length > 0 && (
          <div className="mb-3 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-border text-xs text-muted-foreground space-y-1">
            {reminder.warnings.map((warn, i) => (
              <p key={i} className="flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>{warn}</span>
              </p>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {reminder.sublabel}
          </p>
          {(isActive || isComing) && (
            <Button 
              size="sm" 
              variant={isActive ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={handleConsume}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              已服用
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function LowStockAlert({ supplements, onOpenInventory }: { supplements: SupplementItem[], onOpenInventory: () => void }) {
  if (supplements.length === 0) return null

  return (
    <div className="mx-4 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">库存不足</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {supplements.map(s => s.name).join('、')} 需要补货
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenInventory}>
          查看
        </Button>
      </div>
    </div>
  )
}

function InventorySheet({ 
  settings, 
  onUpdateInventory,
  open,
  onOpenChange
}: { 
  settings: UserSettings
  onUpdateInventory: (id: string, change: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            补剂库存
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100%-60px)] pr-4">
          <div className="space-y-3">
            {settings.supplements.map(supplement => {
              const percentage = Math.min(100, (supplement.inventory / (supplement.lowStockThreshold * 3)) * 100)
              const isLow = supplement.inventory <= supplement.lowStockThreshold
              
              return (
                <div key={supplement.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", supplement.color)}>
                        {getIcon(supplement.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{supplement.name}</p>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 opacity-80">
                            单次: {supplement.dosage || 1}
                          </Badge>
                        </div>
                        {supplement.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{supplement.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onUpdateInventory(supplement.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className={cn(
                        "w-12 text-center font-semibold tabular-nums",
                        isLow && "text-destructive"
                      )}>
                        {supplement.inventory}
                      </span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onUpdateInventory(supplement.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn("h-1.5", isLow && "[&>div]:bg-destructive")}
                  />
                  {isLow && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      低于阈值 ({supplement.lowStockThreshold})
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function TimeSettingsDialog({ 
  settings, 
  onSave 
}: { 
  settings: UserSettings
  onSave: (newSettings: UserSettings) => void
}) {
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null)
  const [open, setOpen] = useState(false)
  
  const now = new Date()
  const dayOfWeek = getDayOfWeek(now)

  // 完美防死机：只有弹窗打开时，才深拷贝同步最外层的真实配置
  useEffect(() => {
    if (open && settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)))
    }
  }, [open, settings])

  if (!localSettings || !localSettings.times) return null

  const handleSave = () => {
    onSave(localSettings)
    setOpen(false)
  }

  // 极致防御：防止有些星期下的自定义时间段为 undefined 导致渲染崩塌
  const getMorningTime = () => localSettings.times.morning[dayOfWeek] ?? 8.0
  const getLunchTime = () => localSettings.times.lunch[dayOfWeek] ?? 12.0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Clock className="w-4 h-4 mr-1.5" />
          调整时间
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>调整提醒时间</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">早饭前 (今日)</Label>
            <Input 
              type="time" 
              value={formatTime(getMorningTime())}
              onChange={e => {
                const time = parseTimeString(e.target.value)
                setLocalSettings(prev => prev ? {
                  ...prev,
                  times: {
                    ...prev.times,
                    morning: { ...prev.times.morning, [dayOfWeek]: time }
                  }
                } : null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">中饭后 (今日)</Label>
            <Input 
              type="time" 
              value={formatTime(getLunchTime())}
              onChange={e => {
                const time = parseTimeString(e.target.value)
                setLocalSettings(prev => prev ? {
                  ...prev,
                  times: {
                    ...prev.times,
                    lunch: { ...prev.times.lunch, [dayOfWeek]: time }
                  }
                } : null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">晚饭后 (每日)</Label>
            <Input 
              type="time" 
              value={formatTime(localSettings.times.evening)}
              onChange={e => {
                const time = parseTimeString(e.target.value)
                setLocalSettings(prev => prev ? {
                  ...prev,
                  times: { ...prev.times, evening: time }
                } : null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">睡前 (每日)</Label>
            <Input 
              type="time" 
              value={formatTime(localSettings.times.night)}
              onChange={e => {
                const time = parseTimeString(e.target.value)
                setLocalSettings(prev => prev ? {
                  ...prev,
                  times: { ...prev.times, night: time }
                } : null)
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingsPanel({
  settings,
  notificationEnabled,
  notificationPermission,
  onToggleNotification,
  onResetPeriod,
  onTestNotification,
  onOpenInventory,
  onSaveSettings
}: {
  settings: UserSettings
  notificationEnabled: boolean
  notificationPermission: NotificationPermission | 'default'
  onToggleNotification: () => void
  onResetPeriod: () => void
  onTestNotification: () => void
  onOpenInventory: () => void
  onSaveSettings: (settings: UserSettings) => void
}) {
  return (
    <div className="p-4 border-t border-border bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {notificationEnabled && notificationPermission === 'granted' ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">推送通知</p>
            <p className="text-xs text-muted-foreground">
              {notificationPermission === 'granted' 
                ? (notificationEnabled ? '已启用' : '已关闭')
                : '需要授权'}
            </p>
          </div>
        </div>
        <Switch 
          checked={notificationEnabled && notificationPermission === 'granted'}
          onCheckedChange={onToggleNotification}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <TimeSettingsDialog settings={settings} onSave={onSaveSettings} />
        <Button variant="outline" size="sm" className="h-10" onClick={onOpenInventory}>
          <Package className="w-4 h-4 mr-1.5" />
          库存管理
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResetPeriod}
          className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <Droplet className="w-4 h-4 mr-1.5" />
          经期第一天
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onTestNotification}
          className="h-10"
        >
          <TestTube className="w-4 h-4 mr-1.5" />
          测试通知
        </Button>
      </div>
    </div>
  )
}

// ==================== Main Component ====================
export default function SupplementReminder() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [isOdd, setIsOdd] = useState(true)
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default')
  const [lastNotifiedHour, setLastNotifiedHour] = useState(-1)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  
  // 🔥 核心修正：完美恢复为【数组类型】的引用管理，彻底消除 undefined 崩溃死机隐患
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Initialize
  useEffect(() => {
    const loaded = loadSettings()
    setSettings(loaded)
    setNotificationEnabled(getNotificationEnabled())
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // 智能无阻滚动
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

  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    
    try {
      new Notification(title, {
        body,
        tag: title,
        requireInteraction: false
      })
    } catch {
      // 捕获权限变化时的潜在小异常
    }
  }, [notificationEnabled])

  const updateDisplay = useCallback(() => {
    if (!settings) return
    
    const now = new Date()
    const newReminders = getReminders(now, settings)
    const period = getPeriodInfo(now, settings)

    setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setCurrentDate(now.toLocaleDateString('zh-CN', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }))
    setIsOdd(isOddDay(now))
    setPeriodInfo(period)

    // 检测推送通知
    newReminders.forEach(reminder => {
      const status = getTimeStatus(reminder.time)
      if (status === 'active') {
        const current = getCurrentTime()
        const diff = current - reminder.time
        const shouldNotify = diff >= -0.033 && diff <= 0.008
        
        if (shouldNotify) {
          const currentHour = now.getHours()
          if (lastNotifiedHour !== currentHour) {
            const supplementList = reminder.items.map(s => s.name).join('、')
            sendNotification(
              `${reminder.label} ${formatTime(reminder.time)}`,
              supplementList
            )
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
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    
    if (confirm(`确定要把今天 (${todayStr}) 设定为新经期的第一天吗？\n系统将以此日期重新推算后续的铁剂期。`)) {
      const newSettings = setPeriodStartDate(settings, today)
      handleSaveSettings(newSettings)
      setLastNotifiedHour(-1)
    }
  }

  const handleTestNotification = () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      alert('请先允许通知权限')
      return
    }
    
    const currentTimeNum = getCurrentTime()
    const targetReminder = reminders.find(r => r.time > currentTimeNum) || reminders[0]
    
    if (targetReminder) {
      const sampleText = targetReminder.items.map(s => s.name).join('、')
      sendNotification(
        `测试通知 - ${targetReminder.label}`,
        `${formatTime(targetReminder.time)} ${sampleText}`
      )
    }
  }

  const handleUpdateInventory = (id: string, change: number) => {
    if (!settings) return
    const newSettings = updateInventory(settings, id, change)
    handleSaveSettings(newSettings)
  }

  const handleConsumeSupplement = (ids: string[]) => {
    if (!settings) return
    const newSettings = consumeSupplements(settings, ids)
    handleSaveSettings(newSettings)
  }

  if (!settings || !periodInfo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse text-sm">精密加载底层逻辑中...</div>
      </main>
    )
  }

  const lowStockSupplements = getLowStockSupplements(settings)

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl shadow-foreground/5 overflow-hidden border border-border">
        {/* Header */}
        <div className="p-6 text-center border-b border-border">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Pill className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">补剂提醒</h1>
          <p className="text-sm text-muted-foreground mt-1">每日4次智能时差排班</p>
        </div>
        
        {/* Time Display */}
        <TimeDisplay time={currentTime} date={currentDate} isOdd={isOdd} />
        
        {/* Period Status */}
        <PeriodStatusCard periodInfo={periodInfo} />
        
        {/* Low Stock Alert */}
        <div className="mt-4">
          <LowStockAlert 
            supplements={lowStockSupplements} 
            onOpenInventory={() => setInventoryOpen(true)} 
          />
        </div>
        
        {/* Reminder Cards */}
        <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
          {reminders.map((reminder, index) => (
            <ReminderCard 
              key={reminder.key} 
              reminder={reminder} 
              index={index}
              onConsume={handleConsumeSupplement}
              cardRef={el => { cardRefs.current[index] = el; }}
            />
          ))}
        </div>
        
        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          notificationEnabled={notificationEnabled}
          notificationPermission={notificationPermission}
          onToggleNotification={handleToggleNotification}
          onResetPeriod={handleResetPeriod}
          onTestNotification={handleTestNotification}
          onSaveSettings={handleSaveSettings}
          onOpenInventory={() => setInventoryOpen(true)}
        />
        
        {/* Inventory Sheet */}
        <InventorySheet 
          settings={settings}
          onUpdateInventory={handleUpdateInventory}
          open={inventoryOpen}
          onOpenChange={setInventoryOpen}
        />
      </div>
    </main>
  )
}