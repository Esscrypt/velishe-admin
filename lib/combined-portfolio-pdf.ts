import jsPDF from "jspdf";
import type { ModelStats } from "@/lib/db/schema";

export interface ModelForPdf {
  name: string;
  slug: string;
  stats: ModelStats;
  featuredImage?: string;
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const PDF_MARGIN_X_MM = 14;
const PDF_MARGIN_TOP_MM = 10;
const PDF_MARGIN_BOTTOM_MM = 12;
const PDF_HEADER_HEIGHT_MM = 20;
const JPEG_QUALITY = 0.92;

const GRID_COLS = 3;
const GRID_ROWS = 2;
const MODELS_PER_PAGE = GRID_COLS * GRID_ROWS;
const COL_GAP_MM = 8;
const ROW_GAP_MM = 10;
const CELL_TEXT_HEIGHT_MM = 16;

async function loadImageAsDataUrl(src: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch (err) {
        console.error("[combined-portfolio-pdf] Failed to rasterize image:", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitInBox(
  imgWidth: number,
  imgHeight: number,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(boxWidth / imgWidth, boxHeight / imgHeight);
  return { width: imgWidth * ratio, height: imgHeight * ratio };
}

function buildStatsLines(stats: ModelStats): { primary: string; secondary: string } {
  const sep = "  •  ";
  const primaryParts: string[] = [];
  if (stats.height) primaryParts.push(`Height ${stats.height}`);
  if (stats.bust) primaryParts.push(`Bust ${stats.bust}`);
  if (stats.waist) primaryParts.push(`Waist ${stats.waist}`);

  const secondaryParts: string[] = [];
  if (stats.hips) secondaryParts.push(`Hips ${stats.hips}`);
  if (stats.shoeSize) secondaryParts.push(`Shoe ${stats.shoeSize}`);
  if (stats.hairColor) secondaryParts.push(`Hair ${stats.hairColor}`);
  if (stats.eyeColor) secondaryParts.push(`Eyes ${stats.eyeColor}`);

  return { primary: primaryParts.join(sep), secondary: secondaryParts.join(sep) };
}

function renderHeader(pdf: jsPDF, pageWidth: number): void {
  const centerX = pageWidth / 2;
  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.setTextColor(20);
  pdf.text("V È L I S H E", centerX, PDF_MARGIN_TOP_MM + 9, {
    align: "center",
    charSpace: 1.4,
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(80);
  pdf.text("M G M T", centerX, PDF_MARGIN_TOP_MM + 15, {
    align: "center",
    charSpace: 2.2,
  });
}

function renderCell(
  pdf: jsPDF,
  model: ModelForPdf,
  image: LoadedImage | null,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
): void {
  const imageBoxHeight = cellHeight - CELL_TEXT_HEIGHT_MM;
  const centerX = cellX + cellWidth / 2;

  if (image) {
    const { width, height } = fitInBox(image.width, image.height, cellWidth, imageBoxHeight);
    const x = cellX + (cellWidth - width) / 2;
    const y = cellY + (imageBoxHeight - height);
    pdf.addImage(image.dataUrl, "JPEG", x, y, width, height, undefined, "FAST");
  }

  const nameY = cellY + imageBoxHeight + 5;
  pdf.setFont("times", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.text(model.name, centerX, nameY, { align: "center" });

  const { primary, secondary } = buildStatsLines(model.stats);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(70);
  pdf.text(primary, centerX, nameY + 4.5, { align: "center" });
  pdf.text(secondary, centerX, nameY + 8.5, { align: "center" });
}

export async function generateCombinedPortfolioPdf(
  models: ModelForPdf[],
): Promise<void> {
  if (models.length === 0) return;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentTop = PDF_MARGIN_TOP_MM + PDF_HEADER_HEIGHT_MM;
  const contentWidth = pageWidth - PDF_MARGIN_X_MM * 2;
  const contentHeight = pageHeight - contentTop - PDF_MARGIN_BOTTOM_MM;
  const cellWidth = (contentWidth - COL_GAP_MM * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = (contentHeight - ROW_GAP_MM * (GRID_ROWS - 1)) / GRID_ROWS;

  const loadedImages = await Promise.all(
    models.map((model) =>
      model.featuredImage ? loadImageAsDataUrl(model.featuredImage) : Promise.resolve(null),
    ),
  );

  for (let i = 0; i < models.length; i += 1) {
    const positionInPage = i % MODELS_PER_PAGE;
    if (i > 0 && positionInPage === 0) pdf.addPage();
    if (positionInPage === 0) renderHeader(pdf, pageWidth);

    const col = positionInPage % GRID_COLS;
    const row = Math.floor(positionInPage / GRID_COLS);
    const cellX = PDF_MARGIN_X_MM + col * (cellWidth + COL_GAP_MM);
    const cellY = contentTop + row * (cellHeight + ROW_GAP_MM);

    renderCell(pdf, models[i], loadedImages[i], cellX, cellY, cellWidth, cellHeight);
  }

  pdf.save("velishe-portfolio.pdf");
}
