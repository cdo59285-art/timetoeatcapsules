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
  Bell, BellOff, Clock, Calendar, Droplet, Sun, Moon, Sparkles, 
  Pill, TestTube, Package, AlertTriangle, Check, 
  Plus, Minus, ChevronRight, Utensils, Dna, Fish, Leaf, Zap, Info, Trash2, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// 1. 底层类型与默认配置 (Types & Defaults)
// ============================================================================
type SupplementItem = {
  id: string; name: string; icon: string; color: string;
  inventory: number; lowStockThreshold: number; dosage: number; description: string;
}

type SlotConfig = { oddDay: string[]; evenDay: string[]; evenDayIronPeriod?: string[] }

type UserSettings = {
  lastPeriodStart: string;
  cycleLength: number;
  periodDuration: number;
  ironDays: number;
  times: { morning: number; lunch: number; evening: number; night: number };
  supplements: SupplementItem[];
  slotSupplements: { morning: SlotConfig; lunch: SlotConfig; evening: SlotConfig; night: SlotConfig };
}

const DEFAULT_SETTINGS: UserSettings = {
  lastPeriodStart: "2026-04-20",
  cycleLength: 39,
  periodDuration: 6,
  ironDays: 14,
  times: { morning: 8.0, lunch: 12.5, evening: 18.5, night: 22.0 },
  supplements: [
    { id: "probiotic", name: "钟根堂益生菌", icon: "dna", color: "bg-teal-500/10 text-teal-600 border-teal-500/20", inventory: 30, lowStockThreshold: 5, dosage: 1, description: "早饭前空腹" },
    { id: "oliveoil", name: "鲜榨橄榄油", icon: "droplet", color: "bg-lime-500/10 text-lime-600 border-lime-500/20", inventory: 30, lowStockThreshold: 5, dosage: 1, description: "1小勺" },
    { id: "silymarin", name: "水飞蓟", icon: "leaf", color: "bg-green-500/10 text-green-600 border-green-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "护肝" },
    { id: "zinc", name: "葡萄糖酸锌", icon: "zap", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "单数日吃" },
    { id: "krill", name: "磷虾油", icon: "fish", color: "bg-rose-500/10 text-rose-600 border-rose-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "双数日随餐" },
    { id: "vitd", name: "维D3+K2", icon: "sun", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "促钙吸收" },
    { id: "calcium", name: "纯柠檬酸钙", icon: "pill", color: "bg-sky-500/10 text-sky-600 border-sky-500/20", inventory: 60, lowStockThreshold: 10, dosage: 1, description: "强绑定D3" },
    { id: "iron", name: "螯合铁", icon: "pill", color: "bg-red-500/10 text-red-600 border-red-500/20", inventory: 30, lowStockThreshold: 5, dosage: 1, description: "经后两周黄金期" },
    { id: "vitc", name: "维生素C", icon: "sparkles", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", inventory: 90, lowStockThreshold: 15, dosage: 1, description: "抗氧化助铁" },
    { id: "magnesium", name: "甘氨酸镁", icon: "moon", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", inventory: 60, lowStockThreshold: 10, dosage: 2, description: "睡前舒缓" }
  ],
  slotSupplements: {
    morning: { oddDay: ["probiotic"], evenDay: ["probiotic"] },
    lunch: { oddDay: ["oliveoil", "silymarin", "zinc"], evenDay: ["krill", "vitd", "calcium", "silymarin"] },
    evening: { oddDay: ["vitc"], evenDay: ["vitc"], evenDayIronPeriod: ["iron", "vitc"] },
    night: { oddDay: ["magnesium"], evenDay: ["magnesium"] }
  }
}

// 鲁棒性加载：将旧版本的对象型时间转换为数字型时间
function normalizeTime(val: any, fallback: number): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) return Object.values(val)[0] as number || fallback;
  return fallback;
}

function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem('supplement_app_v4')
    if (!saved) return DEFAULT_SETTINGS
    const parsed = JSON.parse(saved)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      times: {
        morning: normalizeTime(parsed.times?.morning, 8.0),
        lunch: normalizeTime(parsed.times?.lunch, 12.5),
        evening: normalizeTime(parsed.times?.evening, 18.5),
        night: normalizeTime(parsed.times?.night, 22.0),
      }
    }
  } catch { return DEFAULT_SETTINGS }
}

