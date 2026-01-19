import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Using the new consolidated inventory table

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number | null;
  minimum_stock: number | null;
  maximum_stock: number | null;
  reorder_point: number | null;
  unit_of_measure: string;
  unit_cost: number | null;
  last_purchase_price: number | null;
  last_purchase_date: string | null;
  supplier_id: string | null;
  barcode: string | null;
  qr_code: string | null;
  location: string | null;
  is_active: boolean | null;
  last_restocked: string | null;
  alert_status: string | null;
  alert_acknowledged: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: 'purchase' | 'usage' | 'adjustment' | 'return';
  quantity: number;
  unit_cost: number | null;
  work_order_id: string | null;
  purchase_order_id: string | null;
  performed_by: string | null;
  notes: string | null;
  scanned_via: string | null;
  created_at: string | null;
}

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
    const { data: items, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("is_active", true);

    if (error) {
      toast.error("Error loading inventory stats");
      setLoading(false);
      return;
    }

    const itemsList = items || [];
    const lowStockItems = itemsList.filter(item => item.alert_status === 'low_stock');
    const outOfStockItems = itemsList.filter(item => item.alert_status === 'out_of_stock' || (item.current_stock !== null && item.current_stock <= 0));
    const totalValue = itemsList.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0);

    setStats({
      totalItems: itemsList.length,
      lowStockAlerts: lowStockItems.length,
      itemsToReorder: lowStockItems.length + outOfStockItems.length,
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
    let query = supabase.from("inventory").select("*").eq("is_active", true).order("name");

    if (filters?.category) {
      query = query.eq("category", filters.category);
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
        filtered = filtered.filter((i) => i.alert_status === 'out_of_stock' || (i.current_stock !== null && i.current_stock <= 0));
      } else if (filters?.status === "low_stock") {
        filtered = filtered.filter((i) => i.alert_status === 'low_stock');
      } else if (filters?.status === "in_stock") {
        filtered = filtered.filter((i) => !i.alert_status && i.current_stock !== null && i.current_stock > 0);
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
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .not("alert_status", "is", null)
      .eq("alert_acknowledged", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error loading alerts");
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledgeAlert = async (itemId: string) => {
    const { error } = await supabase
      .from("inventory")
      .update({ alert_acknowledged: true })
      .eq("id", itemId);

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
      .from("inventory")
      .update({ alert_acknowledged: true })
      .not("alert_status", "is", null)
      .eq("alert_acknowledged", false);

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
      query = query.eq("inventory_id", itemId);
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
  const [suppliers, setSuppliers] = useState<any[]>([]);
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
  inventory_id: string;
  transaction_type: "purchase" | "usage" | "adjustment" | "return";
  quantity: number;
  unit_cost?: number;
  work_order_id?: string;
  purchase_order_id?: string;
  notes?: string;
  scanned_via?: string;
}) {
  const { data, error } = await supabase.from("inventory_transactions").insert(transaction).select().single();

  if (error) {
    toast.error("Error creating transaction: " + error.message);
    return null;
  }

  toast.success("✅ Transaction recorded");
  return data;
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>) {
  const { error } = await supabase
    .from("inventory")
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
    .from("inventory")
    .select("*")
    .or(`sku.eq.${code},barcode.eq.${code},qr_code.eq.${code}`)
    .single();

  return data;
}

export function useRealtimeInventory(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("inventory-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, (payload) => {
        onUpdate();
        if (payload.eventType === "UPDATE") {
          const item = payload.new as InventoryItem;
          if (item.alert_status === "out_of_stock") {
            toast.error(`🔴 Out of stock: ${item.name}`);
          } else if (item.alert_status === "low_stock") {
            toast.warning(`🟡 Low stock: ${item.name}`);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_transactions" }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
