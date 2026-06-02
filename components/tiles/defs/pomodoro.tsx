"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PomodoroConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";

function asConfig(config: unknown): Required<PomodoroConfig> {
  const c = (config ?? {}) as Partial<PomodoroConfig>;
  const clamp = (n: unknown, d: number) => {
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) && v >= 1 ? Math.floor(v) : d;
  };
  return { workMin: clamp(c.workMin, 25), breakMin: clamp(c.breakMin, 5) };
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function PomodoroRenderer({ config }: TileRendererProps) {
  const { workMin, breakMin } = asConfig(config);
  const workSec = workMin * 60;
  const breakSec = breakMin * 60;

  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(workSec);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  // Keep the displayed time in sync with config changes while paused.
  useEffect(() => {
    if (!running) setSecondsLeft(mode === "work" ? workSec : breakSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSec, breakSec]);

  // One-second tick while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [running]);

  // Auto-advance work ⇄ break when an interval ends.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (mode === "work") {
      setSessions((n) => n + 1);
      setMode("break");
      setSecondsLeft(breakSec);
    } else {
      setMode("work");
      setSecondsLeft(workSec);
    }
  }, [secondsLeft, mode, workSec, breakSec]);

  function reset() {
    setRunning(false);
    setMode("work");
    setSecondsLeft(workSec);
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        className={
          "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide " +
          (mode === "work"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground")
        }
      >
        {mode === "work" ? "Focus" : "Break"}
      </span>
      <span className="text-4xl font-semibold tabular-nums">
        {fmt(secondsLeft)}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button size="sm" variant="outline" onClick={reset} aria-label="Reset">
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {sessions} focus {sessions === 1 ? "session" : "sessions"} done
      </p>
    </div>
  );
}

function PomodoroConfigForm({ value, onChange }: TileConfigFormProps) {
  const cfg = asConfig(value);
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Focus (min)" htmlFor="pomo-work">
        <Input
          id="pomo-work"
          type="number"
          min={1}
          value={cfg.workMin}
          onChange={(e) => onChange({ ...cfg, workMin: num(e.target.value) })}
        />
      </Field>
      <Field label="Break (min)" htmlFor="pomo-break">
        <Input
          id="pomo-break"
          type="number"
          min={1}
          value={cfg.breakMin}
          onChange={(e) => onChange({ ...cfg, breakMin: num(e.target.value) })}
        />
      </Field>
    </div>
  );
}

export const pomodoroDef: TileDefinition = {
  type: "pomodoro",
  label: "Pomodoro",
  description: "A focus timer with work/break intervals.",
  icon: Timer,
  defaultTitle: "Pomodoro",
  defaultConfig: { workMin: 25, breakMin: 5 } satisfies PomodoroConfig,
  Renderer: PomodoroRenderer,
  ConfigForm: PomodoroConfigForm,
};
