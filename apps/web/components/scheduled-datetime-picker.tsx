"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { CalendarIcon } from "lucide-react";

/** "YYYY-MM-DDTHH:mm" ↔ Date 변환 */
function parseLocal(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatForInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(s: string): string {
  const d = parseLocal(s);
  if (!d) return "선택 안 함";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45]; // 0, 15, 30, 45분 단위

type ScheduledDateTimePickerProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  "aria-label"?: string;
};

export function ScheduledDateTimePicker({
  name,
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
}: ScheduledDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const initial = parseLocal(value);
  const [date, setDate] = useState<Date | undefined>(initial ?? undefined);
  const [hour, setHour] = useState<number>(
    initial ? initial.getHours() : new Date().getHours(),
  );
  const [minute, setMinute] = useState<number>(
    initial ? initial.getMinutes() : 0,
  );

  useEffect(() => {
    const d = parseLocal(value);
    setDate(d ?? undefined);
    if (d) {
      setHour(d.getHours());
      setMinute(d.getMinutes());
    }
  }, [value]);

  const apply = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const baseDate = date ?? new Date();
    const d = new Date(baseDate);
    d.setHours(hour, minute, 0, 0);
    onChange(formatForInput(d));
    setOpen(false);
  };

  const clear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onChange("");
    setOpen(false);
  };

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="min-h-[36px] w-full justify-start text-left font-normal"
            aria-label={ariaLabel}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-50" />
            <span className={value ? "text-foreground" : "text-muted-foreground"}>
              {formatDisplay(value)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d)}
              defaultMonth={date ?? new Date()}
              disabled={(d) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d < today;
              }}
              initialFocus
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">시각</span>
              <Select
                value={String(hour)}
                onValueChange={(v) => setHour(Number(v))}
              >
                <SelectTrigger className="h-8 w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}시
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(minute)}
                onValueChange={(v) => setMinute(Number(v))}
              >
                <SelectTrigger className="h-8 w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => clear(e)}
                >
                  지우기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => apply(e)}
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
