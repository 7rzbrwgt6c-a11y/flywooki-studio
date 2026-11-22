
import { getAll } from "./database/fsm-db.js";
import { addFilament } from "./database/inventory.js";
import { getCategories, addCategory } from "./database/categories.js";
import { stockOperation } from "./database/stock.js";

const root = document.body;

root.innerHTML = `
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #111318;
  color: #f1f1f1;
  font-family: Arial, sans-serif;
}
.fsm {
  max-width: 1100px;
  margin: auto;
  padding: 20px;
}
header {
  border-bottom: 1px solid #333;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.logo { color: #ff7a18; font-size: 28px; font-weight: bold; }
.subtitle { color: #888; margin-top: 5px; }
button {
  background: #ff7a18;
  color: #111;
  border: 0;
  padding: 11px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
button.secondary {
  background: #272a33;
  color: white;
}
.card {
  background: #1b1e25;
  border: 1px solid #30343d;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
input, select {
  width: 100%;
  background: #101218;
  color: white;
  border: 1px solid #363a45;
  border-radius: 8px;
  padding: 12px;
  margin: 6px 0 12px;
}
label { color: #bbb; font-size: 14px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(230px,1fr));
  gap: 12px;
}
.filament {
  border: 1px solid #343843;
  padding: 14px;
  border-radius: 10px;
  background: #20232b;
}
.cn { color: #ff7a18; font-weight: bold; }
.stock { font-size: 22px; margin-top: 8px; }
.small { color: #999; font-size: 13px; }
#message { margin: 12px 0; }
hr { border-color: #333; }
</style>

<div class="fsm">
<header>
  <div class="logo">FLYWOOKI STUDIO</div>
  <div class="subtitle">Filament Stock Manager</div>
</header>

<div id="message"></div>

<div class="card">
  <h2>Magazyn filamentów</h2>
  <input id="search" placeholder="Szukaj nazwy lub ID CN...">
  <div id="inventory" class="grid"></div>
</div>

<div class="card">
  <h2>Dodaj filament</h2>
  <label>ID CN</label>
  <input id="cn" placeholder="Unikalny identyfikator">

  <label>Nazwa filamentu</label>
  <input id="name" placeholder="np. PLA Basic Black">

  <label>Kategoria</label>
  <select id="category"></select>

  <label>Stan początkowy</label>
  <input id="stock" type="number" min="0" step="0.01" value="0">

  <button id="addFilament">Dodaj do magazynu</button>
</div>

<div class="card">
  <h2>Kategorie</h2>
  <input id="categoryName" placeholder="Nazwa nowej kategorii">
  <button id="addCategory">Dodaj kategorię</button>
  <div id="categoriesList" class="small"></div>
</div>

<div class="card">
  <h2>Operacja magazynowa</h2>

  <label>ID CN filamentu</label>
  <input id="operationCN" placeholder="Wpisz ID CN">

  <label>Typ operacji</label>
  <select id="operationType">
    <option value="purchase">Zakup / przyjęcie</option>
    <option value="sale">Sprzedaż</option>
    <option value="consumption">Zużycie</option>
    <option value="adjustment">Korekta (+)</option>
  </select>

  <label>Ilość</label>
  <input id="operationQuantity" type="number" min="0.01" step="0.01">

  <label>Notatka</label>
  <input id="operationNote" placeholder="Opcjonalnie">

  <button id="performOperation">Wykonaj operację</button>
</div>

<div class="card">
  <h2>Historia magazynowa</h2>
  <div id="history"></div>
</div>
</div>
`;

const $ = id => document.getElementById(id);

function message(text, error = false) {
  $("message").textContent = text;
  $("message").style.color = error ? "#ff5555" : "#ff7a18";
}

async function refresh() {
  const items = await getAll("inventory");
  const categories = await getCategories();
  const movements = await getAll("stock_movements");

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const search = $("search").value.toLowerCase();

  $("inventory").innerHTML = items
    .filter(i =>
      i.name.toLowerCase().includes(search) ||
      i.cnId.toLowerCase().includes(search)
    )
    .map(i => `
      <div class="filament">
        <div class="cn">${escapeHTML(i.cnId)}</div>
        <strong>${escapeHTML(i.name)}</strong>
        <div class="small">
          ${escapeHTML(categoryMap.get(i.categoryId) || "Brak kategorii")}
        </div>
        <div class="stock">${i.stock} szt.</div>
        <button class="secondary" onclick="document.getElementById('operationCN').value='${escapeHTML(i.cnId)}'">
          Operacja
        </button>
      </div>
    `).join("");

  $("category").innerHTML = categories.map(c =>
    `<option value="${c.id}">${escapeHTML(c.name)}</option>`
  ).join("");

  $("categoriesList").innerHTML = categories.map(c =>
    `<div>• ${escapeHTML(c.name)}</div>`
  ).join("");

  $("history").innerHTML = movements
    .slice()
    .reverse()
    .slice(0, 30)
    .map(m => `
      <div class="small" style="padding:8px 0;border-bottom:1px solid #333">
        <strong>${escapeHTML(m.cnId)}</strong> —
        ${escapeHTML(m.type)} —
        ${m.quantity > 0 ? "+" : ""}${m.quantity} —
        ${new Date(m.date).toLocaleString("pl-PL")}
        ${m.note ? "<br>" + escapeHTML(m.note) : ""}
      </div>
    `).join("");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

$("search").addEventListener("input", refresh);

$("addFilament").addEventListener("click", async () => {
  try {
    await addFilament({
      cnId: $("cn").value,
      name: $("name").value,
      categoryId: Number($("category").value),
      stock: Number($("stock").value)
    });

    $("cn").value = "";
    $("name").value = "";
    $("stock").value = "0";

    message("Filament dodany.");
    await refresh();
  } catch (e) {
    message(e.message, true);
  }
});

$("addCategory").addEventListener("click", async () => {
  try {
    await addCategory({
      name: $("categoryName").value
    });

    $("categoryName").value = "";
    message("Kategoria dodana.");
    await refresh();
  } catch (e) {
    message(e.message, true);
  }
});

$("performOperation").addEventListener("click", async () => {
  try {
    await stockOperation({
      cnId: $("operationCN").value,
      type: $("operationType").value,
      quantity: Number($("operationQuantity").value),
      note: $("operationNote").value
    });

    $("operationQuantity").value = "";
    $("operationNote").value = "";

    message("Operacja wykonana.");
    await refresh();
  } catch (e) {
    message(e.message, true);
  }
});

await refresh();