function saveSettings(settings: UserSettings) {
  if (typeof window !== 'undefined') localStorage.setItem('supplement_app_v4', JSON.stringify(settings))
}

function getCurrentTime(date = new Date()) { return date.getHours() + date.getMinutes() / 60 }
function formatTime(h: number) { return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}` }
function parseTimeString(s: string) { const [h, m] = s.split(':').map(Number); return h + (m || 0) / 60; }
function isOddDay(date: Date) { return date.getDate() % 2 !== 0 }

// ============================================================================
// 2. 核心组件库与主页面 (Main App)
// ============================================================================
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun, moon: Moon, sparkles: Sparkles, droplet: Droplet, pill: Pill, dna: Dna, fish: Fish, leaf: Leaf, zap: Zap, utensils: Utensils, clock: Clock
}
function getIcon(name: string, cn?: string) { const Comp = iconMap[name] || Pill; return <Comp className={cn} /> }

export default function SupplementApp() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [now, setNow] = useState(new Date())
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => { setSettings(loadSettings()) }, [])
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!settings) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse text-sm">唤醒智能中枢...</div>

  // 经期计算
  const diffDays = Math.max(0, Math.floor((now.getTime() - new Date(settings.lastPeriodStart).getTime()) / 86400000))
  const dayInCycle = diffDays % settings.cycleLength
  const inPeriod = dayInCycle < settings.periodDuration
  const afterPeriod = dayInCycle - settings.periodDuration
  const takeIron = !inPeriod && afterPeriod >= 0 && afterPeriod < settings.ironDays
  const daysLeft = settings.cycleLength - dayInCycle

  // 生成提醒列表
  const isOdd = isOddDay(now)
  const getItemsForSlot = (slotKey: keyof UserSettings['slotSupplements']) => {
    let ids: string[] = []
    if (isOdd) ids = settings.slotSupplements[slotKey].oddDay
    else {
      if (slotKey === 'evening' && takeIron && settings.slotSupplements.evening.evenDayIronPeriod) {
        ids = settings.slotSupplements.evening.evenDayIronPeriod
      } else {
        ids = settings.slotSupplements[slotKey].evenDay
      }
    }
    return ids.map(id => settings.supplements.find(s => s.id === id)).filter(Boolean) as SupplementItem[]
  }

  const allReminders = [
    { key: 'morning', label: '早饭前', sublabel: '空腹吸收', time: settings.times.morning, items: getItemsForSlot('morning'), icon: 'sun', warnings: [] },
    { key: 'lunch', label: '中饭后', sublabel: '饱腹抗疲劳', time: settings.times.lunch, items: getItemsForSlot('lunch'), icon: 'utensils', warnings: !isOdd ? ["✨ 完美协同：钙与D3K2已强强绑定，随油脂加倍吸收。"] : [] },
    { key: 'evening', label: '晚饭后', sublabel: '伴随苹果麦片', time: settings.times.evening, items: getItemsForSlot('evening'), icon: 'sparkles', warnings: takeIron && !isOdd ? ["🩸 黄金吃铁日：维C辅助吸收铁剂。"] : [] },
    { key: 'night', label: '睡前', sublabel: '神经舒缓', time: settings.times.night, items: getItemsForSlot('night'), icon: 'moon', warnings: ["💡 完美避让：镁与钙已拉开绝对时差。"] }
  ].map(r => {
    // 经期自动保护：停镁、停钙D3
    if (inPeriod) {
      if (r.key === 'night') r.items = []
      if (r.key === 'lunch') r.items = r.items.filter(i => !['calcium', 'vitd'].includes(i.id))
    }
    return r
  }).filter(r => r.items.length > 0).sort((a, b) => a.time - b.time)

  const handleConsume = (ids: string[]) => {
    const updated = {
      ...settings,
      supplements: settings.supplements.map(s => ids.includes(s.id) ? { ...s, inventory: Math.max(0, s.inventory - (s.dosage || 1)) } : s)
    }
    setSettings(updated); saveSettings(updated);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
        
        {/* Header */}
        <div className="p-5 text-center border-b border-border bg-card">
          <div className="text-4xl font-light tracking-tight tabular-nums mt-2">{formatTime(getCurrentTime(now))}</div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{now.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className={cn("px-2 py-0.5 rounded-full font-medium", isOdd ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600")}>
              {isOdd ? '单数日' : '双数日'}
            </span>
          </div>
        </div>

        {/* 经期智能看板 */}
        <div className={cn("m-4 rounded-xl p-3 border text-xs", 
          inPeriod ? "bg-rose-500/10 border-rose-500/20 text-rose-600" :
          takeIron ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
        )}>
          <p className="font-bold flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5" />
            {inPeriod ? `经期保护中 (第 ${dayInCycle + 1} 天)` : takeIron ? `黄金吃铁期 (第 ${afterPeriod + 1} 天)` : '休整期'}
          </p>
          <p className="opacity-90 mt-1">
            {inPeriod ? '已为您暂停骨骼组(钙镁D3)，降低胃肠负担。' : takeIron ? '系统会在双数日晚间精准推送螯合铁。' : `距下次生理期倒计时：${daysLeft} 天`}
          </p>
        </div>

        {/* 提醒卡片流 */}
        <ScrollArea className="h-[360px] px-4 space-y-3 pb-4">
          {allReminders.map((reminder) => {
            const current = getCurrentTime(now)
            const diff = current - reminder.time
            const isActive = Math.abs(diff) < 0.25
            const isPassed = diff >= 0.25

            return (
              <Card key={reminder.key} className={cn("transition-all border-2 mb-3", isActive && "border-primary bg-primary/5", isPassed && "opacity-50 border-transparent")}>
                <CardContent className="p-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded flex items-center justify-center", isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        {getIcon(reminder.icon, "w-3.5 h-3.5")}
                      </div>
                      <span className="font-bold text-sm">{formatTime(reminder.time)} <span className="font-normal text-muted-foreground text-xs ml-1">({reminder.label})</span></span>
                    </div>
                    {isActive && <Button size="sm" className="h-6 text-[10px]" onClick={() => handleConsume(reminder.items.map(i => i.id))}><Check className="w-3 h-3 mr-1" />已服</Button>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {reminder.items.map(item => (
                      <div key={item.id} className={cn("px-2 py-1 rounded border flex items-center gap-1", item.color)}>
                        <span>{item.name}</span>
                        <span className="opacity-70 text-[10px] font-bold">[{item.dosage}粒/条]</span>
                      </div>
                    ))}
                  </div>

                  {reminder.warnings.map((w, i) => (
                    <p key={i} className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded text-muted-foreground mt-1 flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="scale-95 origin-left">{w}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </ScrollArea>

        {/* 底部高阶控制中心 */}
        <div className="p-4 border-t bg-muted/20">
          <div className="grid grid-cols-2 gap-2">
            
            {/* 时间与周期智能设置 (恢复全配置!) */}
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" className="h-9 text-xs"><Settings className="w-3.5 h-3.5 mr-1" />智能系统设置</Button></DialogTrigger>
              <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle>时间与周期排班调控</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-3 border-r pr-4">
                    <p className="text-xs font-bold text-primary mb-2">每日时间轴</p>
                    {['morning', 'lunch', 'evening', 'night'].map((k, i) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{['早饭前', '中饭后', '晚饭后', '睡前'][i]}</Label>
                        <Input type="time" className="h-7 text-xs" value={formatTime(settings.times[k as keyof typeof settings.times])} 
                          onChange={e => {
                            const t = parseTimeString(e.target.value)
                            const updated = { ...settings, times: { ...settings.times, [k]: t } }
                            setSettings(updated); saveSettings(updated);
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-primary mb-2">生理与停药周期</p>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">完整周期天数 (默认39)</Label>
                      <Input type="number" className="h-7 text-xs" value={settings.cycleLength} onChange={e => {
                        const updated = { ...settings, cycleLength: Number(e.target.value) || 39 }
                        setSettings(updated); saveSettings(updated);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">经期天数 (默认6)</Label>
                      <Input type="number" className="h-7 text-xs" value={settings.periodDuration} onChange={e => {
                        const updated = { ...settings, periodDuration: Number(e.target.value) || 6 }
                        setSettings(updated); saveSettings(updated);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">吃铁黄金天数 (默认14)</Label>
                      <Input type="number" className="h-7 text-xs" value={settings.ironDays} onChange={e => {
                        const updated = { ...settings, ironDays: Number(e.target.value) || 14 }
                        setSettings(updated); saveSettings(updated);
                      }} />
                    </div>
                    <Button size="sm" variant="destructive" className="w-full h-7 text-[10px] mt-2" onClick={() => {
                      if (confirm("确定重置今天为经期第一天吗？")) {
                        const today = new Date(); const d = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
                        const updated = { ...settings, lastPeriodStart: d }; setSettings(updated); saveSettings(updated);
                      }
                    }}>重设今天为经期第1天</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 库存与增删改中心 */}
            <Button variant="outline" className="h-9 text-xs" onClick={() => setInventoryOpen(true)}><Package className="w-3.5 h-3.5 mr-1" />增删与库存</Button>
          </div>
        </div>

        {/* 终极版库存 Sheet (新增补剂、删除、编辑、原生Slider、999输入) */}
        <Sheet open={inventoryOpen} onOpenChange={setInventoryOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col p-4">
            <SheetHeader className="pb-3 border-b mb-3">
              <div className="flex justify-between items-center">
                <SheetTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" />补剂增删与库存管理</SheetTitle>
                <Button size="sm" className="h-7 text-xs" onClick={() => {
                  const newId = 'sup_' + Date.now()
                  const newItem: SupplementItem = { id: newId, name: "新补剂", icon: "pill", color: "bg-zinc-100 text-zinc-700", inventory: 30, lowStockThreshold: 5, dosage: 1, description: "自定义" }
                  // 默认加入午餐排班使其可见
                  const updated = { 
                    ...settings, supplements: [newItem, ...settings.supplements], 
                    slotSupplements: { ...settings.slotSupplements, lunch: { ...settings.slotSupplements.lunch, oddDay: [...settings.slotSupplements.lunch.oddDay, newId], evenDay: [...settings.slotSupplements.lunch.evenDay, newId] } } 
                  }
                  setSettings(updated); saveSettings(updated);
                }}><Plus className="w-3 h-3 mr-1" />新增补剂</Button>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-3 pb-8">
                {settings.supplements.map(s => (
                  <div key={s.id} className="p-3 rounded-xl border bg-card relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => {
                      if (confirm(`彻底删除【${s.name}】？`)) {
                        const updated = { ...settings, supplements: settings.supplements.filter(sup => sup.id !== s.id) }
                        setSettings(updated); saveSettings(updated);
                      }
                    }}><Trash2 className="w-3 h-3" /></Button>
                    
                    <div className="flex gap-2 mb-3 pr-8">
                      <div className="space-y-1 flex-1">
                        <Label className="text-[10px] text-muted-foreground">名称</Label>
                        <Input className="h-7 text-xs font-bold border-transparent bg-muted/30 focus:border-border focus:bg-transparent" value={s.name} onChange={e => {
                          const updated = { ...settings, supplements: settings.supplements.map(sup => sup.id === s.id ? { ...sup, name: e.target.value } : sup) }
                          setSettings(updated); saveSettings(updated);
                        }} />
                      </div>
                      <div className="space-y-1 w-16">
                        <Label className="text-[10px] text-muted-foreground">单次量</Label>
                        <Input type="number" className="h-7 text-xs text-center border-transparent bg-muted/30 focus:border-border" value={s.dosage || 1} onChange={e => {
                          const updated = { ...settings, supplements: settings.supplements.map(sup => sup.id === s.id ? { ...sup, dosage: Math.max(1, Number(e.target.value)) } : sup) }
                          setSettings(updated); saveSettings(updated);
                        }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium w-8">总库存</span>
                      {/* 绝不报错的原生 HTML5 Slider 完美集成 Tailwind */}
                      <input type="range" min="0" max="999" step="1" value={s.inventory} onChange={e => {
                        const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0))
                        const updated = { ...settings, supplements: settings.supplements.map(sup => sup.id === s.id ? { ...sup, inventory: val } : sup) }
                        setSettings(updated); saveSettings(updated);
                      }} className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary" />
                      
                      <Input type="number" max={999} min={0} value={s.inventory} onChange={e => {
                        const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0))
                        const updated = { ...settings, supplements: settings.supplements.map(sup => sup.id === s.id ? { ...sup, inventory: val } : sup) }
                        setSettings(updated); saveSettings(updated);
                      }} className="h-7 w-14 text-center text-xs font-bold tabular-nums" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

      </div>
    </main>
  )
}