"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  METRIC_NAME_EVENT,
  METRIC_NAME_STORAGE_KEY,
  readMetricNameMode,
  writeMetricNameMode,
  type MetricNameMode,
} from "@/lib/stats-lab/metricNameMode";

type MetricNameState = {
  mode: MetricNameMode;
  setMode: (mode: MetricNameMode) => void;
};

export const MetricNameContext = createContext<MetricNameState | null>(null);

function useMetricNameState(active: boolean): MetricNameState {
  const [mode, setModeState] = useState<MetricNameMode>("descriptive");

  useEffect(() => {
    if (!active) return;
    setModeState(readMetricNameMode());
    function sync() {
      setModeState(readMetricNameMode());
    }
    function onStorage(event: StorageEvent) {
      if (event.key === METRIC_NAME_STORAGE_KEY) sync();
    }
    window.addEventListener(METRIC_NAME_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(METRIC_NAME_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [active]);

  const setMode = useCallback((next: MetricNameMode) => {
    writeMetricNameMode(next);
    setModeState(next);
    window.dispatchEvent(new CustomEvent(METRIC_NAME_EVENT));
  }, []);

  return { mode, setMode };
}

export function useMetricNameMode(): MetricNameState {
  const ctx = useContext(MetricNameContext);
  const fallback = useMetricNameState(ctx == null);
  return ctx ?? fallback;
}
