# InvGenerator

Invoice generator for freelancers and sole proprietors. Two independent implementations in one repo:

- **`cli/`** — Python CLI, generates PDF via headless Chromium (Playwright)
- **`web/`** — Static JS app hosted on GitHub Pages, generates PDF in the browser via pdfmake

**Live app:** https://belov-igor.github.io/InvGenerator/

---

## Web version

No installation needed. Open the link above, fill in your seller details in ⚙ Settings (saved to localStorage), add a client card, fill in line items, click **Generate PDF**.

**Templates:** toggle **EN | SRB** in the Invoice Details panel to switch between the minimalist English invoice and the bilingual Serbian/English Faktura (all form labels switch language too).

**Client cards:** save/load to localStorage, export/import as JSON files — useful for keeping your own copy locally or sharing with others.

**Seller settings:** also exportable as JSON — fill in once, export, re-import on any device.

---

## CLI version

Generates a PDF invoice from a client JSON card and interactive prompts.

### Installation

**With uv (recommended):**

```bash
uv sync
uv run playwright install chromium
```

**With pip:**

```bash
python -m venv .venv
.venv/bin/pip install -r cli/requirements.txt
.venv/bin/playwright install chromium
```

### Setup

```bash
cp cli/settings.example.json cli/settings.json
# Edit cli/settings.json with your details (name, address, PIB, IBAN, etc.)
```

### Usage

```bash
# Create a client card
cat > cli/clients/my-client.json << 'EOF'
{
  "name": "Example Corp Ltd",
  "address": "123 Business Street",
  "city": "City 10001",
  "country": "Country",
  "reg_number": "12345678",
  "vat_number": "VAT123456789",
  "email": "billing@example.com"
}
EOF

# Generate invoice — default minimalist English template
./cli/inv create --client my-client --number 2026-001

# Bilingual Serbian/English Faktura template
./cli/inv create --client my-client --number 2026-001 --template serbian

# Options
./cli/inv create --client my-client --number 2026-001 --date 2026-06-01 --due-days 30
./cli/inv list-clients
```

PDF is saved to `cli/invoices/invoice-<number>.pdf`.

### Invoice fields

`cli/settings.json` — your seller info:

| Field | Description |
| --- | --- |
| `name` | Full name or company name |
| `address` | Street address |
| `city` | City and postal code |
| `country` | Country |
| `pib` | PIB (Serbian tax ID) |
| `maticni_broj` | Matični broj |
| `iban` | IBAN for payment |
| `swift` | SWIFT/BIC |
| `bank` | Bank name |
| `email` | Contact email |
| `phone` | Phone number |

---

## Project structure

```
InvGenerator/
  cli/
    generator.py          # dataclasses + PDF generation (Playwright)
    cli.py                # Click CLI
    inv                   # wrapper script
    templates/
      invoice.html        # Jinja2 template — default (English)
      invoice_serbian.html# Jinja2 template — bilingual Serbian/English
    settings.example.json
    requirements.txt      # for pip-based install
    clients/              # saved client cards (gitignored)
    invoices/             # generated PDFs (gitignored)
  web/
    index.html            # Bootstrap form with EN|SRB switcher
    app.js                # localStorage, template switching, i18n
    template-default.js   # pdfmake layout — default (English)
    template-serbian.js   # pdfmake layout — bilingual Serbian/English
  pyproject.toml          # dependencies for uv
  .github/workflows/
    deploy.yml            # auto-deploy web/ to GitHub Pages on push
```

---

## Invoice templates

### Default (EN)

Minimalist A4 layout inspired by Stripe/Anthropic invoices: bold "Invoice" heading, invoice metadata, seller + bill-to columns, amount due line, items table with thin rules, totals block, notes.

Default notes: *VAT not applicable – export of services (B2B)*

### Serbian / Faktura (SRB)

Bilingual Serbian/English layout matching the Serbian statutory Faktura form: `Invoice / Faktura` heading with invoice date + trading date/place metadata, seller + client columns, single items table with Discount and Total columns (gray background), totals rows, comment section, page footer.

Numbers use Serbian format (period as thousands separator, comma as decimal: `1.600,00`). Dates use DD.MM.YYYY.

Default notes: *Payment deadline is 15 days*