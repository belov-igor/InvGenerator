# InvGenerator

Invoice generator for freelancers and sole proprietors. Two independent implementations in one repo:

- **`cli/`** — Python CLI for local use, generates PDF via WeasyPrint
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

### Requirements

```bash
# macOS — pango is required by WeasyPrint
brew install pango

# Python dependencies
pip install -r cli/requirements.txt
```

### Setup

```bash
cp cli/settings.example.json cli/settings.json
# Edit cli/settings.json with your details (name, address, PIB, IBAN, etc.)
```

### Usage

```bash
cd cli

# Create a client card
cat > clients/acme-ou.json << 'EOF'
{
  "name": "Acme OÜ",
  "address": "Tallinn Street 42",
  "city": "Tallinn 10001",
  "country": "Estonia",
  "reg_number": "12345678",
  "vat_number": "EE123456789",
  "email": "accounting@acme.ee"
}
EOF

# Generate invoice (interactive line items)
./inv create --client acme-ou --number 2026-001

# Options
./inv create --client acme-ou --number 2026-001 --date 2026-06-01 --due-days 30
./inv list-clients
```

PDF is saved to `cli/invoices/invoice-<number>.pdf`.

### Invoice fields

`cli/settings.json` — your seller info:

| Field | Description |
|---|---|
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
    generator.py          # dataclasses + PDF generation (WeasyPrint)
    cli.py                # Click CLI
    inv                   # wrapper script (sets DYLD_LIBRARY_PATH on macOS)
    templates/
      invoice.html        # Jinja2 PDF template
    settings.example.json
    requirements.txt
    clients/              # saved client cards (gitignored)
    invoices/             # generated PDFs (gitignored)
  web/
    index.html            # Bootstrap form
    app.js                # pdfmake + localStorage logic
  .github/workflows/
    deploy.yml            # auto-deploy web/ to GitHub Pages on push
```

---

## Invoice design

Clean A4 layout: seller info + "INVOICE" header, bill-to block, items table with alternating rows, total, notes box with VAT disclaimer, payment details, PIB/Matični broj footer.

Default notes: *VAT not applicable – export of services (B2B)*
