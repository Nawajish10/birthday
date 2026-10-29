import * as THREE from "three";

export interface PageContent {
  id: string;
  type: "note" | "photo" | "gallery" | "video" | "song";
  title: string;
  accent: string;
  body: string;
  urdu?: string;
  pageNumber: number;
}

export const DEFAULT_BOOK_PAGE: PageContent = {
  id: "default-page",
  type: "note",
  title: "Happy birthday,",
  accent: "Meerah",
  body: "May your day be full of love, laughter, and everything you deserve.",
  urdu: "سالگرہ مبارک، میرا پیار۔",
  pageNumber: 1,
};

/**
 * Creates a crisp high-res 1024x1440 canvas texture for a book page.
 * Warm ivory paper texture with gold ornamental borders and typography.
 */
export function createPageTexture(
  content?: PageContent,
  isLeft: boolean = false
): THREE.CanvasTexture {
  const safeContent = content || DEFAULT_BOOK_PAGE;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const dummy = new THREE.CanvasTexture(canvas);
    return dummy;
  }

  // 1. Paper Background with subtle warm gradient
  const bg = ctx.createLinearGradient(0, 0, 1024, 1440);
  bg.addColorStop(0, "#fcf8f0");
  bg.addColorStop(0.5, "#f7f0e3");
  bg.addColorStop(1, "#f2e7d5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 1440);

  // 2. Subtle parchment noise / vignette
  const spineGrad = ctx.createLinearGradient(
    isLeft ? 1024 : 0,
    0,
    isLeft ? 920 : 104,
    0
  );
  spineGrad.addColorStop(0, "rgba(70, 50, 30, 0.18)");
  spineGrad.addColorStop(1, "rgba(70, 50, 30, 0)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, 1024, 1440);

  // 3. Delicate antique gold ornamental double border
  ctx.strokeStyle = "rgba(180, 140, 90, 0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, 904, 1320);
  ctx.strokeStyle = "rgba(180, 140, 90, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(75, 75, 874, 1290);

  // Corner ornaments
  ctx.font = "34px serif";
  ctx.fillStyle = "#c27d67";
  ctx.textAlign = "center";
  ctx.fillText("✿", 60, 68);
  ctx.fillText("✿", 964, 68);
  ctx.fillText("✿", 60, 1374);
  ctx.fillText("✿", 964, 1374);

  // 4. Header Kicker
  ctx.font = "600 24px 'DM Sans', sans-serif";
  ctx.fillStyle = "#376e58";
  ctx.textAlign = "center";
  const kicker = isLeft ? "A MOMENT WITH YOU" : `${safeContent.type.toUpperCase()} · A LITTLE GIFT`;
  ctx.fillText(kicker, 512, 160);

  // 5. Title & Accent
  ctx.font = "italic 500 68px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#302c21";
  ctx.fillText(safeContent.title || "Happy birthday,", 512, 270);

  if (safeContent.accent) {
    ctx.font = "italic 400 60px 'Playfair Display', Georgia, serif";
    ctx.fillStyle = "#b6535f";
    ctx.fillText(safeContent.accent, 512, 350);
  }

  // Decorative divider
  ctx.font = "32px serif";
  ctx.fillStyle = "#d88651";
  ctx.fillText("~ ✿ ~", 512, 425);

  // 6. English Body Text
  ctx.font = "400 34px/1.7 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#4a3c31";
  wrapText(ctx, safeContent.body, 512, 530, 720, 56);

  // 7. Urdu Calligraphy Section
  if (safeContent.urdu) {
    ctx.font = "38px 'Noto Naskh Arabic', Tahoma, serif";
    ctx.fillStyle = "#6e4b3b";
    ctx.direction = "rtl";
    wrapText(ctx, safeContent.urdu, 512, 850, 740, 60);
    ctx.direction = "ltr";
  }

  // 8. Page Number
  ctx.font = "500 24px 'DM Sans', sans-serif";
  ctx.fillStyle = "#9c8574";
  ctx.fillText(String(safeContent.pageNumber || 1).padStart(2, "0"), 512, 1330);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string = "",
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  if (!text) return;
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}
