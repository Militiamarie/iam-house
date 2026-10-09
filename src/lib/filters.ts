export type GradeSpec = {
  id: string;
  name: string;
  line: string;
  css: string;
  wash?: string;
  blend?: "soft-light" | "screen" | "overlay" | "multiply";
  grain?: boolean;
  scan?: boolean;
  vignette?: boolean;
};

/** Phone-video grades. They sit on the picture. They don’t smear it. */
export const FILTERS: GradeSpec[] = [
  {
    id: "film",
    name: "House Film",
    line: "The grade the booth actually prints.",
    css: "contrast(0.96) saturate(0.9) sepia(0.14) brightness(1.04)",
    wash: "wash-film",
    blend: "soft-light",
    grain: true,
    vignette: true,
  },
  {
    id: "night",
    name: "818 Night",
    line: "Crushed blacks. Street blue.",
    css: "contrast(1.18) saturate(0.7) brightness(0.88)",
    wash: "wash-night",
    blend: "soft-light",
    vignette: true,
  },
  {
    id: "neon",
    name: "Neon",
    line: "Violet on the skin. The sign stays lit.",
    css: "contrast(1.12) saturate(1.45) brightness(1.03)",
    wash: "wash-neon",
    blend: "screen",
  },
  {
    id: "gold",
    name: "Gold Hour",
    line: "Late sun on the block.",
    css: "contrast(1.05) saturate(1.12) sepia(0.32) brightness(1.06)",
    wash: "wash-gold",
    blend: "overlay",
  },
  {
    id: "noir",
    name: "Noir",
    line: "No color. The face does the work.",
    css: "grayscale(1) contrast(1.3) brightness(0.95)",
    vignette: true,
  },
  {
    id: "bleach",
    name: "Bleach",
    line: "Silver highlights. Skin goes pale.",
    css: "contrast(1.35) saturate(0.28) brightness(1.12)",
    wash: "wash-bleach",
    blend: "soft-light",
  },
  {
    id: "vhs",
    name: "VHS",
    line: "Tape wear. The hook still hits.",
    css: "contrast(1.08) saturate(1.3) hue-rotate(-10deg)",
    wash: "wash-vhs",
    blend: "overlay",
    scan: true,
    grain: true,
  },
  {
    id: "concrete",
    name: "Concrete",
    line: "Alley gray. A little green in the mortar.",
    css: "contrast(1.16) saturate(0.5) brightness(0.94) hue-rotate(28deg)",
    wash: "wash-concrete",
    blend: "multiply",
  },
  {
    id: "blood",
    name: "Blood Moon",
    line: "Red in the shadows.",
    css: "contrast(1.2) saturate(1.25) hue-rotate(-16deg) brightness(0.92)",
    wash: "wash-blood",
    blend: "multiply",
    vignette: true,
  },
  {
    id: "clean",
    name: "Clean",
    line: "Nothing on the picture.",
    css: "none",
  },
];

export type FilterId = (typeof FILTERS)[number]["id"];

export function gradeById(id: string): GradeSpec {
  return FILTERS.find((item) => item.id === id) ?? FILTERS[0]!;
}
