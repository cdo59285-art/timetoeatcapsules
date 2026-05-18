"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format, isAfter, setHours, setMinutes } from "date-fns"
import { Pill, Droplet, Check, Settings, Package, Undo2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// 补剂配置类型
type Supplement = { id: string; name: string; dosage: number; inventory: number }

export default function SupplementApp() {
  const [inPeriod, setInPeriod] = useState(false)
  const [consumedToday, setConsumedToday] = useState<string[]>([]) // 格式: "slotId_date"
  const [supplements, setSupplements] = useState<Supplement[]>([
    { id: "probiotic", name: "益生菌", dosage: 1, inventory: 30 },
    { id: "iron", name: "螯合铁", dosage: 1, inventory: 30 },
    { id: "magnesium", name: "甘氨酸镁", dosage: 2, inventory: 60 }
  ])

  const timeSlots = [
    { id: 'morning', time: "08:00", label: '早饭前' },
    { id: 'lunch', time: "12:30", label: '中饭后' },
    { id: 'evening', time: "18:30", label: '晚饭后' },
    { id: 'night', time: "22:00", label: '睡前' },
  ]

  const now = new Date()
  const todayStr = format(now, "yyyy-MM-dd")

  // 核心过滤：只展示当前时间之后的时间段
  const availableSlots = useMemo(() => {
    return timeSlots.filter(slot => {
      const [h, m] = slot.time.split(':').map(Number)
      return isAfter(setMinutes(setHours(now, h), m), now)
    })
  }, [now])

  // 处理服药与撤回（防误点）
  const toggleConsume = (slotId: string) => {
    const key = `${slotId}_${todayStr}`
    setConsumedToday(prev => {
      if (prev.includes(key)) {
        // 撤回逻辑：归还库存
        setSupplements(s => s.map(item => ({ ...item, inventory: item.inventory + 1 })))
        return prev.filter(k => k !== key)
      } else {
        // 服药逻辑：扣减库存
        setSupplements(s => s.map(item => ({ ...item, inventory: Math.max(0, item.inventory - 1) })))
        return [...prev, key]
      }
    })
  }

  return (
    <main className="max-w-md mx-auto p-4 bg-zinc-50 min-h-screen pb-20">
      {/* 状态控制区 */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Button 
          variant={inPeriod ? "destructive" : "default"}
          className="h-14 flex flex-col items-center justify-center"
          onClick={() => {
            setInPeriod(!inPeriod)
            // 切换经期时，清空当前时段记录以防止冲突
            setConsumedToday([]) 
          }}
        >
          <Droplet className="w-5 h-5 mb-1" />
          <span className="text-xs">{inPeriod ? "结束生理期模式" : "开启生理期模式"}</span>
        </Button>
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center">
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-xs">智能排班配置</span>
        </Button>
      </div>

      {/* 动态时间流 */}
      <div className="space-y-4">
        {availableSlots.map(slot => {
          const isConsumed = consumedToday.includes(`${slot.id}_${todayStr}`)
          // 经期模式自动屏蔽某些药品
          if (inPeriod && slot.id === 'night') return null 

          return (
            <Card key={slot.id} className={cn("transition-all", isConsumed ? "bg-emerald-50 border-emerald-200" : "bg-white")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-wider">{slot.time} • {slot.label}</p>
                  <p className="font-semibold text-sm">待服：{slot.id === 'morning' ? '益生菌' : '日常补剂'}</p>
                </div>
                <Button 
                  size="sm" 
                  variant={isConsumed ? "ghost" : "default"} 
                  onClick={() => toggleConsume(slot.id)}
                >
                  {isConsumed ? <><Undo2 className="w-4 h-4 mr-2"/>撤销</> : <><Check className="w-4 h-4 mr-2"/>已服</>}
                </Button>
              </CardContent>
            </Card>
          )
        })}
        
        {availableSlots.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            今日补剂已全部完成，辛苦啦！✨
          </div>
        )}
      </div>

      {/* 库存悬浮 */}
      <div className="fixed bottom-6 right-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full shadow-xl bg-primary"><Package /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>当前库存</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-4">
              {supplements.map(s => (
                <div key={s.id} className="flex justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <span>{s.name}</span>
                  <span className="font-bold">{s.inventory} 粒</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}