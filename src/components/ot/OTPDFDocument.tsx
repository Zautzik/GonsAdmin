import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (using standard fonts for now)
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a2e',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 5,
  },
  otNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: 5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 100,
    color: '#666',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 5,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
  },
  tableCellSmall: {
    width: 60,
    textAlign: 'right',
  },
  tableCellMedium: {
    width: 80,
    textAlign: 'right',
  },
  costSummary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#1a1a2e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
    fontSize: 8,
    color: '#666',
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 60,
    color: '#f0f0f0',
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
  },
  grid2: {
    flexDirection: 'row',
    gap: 20,
  },
  gridCol: {
    flex: 1,
  },
  badge: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '2 6',
    borderRadius: 3,
    fontSize: 8,
  },
  specBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
  },
  diagramBox: {
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  diagramText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});

interface OTPDFProps {
  workOrder: {
    ot_number: number;
    client_name: string;
    product_name: string;
    product_description: string | null;
    quantity: number;
    status: string;
    priority: number;
    delivery_date: string | null;
    total_price: number;
    unit_price: number;
    budget_code: string | null;
    created_at: string;
  };
  specifications: {
    finished_width_cm: number | null;
    finished_height_cm: number | null;
    substrate_type: string | null;
    substrate_weight_gsm: number | null;
    colors_front: number | null;
    colors_back: number | null;
    pantone_colors: string[];
    finishing_operations: string[];
  } | null;
  calculations: {
    sheet_format: string | null;
    bocas_per_sheet: number | null;
    total_sheets: number | null;
    substrate_kg: number | null;
    ctp_plates: number | null;
  } | null;
  operations: {
    operation_code: string;
    quantity_budgeted: number;
    unit_cost_budgeted: number;
    total_cost_budgeted: number;
    unit_of_measure: string | null;
  }[];
  pricing: {
    materials_cost: number;
    labor_cost: number;
    third_party_cost: number;
    other_cost: number;
    subtotal: number;
    margin_percent: number;
    margin_amount: number;
    total_price: number;
    unit_price: number;
  } | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function OTPDFDocument({ workOrder, specifications, calculations, operations, pricing }: OTPDFProps) {
  const isDraft = workOrder.status === 'draft';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && <Text style={styles.watermark}>BORRADOR</Text>}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>ORDEN DE TRABAJO</Text>
            <Text style={styles.subtitle}>Gonsa S.A</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.otNumber}>OT #{workOrder.ot_number}</Text>
            <Text style={styles.subtitle}>{formatDate(workOrder.created_at)}</Text>
          </View>
        </View>

        {/* Product Title */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{workOrder.product_name}</Text>
          {workOrder.product_description && (
            <Text style={{ fontSize: 9, color: '#666', marginTop: 3 }}>{workOrder.product_description}</Text>
          )}
        </View>

        {/* Client & Job Info */}
        <View style={[styles.section, styles.grid2]}>
          <View style={styles.gridCol}>
            <Text style={styles.sectionTitle}>CLIENTE</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>{workOrder.client_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cantidad:</Text>
              <Text style={styles.value}>{workOrder.quantity.toLocaleString()} unidades</Text>
            </View>
            {workOrder.delivery_date && (
              <View style={styles.row}>
                <Text style={styles.label}>Entrega:</Text>
                <Text style={styles.value}>{formatDate(workOrder.delivery_date)}</Text>
              </View>
            )}
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.sectionTitle}>PRESUPUESTO</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Código:</Text>
              <Text style={styles.value}>{workOrder.budget_code || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Precio Unit.:</Text>
              <Text style={styles.value}>{formatCurrency(workOrder.unit_price)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total:</Text>
              <Text style={styles.value}>{formatCurrency(workOrder.total_price)}</Text>
            </View>
          </View>
        </View>

        {/* Specifications */}
        {specifications && (
          <View style={[styles.section, styles.grid2]}>
            <View style={styles.gridCol}>
              <Text style={styles.sectionTitle}>ESPECIFICACIONES</Text>
              <View style={styles.specBox}>
                <View style={styles.row}>
                  <Text style={styles.label}>Medidas:</Text>
                  <Text style={styles.value}>{specifications.finished_width_cm} × {specifications.finished_height_cm} cm</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Sustrato:</Text>
                  <Text style={styles.value}>{specifications.substrate_type} {specifications.substrate_weight_gsm}g</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Colores:</Text>
                  <Text style={styles.value}>{specifications.colors_front}/{specifications.colors_back}</Text>
                </View>
                {specifications.finishing_operations && specifications.finishing_operations.length > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Terminaciones:</Text>
                    <Text style={styles.value}>{specifications.finishing_operations.join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.sectionTitle}>FORMATO DE PLIEGO</Text>
              {calculations && (
                <View style={styles.diagramBox}>
                  <Text style={styles.diagramText}>{calculations.sheet_format}</Text>
                  <Text style={{ marginTop: 5 }}>Bocas: {calculations.bocas_per_sheet} × {Math.ceil(workOrder.quantity / (calculations.bocas_per_sheet || 1))}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Technical Data */}
        {calculations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATOS TÉCNICOS DE PRODUCCIÓN</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Descripción</Text>
                <Text style={styles.tableCellMedium}>Cantidad</Text>
                <Text style={styles.tableCellMedium}>Unidad</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Total Pliegos</Text>
                <Text style={styles.tableCellMedium}>{calculations.total_sheets?.toLocaleString()}</Text>
                <Text style={styles.tableCellMedium}>hojas</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Sustrato</Text>
                <Text style={styles.tableCellMedium}>{calculations.substrate_kg}</Text>
                <Text style={styles.tableCellMedium}>kg</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Planchas CTP</Text>
                <Text style={styles.tableCellMedium}>{calculations.ctp_plates}</Text>
                <Text style={styles.tableCellMedium}>planchas</Text>
              </View>
            </View>
          </View>
        )}

        {/* Operations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETALLE DE OPERACIONES</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellSmall}>Código</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Descripción</Text>
              <Text style={styles.tableCellSmall}>Cant.</Text>
              <Text style={styles.tableCellSmall}>Unidad</Text>
              <Text style={styles.tableCellMedium}>Costo Unit.</Text>
              <Text style={styles.tableCellMedium}>Total</Text>
            </View>
            {operations.map((op, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCellSmall}>{op.operation_code}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{op.operation_code}</Text>
                <Text style={styles.tableCellSmall}>{op.quantity_budgeted}</Text>
                <Text style={styles.tableCellSmall}>{op.unit_of_measure}</Text>
                <Text style={styles.tableCellMedium}>{formatCurrency(op.unit_cost_budgeted)}</Text>
                <Text style={styles.tableCellMedium}>{formatCurrency(op.total_cost_budgeted)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cost Summary */}
        {pricing && (
          <View style={styles.costSummary}>
            <View style={styles.costRow}>
              <Text>Materiales</Text>
              <Text>{formatCurrency(pricing.materials_cost)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text>Mano de Obra</Text>
              <Text>{formatCurrency(pricing.labor_cost)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text>Terceros</Text>
              <Text>{formatCurrency(pricing.third_party_cost)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text>Otros</Text>
              <Text>{formatCurrency(pricing.other_cost)}</Text>
            </View>
            <View style={[styles.costRow, { marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#ccc' }]}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(pricing.subtotal)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text>Utilidad ({pricing.margin_percent}%)</Text>
              <Text>{formatCurrency(pricing.margin_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatCurrency(pricing.total_price)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>OT #{workOrder.ot_number} • {workOrder.client_name}</Text>
          <Text>Generado: {new Date().toLocaleDateString('es-CL')}</Text>
        </View>
      </Page>
    </Document>
  );
}