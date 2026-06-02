"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Cloudy,
  Loader2,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WeatherConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";

function asConfig(config: unknown): WeatherConfig {
  const c = (config ?? {}) as Partial<WeatherConfig>;
  return {
    place: typeof c.place === "string" ? c.place : "",
    lat: typeof c.lat === "number" ? c.lat : undefined,
    lon: typeof c.lon === "number" ? c.lon : undefined,
    unit: c.unit === "fahrenheit" ? "fahrenheit" : "celsius",
  };
}

/** Map a WMO weather code to a label + icon. */
function wmo(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code === 1 || code === 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Overcast", Icon: Cloudy };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code >= 61 && code <= 65) return { label: "Rain", Icon: CloudRain };
  if (code === 66 || code === 67)
    return { label: "Freezing rain", Icon: CloudRainWind };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { label: "Snow", Icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code >= 95) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Cloudy", Icon: Cloud };
}

type Forecast = {
  current?: { temperature_2m: number; weather_code: number };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

function WeatherRenderer({ config, refreshNonce }: TileRendererProps) {
  const { place, lat, lon, unit } = asConfig(config);
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    data?: Forecast;
  }>({ loading: lat != null });

  useEffect(() => {
    if (lat == null || lon == null) {
      setState({ loading: false });
      return;
    }
    let active = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=4&temperature_unit=${unit}`;
    fetch(url)
      .then((r) => r.json())
      .then((json: Forecast) => {
        if (active) setState({ loading: false, data: json });
      })
      .catch(() => {
        if (active) setState({ loading: false, error: "Couldn't load weather." });
      });
    return () => {
      active = false;
    };
  }, [lat, lon, unit, refreshNonce]);

  if (lat == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Set a location in this tile&apos;s settings.
      </p>
    );
  }
  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  }
  if (state.error || !state.data?.current || !state.data.daily) {
    return (
      <p className="text-sm text-muted-foreground">
        {state.error ?? "No weather data."}
      </p>
    );
  }

  const deg = unit === "fahrenheit" ? "°F" : "°C";
  const cur = wmo(state.data.current.weather_code);
  const d = state.data.daily;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <cur.Icon className="size-9 text-primary" />
        <div className="min-w-0">
          <div className="text-2xl font-semibold tabular-nums">
            {Math.round(state.data.current.temperature_2m)}
            {deg}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {cur.label}
            {place ? ` · ${place}` : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {d.time.slice(0, 4).map((t, i) => {
          const w = wmo(d.weather_code[i]);
          return (
            <div key={t} className="rounded-md bg-muted/40 p-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">
                {new Date(t).toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <w.Icon className="mx-auto my-0.5 size-4 text-muted-foreground" />
              <div className="text-[11px] tabular-nums">
                {Math.round(d.temperature_2m_max[i])}°
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {Math.round(d.temperature_2m_min[i])}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherConfigForm({ value, onChange }: TileConfigFormProps) {
  const cfg = asConfig(value);
  const [query, setQuery] = useState(cfg.place ?? "");
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setErr(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q,
        )}&count=1&language=en&format=json`,
      );
      const json = await res.json();
      const hit = json?.results?.[0];
      if (!hit) {
        setErr("No match found.");
        return;
      }
      const place = [hit.name, hit.admin1, hit.country_code]
        .filter(Boolean)
        .join(", ");
      onChange({ ...cfg, place, lat: hit.latitude, lon: hit.longitude });
    } catch {
      setErr("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Field
        label="Location"
        description={
          cfg.lat != null ? `Set to ${cfg.place}` : "Search for a city."
        }
      >
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Calgary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={search}
            disabled={searching}
          >
            {searching ? "…" : "Search"}
          </Button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </Field>
      <Field label="Units">
        <Select
          value={cfg.unit}
          onValueChange={(v) =>
            v && onChange({ ...cfg, unit: v as "celsius" | "fahrenheit" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string | null) =>
                v === "fahrenheit" ? "Fahrenheit (°F)" : "Celsius (°C)"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="celsius">Celsius (°C)</SelectItem>
            <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export const weatherDef: TileDefinition = {
  type: "weather",
  label: "Weather",
  description: "Current conditions and a short forecast for a place.",
  icon: CloudSun,
  defaultTitle: "Weather",
  defaultConfig: { unit: "celsius" } satisfies WeatherConfig,
  refreshable: true,
  Renderer: WeatherRenderer,
  ConfigForm: WeatherConfigForm,
};
