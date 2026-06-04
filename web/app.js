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

// ── PDF Generation ────────────────────────────────────────
function generatePDF() {
  const seller = storage.getSeller();
  if (!seller.name) {
    alert('Please set up your seller info first (⚙ Settings).');
    return;
  }

  const number   = document.getElementById('inv-number').value.trim();
  const invDate  = document.getElementById('inv-date').value;
  const dueDate  = document.getElementById('due-date').value;
  const currency = document.getElementById('currency').value;
  const notes    = document.getElementById('notes').value.trim();
  const client   = getClientForm();
  const items    = getItems();

  if (!number || !invDate || !dueDate) { alert('Fill in invoice number and dates.'); return; }
  if (!client.name) { alert('Enter client name.'); return; }
  if (!items.length) { alert('Add at least one line item.'); return; }

  const total = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const DARK  = '#1a1a2e';
  const GREY  = '#666666';
  const LGREY = '#aaaaaa';

  const sellerAddr = [seller.address, seller.city, seller.country].filter(Boolean).join('\n');
  const clientAddr = [client.address, client.city, client.country].filter(Boolean).join('\n');
  const clientMeta = [
    client.reg_number ? `Reg. No: ${client.reg_number}` : null,
    client.vat_number ? `VAT: ${client.vat_number}` : null,
    client.email      || null,
  ].filter(Boolean).join('\n');

  const itemRows = items.map(item => [
    { text: item.description, fontSize: 9.5 },
    { text: item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(2), alignment: 'right', fontSize: 9.5 },
    { text: item.unit, fontSize: 9.5 },
    { text: fmtNum(item.rate), alignment: 'right', fontSize: 9.5 },
    { text: fmtNum(item.quantity * item.rate), alignment: 'right', fontSize: 9.5 },
  ]);

  function noteBox(label, content) {
    return {
      table: {
        widths: [3, '*'],
        body: [[
          { text: '', fillColor: DARK, border: [false,false,false,false] },
          {
            stack: [
              { text: label, fontSize: 7.5, color: LGREY, bold: true, characterSpacing: 1.5, margin: [0, 0, 0, 5] },
              ...(Array.isArray(content) ? content : [{ text: content, fontSize: 9, color: '#555555' }])
            ],
            fillColor: '#f5f5f5',
            border: [false,false,false,false],
            margin: [12, 10, 12, 10],
          }
        ]]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
    };
  }

  const payRows = [
    seller.bank  ? [{ text: 'Bank',      fontSize: 8.5, color: LGREY }, { text: seller.bank,  fontSize: 9, color: '#555' }] : null,
    seller.iban  ? [{ text: 'IBAN',      fontSize: 8.5, color: LGREY }, { text: seller.iban,  fontSize: 9, color: '#555' }] : null,
    seller.swift ? [{ text: 'SWIFT/BIC', fontSize: 8.5, color: LGREY }, { text: seller.swift, fontSize: 9, color: '#555' }] : null,
  ].filter(Boolean);

  const docDef = {
    pageSize: 'A4',
    pageMargins: [56, 56, 56, 70],
    defaultStyle: { font: 'Helvetica' },
    content: [
      // Header
      {
        columns: [
          {
            stack: [
              { text: seller.name, fontSize: 20, bold: true, color: DARK },
              sellerAddr ? { text: sellerAddr, fontSize: 9, color: GREY, margin: [0, 5, 0, 0], lineHeight: 1.5 } : {},
              seller.email ? { text: seller.email, fontSize: 9, color: GREY } : {},
              seller.phone ? { text: seller.phone, fontSize: 9, color: GREY } : {},
            ]
          },
          {
            stack: [
              { text: 'INVOICE', fontSize: 28, color: DARK, alignment: 'right', characterSpacing: 3 },
              { text: `No. ${number}`, fontSize: 9.5, color: LGREY, alignment: 'right', margin: [0, 4, 0, 0] },
            ]
          }
        ]
      },
      // Divider
      { canvas: [{ type: 'line', x1: 0, y1: 8, x2: 483, y2: 8, lineWidth: 2, lineColor: DARK }], margin: [0, 8, 0, 20] },
      // Bill To + Invoice info
      {
        columns: [
          {
            stack: [
              { text: 'BILL TO', fontSize: 8, color: LGREY, bold: true, characterSpacing: 1.5 },
              { text: client.name, fontSize: 12, bold: true, color: DARK, margin: [0, 5, 0, 3] },
              clientAddr ? { text: clientAddr, fontSize: 9, color: GREY, lineHeight: 1.5 } : {},
              clientMeta ? { text: clientMeta, fontSize: 9, color: GREY, lineHeight: 1.5, margin: [0, 2, 0, 0] } : {},
            ],
            width: '*',
          },
          {
            table: {
              body: [
                [{ text: 'Date',     fontSize: 8, color: LGREY, bold: true }, { text: fmtDate(invDate), bold: true, color: DARK }],
                [{ text: 'Due Date', fontSize: 8, color: LGREY, bold: true }, { text: fmtDate(dueDate), bold: true, color: DARK }],
                [{ text: 'Currency', fontSize: 8, color: LGREY, bold: true }, { text: currency, bold: true, color: DARK }],
              ]
            },
            layout: 'noBorders',
            width: 'auto',
          }
        ],
        margin: [0, 0, 0, 24],
      },
      // Items table
      {
        table: {
          headerRows: 1,
          widths: ['*', 45, 52, 65, 65],
          body: [
            [
              { text: 'DESCRIPTION', style: 'th' },
              { text: 'QTY',    style: 'th', alignment: 'right' },
              { text: 'UNIT',   style: 'th' },
              { text: 'RATE',   style: 'th', alignment: 'right' },
              { text: 'AMOUNT', style: 'th', alignment: 'right' },
            ],
            ...itemRows,
          ]
        },
        layout: {
          hLineWidth: (i) => i <= 1 ? 0 : 0.5,
          vLineWidth: ()  => 0,
          hLineColor: ()  => '#ececec',
          fillColor:  (i) => i === 0 ? DARK : (i % 2 === 0 ? '#f8f8f8' : null),
          paddingLeft:   () => 10,
          paddingRight:  () => 10,
          paddingTop:    () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 12],
      },
      // Total
      {
        columns: [
          { text: '', width: '*' },
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: DARK }] },
              { text: `Total   ${currency} ${fmtNum(total)}`, fontSize: 13, bold: true, color: DARK, alignment: 'right', margin: [0, 7, 0, 0] },
            ],
            width: 200,
          }
        ],
        margin: [0, 4, 0, 28],
      },
      // Notes
      ...(notes ? [noteBox('NOTES', notes)] : []),
      // Payment details
      ...(payRows.length ? [noteBox('PAYMENT DETAILS', [{ table: { body: payRows }, layout: 'noBorders' }])] : []),
      // Footer IDs
      ...(seller.pib ? [{
        text: `PIB: ${seller.pib}` + (seller.maticni_broj ? `  ·  Matični broj: ${seller.maticni_broj}` : ''),
        fontSize: 8, color: '#cccccc', alignment: 'center', margin: [0, 10, 0, 0],
      }] : []),
    ],
    styles: {
      th: { fontSize: 8, bold: true, color: '#ffffff' },
    },
  };

  pdfMake.createPdf(docDef).download(`invoice-${number}.pdf`);
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
