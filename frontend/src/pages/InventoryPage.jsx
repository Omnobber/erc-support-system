import { useEffect, useState } from "react";
import api from "../api";

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    sku: "",
    quantity: 0,
    threshold: 5,
    unit: "pcs"
  });

  const load = async () => {
    try {
      const { data } = await api.get("/inventory");
      setItems(data.items);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load inventory");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createItem = async (event) => {
    event.preventDefault();
    try {
      await api.post("/inventory", form);
      setForm({ name: "", sku: "", quantity: 0, threshold: 5, unit: "pcs" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create inventory item");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-heading text-xl font-semibold">Inventory Module</h2>
        <form onSubmit={createItem} className="mt-3 grid gap-2 md:grid-cols-5">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Part name"
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
            required
          />
          <input
            value={form.sku}
            onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
            placeholder="SKU"
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
            required
          />
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
            placeholder="Qty"
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
            required
          />
          <input
            type="number"
            value={form.threshold}
            onChange={(e) => setForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
            placeholder="Low threshold"
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
            required
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white">Add Part</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">Part</th>
                <th className="p-2">SKU</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Threshold</th>
                <th className="p-2">Alert</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-2 font-semibold">{item.name}</td>
                  <td className="p-2">{item.sku}</td>
                  <td className="p-2">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="p-2">{item.threshold}</td>
                  <td className={`p-2 font-semibold ${item.quantity <= item.threshold ? "text-red-600" : "text-brand-700"}`}>
                    {item.quantity <= item.threshold ? "Low Stock" : "Healthy"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default InventoryPage;
