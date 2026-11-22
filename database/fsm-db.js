const DB_NAME = "FlywookiStudio";
const DB_VERSION = 1;

let dbInstance;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("inventory")) {
        const store = db.createObjectStore("inventory", {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("cnId", "cnId", { unique: true });
        store.createIndex("categoryId", "categoryId");
        store.createIndex("name", "name");
      }

      if (!db.objectStoreNames.contains("categories")) {
        const store = db.createObjectStore("categories", {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("name", "name", { unique: true });
      }

      if (!db.objectStoreNames.contains("stock_movements")) {
        const store = db.createObjectStore("stock_movements", {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("cnId", "cnId");
        store.createIndex("date", "date");
        store.createIndex("type", "type");
      }

      if (!db.objectStoreNames.contains("settings")) {
        const store = db.createObjectStore("settings", {
          keyPath: "key"
        });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addItem(storeName, item) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateItem(storeName, item) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(storeName, id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
