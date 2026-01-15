import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  FileText,
  ArrowLeft,
  Check,
  X,
  Truck,
  Printer,
  Calendar,
  User,
  Package,
  DollarSign,
  Clock,
  Edit,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  usePurchaseOrderDetail,
  updatePurchaseOrderStatus,
  receiveOrderItems,
} from "@/hooks/useProcurementData";

export default function PurchaseOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [showReceiveDialog, setShowReceiveDialog] = useState(searchParams.get("receive") === "true");
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  const { order, loading, refetch } = usePurchaseOrderDetail(id || null);

  useEffect(() => {
    if (order?.items) {
      const initial: Record<string, number> = {};
      order.items.forEach((item) => {
        const remaining = item.quantity_ordered - (item.quantity_received || 0);
        initial[item.inventory_item_id] = remaining;
      });
      setReceiveQuantities(initial);
    }
  }, [order]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Borrador</Badge>;
      case "sent":
        return <Badge variant="default">Enviado</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "partially_received":
        return <Badge className="bg-yellow-500">Parcialmente Recibido</Badge>;
      case "received":
        return <Badge className="bg-green-500">Recibido</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    await updatePurchaseOrderStatus(order.id, "sent");
    refetch();
  };

  const handleCancel = async () => {
    if (!order) return;
    if (confirm("¿Estás seguro de cancelar esta orden?")) {
      await updatePurchaseOrderStatus(order.id, "cancelled");
      refetch();
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    await updatePurchaseOrderStatus(order.id, "confirmed");
    refetch();
  };

  const handleReceive = async () => {
    if (!order) return;

    const receivedItems = Object.entries(receiveQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        itemId,
        quantityReceived: qty,
      }));

    if (receivedItems.length === 0) {
      return;
    }

    await receiveOrderItems(order.id, receivedItems);
    setShowReceiveDialog(false);
    refetch();
  };

  if (loading || !order) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalReceived = order.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0;
  const totalOrdered = order.items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;
  const receiveProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/industry/procurement/purchase-orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">OC #{order.po_number}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">{order.supplier?.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {order.status === "draft" && (
            <>
              <Button variant="outline" onClick={() => navigate(`/industry/procurement/purchase-orders/${order.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="default" onClick={handleApprove}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Proveedor
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </>
          )}
          {order.status === "sent" && (
            <Button variant="default" onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Recepción
            </Button>
          )}
          {["sent", "confirmed", "partially_received"].includes(order.status || "") && (
            <Button variant="default" onClick={() => setShowReceiveDialog(true)}>
              <Truck className="h-4 w-4 mr-2" />
              Recibir Items
            </Button>
          )}
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Orden</p>
                <p className="font-semibold">{format(new Date(order.order_date), "dd/MM/yyyy", { locale: es })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entrega Esperada</p>
                <p className="font-semibold">
                  {order.expected_delivery_date
                    ? format(new Date(order.expected_delivery_date), "dd/MM/yyyy", { locale: es })
                    : "Sin definir"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold">{formatCurrency(order.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recibido</p>
                <p className="font-semibold">{Math.round(receiveProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {order.status !== "draft" && order.status !== "cancelled" && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso de Recepción</span>
                <span className="font-medium">{totalReceived} / {totalOrdered} items</span>
              </div>
              <Progress value={receiveProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Información del Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{order.supplier?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contacto</p>
              <p className="font-medium">{order.supplier?.contact_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{order.supplier?.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{order.supplier?.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Términos de Pago</p>
              <p className="font-medium">{order.supplier?.payment_terms || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lead Time</p>
              <p className="font-medium">{order.supplier?.lead_time_days || "-"} días</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Items de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => {
                const received = item.quantity_received || 0;
                const pending = item.quantity_ordered - received;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item?.name || "Item"}</TableCell>
                    <TableCell className="font-mono text-sm">{item.item?.sku || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity_ordered.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={received > 0 ? "text-green-600 font-medium" : ""}>
                        {received.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={pending > 0 ? "text-orange-600" : "text-green-600"}>
                        {pending.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total_cost || item.quantity_ordered * item.unit_cost)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={6} className="text-right font-semibold">
                  Total:
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(order.total_amount || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Receive Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recibir Items - OC #{order.po_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Ingrese las cantidades recibidas para cada item:
            </p>
            <div className="space-y-3">
              {order.items?.map((item) => {
                const remaining = item.quantity_ordered - (item.quantity_received || 0);
                if (remaining <= 0) return null;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.item?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ordenado: {item.quantity_ordered} | Recibido: {item.quantity_received || 0} | Pendiente: {remaining}
                      </p>
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Cantidad a Recibir</Label>
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        value={receiveQuantities[item.inventory_item_id] || 0}
                        onChange={(e) =>
                          setReceiveQuantities((prev) => ({
                            ...prev,
                            [item.inventory_item_id]: Math.min(Number(e.target.value), remaining),
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive}>
              <Truck className="h-4 w-4 mr-2" />
              Confirmar Recepción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
