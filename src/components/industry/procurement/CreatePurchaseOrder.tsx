import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Save,
  Send,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuppliers, useInventoryItems } from "@/hooks/useInventoryData";
import { createPurchaseOrder } from "@/hooks/useProcurementData";

interface OrderItem {
  id: string;
  inventoryItemId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  const [saving, setSaving] = useState(false);

  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { items: inventoryItems, loading: itemsLoading } = useInventoryItems({
    supplierId: supplierId || undefined,
    search: searchItem || undefined,
  });

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const addItem = (item: typeof inventoryItems[0]) => {
    const existing = orderItems.find((oi) => oi.inventoryItemId === item.id);
    if (existing) {
      setOrderItems((prev) =>
        prev.map((oi) =>
          oi.inventoryItemId === item.id ? { ...oi, quantity: oi.quantity + 1 } : oi
        )
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          inventoryItemId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unitCost: item.last_purchase_price || item.unit_cost || 0,
        },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const updateItemCost = (id: string, unitCost: number) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitCost } : item))
    );
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const handleSave = async (status: "draft" | "sent") => {
    if (!supplierId) {
      return;
    }
    if (orderItems.length === 0) {
      return;
    }

    setSaving(true);
    const result = await createPurchaseOrder(
      supplierId,
      orderItems.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
      {
        expectedDeliveryDate: expectedDelivery || undefined,
        notes: notes || undefined,
        status,
      }
    );

    setSaving(false);
    if (result) {
      navigate(`/industry/procurement/purchase-orders/${result.id}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/industry/procurement/purchase-orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nueva Orden de Compra</h1>
            <p className="text-muted-foreground">Crear orden de compra a proveedor</p>
          </div>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { num: 1, label: "Proveedor" },
          { num: 2, label: "Items" },
          { num: 3, label: "Detalles" },
          { num: 4, label: "Revisar" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => setStep(s.num)}
              disabled={s.num > step + 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="font-semibold">{s.num}</span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {i < 3 && <div className="w-8 h-0.5 bg-muted mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Supplier */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Proveedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplier && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <h4 className="font-medium mb-2">Información del Proveedor</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contacto:</span>{" "}
                    <span>{selectedSupplier.contact_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span>{selectedSupplier.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>{" "}
                    <span>{selectedSupplier.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Time:</span>{" "}
                    <span>{selectedSupplier.lead_time_days || 7} días</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Términos:</span>{" "}
                    <span>{selectedSupplier.payment_terms || "-"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!supplierId}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add Items */}
      {step === 2 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Catálogo de Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar items..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {itemsLoading ? (
                  <p className="text-center py-4 text-muted-foreground">Cargando...</p>
                ) : inventoryItems.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    No hay items para este proveedor
                  </p>
                ) : (
                  inventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => addItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-medium">{formatCurrency(item.last_purchase_price || item.unit_cost || 0)}</p>
                        <p className="text-xs text-muted-foreground">Stock: {item.current_stock || 0}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items en la Orden ({orderItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Agrega items del catálogo
                </p>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          value={item.unitCost}
                          onChange={(e) => updateItemCost(item.id, Number(e.target.value))}
                          className="w-24 h-8"
                        />
                      </div>
                      <p className="font-semibold w-24 text-right">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button onClick={() => setStep(3)} disabled={orderItems.length === 0}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Entrega Esperada</Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Instrucciones especiales, notas para el proveedor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button onClick={() => setStep(4)}>
                Revisar Orden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revisar Orden de Compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-semibold">{selectedSupplier?.name}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Fecha Entrega</p>
                  <p className="font-semibold">{expectedDelivery || "Sin definir"}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold text-lg">{formatCurrency(totalAmount)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p>{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              Atrás
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Borrador
              </Button>
              <Button onClick={() => handleSave("sent")} disabled={saving}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Proveedor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
