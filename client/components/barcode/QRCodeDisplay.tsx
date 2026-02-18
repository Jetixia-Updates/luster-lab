/**
 * QR Code Display - Compatible with phone cameras
 */

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  className?: string;
}

export function QRCodeDisplay({
  value,
  size = 120,
  level = "M",
  className = "",
}: QRCodeDisplayProps) {
  if (!value) return null;
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level={level}
      includeMargin
      className={className}
    />
  );
}
