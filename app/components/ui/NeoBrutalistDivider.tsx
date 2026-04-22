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
      <line x1="6" y1="20" x2="6" y2="6" stroke="black" strokeWidth={stroke} />
      <line x1="6" y1="6" x2="20" y2="6" stroke="black" strokeWidth={stroke} />

      <line
        x1="42"
        y1="20"
        x2="42"
        y2="6"
        stroke="black"
        strokeWidth={stroke}
      />
      <line x1="42" y1="6" x2="28" y2="6" stroke="black" strokeWidth={stroke} />

      <line x1="6" y1="28" x2="6" y2="42" stroke="black" strokeWidth={stroke} />
      <line
        x1="6"
        y1="42"
        x2="20"
        y2="42"
        stroke="black"
        strokeWidth={stroke}
      />

      <line
        x1="42"
        y1="28"
        x2="42"
        y2="42"
        stroke="black"
        strokeWidth={stroke}
      />
      <line
        x1="42"
        y1="42"
        x2="28"
        y2="42"
        stroke="black"
        strokeWidth={stroke}
      />
      <circle cx="24" cy="24" r="2" fill="black" />
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
