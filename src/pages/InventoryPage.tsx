import { useEffect, useState, type FormEvent } from "react";
import { Package, AlertTriangle, RefreshCw, TrendingUp, Plus, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../components/ui/FormField";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  updated_at: string;
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "General",
  quantity: "0",
  reorder_level: "10",
  unit_cost: "0",
  supplier: "",
};

export default function InventoryPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("inventory")
      .select("id, name, sku, category, quantity, reorder_level, unit_cost, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });
    setItems((data ?? []) as InventoryItem[]);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [companyId]);

  const set = (key: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.name.trim()) {
      setError("Product name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("inventory").insert({
      company_id: companyId,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category,
      quantity: Number(form.quantity) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      supplier: form.supplier.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError("We couldn't save that product — please try again.");
      return;
    }
    setModalOpen(false);
    setForm({ ...EMPTY_FORM });
    await loadItems();
  };

  const totalStock = items.reduce((s, i) => s + i.quantity, 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * Number(i.unit_cost), 0);
  const lowStock = items.filter((i) => i.quantity <= i.reorder_level);
  const outOfStock = items.filter((i) => i.quantity === 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        subtitle="Manage stock levels, reorder points, and product catalog"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add Product
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package size={18} />}
          label="Total SKUs"
          value={items.length.toString()}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<RefreshCw size={18} />}
          label="Total Stock"
          value={totalStock.toLocaleString()}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Inventory Value"
          value={`$${totalValue.toLocaleString()}`}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          label="Low Stock Items"
          value={lowStock.length.toString()}
          change={outOfStock.length}
          iconColor={lowStock.length > 0 ? "text-danger" : "text-success"}
        />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="glass-card p-5 border border-danger/30 bg-danger/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-danger/15 flex items-center justify-center">
              <AlertTriangle size={16} className="text-danger" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {lowStock.length} item{lowStock.length > 1 ? "s" : ""} below reorder level
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {outOfStock.length > 0 && `${outOfStock.length} out of stock — `}
                Reorder soon to avoid disruption
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-surface/50">
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-medium">{item.name}</span>
                  <span className="text-xs text-text-muted">{item.sku}</span>
                </div>
                <span className="text-danger font-semibold">
                  {item.quantity} / {item.reorder_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory table */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Package size={16} className="text-accent" />
            All Products
          </h3>
          {items.length > 0 && (
            <Button size="sm" variant="ghost" icon={ArrowUpRight}>
              Export
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Package size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No inventory data yet</p>
            <p className="text-xs mt-1">
              Click "Add Product" to create your first item, or load sample data from the Dashboard
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Product</th>
                  <th className="text-left py-2 px-4 font-medium">SKU</th>
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-right py-2 px-4 font-medium">Qty</th>
                  <th className="text-right py-2 px-4 font-medium">Price</th>
                  <th className="text-right py-2 pl-4 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLow = item.quantity <= item.reorder_level;
                  const isOut = item.quantity === 0;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors ${
                        isOut ? "bg-danger/5" : isLow ? "bg-warning/5" : ""
                      }`}
                    >
                      <td className="py-3 pr-4 text-text-primary font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-text-muted text-xs font-mono">{item.sku}</td>
                      <td className="py-3 px-4 text-text-secondary">{item.category}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${isOut ? "text-danger" : isLow ? "text-warning" : "text-text-primary"}`}>
                          {item.quantity}
                        </span>
                        <span className="text-text-muted text-xs ml-1">/ {item.reorder_level}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-text-muted">${Number(item.unit_cost).toFixed(2)}</td>
                      <td className="py-3 pl-4 text-right text-text-primary font-semibold">
                        ${(item.quantity * Number(item.unit_cost)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add product modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Product"
        description="Create a new inventory item"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="add-product-form" loading={saving}>
              {saving ? "Saving…" : "Add Product"}
            </Button>
          </>
        }
      >
        <form id="add-product-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Product name" htmlFor="inv-name">
            <TextInput
              id="inv-name"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Espresso Beans (1kg)"
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SKU" htmlFor="inv-sku">
              <TextInput
                id="inv-sku"
                value={form.sku}
                onChange={set("sku")}
                placeholder="e.g. ESP-1KG"
              />
            </Field>
            <Field label="Category" htmlFor="inv-category">
              <SelectInput id="inv-category" value={form.category} onChange={set("category")}>
                <option>General</option>
                <option>Ingredients</option>
                <option>Packaging</option>
                <option>Equipment</option>
                <option>Beverages</option>
                <option>Snacks</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Quantity" htmlFor="inv-qty">
              <TextInput
                id="inv-qty"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={set("quantity")}
              />
            </Field>
            <Field label="Reorder level" htmlFor="inv-reorder">
              <TextInput
                id="inv-reorder"
                type="number"
                min="0"
                step="1"
                value={form.reorder_level}
                onChange={set("reorder_level")}
              />
            </Field>
            <Field label="Unit cost ($)" htmlFor="inv-cost">
              <TextInput
                id="inv-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={set("unit_cost")}
              />
            </Field>
          </div>
          <Field label="Supplier" htmlFor="inv-supplier">
            <TextInput
              id="inv-supplier"
              value={form.supplier}
              onChange={set("supplier")}
              placeholder="e.g. Green Valley Roasters"
            />
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function KpiCard({
  icon, label, value, change, iconColor,
}: {
  icon: React.ReactNode; label: string; value: string; change?: number; iconColor: string;
}) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium mb-1 ${change === 0 ? "text-success" : "text-danger"}`}>
            {change} out of stock
          </span>
        )}
      </div>
    </div>
  );
}
