import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Render a DOM element into a single-page PDF, sized to match its aspect ratio.
// We use a tall single page rather than splitting across A4 pages because both
// the scrapbook and Instagram layouts are designed as one continuous spread.
export async function downloadElementAsPdf(el, filename, { background = null } = {}) {
  if (!el) return;
  await waitForImagesIn(el);
  const canvas = await html2canvas(el, {
    backgroundColor: background,
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
    width: el.scrollWidth,
    height: el.scrollHeight,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdfW = 595.28; // A4 width in points
  const pdfH = (canvas.height / canvas.width) * pdfW;
  const pdf = new jsPDF({
    unit: "pt",
    format: [pdfW, pdfH],
    orientation: pdfH > pdfW ? "p" : "l",
  });
  pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
  const safe = (filename || "adventure").replace(/[^a-z0-9]/gi, "_");
  pdf.save(safe + ".pdf");
}

function waitForImagesIn(el) {
  const imgs = Array.from(el.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((r) => {
            img.onload = r;
            img.onerror = r;
          })
    )
  );
}
