"use client";

import { useEffect } from "react";
import { captureAttribution } from "../_lib/attribution";

/** Mount once in the root layout to record first-touch UTM/referrer. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
