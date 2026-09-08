import { StyleSheet } from "@react-pdf/renderer";

// Colors pulled from docs/DESIGN.md's light palette (primary/on-surface/etc.)
// so generated PDFs read as the same product as the app UI.
export const pdfColors = {
  primary: "#3525cd",
  onSurface: "#131b2e",
  onSurfaceVariant: "#464555",
  outlineVariant: "#c7c4d8",
  surfaceContainerLow: "#f2f3ff",
  error: "#ba1a1a",
  success: "#146c2e",
};

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: pdfColors.onSurface,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `2px solid ${pdfColors.primary}`,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.primary,
  },
  companyLine: {
    fontSize: 8,
    color: pdfColors.onSurfaceVariant,
    marginTop: 2,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  docMeta: {
    fontSize: 8,
    color: pdfColors.onSurfaceVariant,
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  sectionBlock: {
    flex: 1,
  },
  label: {
    fontSize: 7,
    color: pdfColors.onSurfaceVariant,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    marginBottom: 6,
  },
  table: {
    borderTop: `1px solid ${pdfColors.outlineVariant}`,
    borderLeft: `1px solid ${pdfColors.outlineVariant}`,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: pdfColors.surfaceContainerLow,
  },
  tableRow: {
    flexDirection: "row",
  },
  th: {
    padding: 6,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderRight: `1px solid ${pdfColors.outlineVariant}`,
    borderBottom: `1px solid ${pdfColors.outlineVariant}`,
  },
  td: {
    padding: 6,
    fontSize: 8.5,
    borderRight: `1px solid ${pdfColors.outlineVariant}`,
    borderBottom: `1px solid ${pdfColors.outlineVariant}`,
  },
  totalsBlock: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: pdfColors.onSurfaceVariant,
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  balanceDue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.error,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 48,
  },
  signatureBlock: {
    width: 180,
    borderTop: `1px solid ${pdfColors.onSurface}`,
    paddingTop: 4,
    fontSize: 8,
    color: pdfColors.onSurfaceVariant,
  },
  terms: {
    marginTop: 24,
    paddingTop: 8,
    borderTop: `1px solid ${pdfColors.outlineVariant}`,
    fontSize: 7,
    color: pdfColors.onSurfaceVariant,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7,
    color: pdfColors.onSurfaceVariant,
    textAlign: "center",
    borderTop: `1px solid ${pdfColors.outlineVariant}`,
    paddingTop: 6,
  },
});
