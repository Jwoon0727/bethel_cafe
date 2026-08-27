import type { MenuTemp } from "@/lib/menu";

type TempBadgeProps = {
  temp: MenuTemp;
  size?: "sm" | "lg";
};

export function TempBadge({ temp, size = "sm" }: TempBadgeProps) {
  const isHot = temp === "HOT";
  return (
    <span
      className={`inline-block rounded-full font-bold text-white ${
        isHot ? "bg-red-500" : "bg-blue-500"
      } ${size === "lg" ? "px-4 py-1 text-base" : "px-2.5 py-0.5 text-xs"}`}
    >
      {temp}
    </span>
  );
}
