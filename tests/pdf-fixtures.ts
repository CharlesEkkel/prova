// Small PDFs made on the spot, so no binary is kept in the repository.

/** A valid PDF of this many pages, each saying "Page n" in large type, so a viewer has something to draw. */
export const samplePdf = (pages: number): Uint8Array<ArrayBuffer> => {
  const count = Math.max(1, pages);
  const fontNumber = 3 + count * 2;
  const pageNumbers = Array.from({ length: count }, (_, index) => 3 + index * 2);
  const objects: readonly string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n.toString()} 0 R`).join(' ')}] /Count ${count.toString()} >>`,
    ...pageNumbers.flatMap((number, index) => {
      const text = `BT /F1 72 Tf 60 400 Td (Page ${(index + 1).toString()}) Tj ET`;
      return [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${(number + 1).toString()} 0 R /Resources << /Font << /F1 ${fontNumber.toString()} 0 R >> >> >>`,
        `<< /Length ${text.length.toString()} >>\nstream\n${text}\nendstream`,
      ];
    }),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const header = '%PDF-1.4\n';
  const body = objects.reduce<{ readonly text: string; readonly offsets: readonly number[] }>(
    (so_far, object, index) => ({
      text: `${so_far.text}${(index + 1).toString()} 0 obj\n${object}\nendobj\n`,
      offsets: [...so_far.offsets, so_far.text.length],
    }),
    { text: header, offsets: [] },
  );
  const xrefAt = body.text.length;
  const xref = [
    `xref\n0 ${(objects.length + 1).toString()}\n0000000000 65535 f \n`,
    ...body.offsets.map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`),
  ].join('');
  const trailer = `trailer\n<< /Size ${(objects.length + 1).toString()} /Root 1 0 R >>\nstartxref\n${xrefAt.toString()}\n%%EOF\n`;
  return new TextEncoder().encode(`${body.text}${xref}${trailer}`);
};

/** Bytes of exactly this size that start like a PDF, for testing a size limit. The bucket checks only the declared type. */
export const pdfOfSize = (size: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode('%PDF-1.4\n').slice(0, size));
  return bytes;
};
