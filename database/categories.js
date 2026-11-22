import { openDB } from "./fsm-db.js";

export async function addCategory({
  name,
  image = ""
}) {
  name = String(name || "").trim();

  if (!name) {
    throw new Error("Podaj nazwę kategorii.");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    const request = store.add({
      name,
      image,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getCategories() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("categories", "readonly");
    const request = tx.objectStore("categories").getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateCategory({
  id,
  name,
  image = ""
}) {
  if (!id) throw new Error("Brak ID kategorii.");

  name = String(name || "").trim();

  if (!name) {
    throw new Error("Podaj nazwę kategorii.");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    store.put({
      id,
      name,
      image,
      updatedAt: new Date().toISOString()
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCategory(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["categories", "inventory"],
      "readwrite"
    );

    const categories = tx.objectStore("categories");
    const inventory = tx.objectStore("inventory");

    const request = inventory.index("categoryId").getAll(id);

    request.onsuccess = () => {
      if (request.result.length > 0) {
        tx.abort();
        reject(
          new Error("Nie można usunąć kategorii, która zawiera filamenty.")
        );
        return;
      }

      categories.delete(id);
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
