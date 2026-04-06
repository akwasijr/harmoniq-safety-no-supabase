import { cn } from "@/lib/utils";

const COUNTRY_FLAG_URLS: Record<string, string> = {
  US: "https://flagcdn.com/w80/us.png",
  GB: "https://flagcdn.com/w80/gb.png",
  NL: "https://flagcdn.com/w80/nl.png",
  SE: "https://flagcdn.com/w80/se.png",
  DE: "https://flagcdn.com/w80/de.png",
  FR: "https://flagcdn.com/w80/fr.png",
  ES: "https://flagcdn.com/w80/es.png",
};

interface CountryFlagProps {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-5 w-7",
  md: "h-8 w-11",
  lg: "h-10 w-14",
};

export function CountryFlag({ code, size = "md", className }: CountryFlagProps) {
  const url = COUNTRY_FLAG_URLS[code];
  if (!url) return null;

  return (
    <img
      src={url}
      alt={`${code} flag`}
      className={cn(SIZE_CLASSES[size], "rounded-sm object-cover", className)}
      loading="lazy"
      draggable={false}
    />
  );
}
