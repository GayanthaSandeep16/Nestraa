import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdfResponse(document: ReactElement<DocumentProps>, filename: string) {
  const buffer = await renderToBuffer(document);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // inline (not attachment) so mobile/desktop browsers open their native
      // PDF viewer, which already offers print/download/share affordances —
      // no bespoke sharing integration needed.
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
