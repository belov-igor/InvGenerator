# InvGenerator

Invoice generator for freelancers and sole proprietors. Two independent implementations in one repo:

- **`cli/`** — Python CLI, generates PDF via headless Chromium (Playwright)
- **`web/`** — Static JS app hosted on GitHub Pages, generates PDF in the browser via pdfmake

**Live app:** https://belov-igor.github.io/InvGenerator/

---

## Web version

No installation needed. Open the link above, fill in your seller details in ⚙ Settings (saved to localStorage), add a client card, fill in line items, click **Generate PDF**.

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

# Generate invoice (interactive line items)
./cli/inv create --client my-client --number 2026-001

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
      invoice.html        # Jinja2 template
    settings.example.json
    requirements.txt      # for pip-based install
    clients/              # saved client cards (gitignored)
    invoices/             # generated PDFs (gitignored)
  web/
    index.html            # Bootstrap form
    app.js                # pdfmake + localStorage logic
  pyproject.toml          # dependencies for uv
  .github/workflows/
    deploy.yml            # auto-deploy web/ to GitHub Pages on push
```

---

## Invoice design

Minimalist A4 layout: bold "Invoice" heading, invoice metadata, seller + bill-to columns, amount due line, items table with thin rules, totals block, notes and payment details as plain text.

Default notes: *VAT not applicable – export of services (B2B)*