"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CountdownConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";

function asConfig(config: unknown): CountdownConfig {
  const c = (config ?? {}) as Partial<CountdownConfig>;
  return {
    label: typeof c.label === "string" ? c.label : "",
    targetDate: typeof c.targetDate === "string" ? c.targetDate : "",
  };
}

/** Parse a date-only string (YYYY-MM-DD) as LOCAL midnight; otherwise defer to Date. */
function parseTarget(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return new Date(s).getTime();
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function CountdownRenderer({ config }: TileRendererProps) {
  const { label, targetDate } = asConfig(config);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetDate) {
    return (
      <p className="text-sm text-muted-foreground">
        Set a target date in this tile&apos;s settings.
      </p>
    );
  }

  const target = parseTarget(targetDate);
  if (Number.isNaN(target)) {
    return <p className="text-sm text-muted-foreground">Invalid date.</p>;
  }

  const diff = target - now;
  const reached = diff <= 0;
  const { days, hours, minutes, seconds } = parts(Math.abs(diff));

  const Unit = ({ value, unit }: { value: number; unit: string }) => (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {unit}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-1 text-center">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex items-end gap-3">
        <Unit value={days} unit="days" />
        <Unit value={hours} unit="hrs" />
        <Unit value={minutes} unit="min" />
        <Unit value={seconds} unit="sec" />
      </div>
      <p className="text-xs text-muted-foreground">
        {reached ? "reached " : "until "}
        {new Date(target).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

function CountdownConfigForm({ value, onChange }: TileConfigFormProps) {
  const cfg = asConfig(value);
  return (
    <div className="grid gap-4">
      <Field label="Label" htmlFor="cd-label" description="What you're counting down to.">
        <Input
          id="cd-label"
          value={cfg.label}
          onChange={(e) => onChange({ ...cfg, label: e.target.value })}
          placeholder="Trip to Banff"
        />
      </Field>
      <Field label="Target date" htmlFor="cd-date">
        <Input
          id="cd-date"
          type="date"
          value={cfg.targetDate}
          onChange={(e) => onChange({ ...cfg, targetDate: e.target.value })}
        />
      </Field>
    </div>
  );
}

export const countdownDef: TileDefinition = {
  type: "countdown",
  label: "Countdown",
  description: "A live countdown to a date you choose.",
  icon: Hourglass,
  defaultTitle: "Countdown",
  defaultConfig: { label: "", targetDate: "" } satisfies CountdownConfig,
  Renderer: CountdownRenderer,
  ConfigForm: CountdownConfigForm,
};
