"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// `dot` is the light-mode swatch color; the actual tokens live in globals.css.
const ACCENTS = [
  { key: "green", label: "Green", dot: "oklch(0.52 0.13 159)" },
  { key: "blue", label: "Blue", dot: "oklch(0.55 0.17 256)" },
  { key: "violet", label: "Violet", dot: "oklch(0.55 0.20 292)" },
  { key: "rose", label: "Rose", dot: "oklch(0.55 0.19 12)" },
  { key: "teal", label: "Teal", dot: "oklch(0.52 0.10 185)" },
  { key: "orange", label: "Orange", dot: "oklch(0.55 0.16 50)" },
] as const;

function applyAccent(key: string) {
  const el = document.documentElement;
  if (key === "green") el.removeAttribute("data-accent");
  else el.setAttribute("data-accent", key);
  try {
    localStorage.setItem("accent", key);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export function AccentPicker() {
  const [current, setCurrent] = useState("green");

  useEffect(() => {
    try {
      setCurrent(localStorage.getItem("accent") || "green");
    } catch {
      // ignore
    }
  }, []);

  function pick(key: string) {
    applyAccent(key);
    setCurrent(key);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Accent color" />}
      >
        <Palette className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Accent color</DropdownMenuLabel>
        {ACCENTS.map((a) => (
          <DropdownMenuItem key={a.key} onClick={() => pick(a.key)}>
            <span
              className="size-3.5 rounded-full ring-1 ring-foreground/15"
              style={{ backgroundColor: a.dot }}
            />
            {a.label}
            {current === a.key && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
