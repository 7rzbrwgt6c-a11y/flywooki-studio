import { openDB } from "./fsm-db.js";

export async function addFilament({
  cnId,
  name,
  categoryId,
  stock = 0
}) {
  cnId = String(cnId || "").trim();
  name = String(name || "").trim();
  stock = Number(stock);

  if (!cnId) throw new Error("Podaj ID CN.");
  if (!name) throw new Error("Podaj nazwę filamentu.");
  if (!categoryId) throw new Error("Wybierz kategorię.");
  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error("Nieprawidłowa ilość.");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["inventory", "stock_movements"],
      "readwrite"
    );

    const inventory = tx.objectStore("inventory");
    const movements = tx.objectStore("stock_movements");

    const filament = {
      cnId,
      name,
      categoryId,
      stock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const request = inventory.add(filament);

    request.onsuccess = () => {
      if (stock > 0) {
        movements.add({
          cnId,
          type: "initial",
          quantity: stock,
          note: "Stan początkowy",
          date: new Date().toISOString()
        });
      }
    };

    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
