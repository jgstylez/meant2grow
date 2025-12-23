import React from "react";

interface LogoProps {
  className?: string;
  title?: string;
}

/**
 * Brand mark: a “mentorship bridge” shaped like an M (mentor ↔ mentee),
 * with a growth leaf at the apex. Designed to be distinctive but still clean.
 */
export const Logo: React.FC<LogoProps> = ({
  className = "w-8 h-8",
  title = "Meant2Grow",
}) => (
  <svg
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
  >
    <defs>
      {/* Flat mark: no gradients or shadows for a cleaner, more modern logo */}
    </defs>

    {/* Badge */}
    <rect x="5" y="5" width="38" height="38" rx="13" fill="#10B981" />
    <rect
      x="7.5"
      y="7.5"
      width="33"
      height="33"
      rx="11"
      fill="none"
      stroke="rgba(255,255,255,0.22)"
      strokeWidth="1.5"
    />

    {/* Clean monoline “M” (mentorship bridge) */}
    <path
      d="M14 33
         V18
         L24 29
         L34 18
         V33"
      fill="none"
      stroke="white"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.98"
    />

    {/* Flat growth leaf at apex */}
    <path
      d="M24 12.6
         C21.4 12.9 19.8 15.1 19.9 17.1
         C21.9 17.0 23.8 15.3 24 12.6Z
         M24 12.6
         C26.6 12.9 28.2 15.1 28.1 17.1
         C26.1 17.0 24.2 15.3 24 12.6Z"
      fill="white"
      opacity="0.92"
    />
    <path
      d="M24 13.3 V17.8"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);
