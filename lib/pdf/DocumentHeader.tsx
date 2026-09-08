import { Text, View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/pdf/company";
import { pdfStyles } from "@/lib/pdf/styles";

export function DocumentHeader({
  title,
  documentNo,
  date,
}: {
  title: string;
  documentNo: string;
  date: string;
}) {
  return (
    <View style={pdfStyles.headerRow}>
      <View>
        <Text style={pdfStyles.brand}>Nestraa</Text>
        <Text style={pdfStyles.companyLine}>{COMPANY.name}</Text>
        {COMPANY.addressLines.map((line) => (
          <Text key={line} style={pdfStyles.companyLine}>
            {line}
          </Text>
        ))}
        <Text style={pdfStyles.companyLine}>
          {COMPANY.phone} · {COMPANY.email}
        </Text>
      </View>
      <View>
        <Text style={pdfStyles.docTitle}>{title}</Text>
        <Text style={pdfStyles.docMeta}>No: {documentNo}</Text>
        <Text style={pdfStyles.docMeta}>Date: {date}</Text>
      </View>
    </View>
  );
}

export function DocumentFooter({ note }: { note: string }) {
  return (
    <Text style={pdfStyles.footer} fixed>
      {note}
    </Text>
  );
}
