import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Calculator,
  ShoppingCart,
  Download,
  RefreshCw,
  ArrowLeft,
  Package,
  AlertTriangle,
  Check,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMRPCalculator, createPurchaseOrder } from "@/hooks/useProcurementData";
import { useSuppliers } from "@/hooks/useInventoryData";
import { toast } from "sonner";

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  supplierId: string;
  supplierName: string;
}

export default function MRPCalculator() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(30);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const { mrpData, loading, refetch } = useMRPCalculator(dateRange);
  const { suppliers } = useSuppliers();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const getStatusColor = (netNeed: number, leadTime: number, orderByDate: Date | null) => {
    if (netNeed === 0) return "";
    if (!orderByDate) return "bg-yellow-50 dark:bg-yellow-950/20";
    
    const now = new Date();
    const daysUntilOrder = Math.ceil((orderByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilOrder <= 0) return "bg-red-50 dark:bg-red-950/20";
    if (daysUntilOrder <= 3) return "bg-orange-50 dark:bg-orange-950/20";
    if (daysUntilOrder <= 7) return "bg-yellow-50 dark:bg-yellow-950/20";
    return "";
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === mrpData.filter((d) => d.netNeed > 0).length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mrpData.filter((d) => d.netNeed > 0).map((d) => d.item.id));
    }
  };

  const addToCart = () => {
    const newItems: CartItem[] = [];
    
    for (const itemId of selectedItems) {
      const data = mrpData.find((d) => d.item.id === itemId);
      if (!data) continue;
      
      newItems.push({
        itemId: data.item.id,
        itemName: data.item.name,
        quantity: data.suggestedOrder,
        unitCost: data.item.unit_cost || 0,
        supplierId: data.supplier?.id || "",
        supplierName: data.supplier?.name || "Sin proveedor",
      });
    }

    setCartItems((prev) => {
      const existing = [...prev];
      for (const newItem of newItems) {
        const existingIndex = existing.findIndex((e) => e.itemId === newItem.itemId);
        if (existingIndex >= 0) {
          existing[existingIndex].quantity += newItem.quantity;
        } else {
          existing.push(newItem);
        }
      }
      return existing;
    });

    setSelectedItems([]);
    toast.success(`${newItems.length} items agregados al carrito`);
    setShowCart(true);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, quantity } : item))
    );
  };

  const cartBySupplier = cartItems.reduce((acc, item) => {
    if (!acc[item.supplierId]) {
      acc[item.supplierId] = { name: item.supplierName, items: [] };
    }
    acc[item.supplierId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; items: CartItem[] }>);

  const createPOs = async () => {
    for (const [supplierId, data] of Object.entries(cartBySupplier)) {
      if (!supplierId) {
        toast.error("Algunos items no tienen proveedor asignado");
        continue;
      }

      await createPurchaseOrder(
        supplierId,
        data.items.map((item) => ({
          inventoryItemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
        { status: "draft" }
      );
    }

    setCartItems([]);
    setShowCart(false);
    navigate("/industry/procurement/purchase-orders");
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/industry/procurement")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Calculadora MRP</h1>
            <p className="text-muted-foreground">Planificación de requerimientos de materiales</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="14">Próximos 14 días</SelectItem>
              <SelectItem value="30">Próximos 30 días</SelectItem>
              <SelectItem value="60">Próximos 60 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalcular
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {cartItems.length > 0 && (
            <Button variant="default" onClick={() => setShowCart(!showCart)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Carrito ({cartItems.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* MRP Table */}
        <div className={showCart ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Requerimientos de Materiales
                </CardTitle>
                {selectedItems.length > 0 && (
                  <Button onClick={addToCart}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Agregar al Carrito ({selectedItems.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedItems.length === mrpData.filter((d) => d.netNeed > 0).length && mrpData.filter((d) => d.netNeed > 0).length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Req. 7d</TableHead>
                      <TableHead className="text-right">Req. 30d</TableHead>
                      <TableHead className="text-right">En Pedido</TableHead>
                      <TableHead className="text-right">Necesidad Neta</TableHead>
                      <TableHead className="text-right">Cant. Sugerida</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Ordenar Antes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 11 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : mrpData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p>No hay requerimientos pendientes</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mrpData.map((row) => (
                        <TableRow
                          key={row.item.id}
                          className={getStatusColor(row.netNeed, row.leadTime, row.orderByDate)}
                        >
                          <TableCell>
                            {row.netNeed > 0 && (
                              <Checkbox
                                checked={selectedItems.includes(row.item.id)}
                                onCheckedChange={() => toggleItem(row.item.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.item.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{row.item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.currentStock.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.required7d > 0 ? (
                              <span className={row.required7d > row.currentStock ? "text-destructive font-semibold" : ""}>
                                {row.required7d.toLocaleString()}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.required30d > 0 ? row.required30d.toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.onOrder > 0 ? (
                              <span className="text-blue-600">{row.onOrder.toLocaleString()}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {row.netNeed > 0 ? (
                              <span className="text-destructive">{row.netNeed.toLocaleString()}</span>
                            ) : (
                              <span className="text-green-600">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.suggestedOrder > 0 ? (
                              <Badge variant="secondary">{row.suggestedOrder.toLocaleString()}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{row.supplier?.name || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{row.leadTime} días</span>
                          </TableCell>
                          <TableCell>
                            {row.orderByDate ? (
                              <Badge
                                variant={row.orderByDate < new Date() ? "destructive" : "outline"}
                              >
                                {format(row.orderByDate, "dd MMM", { locale: es })}
                              </Badge>
                            ) : (
                              "-"
                            )}
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

        {/* Shopping Cart Sidebar */}
        {showCart && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito de Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    El carrito está vacío
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(cartBySupplier).map(([supplierId, data]) => (
                      <div key={supplierId} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{data.name}</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {data.items.map((item) => (
                            <div key={item.itemId} className="flex items-center gap-2 text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{item.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.unitCost)} × {item.quantity}
                                </p>
                              </div>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCartQuantity(item.itemId, Number(e.target.value))}
                                className="w-20 h-8"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => removeFromCart(item.itemId)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4">
                      <div className="flex justify-between font-semibold">
                        <span>Total Estimado:</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Se crearán {Object.keys(cartBySupplier).length} orden(es) de compra
                      </p>
                    </div>

                    <Button className="w-full" onClick={createPOs}>
                      Crear Órdenes de Compra
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/40"></div>
              <span>Ordenar ahora (fecha pasada)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-950/40"></div>
              <span>Ordenar pronto (3 días)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-950/40"></div>
              <span>Próxima semana</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted"></div>
              <span>Stock suficiente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
