import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  RefreshCw,
  Check,
  X,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useInventoryStats,
  useInventoryItems,
  useInventoryAlerts,
  useSuppliers,
  useRealtimeInventory,
} from "@/hooks/useInventoryData";
import InventoryItemDialog from "./InventoryItemDialog";
import ScannerDialog from "./ScannerDialog";

const categories = [
  { value: "substrate", label: "Sustrato" },
  { value: "ink", label: "Tinta" },
  { value: "finishing_material", label: "Acabado" },
  { value: "consumable", label: "Consumible" },
  { value: "packaging", label: "Empaque" },
  { value: "other", label: "Otro" },
];

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "in_stock", label: "En Stock" },
  { value: "low_stock", label: "Stock Bajo" },
  { value: "out_of_stock", label: "Sin Stock" },
];

export default function InventoryDashboard() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const { stats, loading: statsLoading, refetch: refetchStats } = useInventoryStats();
  const { items, loading: itemsLoading, refetch: refetchItems } = useInventoryItems({
    category: categoryFilter || undefined,
    status: (statusFilter as any) || undefined,
    search: search || undefined,
  });
  const { alerts, loading: alertsLoading, acknowledgeAlert, acknowledgeAll, refetch: refetchAlerts } = useInventoryAlerts();
  const { suppliers } = useSuppliers();

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchItems();
    refetchAlerts();
  }, [refetchStats, refetchItems, refetchAlerts]);

  useRealtimeInventory(handleRefresh);

  const getStockStatus = (item: any) => {
    if (item.current_stock === 0 || item.current_stock === null) {
      return { label: "Sin Stock", color: "destructive" as const };
    }
    if (item.reorder_point && item.current_stock <= item.reorder_point) {
      return { label: "Stock Bajo", color: "warning" as const };
    }
    return { label: "En Stock", color: "default" as const };
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "out_of_stock":
        return "🔴";
      case "low_stock":
        return "🟡";
      case "overstock":
        return "🟠";
      default:
        return "⚪";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const handleScanResult = (code: string) => {
    setSearch(code);
    setShowScanner(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
          <p className="text-muted-foreground">Control de stock y materiales</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowScanner(true)}>
            <Search className="h-4 w-4 mr-2" />
            Escanear
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => { setSelectedItem(null); setShowItemDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.lowStockAlerts > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.lowStockAlerts > 0 ? "bg-destructive/10" : "bg-yellow-500/10"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.lowStockAlerts > 0 ? "text-destructive" : "text-yellow-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas Stock</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.lowStockAlerts}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por Reordenar</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.itemsToReorder}</p>
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
                <p className="text-sm text-muted-foreground">Valor Total</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Alertas Activas ({alerts.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={acknowledgeAll}>
                <Check className="h-4 w-4 mr-1" />
                Reconocer Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 10).map((alert) => (
                <Badge
                  key={alert.id}
                  variant="outline"
                  className="py-1.5 px-3 cursor-pointer hover:bg-muted"
                  onClick={() => setSelectedItem(alert.item)}
                >
                  <span className="mr-1">{getAlertIcon(alert.alert_type)}</span>
                  {alert.item?.name || "Item"}
                  <button
                    className="ml-2 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      acknowledgeAlert(alert.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {alerts.length > 10 && (
                <Badge variant="secondary">+{alerts.length - 10} más</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Reorden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron items
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const status = getStockStatus(item);
                    const recentlyUpdated =
                      item.updated_at && new Date().getTime() - new Date(item.updated_at).getTime() < 3600000;
                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer hover:bg-muted/50 ${recentlyUpdated ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                        onClick={() => { setSelectedItem(item); setShowItemDialog(true); }}
                      >
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories.find((c) => c.value === item.category)?.label || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              status.color === "destructive"
                                ? "text-destructive"
                                : status.color === "warning"
                                ? "text-yellow-600"
                                : ""
                            }
                          >
                            {item.current_stock?.toLocaleString() || 0}
                          </span>
                        </TableCell>
                        <TableCell>{item.unit_of_measure}</TableCell>
                        <TableCell className="text-right">{item.reorder_point || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={status.color === "warning" ? "secondary" : status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.updated_at
                            ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setShowItemDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      {showScanner && (
        <ScannerDialog
          open={showScanner}
          onOpenChange={setShowScanner}
          onScan={handleScanResult}
        />
      )}

      {/* Item Detail Dialog */}
      {showItemDialog && (
        <InventoryItemDialog
          open={showItemDialog}
          onOpenChange={setShowItemDialog}
          item={selectedItem}
          suppliers={suppliers}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
