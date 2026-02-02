import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Clock,
  Star,
  Edit,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSuppliers } from "@/hooks/useInventoryData";
import { useSupplierDetails } from "@/hooks/useProcurementData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

export default function SupplierManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    payment_terms: "",
    lead_time_days: 7,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { suppliers, loading, refetch } = useSuppliers();
  const { supplier: supplierDetail, purchaseHistory, items: supplierItems } = useSupplierDetails(selectedSupplierId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateForm = () => {
    setEditSupplier(null);
    setFormData({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      payment_terms: "",
      lead_time_days: 7,
      notes: "",
    });
    setShowForm(true);
  };

  const openEditForm = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      payment_terms: supplier.payment_terms || "",
      lead_time_days: supplier.lead_time_days || 7,
      notes: supplier.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editSupplier.id);
        if (error) throw error;
        toast.success("Proveedor actualizado");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert([formData]);
        if (error) throw error;
        toast.success("Proveedor creado");
      }
      setShowForm(false);
      refetch();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
    setSaving(false);
  };

  const totalSpent = purchaseHistory.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const avgLeadTime = purchaseHistory.length > 0
    ? purchaseHistory.reduce((sum, po) => {
        if (!po.expected_delivery_date || !po.actual_delivery_date) return sum;
        const expected = new Date(po.expected_delivery_date);
        const actual = new Date(po.actual_delivery_date);
        return sum + (actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / purchaseHistory.filter((po) => po.actual_delivery_date).length
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/industry/procurement")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>
            <p className="text-muted-foreground">Administrar proveedores y sus datos</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className={selectedSupplierId ? "lg:col-span-1" : "lg:col-span-3"}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No se encontraron proveedores
                </p>
              ) : (
                <div className="divide-y">
                  {filteredSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedSupplierId === supplier.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                      onClick={() => setSelectedSupplierId(supplier.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{supplier.name}</span>
                            {supplier.rating && (
                              <div className="flex items-center text-yellow-500">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs ml-0.5">{supplier.rating}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {supplier.contact_name && (
                              <span>{supplier.contact_name}</span>
                            )}
                            {supplier.lead_time_days && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {supplier.lead_time_days}d
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(supplier);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Supplier Detail */}
        {selectedSupplierId && supplierDetail && (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {supplierDetail.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditForm(supplierDetail)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedSupplierId(null)}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </p>
                      <p className="font-medium">{supplierDetail.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Teléfono
                      </p>
                      <p className="font-medium">{supplierDetail.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contacto</p>
                      <p className="font-medium">{supplierDetail.contact_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium">{supplierDetail.address || "-"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Time</p>
                      <p className="font-medium">{supplierDetail.lead_time_days || 7} días</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Términos de Pago</p>
                      <p className="font-medium">{supplierDetail.payment_terms || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (supplierDetail.rating || 0) ? "text-yellow-500 fill-current" : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Gastado</p>
                      <p className="font-semibold text-lg">{formatCurrency(totalSpent)}</p>
                    </div>
                  </div>
                </div>

                {supplierDetail.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{supplierDetail.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Associated Items */}
            {supplierItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Items Asociados ({supplierItems.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Último Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierItems.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.current_stock || 0}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.last_purchase_price || item.unit_cost || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Purchase History */}
            {purchaseHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Historial de Compras ({purchaseHistory.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OC #</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseHistory.slice(0, 10).map((po) => (
                        <TableRow
                          key={po.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/industry/procurement/purchase-orders/${po.id}`)}
                        >
                          <TableCell className="font-medium">#{po.po_number}</TableCell>
                          <TableCell>{format(new Date(po.order_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                          <TableCell>
                            <Badge variant={po.status === "received" ? "default" : "secondary"}>
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(po.total_amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contacto</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Nombre contacto"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@proveedor.com"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead Time (días)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Términos de Pago</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="30 días"
                />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {editSupplier ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
