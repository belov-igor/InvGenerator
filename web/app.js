// ── LocalStorage ────────────────────────────────────────
const SELLER_KEY = 'invgen_seller';
const CLIENT_PREFIX = 'invgen_client_';

const storage = {
  getSeller:   ()     => JSON.parse(localStorage.getItem(SELLER_KEY) || '{}'),
  saveSeller:  (d)    => localStorage.setItem(SELLER_KEY, JSON.stringify(d)),
  getClient:   (name) => JSON.parse(localStorage.getItem(CLIENT_PREFIX + name) || 'null'),
  saveClient:  (name, d) => localStorage.setItem(CLIENT_PREFIX + name, JSON.stringify(d)),
  listClients: ()     => Object.keys(localStorage)
    .filter(k => k.startsWith(CLIENT_PREFIX))
    .map(k => k.slice(CLIENT_PREFIX.length))
    .sort(),
};

// ── Seller ───────────────────────────────────────────────
function updateSellerDisplay() {
  const s = storage.getSeller();
  const el = document.getElementById('seller-display');
  if (s.name) {
    el.textContent = s.name;
    el.className = 'text-muted small';
  } else {
    el.textContent = '⚠ Set up seller info';
    el.className = 'text-danger small';
  }
}

function loadSellerForm() {
  const s = storage.getSeller();
  ['name','email','address','city','country','pib','maticni_broj','phone','bank','iban','swift']
    .forEach(f => { const el = document.getElementById(`seller_${f}`); if (el) el.value = s[f] || ''; });
}

function saveSellerSettings() {
  const fields = ['name','email','address','city','country','pib','maticni_broj','phone','bank','iban','swift'];
  const data = {};
  fields.forEach(f => { data[f] = (document.getElementById(`seller_${f}`)?.value || '').trim(); });
  storage.saveSeller(data);
  updateSellerDisplay();
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
  toast('Settings saved');
}

function exportSellerSettings() {
  const data = storage.getSeller();
  if (!data.name) { toast('Nothing to export yet', 'warning'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'my-seller-settings.json';
  a.click();
}

function importSellerSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      storage.saveSeller(data);
      loadSellerForm();
      updateSellerDisplay();
      toast('Settings imported');
    } catch {
      alert('Invalid JSON file');
    }
  };
  input.click();
}

// ── Client helpers ───────────────────────────────────────
const CLIENT_FIELDS = ['name','email','address','city','country','reg_number','vat_number'];

function getClientForm() {
  const d = {};
  CLIENT_FIELDS.forEach(f => { d[f] = (document.getElementById(`client_${f}`)?.value || '').trim(); });
  return d;
}

function fillClientForm(data) {
  if (!data) return;
  CLIENT_FIELDS.forEach(f => {
    const el = document.getElementById(`client_${f}`);
    if (el) el.value = data[f] || '';
  });
}

function refreshClientDropdown(selectName = null) {
  const dd = document.getElementById('client-select');
  const prev = selectName || dd.value;
  dd.innerHTML = '<option value="">— saved clients —</option>';
  storage.listClients().forEach(name => {
    const opt = new Option(name, name);
    if (name === prev) opt.selected = true;
    dd.appendChild(opt);
  });
  document.getElementById('btn-load-client').disabled = !dd.value;
}

function loadSelectedClient() {
  const name = document.getElementById('client-select').value;
  if (!name) return;
  fillClientForm(storage.getClient(name));
  toast(`Loaded: ${name}`);
}

function saveCurrentClient() {
  const data = getClientForm();
  if (!data.name) { toast('Enter client name first', 'warning'); return; }
  const name = prompt('Save as (slug, e.g. "acme-ou"):')?.trim();
  if (!name) return;
  storage.saveClient(name, data);
  refreshClientDropdown(name);
  toast(`Saved: ${name}`);
}

function exportClient() {
  const name = document.getElementById('client-select').value;
  if (!name) { toast('Select a client first', 'warning'); return; }
  const data = storage.getClient(name);
  if (!data) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `${name}.json`;
  a.click();
}

function importClient() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const name = file.name.replace(/\.json$/, '');
      storage.saveClient(name, data);
      refreshClientDropdown(name);
      fillClientForm(data);
      toast(`Imported: ${name}`);
    } catch {
      alert('Invalid JSON file');
    }
  };
  input.click();
}

