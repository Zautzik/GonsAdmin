import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Save,
  Loader2,
  QrCode,
  Printer,
  History,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createInventoryTransaction, useInventoryTransactions } from "@/hooks/useInventoryData";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  suppliers: Supplier[];
  onSuccess: () => void;
}

const categories = [
  { value: "substrate", label: "Sustrato" },
  { value: "ink", label: "Tinta" },
  { value: "finishing_material", label: "Acabado" },
  { value: "consumable", label: "Consumible" },
  { value: "packaging", label: "Empaque" },
  { value: "other", label: "Otro" },
];

const units = [
  { value: "kg", label: "Kilogramos" },
  { value: "units", label: "Unidades" },
  { value: "rolls", label: "Rollos" },
  { value: "liters", label: "Litros" },
  { value: "sheets", label: "Hojas" },
  { value: "boxes", label: "Cajas" },
];

export default function InventoryItemDialog({
  open,
  onOpenChange,
  item,
  suppliers,
  onSuccess,
}: InventoryItemDialogProps) {
  const isNew = !item;
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setSaving] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "subtract" | "set">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    barcode: "",
    qr_code: "",
    category: "other" as string,
    unit_of_measure: "units" as string,
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    reorder_point: 0,
    location: "",
    supplier_id: "",
    unit_cost: 0,
  });

  const { transactions, loading: transactionsLoading, refetch: refetchTransactions } = useInventoryTransactions(item?.id);

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || "",
        name: item.name || "",
        barcode: item.barcode || "",
        qr_code: item.qr_code || "",
        category: item.category || "other",
        unit_of_measure: item.unit_of_measure || "units",
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        maximum_stock: item.maximum_stock || 0,
        reorder_point: item.reorder_point || 0,
        location: item.location || "",
        supplier_id: item.supplier_id || "",
        unit_cost: item.unit_cost || 0,
      });
    } else {
      setFormData({
        sku: "",
        name: "",
        barcode: "",
        qr_code: "",
        category: "other",
        unit_of_measure: "units",
        current_stock: 0,
        minimum_stock: 0,
        maximum_stock: 0,
        reorder_point: 0,
        location: "",
        supplier_id: "",
        unit_cost: 0,
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!formData.sku.trim() || !formData.name.trim()) {
      toast.error("SKU y nombre son obligatorios");
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        sku: formData.sku,
        name: formData.name,
        barcode: formData.barcode || null,
        qr_code: formData.qr_code || null,
        category: formData.category as any,
        unit_of_measure: formData.unit_of_measure as any,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock,
        maximum_stock: formData.maximum_stock,
        reorder_point: formData.reorder_point,
        location: formData.location || null,
        supplier_id: formData.supplier_id || null,
        unit_cost: formData.unit_cost,
      };
      
      if (isNew) {
        const { error } = await supabase.from("inventory_items").insert(insertData);
        if (error) throw error;
        toast.success("Item creado exitosamente");
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .update({ ...insertData, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        if (error) throw error;
        toast.success("Item actualizado exitosamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustment = async () => {
    if (!item || !adjustmentQty || !adjustmentReason) {
      toast.error("Ingresa cantidad y razón del ajuste");
      return;
    }

    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad inválida");
      return;
    }

    let newStock = formData.current_stock;
    let transactionQty = qty;

    if (adjustmentMode === "add") {
      newStock += qty;
    } else if (adjustmentMode === "subtract") {
      newStock -= qty;
      transactionQty = -qty;
    } else {
      transactionQty = qty - formData.current_stock;
      newStock = qty;
    }

    if (newStock < 0) {
      toast.error("El stock no puede ser negativo");
      return;
    }

    setSaving(true);
    try {
      await createInventoryTransaction({
        inventory_item_id: item.id,
        transaction_type: "adjustment",
        quantity: Math.abs(transactionQty),
        notes: `${adjustmentReason}: ${adjustmentNotes}`,
        scanned_via: "manual",
      });

      setFormData((prev) => ({ ...prev, current_stock: newStock }));
      setAdjustmentQty("");
      setAdjustmentReason("");
      setAdjustmentNotes("");
      refetchTransactions();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateQRCode = () => {
    const qr = `INV-${formData.sku}-${Date.now().toString(36).toUpperCase()}`;
    setFormData((prev) => ({ ...prev, qr_code: qr }));
    toast.success("Código QR generado");
  };

  const stockPercentage =
    formData.maximum_stock > 0
      ? Math.min(100, (formData.current_stock / formData.maximum_stock) * 100)
      : 0;

  const getStockColor = () => {
    if (formData.current_stock === 0) return "bg-destructive";
    if (formData.reorder_point && formData.current_stock <= formData.reorder_point)
      return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isNew ? "Nuevo Item de Inventario" : formData.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="stock" disabled={isNew}>
              Stock
            </TabsTrigger>
            <TabsTrigger value="history" disabled={isNew}>
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Couche 300gsm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                  placeholder="7891234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Código QR</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.qr_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, qr_code: e.target.value }))}
                    placeholder="QR Code"
                  />
                  <Button variant="outline" size="icon" onClick={generateQRCode}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidad de Medida</Label>
                <Select
                  value={formData.unit_of_measure}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, unit_of_measure: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimum_stock: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Máximo</Label>
                <Input
                  type="number"
                  value={formData.maximum_stock}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maximum_stock: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Punto Reorden</Label>
                <Input
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reorder_point: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Costo Unitario</Label>
                <Input
                  type="number"
                  value={formData.unit_cost}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Bodega A, Rack 3"
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, supplier_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 mt-4">
            {/* Stock Gauge */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Nivel de Stock</span>
                  <Badge variant={formData.current_stock === 0 ? "destructive" : "default"}>
                    {formData.current_stock.toLocaleString()} {formData.unit_of_measure}
                  </Badge>
                </div>
                <Progress value={stockPercentage} className={`h-3 ${getStockColor()}`} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Min: {formData.minimum_stock}</span>
                  <span>Reorden: {formData.reorder_point}</span>
                  <span>Max: {formData.maximum_stock}</span>
                </div>
              </CardContent>
            </Card>

            {/* Adjustment Form */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Ajustar Stock
                </h4>

                <div className="flex gap-2">
                  <Button
                    variant={adjustmentMode === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentMode("add")}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                  <Button
                    variant={adjustmentMode === "subtract" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentMode("subtract")}
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Restar
                  </Button>
                  <Button
                    variant={adjustmentMode === "set" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentMode("set")}
                    className="flex-1"
                  >
                    Establecer
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón</Label>
                    <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="damaged">Dañado</SelectItem>
                        <SelectItem value="lost">Perdido</SelectItem>
                        <SelectItem value="found">Encontrado</SelectItem>
                        <SelectItem value="correction">Corrección</SelectItem>
                        <SelectItem value="inventory">Inventario físico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleAdjustment} disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Aplicar Ajuste
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4" />
              <h4 className="font-medium">Historial de Transacciones</h4>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        Sin transacciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {tx.created_at
                            ? format(new Date(tx.created_at), "dd/MM/yy HH:mm", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.transaction_type === "purchase"
                                ? "default"
                                : tx.transaction_type === "usage"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {tx.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            tx.transaction_type === "usage" ? "text-destructive" : "text-green-600"
                          }`}
                        >
                          {tx.transaction_type === "usage" ? "-" : "+"}
                          {tx.quantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {tx.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          {!isNew && (
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isNew ? "Crear Item" : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
