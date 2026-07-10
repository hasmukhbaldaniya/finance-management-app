import { PDFDocument } from "pdf-lib";

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer);
  return doc.getPageCount();
}

// Extracts one or more 1-indexed pages into a standalone PDF — used both to
// send a single page to the AI/ML service (023's "single PDF page" unit,
// sent as a native PDF document rather than rasterized to an image) and to
// combine several pages for Merge.
export async function extractPdfPages(buffer: Buffer, pageNumbers: number[]): Promise<Buffer> {
  const source = await PDFDocument.load(buffer);
  const target = await PDFDocument.create();
  const copiedPages = await target.copyPages(
    source,
    pageNumbers.map((pageNumber) => pageNumber - 1)
  );
  copiedPages.forEach((page) => target.addPage(page));
  return Buffer.from(await target.save());
}
