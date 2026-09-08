import { Document, Page, Text, View } from "@react-pdf/renderer";
import { DocumentFooter, DocumentHeader } from "@/lib/pdf/DocumentHeader";
import { pdfStyles } from "@/lib/pdf/styles";
import { formatMoney } from "@/lib/pdf/company";

interface ConsignmentItemRow {
  material: { sku: string; name: string };
  quantityDelivered: string;
  unitPrice: string;
}

interface ConsignmentForPdf {
  consignmentNumber: string;
  deliveryDate: string;
  status: string;
  notes: string | null;
  customer: { name: string; phone: string | null; address: string | null };
  warehouse: { name: string };
  salesRep: { fullName: string } | null;
  items: ConsignmentItemRow[];
}

function qty(value: string) {
  return Number(value).toLocaleString("en-LK", { maximumFractionDigits: 3 });
}

export function DeliveryNoteDocument({
  consignment,
  financials,
}: {
  consignment: ConsignmentForPdf;
  financials: { deliveredValue: string; returnedValue: string; outstanding: string };
}) {
  const lineTotal = (item: ConsignmentItemRow) => Number(item.quantityDelivered) * Number(item.unitPrice);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader
          title="Delivery Note / Consignment Invoice"
          documentNo={consignment.consignmentNumber}
          date={new Date(consignment.deliveryDate).toLocaleDateString("en-LK")}
        />

        <View style={[pdfStyles.section, pdfStyles.sectionRow]}>
          <View style={pdfStyles.sectionBlock}>
            <Text style={pdfStyles.label}>Delivered To (Retailer)</Text>
            <Text style={pdfStyles.value}>{consignment.customer.name}</Text>
            <Text style={pdfStyles.value}>{consignment.customer.address ?? "—"}</Text>
            <Text style={pdfStyles.value}>{consignment.customer.phone ?? "—"}</Text>
          </View>
          <View style={pdfStyles.sectionBlock}>
            <Text style={pdfStyles.label}>Dispatched From</Text>
            <Text style={pdfStyles.value}>{consignment.warehouse.name}</Text>
            <Text style={pdfStyles.label}>Sales Representative</Text>
            <Text style={pdfStyles.value}>{consignment.salesRep?.fullName ?? "—"}</Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.th, { width: "10%" }]}>SKU</Text>
            <Text style={[pdfStyles.th, { width: "38%" }]}>Product</Text>
            <Text style={[pdfStyles.th, { width: "17%", textAlign: "right" }]}>Qty Delivered</Text>
            <Text style={[pdfStyles.th, { width: "17%", textAlign: "right" }]}>Unit Price</Text>
            <Text style={[pdfStyles.th, { width: "18%", textAlign: "right", borderRight: "none" }]}>Line Total</Text>
          </View>
          {consignment.items.map((item, index) => (
            <View style={pdfStyles.tableRow} key={index}>
              <Text style={[pdfStyles.td, { width: "10%" }]}>{item.material.sku}</Text>
              <Text style={[pdfStyles.td, { width: "38%" }]}>{item.material.name}</Text>
              <Text style={[pdfStyles.td, { width: "17%", textAlign: "right" }]}>{qty(item.quantityDelivered)}</Text>
              <Text style={[pdfStyles.td, { width: "17%", textAlign: "right" }]}>{formatMoney(item.unitPrice)}</Text>
              <Text style={[pdfStyles.td, { width: "18%", textAlign: "right", borderRight: "none" }]}>
                {formatMoney(lineTotal(item))}
              </Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.totalsBlock}>
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.totalsLabel}>Delivered Value</Text>
            <Text style={pdfStyles.totalsValue}>{formatMoney(financials.deliveredValue)}</Text>
          </View>
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.totalsLabel}>Returned Value</Text>
            <Text style={pdfStyles.totalsValue}>
              {Number(financials.returnedValue) > 0 ? `-${formatMoney(financials.returnedValue)}` : formatMoney(0)}
            </Text>
          </View>
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.totalsLabel}>Outstanding Balance</Text>
            <Text style={pdfStyles.balanceDue}>{formatMoney(financials.outstanding)}</Text>
          </View>
        </View>

        {consignment.notes && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Notes</Text>
            <Text style={pdfStyles.value}>{consignment.notes}</Text>
          </View>
        )}

        <View style={pdfStyles.signatureRow}>
          <Text style={pdfStyles.signatureBlock}>Retailer Signature</Text>
          <Text style={pdfStyles.signatureBlock}>Sales Representative Signature</Text>
        </View>

        <Text style={pdfStyles.terms}>
          Terms &amp; Conditions: Goods listed above are supplied on consignment and remain the property of{" "}
          {"Nestraa Private Limited"} until sold or invoiced. The retailer is responsible for goods held until sold, returned in
          good condition, or accounted for as damaged/expired stock at the next collection.
        </Text>

        <DocumentFooter note="Generated by Nestraa Management System" />
      </Page>
    </Document>
  );
}