// ── Line items ────────────────────────────────────────────
function addItem(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="form-control form-control-sm" name="description"
         value="${esc(data.description || '')}" required></td>
    <td><input type="number" class="form-control form-control-sm" name="quantity"
         value="${data.quantity ?? 1}" step="0.01" min="0.01"
         oninput="calcRow(this);updateTotal()" required></td>
    <td><input type="text" class="form-control form-control-sm" name="unit"
         value="${esc(data.unit || 'service')}"></td>
    <td><input type="number" class="form-control form-control-sm" name="rate"
         value="${data.rate ?? ''}" step="0.01" min="0"
         oninput="calcRow(this);updateTotal()" required></td>
    <td class="text-end">
      <span class="row-amount text-muted small">${data.rate ? fmtNum((data.quantity ?? 1) * data.rate) : '—'}</span>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-sm btn-link text-danger p-0 remove-row"
              onclick="this.closest('tr').remove();updateTotal()">✕</button>
    </td>`;
  document.getElementById('items-body').appendChild(tr);
  updateTotal();
}

function calcRow(input) {
  const row = input.closest('tr');
  const qty  = parseFloat(row.querySelector('[name="quantity"]').value) || 0;
  const rate = parseFloat(row.querySelector('[name="rate"]').value)     || 0;
  row.querySelector('.row-amount').textContent = qty && rate ? fmtNum(qty * rate) : '—';
}

function getItems() {
  return [...document.querySelectorAll('#items-body tr')].map(row => ({
    description: row.querySelector('[name="description"]').value.trim(),
    quantity:    parseFloat(row.querySelector('[name="quantity"]').value) || 1,
    unit:        row.querySelector('[name="unit"]').value.trim() || 'service',
    rate:        parseFloat(row.querySelector('[name="rate"]').value) || 0,
  })).filter(i => i.description);
}

function updateTotal() {
  const items = getItems();
  const total = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const currency = document.getElementById('currency').value;
  document.getElementById('grand-total').textContent = total > 0 ? `Total: ${currency} ${fmtNum(total)}` : '';
}

// ── Template switching ────────────────────────────────────
let currentTemplate = 'default';

const NOTES_DEFAULT = {
  default: 'VAT not applicable – export of services (B2B)',
  serbian: 'Payment deadline is 15 days',
};

const ITEM_HEADERS = {
  default: { description: 'Description', qty: 'Qty',        unit: 'Unit',       rate: 'Rate',       amount: 'Amount'       },
  serbian: { description: 'Description / Vrsta usluge', qty: 'Qty / Kol.', unit: 'Unit / Jed.', rate: 'Rate / Cena', amount: 'Amount / Ukupno' },
};

function setTemplate(tpl) {
  currentTemplate = tpl;
  const notesEl = document.getElementById('notes');
  if (Object.values(NOTES_DEFAULT).includes(notesEl.value.trim())) {
    notesEl.value = NOTES_DEFAULT[tpl];
  }
  const h = ITEM_HEADERS[tpl];
  document.getElementById('th-description').textContent = h.description;
  document.getElementById('th-qty').textContent         = h.qty;
  document.getElementById('th-unit').textContent        = h.unit;
  document.getElementById('th-rate').textContent        = h.rate;
  document.getElementById('th-amount').textContent      = h.amount;
}

// ── PDF Generation ────────────────────────────────────────
function generatePDF() {
  const seller = storage.getSeller();
  if (!seller.name) { alert('Please set up your seller info first (⚙ Settings).'); return; }

  const number    = document.getElementById('inv-number').value.trim();
  const invDate   = document.getElementById('inv-date').value;
  const dueDate   = document.getElementById('due-date').value;
  const currency  = document.getElementById('currency').value;
  const reference = document.getElementById('reference').value.trim();
  const notes     = document.getElementById('notes').value.trim();
  const client    = getClientForm();
  const items     = getItems();

  if (!number || !invDate || !dueDate) { alert('Fill in invoice number and dates.'); return; }
  if (!client.name) { alert('Enter client name.'); return; }
  if (!items.length) { alert('Add at least one line item.'); return; }

  const data = {
    seller, client, number, invDate, dueDate, currency, reference, notes, items,
    total: items.reduce((s, i) => s + i.quantity * i.rate, 0),
  };

  if (currentTemplate === 'serbian') generateSerbian(data);
  else generateDefault(data);
}

// ── Utilities ─────────────────────────────────────────────
function fmtNum(n) {
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function addDays(str, n) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `alert alert-${type} py-2 px-3 mb-2 shadow-sm`;
  el.style.fontSize = '0.85rem';
  el.textContent = msg;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const t = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = t;
  document.getElementById('due-date').value = addDays(t, 14);

  document.getElementById('inv-date').addEventListener('change', function () {
    document.getElementById('due-date').value = addDays(this.value, 14);
  });
  document.getElementById('currency').addEventListener('change', updateTotal);

  document.getElementById('settingsModal').addEventListener('show.bs.modal', loadSellerForm);

  updateSellerDisplay();
  refreshClientDropdown();
  addItem();
});
