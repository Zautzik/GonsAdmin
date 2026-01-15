import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  FileText,
  Truck,
  DollarSign,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRight,
  Clock,
  Package,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  useProcurementStats,
  usePurchaseSuggestions,
  usePurchaseOrders,
} from "@/hooks/useProcurementData";

export default function ProcurementDashboard() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading, refetch: refetchStats } = useProcurementStats();
  const { suggestions, loading: suggestionsLoading, refetch: refetchSuggestions } = usePurchaseSuggestions();
  const { orders, loading: ordersLoading, refetch: refetchOrders } = usePurchaseOrders({
    status: undefined, // Get all
  });

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchSuggestions();
    refetchOrders();
  }, [refetchStats, refetchSuggestions, refetchOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const urgentSuggestions = suggestions.filter((s) => s.priority === "urgent");
  const soonSuggestions = suggestions.filter((s) => s.priority === "soon");

  const pendingOrders = orders.filter((o) => o.status === "draft");
  const expectedDeliveries = orders.filter((o) => {
    if (!o.expected_delivery_date) return false;
    const deliveryDate = new Date(o.expected_delivery_date);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return deliveryDate >= now && deliveryDate <= weekEnd && !["received", "cancelled"].includes(o.status || "");
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-destructive bg-destructive/5";
      case "soon":
        return "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Compras y Adquisiciones</h1>
          <p className="text-muted-foreground">Gestión de órdenes de compra y proveedores</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => navigate("/industry/procurement/mrp")}>
            <Package className="h-4 w-4 mr-2" />
            Calculadora MRP
          </Button>
          <Button onClick={() => navigate("/industry/procurement/purchase-orders/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OC Activas</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.activePOs}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.pendingApprovals > 0 ? "border-yellow-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.pendingApprovals > 0 ? "bg-yellow-500/10" : "bg-orange-500/10"}`}>
                <Clock className={`h-5 w-5 ${stats.pendingApprovals > 0 ? "text-yellow-500" : "text-orange-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por Aprobar</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                )}
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
                <p className="text-sm text-muted-foreground">Entregas Esta Semana</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.expectedDeliveriesThisWeek}</p>
                )}
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
                <p className="text-sm text-muted-foreground">Valor OCs</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats.totalPOValue)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Items to Reorder Now */}
        <Card className={urgentSuggestions.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${urgentSuggestions.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              Ordenar Ahora ({urgentSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : urgentSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ✓ No hay items urgentes
              </p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {urgentSuggestions.slice(0, 10).map((suggestion) => (
                    <div
                      key={suggestion.item.id}
                      className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${getPriorityColor(suggestion.priority)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{suggestion.item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {suggestion.currentStock} / Reorden: {suggestion.reorderPoint}
                          </p>
                        </div>
                        <Badge variant="destructive" className="ml-2">
                          +{suggestion.suggestedQuantity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {urgentSuggestions.length > 0 && (
              <Button
                variant="destructive"
                className="w-full mt-3"
                onClick={() => navigate("/industry/procurement/mrp")}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Generar OC
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Material Needs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Necesidades Próximas ({soonSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : soonSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay necesidades próximas
              </p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {soonSuggestions.slice(0, 10).map((suggestion) => (
                    <div
                      key={suggestion.item.id}
                      className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${getPriorityColor(suggestion.priority)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{suggestion.item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Lead time: {suggestion.leadTimeDays} días
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          +{suggestion.suggestedQuantity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => navigate("/industry/procurement/mrp")}
            >
              Ver Calculadora MRP
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Aprobaciones Pendientes ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ✓ No hay OCs pendientes
              </p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {pendingOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/industry/procurement/purchase-orders/${order.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">OC #{order.po_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.supplier?.name || "Sin proveedor"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(order.total_amount || 0)}</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => navigate("/industry/procurement/purchase-orders")}
            >
              Ver Todas las OCs
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Expected Deliveries */}
      {expectedDeliveries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Entregas Esperadas Esta Semana ({expectedDeliveries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expectedDeliveries.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/industry/procurement/purchase-orders/${order.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">OC #{order.po_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{order.supplier?.name}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {order.expected_delivery_date
                        ? format(new Date(order.expected_delivery_date), "dd MMM", { locale: es })
                        : "Sin fecha"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold">{formatCurrency(order.total_amount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Órdenes Recientes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/industry/procurement/purchase-orders")}>
              Ver Todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay órdenes de compra
            </p>
          ) : (
            <div className="divide-y">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="py-3 cursor-pointer hover:bg-muted/50 -mx-3 px-3 rounded-lg"
                  onClick={() => navigate(`/industry/procurement/purchase-orders/${order.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">OC #{order.po_number}</p>
                        <p className="text-sm text-muted-foreground">{order.supplier?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.total_amount || 0)}</p>
                      <div className="flex items-center gap-2 justify-end">
                        {getStatusBadge(order.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.order_date), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
