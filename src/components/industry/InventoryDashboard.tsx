import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
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
  Search,
  ScanBarcode,
  Plus,
  Minus,
  ArrowDown,
  ArrowUp,
  Sliders,
  Loader2,
  X,
  Check,
} from "lucide-react";
import {
  useInventoryStats,
  useInventoryItems,
  useInventoryAlerts,
  useRealtimeInventory,
  createInventoryTransaction,
} from "@/hooks/useInventoryData";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

type ActionMode = "usage" | "receive" | "adjust" | null;

// ─── Stock Indicator ───────────────────────────────────
function StockIndicator({ stock, reorderPoint }: { stock: number | null; reorderPoint: number | null }) {
  const s = stock ?? 0;
  const r = reorderPoint ?? 0;
  if (s <= 0) return <span className="inline-block h-3 w-3 rounded-full bg-destructive" title="Sin stock" />;
  if (r > 0 && s <= r) return <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" title="Stock bajo" />;
  return <span className="inline-block h-3 w-3 rounded-full bg-green-500" title="En stock" />;
}

// ─── Inventory Item Card ───────────────────────────────
function InventoryCard({
  item,
  onAction,
}: {
  item: any;
  onAction: (item: any, mode: ActionMode) => void;
}) {
  const stock = item.current_stock ?? 0;

  return (
    <Card className="bg-card shadow-sm hover:shadow-md transition-all duration-200 rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StockIndicator stock={item.current_stock} reorderPoint={item.reorder_point} />
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</p>
          </div>
        </div>

        {/* Stock Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-2xl font-semibold text-foreground">
            {stock.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{item.unit_of_measure}</span>
          </p>
          {item.reorder_point && (
            <p className="text-xs text-muted-foreground mt-1">
              Punto de reorden: {item.reorder_point} {item.unit_of_measure}
            </p>
          )}
        </div>

        {/* Actions - large touch targets */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-11 text-sm"
            onClick={() => onAction(item, "usage")}
          >
            <ArrowUp className="h-4 w-4 mr-1.5" />
            Usar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-11 text-sm"
            onClick={() => onAction(item, "receive")}
          >
            <ArrowDown className="h-4 w-4 mr-1.5" />
            Recibir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 text-sm"
            onClick={() => onAction(item, "adjust")}
          >
            <Sliders className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Action Sheet ──────────────────────────────────────
function ActionSheet({
  open,
  onOpenChange,
  item,
  mode,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  mode: ActionMode;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState(0);
  const [otNumber, setOtNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    if (mode === "usage" && open) {
      supabase
        .from("work_orders")
        .select("id, ot_number, client_name")
        .neq("status", "completed")
        .neq("status", "delivered")
        .order("ot_number", { ascending: false })
        .limit(50)
        .then(({ data }) => setWorkOrders(data || []));
    }
  }, [mode, open]);

  const resetAndClose = () => {
    setQuantity(0);
    setOtNumber("");
    setSuccess(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!item || quantity <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    if (mode === "usage" && (item.current_stock ?? 0) < quantity) {
      toast.error("Stock insuficiente");
      return;
    }

    setLoading(true);
    const transactionType =
      mode === "receive" ? "purchase" : mode === "usage" ? "usage" : "adjustment";

    let workOrderId: string | undefined;
    if (mode === "usage" && otNumber) {
      const wo = workOrders.find(
        (w) => w.ot_number?.toString() === otNumber
      );
      workOrderId = wo?.id;
    }

    const result = await createInventoryTransaction({
      inventory_id: item.id,
      transaction_type: transactionType,
      quantity: mode === "adjust" ? quantity - (item.current_stock ?? 0) : quantity,
      work_order_id: workOrderId,
      notes:
        mode === "receive"
          ? "Recepción de material"
          : mode === "usage"
          ? `Uso${otNumber ? ` - OT ${otNumber}` : ""}`
          : "Ajuste de inventario",
      scanned_via: "manual",
    });

    setLoading(false);

    if (result) {
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        resetAndClose();
      }, 2000);
    }
  };

  const newStock =
    mode === "receive"
      ? (item?.current_stock ?? 0) + quantity
      : mode === "usage"
      ? (item?.current_stock ?? 0) - quantity
      : quantity;

  const modeLabels: Record<string, { title: string; verb: string }> = {
    usage: { title: "Registrar Uso", verb: "Confirmar Uso" },
    receive: { title: "Recibir Material", verb: "Confirmar Recepción" },
    adjust: { title: "Ajustar Stock", verb: "Confirmar Ajuste" },
  };

  const labels = modeLabels[mode || "usage"];

  return (
    <Sheet open={open} onOpenChange={resetAndClose}>
      <SheetContent className="w-full sm:max-w-[400px] flex flex-col">
        {success ? (
          /* Success State */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Stock Actualizado</h2>
            <p className="text-lg text-muted-foreground">
              {item?.name}: {newStock.toLocaleString()} {item?.unit_of_measure}
            </p>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold">{labels?.title}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-6 py-6 overflow-y-auto">
              {/* Item Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-foreground text-lg">{item?.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{item?.sku}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Stock actual: <span className="font-semibold text-foreground">{(item?.current_stock ?? 0).toLocaleString()} {item?.unit_of_measure}</span>
                </p>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {mode === "adjust" ? "Nuevo Stock" : "Cantidad"}
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 shrink-0"
                    onClick={() => setQuantity((p) => Math.max(0, p - 10))}
                    disabled={quantity < 10}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center text-4xl font-semibold h-16"
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 shrink-0"
                    onClick={() => setQuantity((p) => p + 10)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">{item?.unit_of_measure}</p>
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setQuantity(val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>

              {/* OT for usage mode */}
              {mode === "usage" && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">OT # (opcional)</Label>
                  <Select value={otNumber} onValueChange={setOtNumber}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar OT..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map((wo) => (
                        <SelectItem key={wo.id} value={wo.ot_number?.toString()}>
                          OT-{wo.ot_number} — {wo.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Preview */}
              {quantity > 0 && mode !== "adjust" && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    Nuevo stock: <span className="font-semibold text-foreground">{newStock.toLocaleString()} {item?.unit_of_measure}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-4 border-t">
              <Button
                className="w-full h-14 text-base gap-2"
                onClick={handleSubmit}
                disabled={loading || quantity <= 0}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {labels?.verb}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Dashboard ────────────────────────────────────
export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionItem, setActionItem] = useState<any>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);

  const { stats, loading: statsLoading, refetch: refetchStats } = useInventoryStats();
  const { items, loading: itemsLoading, refetch: refetchItems } = useInventoryItems({
    search: search || undefined,
  });
  const { alerts, acknowledgeAll, refetch: refetchAlerts } = useInventoryAlerts();

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchItems();
    refetchAlerts();
  }, [refetchStats, refetchItems, refetchAlerts]);

  useRealtimeInventory(handleRefresh);

  const handleAction = (item: any, mode: ActionMode) => {
    setActionItem(item);
    setActionMode(mode);
  };

  const lowStockCount = alerts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventario</h1>
      </div>

      {/* Search + Scan */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 text-base"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          className="h-12 px-5 gap-2 text-base shrink-0"
          onClick={() => navigate("/industry/scan")}
        >
          <ScanBarcode className="h-5 w-5" />
          <span className="hidden sm:inline">Escanear</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>

      {/* Alert Banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex-1">
            {lowStockCount} artículo{lowStockCount > 1 ? "s" : ""} con stock bajo
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-yellow-700 dark:text-yellow-300 text-xs shrink-0"
            onClick={acknowledgeAll}
          >
            Descartar
          </Button>
        </div>
      )}

      {/* Inventory Cards */}
      {itemsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-5">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-12 w-full mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 w-11" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No se encontraron artículos
          </h2>
          <p className="text-sm text-muted-foreground">
            {search ? "Intenta con otro término de búsqueda" : "Agrega artículos al inventario para comenzar"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InventoryCard key={item.id} item={item} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Action Sheet */}
      <ActionSheet
        open={!!actionMode}
        onOpenChange={(open) => {
          if (!open) {
            setActionMode(null);
            setActionItem(null);
          }
        }}
        item={actionItem}
        mode={actionMode}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
