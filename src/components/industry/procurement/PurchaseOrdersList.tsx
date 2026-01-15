import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  Eye,
  Check,
  X,
  Truck,
  Printer,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePurchaseOrders, updatePurchaseOrderStatus } from "@/hooks/useProcurementData";
import { useSuppliers } from "@/hooks/useInventoryData";

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "partially_received", label: "Parcialmente Recibido" },
  { value: "received", label: "Recibido" },
  { value: "cancelled", label: "Cancelado" },
];

export default function PurchaseOrdersList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [search, setSearch] = useState("");

  const { orders, loading, refetch } = usePurchaseOrders({
    status: statusFilter || undefined,
    supplierId: supplierFilter || undefined,
  });
  const { suppliers } = useSuppliers();

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
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      case "received":
        return <Badge className="bg-green-500">Recibido</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updatePurchaseOrderStatus(orderId, "sent");
    refetch();
  };

  const handleCancel = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de cancelar esta orden?")) {
      await updatePurchaseOrderStatus(orderId, "cancelled");
      refetch();
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        String(order.po_number).includes(searchLower) ||
        order.supplier?.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/industry/procurement")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
            <p className="text-muted-foreground">Gestión de órdenes de compra a proveedores</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => navigate("/industry/procurement/purchase-orders/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por # de orden o proveedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los proveedores</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC #</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Orden</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron órdenes de compra
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/industry/procurement/purchase-orders/${order.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">#{order.po_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{order.supplier?.name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{format(new Date(order.order_date), "dd/MM/yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(order.order_date), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.expected_delivery_date ? (
                          <div>
                            <p className="text-sm">{format(new Date(order.expected_delivery_date), "dd/MM/yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(order.expected_delivery_date), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.total_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/industry/procurement/purchase-orders/${order.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={(e) => handleApprove(order.id, e)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={(e) => handleCancel(order.id, e)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {["sent", "confirmed", "partially_received"].includes(order.status || "") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/industry/procurement/purchase-orders/${order.id}?receive=true`);
                              }}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Print PO
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
