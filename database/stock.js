import { openDB } from "./fsm-db.js";

const TYPES = ["purchase", "sale", "consumption", "adjustment"];

export async function stockOperation({
  cnId,
  type,
  quantity,
  note = ""
}) {
  if (!cnId) throw new Error("Brak ID CN.");
  if (!TYPES.includes(type)) throw new Error("Nieprawidłowy typ operacji.");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Ilość musi być większa od zera.");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["inventory", "stock_movements"],
      "readwrite"
    );

    const inventoryStore = tx.objectStore("inventory");
    const movementStore = tx.objectStore("stock_movements");
    const index = inventoryStore.index("cnId");

    const request = index.get(cnId);

    request.onsuccess = () => {
      const item = request.result;

      if (!item) {
        tx.abort();
        reject(new Error("Nie znaleziono filamentu o podanym ID CN."));
        return;
      }

      let delta;

      if (type === "purchase") {
        delta = quantity;
      } else if (type === "adjustment") {
        delta = quantity;
      } else {
        delta = -quantity;
      }

      const currentStock = Number(item.stock || 0);
      const newStock = currentStock + delta;

      if (newStock < 0) {
        tx.abort();
        reject(new Error("Brak wystarczającego stanu magazynowego."));
        return;
      }

      item.stock = newStock;
      item.updatedAt = new Date().toISOString();

      inventoryStore.put(item);

      movementStore.add({
        cnId,
        type,
        quantity: delta,
        note,
        date: new Date().toISOString()
      });
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => {
      if (tx.error) reject(tx.error);
    };
  });
}
