import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];
type InventoryAlert = Database["public"]["Tables"]["inventory_alerts"]["Row"];
type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

export interface InventoryStats {
  totalItems: number;
  lowStockAlerts: number;
  itemsToReorder: number;
  totalValue: number;
  outOfStock: number;
}

export function useInventoryStats() {
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockAlerts: 0,
    itemsToReorder: 0,
    totalValue: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const [itemsRes, alertsRes] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("is_active", true),
      supabase.from("inventory_alerts").select("*").eq("is_acknowledged", false),
    ]);

    const items = itemsRes.data || [];
    const alerts = alertsRes.data || [];

    const lowStockItems = items.filter(
      (item) => item.current_stock !== null && item.reorder_point !== null && item.current_stock <= item.reorder_point
    );
    const outOfStockItems = items.filter((item) => item.current_stock === 0 || item.current_stock === null);
    const totalValue = items.reduce((sum, item) => sum + (item.current_stock || 0) * (item.unit_cost || 0), 0);

    setStats({
      totalItems: items.length,
      lowStockAlerts: alerts.filter((a) => a.alert_type === "low_stock" || a.alert_type === "out_of_stock").length,
      itemsToReorder: lowStockItems.length,
      totalValue,
      outOfStock: outOfStockItems.length,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export function useInventoryItems(filters?: {
  category?: string;
  supplierId?: string;
  status?: "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("inventory_items").select("*").eq("is_active", true).order("name");

    if (filters?.category) {
      query = query.eq("category", filters.category as any);
    }
    if (filters?.supplierId) {
      query = query.eq("supplier_id", filters.supplierId);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading inventory");
    } else {
      let filtered = data || [];
      if (filters?.status === "out_of_stock") {
        filtered = filtered.filter((i) => i.current_stock === 0 || i.current_stock === null);
      } else if (filters?.status === "low_stock") {
        filtered = filtered.filter(
          (i) => i.current_stock !== null && i.reorder_point !== null && i.current_stock <= i.reorder_point && i.current_stock > 0
        );
      } else if (filters?.status === "in_stock") {
        filtered = filtered.filter(
          (i) => i.current_stock !== null && (i.reorder_point === null || i.current_stock > i.reorder_point)
        );
      }
      setItems(filtered);
    }
    setLoading(false);
  }, [filters?.category, filters?.supplierId, filters?.status, filters?.search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, refetch: fetchItems };
}

export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState<(InventoryAlert & { item?: InventoryItem })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data: alertsData, error } = await supabase
      .from("inventory_alerts")
      .select("*")
      .eq("is_acknowledged", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error loading alerts");
      setLoading(false);
      return;
    }

    // Fetch related items
    const itemIds = [...new Set((alertsData || []).map((a) => a.inventory_item_id))];
    const { data: itemsData } = await supabase.from("inventory_items").select("*").in("id", itemIds);

    const enriched = (alertsData || []).map((alert) => ({
      ...alert,
      item: itemsData?.find((i) => i.id === alert.inventory_item_id),
    }));

    setAlerts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("inventory_alerts")
      .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      toast.error("Error acknowledging alert");
      return false;
    }
    toast.success("Alert acknowledged");
    fetchAlerts();
    return true;
  };

  const acknowledgeAll = async () => {
    const { error } = await supabase
      .from("inventory_alerts")
      .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("is_acknowledged", false);

    if (error) {
      toast.error("Error acknowledging alerts");
      return false;
    }
    toast.success("All alerts acknowledged");
    fetchAlerts();
    return true;
  };

  return { alerts, loading, refetch: fetchAlerts, acknowledgeAlert, acknowledgeAll };
}

export function useInventoryTransactions(itemId?: string) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false }).limit(100);

    if (itemId) {
      query = query.eq("inventory_item_id", itemId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading transactions");
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, refetch: fetchTransactions };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("suppliers").select("*").eq("is_active", true).order("name");

    if (error) {
      toast.error("Error loading suppliers");
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return { suppliers, loading, refetch: fetchSuppliers };
}

export async function createInventoryTransaction(transaction: {
  inventory_item_id: string;
  transaction_type: "purchase" | "usage" | "adjustment" | "return" | "transfer";
  quantity: number;
  unit_cost?: number;
  work_order_id?: string;
  purchase_order_id?: string;
  notes?: string;
  scanned_via?: "barcode" | "qr" | "manual";
}) {
  const { data, error } = await supabase.from("inventory_transactions").insert(transaction).select().single();

  if (error) {
    toast.error("Error creating transaction: " + error.message);
    return null;
  }

  // Update inventory stock
  const { data: item } = await supabase.from("inventory_items").select("current_stock").eq("id", transaction.inventory_item_id).single();

  let newStock = item?.current_stock || 0;
  if (transaction.transaction_type === "purchase" || transaction.transaction_type === "return") {
    newStock += transaction.quantity;
  } else if (transaction.transaction_type === "usage") {
    newStock -= transaction.quantity;
  } else if (transaction.transaction_type === "adjustment") {
    // quantity is the new absolute value or a delta
    newStock = transaction.quantity;
  }

  await supabase.from("inventory_items").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", transaction.inventory_item_id);

  toast.success("✅ Transaction recorded");
  return data;
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
  const { error } = await supabase
    .from("inventory_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    toast.error("Error updating item: " + error.message);
    return false;
  }

  toast.success("Item updated");
  return true;
}

export async function findItemByCode(code: string): Promise<InventoryItem | null> {
  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .or(`sku.eq.${code},barcode.eq.${code},qr_code.eq.${code}`)
    .single();

  return data;
}

export function useRealtimeInventory(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("inventory-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        onUpdate();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_transactions" }, () => {
        onUpdate();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inventory_alerts" }, (payload) => {
        const alert = payload.new as InventoryAlert;
        if (alert.alert_type === "out_of_stock") {
          toast.error(`🔴 Out of stock alert: ${alert.message}`);
        } else if (alert.alert_type === "low_stock") {
          toast.warning(`🟡 Low stock alert: ${alert.message}`);
        }
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
