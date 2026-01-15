import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderItem = Database["public"]["Tables"]["purchase_order_items"]["Row"];
type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

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

    const [posRes] = await Promise.all([
      supabase.from("purchase_orders").select("*"),
    ]);

    const allPOs = posRes.data || [];
    const activePOs = allPOs.filter((po) => !["received", "cancelled"].includes(po.status || ""));
    const pendingApprovals = allPOs.filter((po) => po.status === "draft");
    const expectedThisWeek = allPOs.filter((po) => {
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
  const [orders, setOrders] = useState<(PurchaseOrder & { supplier?: Supplier; items?: PurchaseOrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("purchase_orders").select("*").order("order_date", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status as any);
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
  const [order, setOrder] = useState<(PurchaseOrder & { supplier?: Supplier; items?: (PurchaseOrderItem & { item?: InventoryItem })[] }) | null>(null);
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

    // Fetch items
    const { data: itemsData } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", orderId);

    // Fetch inventory items
    const itemIds = (itemsData || []).map((i) => i.inventory_item_id);
    const { data: inventoryItems } = await supabase.from("inventory_items").select("*").in("id", itemIds);

    const enrichedItems = (itemsData || []).map((poItem) => ({
      ...poItem,
      item: inventoryItems?.find((i) => i.id === poItem.inventory_item_id),
    }));

    setOrder({
      ...poData,
      supplier: supplierData || undefined,
      items: enrichedItems,
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
      .from("inventory_items")
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

      // Calculate priority
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

    // Sort by priority
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
    const { data: items } = await supabase.from("inventory_items").select("*").eq("is_active", true);
    
    // Get material requirements for upcoming OTs
    const { data: requirements } = await supabase
      .from("material_requirements")
      .select("*, work_orders(*)")
      .neq("status", "consumed");

    // Get pending PO items
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("*, purchase_orders(*)")
      .lt("quantity_ordered", 0); // Get all, filter later

    // Get active PO items
    const { data: activePOItems } = await supabase
      .from("purchase_order_items")
      .select("*, purchase_orders!inner(*)")
      .not("purchase_orders.status", "in", '("received","cancelled")');

    // Get suppliers
    const supplierIds = [...new Set((items || []).filter((i) => i.supplier_id).map((i) => i.supplier_id!))];
    const { data: suppliers } = await supabase.from("suppliers").select("*").in("id", supplierIds);

    const now = new Date();
    const date7d = new Date(now);
    date7d.setDate(date7d.getDate() + 7);
    const date30d = new Date(now);
    date30d.setDate(date30d.getDate() + 30);

    const mrpResults = (items || []).map((item) => {
      const itemReqs = (requirements || []).filter((r) => r.inventory_item_id === item.id);
      
      const required7d = itemReqs
        .filter((r) => {
          const wo = r.work_orders as any;
          const deadline = wo?.delivery_date;
          if (!deadline) return true; // Include if no deadline
          return new Date(deadline) <= date7d;
        })
        .reduce((sum, r) => sum + (r.quantity_required - (r.quantity_allocated || 0)), 0);

      const required30d = itemReqs.reduce((sum, r) => sum + (r.quantity_required - (r.quantity_allocated || 0)), 0);

      const onOrder = (activePOItems || [])
        .filter((poi) => poi.inventory_item_id === item.id)
        .reduce((sum, poi) => sum + (poi.quantity_ordered - (poi.quantity_received || 0)), 0);

      const currentStock = item.current_stock || 0;
      const netNeed = Math.max(required30d - currentStock - onOrder, 0);
      const suggestedOrder = netNeed > 0 ? Math.max(netNeed, item.minimum_stock || 0) : 0;

      const supplier = suppliers?.find((s) => s.id === item.supplier_id);
      const leadTime = supplier?.lead_time_days || 7;

      let orderByDate: Date | null = null;
      if (netNeed > 0) {
        orderByDate = new Date(date7d);
        orderByDate.setDate(orderByDate.getDate() - leadTime);
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
      supabase.from("inventory_items").select("*").eq("supplier_id", supplierId),
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
  items: { inventoryItemId: string; quantity: number; unitCost: number }[],
  options?: {
    expectedDeliveryDate?: string;
    notes?: string;
    status?: string;
  }
) {
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const { data: poData, error: poError } = await supabase
    .from("purchase_orders")
    .insert([{
      supplier_id: supplierId,
      status: (options?.status || "draft") as any,
      expected_delivery_date: options?.expectedDeliveryDate || null,
      notes: options?.notes || null,
      total_amount: totalAmount,
    }])
    .select()
    .single();

  if (poError) {
    toast.error("Error creating purchase order: " + poError.message);
    return null;
  }

  // Create PO items
  const poItems = items.map((item) => ({
    purchase_order_id: poData.id,
    inventory_item_id: item.inventoryItemId,
    quantity_ordered: item.quantity,
    unit_cost: item.unitCost,
    total_cost: item.quantity * item.unitCost,
  }));

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItems);

  if (itemsError) {
    toast.error("Error adding items: " + itemsError.message);
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
  receivedItems: { itemId: string; quantityReceived: number; location?: string }[]
) {
  for (const received of receivedItems) {
    // Update PO item
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", orderId)
      .eq("inventory_item_id", received.itemId)
      .single();

    if (!poItem) continue;

    const newReceived = (poItem.quantity_received || 0) + received.quantityReceived;

    await supabase
      .from("purchase_order_items")
      .update({ quantity_received: newReceived })
      .eq("id", poItem.id);

    // Create inventory transaction
    await supabase.from("inventory_transactions").insert({
      inventory_item_id: received.itemId,
      transaction_type: "purchase",
      quantity: received.quantityReceived,
      purchase_order_id: orderId,
      unit_cost: poItem.unit_cost,
      notes: `Received from PO`,
    });

    // Update inventory stock
    const { data: item } = await supabase
      .from("inventory_items")
      .select("current_stock")
      .eq("id", received.itemId)
      .single();

    const newStock = (item?.current_stock || 0) + received.quantityReceived;
    await supabase
      .from("inventory_items")
      .update({
        current_stock: newStock,
        last_purchase_date: new Date().toISOString(),
        last_purchase_price: poItem.unit_cost,
        location: received.location || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", received.itemId);
  }

  // Check if all items received
  const { data: allItems } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", orderId);

  const allReceived = allItems?.every((i) => (i.quantity_received || 0) >= i.quantity_ordered);
  const partiallyReceived = allItems?.some((i) => (i.quantity_received || 0) > 0);

  await supabase
    .from("purchase_orders")
    .update({
      status: allReceived ? "received" : "partially_received",
      actual_delivery_date: allReceived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  toast.success("✅ Items received and inventory updated");
  return true;
}

export async function createSupplier(data: Partial<Supplier>) {
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      name: data.name!,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      payment_terms: data.payment_terms,
      lead_time_days: data.lead_time_days,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) {
    toast.error("Error creating supplier: " + error.message);
    return null;
  }

  toast.success("Supplier created");
  return supplier;
}

export async function updateSupplier(supplierId: string, data: Partial<Supplier>) {
  const { error } = await supabase
    .from("suppliers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", supplierId);

  if (error) {
    toast.error("Error updating supplier: " + error.message);
    return false;
  }

  toast.success("Supplier updated");
  return true;
}
