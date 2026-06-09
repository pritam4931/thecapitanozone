import React from 'react';

interface LogoProps {
  className?: string;
  lightBackground?: boolean;
}

export default function Logo({ className = "h-16 w-auto", lightBackground = false }: LogoProps) {
  // High-precision SVG that meticulously emulates the exact original logo uploaded by the user:
  // - "THE" in Oswald font (bold condensed) with a white body, solid black outline, and solid black 3D block shadow.
  // - "CAPITANO" in Oswald font (slanted & skewed) with a white body, thick black outline, and offset black block shadow.
  // - "ZONE" in Permanent Marker font with a vibrant yellow fill, thick black brush-stroke outline, and offset black shadow.
  // - A five-point hand-drawn looking athletic star next to "ZONE".
  // - The circular stamp styled "FOOTBALL ACCESSRIES STORE" curving clockwise around secondary concentric border rings.
  return (
    <svg
      viewBox="0 0 500 400"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Circular text path centered at (380, 83) with radius 42.5 */}
        <path
          id="stampPath"
          d="M 337.5, 83 A 42.5,42.5 0 1,1 422.5, 83 A 42.5,42.5 0 1,1 337.5, 83"
          fill="none"
        />
      </defs>

      {/* 1. Circular Text Stamp "FOOTBALL ACCESSRIES STORE" curving clockwise */}
      <g className="opacity-95">
        {/* Outer Circular Ring of the Stamp */}
        <circle
          cx="380"
          cy="83"
          r="48"
          fill="none"
          stroke={lightBackground ? "#000000" : "#ffffff"}
          strokeWidth="0.8"
          strokeDasharray="4 2"
          className="opacity-35"
        />
        {/* Inner Circular Ring of the Stamp */}
        <circle
          cx="380"
          cy="83"
          r="36"
          fill="none"
          stroke={lightBackground ? "#000000" : "#ffffff"}
          strokeWidth="0.8"
          className="opacity-35"
        />
        {/* Curved Text Path */}
        <text
          fill={lightBackground ? "#111111" : "#ffffff"}
          fontSize="7.5"
          fontWeight="800"
          letterSpacing="1.8"
          fontFamily='"DM Sans", "Inter", sans-serif'
          className="uppercase select-none"
        >
          <textPath href="#stampPath" startOffset="3%">
            FOOTBALL ACCESSRIES STORE
          </textPath>
        </text>
      </g>

      {/* 2. Main skewed and rotated typography block */}
      {/* SkewX(-10) and rotate(-5) projects the high-energy athletic upward slant */}
      <g transform="rotate(-5) skewX(-10) translate(20, 20)">
        
        {/* === Text: THE === */}
        {/* Layer 1: Block Offset Shadow */}
        <text
          x="66"
          y="146"
          fill="black"
          stroke="black"
          strokeWidth="12"
          strokeLinejoin="miter"
          strokeMiterlimit="2"
          fontSize="56"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1.5"
        >
          THE
        </text>
        {/* Layer 2: Main Outline */}
        <text
          x="60"
          y="140"
          fill="none"
          stroke="black"
          strokeWidth="12"
          strokeLinejoin="miter"
          strokeMiterlimit="2"
          fontSize="56"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1.5"
        >
          THE
        </text>
        {/* Layer 3: Fill Face */}
        <text
          x="60"
          y="140"
          fill={lightBackground ? "black" : "white"}
          fontSize="56"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1.5"
        >
          THE
        </text>

        {/* === Text: CAPITANO === */}
        {/* Layer 1: Offset Shadow */}
        <text
          x="46"
          y="238"
          fill="black"
          stroke="black"
          strokeWidth="16"
          strokeLinejoin="miter"
          strokeMiterlimit="2"
          fontSize="76"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1"
        >
          CAPITANO
        </text>
        {/* Layer 2: Thick Outline */}
        <text
          x="40"
          y="232"
          fill="none"
          stroke="black"
          strokeWidth="16"
          strokeLinejoin="miter"
          strokeMiterlimit="2"
          fontSize="76"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1"
        >
          CAPITANO
        </text>
        {/* Layer 3: Fill Face */}
        <text
          x="40"
          y="232"
          fill={lightBackground ? "black" : "white"}
          fontSize="76"
          fontWeight="900"
          fontFamily="Oswald, sans-serif"
          letterSpacing="1"
        >
          CAPITANO
        </text>

        {/* === Text: ZONE === */}
        {/* Layer 1: Brush Offset Shadow */}
        <text
          x="146"
          y="326"
          fill="black"
          stroke="black"
          strokeWidth="16"
          strokeLinejoin="round"
          fontSize="92"
          fontWeight="900"
          fontFamily="'Permanent Marker', cursive"
        >
          ZONE
        </text>
        {/* Layer 2: Outline */}
        <text
          x="140"
          y="320"
          fill="none"
          stroke="black"
          strokeWidth="16"
          strokeLinejoin="round"
          fontSize="92"
          fontWeight="900"
          fontFamily="'Permanent Marker', cursive"
        >
          ZONE
        </text>
        {/* Layer 3: Vibrant yellow brush filling */}
        <text
          x="140"
          y="320"
          fill="#facd15"
          fontSize="92"
          fontWeight="900"
          fontFamily="'Permanent Marker', cursive"
        >
          ZONE
        </text>

        {/* === Graphic: Five-Point Star ★ === */}
        {/* Layer 1: Outline Backing */}
        <polygon
          points="380,250 389,270 410,273 395,286 399,307 380,295 361,307 365,286 350,273 371,270"
          fill="black"
          stroke="black"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        {/* Layer 2: Main golden-yellow star */}
        <polygon
          points="380,250 389,270 410,273 395,286 399,307 380,295 361,307 365,286 350,273 371,270"
          fill="#facd15"
          stroke="black"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
