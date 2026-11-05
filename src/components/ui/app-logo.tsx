"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export interface AppLogoProps {
  /** Override URL logo khusus */
  logoUrl?: string | null;
  /** Override nama teks */
  name?: string;
  /** Ukuran logo: sm, md, lg */
  size?: "sm" | "md" | "lg";
  /** Menampilkan teks nama sistem atau hanya icon */
  showText?: boolean;
  /** Bungkus dengan tag Link menuju ke '/' */
  href?: string | null;
  /** ClassName kontainer */
  className?: string;
  /** ClassName teks */
  textClassName?: string;
  /** Subtitle atau badge kecil di bawah nama */
  subtitle?: string | null;
}

export function AppLogo({
  logoUrl = siteConfig.logoUrl,
  name = siteConfig.name,
  size = "md",
  showText = true,
  href = "/",
  className,
  textClassName,
  subtitle,
}: AppLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const textSizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const hasCustomImage = Boolean(logoUrl) && !imageError;

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Icon / Image Container */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
          sizeClasses[size]
        )}
      >
        {hasCustomImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl!}
            alt={name}
            onError={() => setImageError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          /* Default Modern Blue Emblem SVG */
          <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 shadow-sm shadow-blue-900/20 text-white">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[60%] w-[60%] drop-shadow-sm"
            >
              {/* Modern geometric W glyph */}
              <path
                d="M5 8L10 24L16 13L22 24L27 8"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="7" r="2" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
        )}
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              textSizeClasses[size],
              textClassName
            )}
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {name}
          </span>
          {subtitle && (
            <span className="mt-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-90 inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

