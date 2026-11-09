// Kenyan-shilling coin icon for Lipa Mdogo Mdogo. Drop-in replacement for a
// lucide icon: sized by className (h-*/w-*) and coloured by currentColor.
import React from 'react';

export default function KshIcon({ className = 'h-5 w-5', strokeWidth = 1.75, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="12" cy="12" r="10.75" />
      <text
        x="12"
        y="12"
        dy="0.36em"
        textAnchor="middle"
        fontFamily="Inter, 'Segoe UI', Roboto, Arial, sans-serif"
        fontSize="10.2"
        fontWeight="800"
        letterSpacing="-0.6"
        fill="currentColor"
        stroke="none"
      >
        KSh
      </text>
    </svg>
  );
}
