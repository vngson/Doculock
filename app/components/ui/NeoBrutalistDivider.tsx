import React from "react";

interface NeoBrutalistDividerProps {
  size?: number;
}

export function CrosshairIcon({ size = 32, stroke = 2 }) {
  return (
    <svg
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <circle
    cx="24"
    cy="24"
    r="18"
    stroke="black"
    strokeWidth={stroke}
  />

  <line
    x1="24"
    y1="-20"
    x2="24"
    y2="78"
    stroke="black"
    strokeWidth={stroke}
    strokeLinecap="round"
  />

  <line
    x1="-20"
    y1="24"
    x2="78"
    y2="24"
    stroke="black"
    strokeWidth={stroke}
    strokeLinecap="round"
  />
</svg>
  );
}

export default function NeoBrutalistDivider({
  size = 28,
}: NeoBrutalistDividerProps) {
  return (
    <div className="neo-brutalist-divider">
      {/* Icon Trái */}
      <div className="icon-box left">
        <CrosshairIcon size={size} />
      </div>

      {/* Đường kẻ */}
      <div className="divider-line" />

      {/* Icon Phải */}
      <div className="icon-box right">
        <CrosshairIcon size={size} />
      </div>
    </div>
  );
}
