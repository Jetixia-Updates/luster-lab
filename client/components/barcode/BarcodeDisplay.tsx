/**
 * Barcode Display - Code128 compatible with all scanners
 * Uses JsBarcode for standard Code128 encoding
 */

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  format?: "CODE128" | "EAN13" | "EAN8";
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
}

export function BarcodeDisplay({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  fontSize = 14,
  className = "",
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          fontSize,
          margin: 5,
          displayValue: true,
        });
      } catch (e) {
        console.warn("Barcode error:", e);
      }
    }
  }, [value, format, width, height, fontSize]);

  if (!value) return null;
  return <svg ref={svgRef} className={className} />;
}
