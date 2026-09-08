export const BRAND = "#D4AF37";

// School-of-magic accent colors (subtle tints within the brand palette).
export const schoolColors: Record<string, string> = {
  Abiurazione: "#4C6B8A",
  Ammaliamento: "#B85C8A",
  Divinazione: "#7A6BA8",
  Evocazione: "#C97A3E",
  Illusione: "#8E5EA8",
  Invocazione: "#C74848",
  Necromanzia: "#5F5F5F",
  Trasmutazione: "#6BA85E",
};

export function schoolColor(scuola: string): string {
  return schoolColors[scuola] ?? BRAND;
}
