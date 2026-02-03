import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, Json } from "@/integrations/supabase/types";

type PurchaseOrder = Tables<"purchase_orders">;
type Supplier = Tables<"suppliers">;
type InventoryItem = Tables<"inventory">;

// Purchase order items stored in JSONB
interface POItem {
  inventory_id: string;
  name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
}

export interface ProcurementStats {
  activePOs: number;
  pendingApprovals: number;
  expectedDeliveriesThisWeek: number;
  totalPOValue: number;
}

export interface PurchaseSuggestion {
  item: InventoryItem;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  supplier?: Supplier;
  priority: "urgent" | "soon" | "normal";
  leadTimeDays: number;
}

export interface CartItem {
  itemId: string;
  item: InventoryItem;
  quantity: number;
  unitCost: number;
  supplierId: string;
}

export function useProcurementStats() {
  const [stats, setStats] = useState<ProcurementStats>({
    activePOs: 0,
    pendingApprovals: 0,
    expectedDeliveriesThisWeek: 0,
    totalPOValue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: allPOs } = await supabase.from("purchase_orders").select("*");

    const activePOs = (allPOs || []).filter((po) => !["received", "cancelled"].includes(po.status || ""));
    const pendingApprovals = (allPOs || []).filter((po) => po.status === "draft");
    const expectedThisWeek = (allPOs || []).filter((po) => {
      if (!po.expected_delivery_date) return false;
      const deliveryDate = new Date(po.expected_delivery_date);
      return deliveryDate >= now && deliveryDate <= weekEnd && po.status !== "received" && po.status !== "cancelled";
    });
    const totalValue = activePOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);

    setStats({
      activePOs: activePOs.length,
      pendingApprovals: pendingApprovals.length,
      expectedDeliveriesThisWeek: expectedThisWeek.length,
      totalPOValue: totalValue,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export function usePurchaseOrders(filters?: {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [orders, setOrders] = useState<(PurchaseOrder & { supplier?: Supplier })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("purchase_orders").select("*").order("order_date", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.supplierId) {
      query = query.eq("supplier_id", filters.supplierId);
    }
    if (filters?.dateFrom) {
      query = query.gte("order_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("order_date", filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading purchase orders");
      setLoading(false);
      return;
    }

    // Fetch suppliers
    const supplierIds = [...new Set((data || []).map((po) => po.supplier_id))];
    const { data: suppliersData } = await supabase.from("suppliers").select("*").in("id", supplierIds);

    const enriched = (data || []).map((po) => ({
      ...po,
      supplier: suppliersData?.find((s) => s.id === po.supplier_id),
    }));

    setOrders(enriched);
    setLoading(false);
  }, [filters?.status, filters?.supplierId, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

export function usePurchaseOrderDetail(orderId: string | null) {
  const [order, setOrder] = useState<(PurchaseOrder & { supplier?: Supplier; parsedItems?: POItem[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);

    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (poError) {
      toast.error("Error loading purchase order");
      setLoading(false);
      return;
    }

    // Fetch supplier
    const { data: supplierData } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", poData.supplier_id)
      .single();

    // Parse items from JSONB
    const parsedItems = (Array.isArray(poData.items) ? poData.items : []) as unknown as POItem[];

    setOrder({
      ...poData,
      supplier: supplierData || undefined,
      parsedItems,
    });
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, refetch: fetchOrder };
}

export function usePurchaseSuggestions() {
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);

    // Get all items with stock levels
    const { data: items, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("is_active", true);

    if (error) {
      toast.error("Error loading suggestions");
      setLoading(false);
      return;
    }

    // Get suppliers
    const supplierIds = [...new Set((items || []).filter((i) => i.supplier_id).map((i) => i.supplier_id!))];
    const { data: suppliers } = await supabase.from("suppliers").select("*").in("id", supplierIds);

    // Filter items needing reorder
    const needsReorder = (items || []).filter((item) => {
      if (!item.reorder_point) return false;
      return (item.current_stock || 0) <= item.reorder_point;
    });

    const suggestionsList: PurchaseSuggestion[] = needsReorder.map((item) => {
      const supplier = suppliers?.find((s) => s.id === item.supplier_id);
      const currentStock = item.current_stock || 0;
      const reorderPoint = item.reorder_point || 0;
      const maxStock = item.maximum_stock || reorderPoint * 3;
      const suggestedQty = Math.max(maxStock - currentStock, 0);

      let priority: "urgent" | "soon" | "normal" = "normal";
      if (currentStock === 0) {
        priority = "urgent";
      } else if (currentStock <= reorderPoint * 0.5) {
        priority = "urgent";
      } else if (currentStock <= reorderPoint) {
        priority = "soon";
      }

      return {
        item,
        currentStock,
        reorderPoint,
        suggestedQuantity: suggestedQty,
        supplier,
        priority,
        leadTimeDays: supplier?.lead_time_days || 7,
      };
    });

    suggestionsList.sort((a, b) => {
      const priorityOrder = { urgent: 0, soon: 1, normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setSuggestions(suggestionsList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { suggestions, loading, refetch: fetchSuggestions };
}

export function useMRPCalculator(dateRange: number = 30) {
  const [mrpData, setMrpData] = useState<{
    item: InventoryItem;
    currentStock: number;
    required7d: number;
    required30d: number;
    onOrder: number;
    netNeed: number;
    suggestedOrder: number;
    supplier?: Supplier;
    leadTime: number;
    orderByDate: Date | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateMRP = useCallback(async () => {
    setLoading(true);

    // Get all inventory items
    const { data: items } = await supabase.from("inventory").select("*").eq("is_active", true);
    
    // Get pending POs to calculate on-order quantities
    const { data: pendingPOs } = await supabase
      .from("purchase_orders")
      .select("*")
      .not("status", "in", '("received","cancelled")');

    // Get suppliers
    const supplierIds = [...new Set((items || []).filter((i) => i.supplier_id).map((i) => i.supplier_id!))];
    const { data: suppliers } = await supabase.from("suppliers").select("*").in("id", supplierIds);

    // Calculate on-order quantities from PO items
    const onOrderByItem: Record<string, number> = {};
    (pendingPOs || []).forEach((po) => {
      const poItems = (Array.isArray(po.items) ? po.items : []) as unknown as POItem[];
      poItems.forEach((item) => {
        const remaining = item.quantity_ordered - (item.quantity_received || 0);
        onOrderByItem[item.inventory_id] = (onOrderByItem[item.inventory_id] || 0) + remaining;
      });
    });

    const mrpResults = (items || []).map((item) => {
      const currentStock = item.current_stock || 0;
      const reorderPoint = item.reorder_point || 0;
      const onOrder = onOrderByItem[item.id] || 0;
      
      // Estimate requirements based on reorder point (simplified)
      const required7d = Math.max(reorderPoint * 0.25, 0);
      const required30d = Math.max(reorderPoint, 0);
      
      const netNeed = Math.max(required30d - currentStock - onOrder, 0);
      const suggestedOrder = netNeed > 0 ? Math.max(netNeed, item.minimum_stock || 0) : 0;

      const supplier = suppliers?.find((s) => s.id === item.supplier_id);
      const leadTime = supplier?.lead_time_days || 7;

      let orderByDate: Date | null = null;
      if (netNeed > 0) {
        orderByDate = new Date();
        orderByDate.setDate(orderByDate.getDate() + 7 - leadTime);
      }

      return {
        item,
        currentStock,
        required7d,
        required30d,
        onOrder,
        netNeed,
        suggestedOrder,
        supplier,
        leadTime,
        orderByDate,
      };
    }).filter((r) => r.required7d > 0 || r.required30d > 0 || r.netNeed > 0);

    mrpResults.sort((a, b) => {
      if (a.netNeed > 0 && b.netNeed === 0) return -1;
      if (a.netNeed === 0 && b.netNeed > 0) return 1;
      return b.netNeed - a.netNeed;
    });

    setMrpData(mrpResults);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    calculateMRP();
  }, [calculateMRP]);

  return { mrpData, loading, refetch: calculateMRP };
}

export function useSupplierDetails(supplierId: string | null) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseOrder[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);

    const [supplierRes, ordersRes, itemsRes] = await Promise.all([
      supabase.from("suppliers").select("*").eq("id", supplierId).single(),
      supabase.from("purchase_orders").select("*").eq("supplier_id", supplierId).order("order_date", { ascending: false }).limit(20),
      supabase.from("inventory").select("*").eq("supplier_id", supplierId),
    ]);

    setSupplier(supplierRes.data);
    setPurchaseHistory(ordersRes.data || []);
    setItems(itemsRes.data || []);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { supplier, purchaseHistory, items, loading, refetch: fetchDetails };
}

export async function createPurchaseOrder(
  supplierId: string,
  items: { inventoryItemId: string; name: string; sku: string; quantity: number; unitCost: number }[],
  options?: {
    expectedDeliveryDate?: string;
    notes?: string;
    status?: string;
  }
) {
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  
  // Build items JSONB array
  const poItems: POItem[] = items.map((item) => ({
    inventory_id: item.inventoryItemId,
    name: item.name,
    sku: item.sku,
    quantity_ordered: item.quantity,
    quantity_received: 0,
    unit_cost: item.unitCost,
    total_cost: item.quantity * item.unitCost,
  }));

  const { data: poData, error: poError } = await supabase
    .from("purchase_orders")
    .insert([{
      supplier_id: supplierId,
      status: options?.status || "draft",
      expected_delivery_date: options?.expectedDeliveryDate || null,
      notes: options?.notes || null,
      total_amount: totalAmount,
      items: poItems as unknown as Json,
    }])
    .select()
    .single();

  if (poError) {
    toast.error("Error creating purchase order: " + poError.message);
    return null;
  }

  toast.success("✅ Purchase order created - PO #" + poData.po_number);
  return poData;
}

export async function updatePurchaseOrderStatus(orderId: string, status: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  
  if (status === "sent") {
    updates.approved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("purchase_orders").update(updates).eq("id", orderId);

  if (error) {
    toast.error("Error updating order: " + error.message);
    return false;
  }

  toast.success("Order status updated to: " + status);
  return true;
}

export async function receiveOrderItems(
  orderId: string,
  receivedItems: { inventoryId: string; quantityReceived: number; location?: string }[]
) {
  // Get the PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (poError || !po) {
    toast.error("Error loading purchase order");
    return false;
  }

  const items = (Array.isArray(po.items) ? po.items : []) as unknown as POItem[];
  
  for (const received of receivedItems) {
    // Update item in JSONB
    const itemIndex = items.findIndex((i) => i.inventory_id === received.inventoryId);
    if (itemIndex === -1) continue;

    items[itemIndex].quantity_received = (items[itemIndex].quantity_received || 0) + received.quantityReceived;

    // Create inventory transaction
    await supabase.from("inventory_transactions").insert({
      inventory_id: received.inventoryId,
      transaction_type: "purchase",
      quantity: received.quantityReceived,
      purchase_order_id: orderId,
      unit_cost: items[itemIndex].unit_cost,
      notes: `Received from PO #${po.po_number}`,
    });
  }

  // Check if fully received
  const allReceived = items.every((i) => i.quantity_received >= i.quantity_ordered);
  
  await supabase.from("purchase_orders").update({
    items: items as unknown as Json,
    status: allReceived ? "received" : "partially_received",
    actual_delivery_date: allReceived ? new Date().toISOString().split("T")[0] : null,
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);

  toast.success("Items received successfully");
  return true;
}