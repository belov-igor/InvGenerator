# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Invoice generator for a Serbian sole proprietor (Igor Belov pr Novi Sad). Two independent implementations:

- **`cli/`** — Python CLI, renders HTML via Jinja2, generates PDF via headless Chromium (Playwright)
- **`web/`** — Static JS app (Bootstrap + pdfmake), deployed to GitHub Pages, no backend

## Commands

```bash
# Install dependencies (creates .venv)
uv sync
uv run playwright install chromium

# Generate an invoice
./cli/inv create --client nextgis --number NG-07/2026 --reference 2/2026

# List saved clients
./cli/inv list-clients
```

The `cli/inv` wrapper is a shell script that calls `.venv/bin/python cli/cli.py`. No separate build step.

## CLI architecture

`cli/generator.py` contains all data classes (`Seller`, `Client`, `LineItem`, `Invoice`) and `generate_pdf()`. The PDF pipeline: Jinja2 renders `cli/templates/invoice.html` → Playwright loads the HTML string → `page.pdf()` writes A4 PDF.

`cli/cli.py` is a Click app that wraps `generator.py`. It reads seller data from `cli/settings.json` (gitignored) and client cards from `cli/clients/*.json` (gitignored).

Invoice filename is auto-generated from `invoice.number` with `/` and spaces replaced by `-` to avoid path issues (e.g. `NG-06/2026` → `invoice-NG-06-2026.pdf`).

## Web architecture

Everything is in `web/index.html` + `web/app.js`. Seller settings and client cards are stored in `localStorage`. PDF is generated entirely in the browser via pdfmake — no server involved. Deployed automatically to GitHub Pages on push via `.github/workflows/deploy.yml`.

The pdfmake document definition is built inline in `generatePDF()` in `app.js`. To change the PDF layout, edit both `cli/templates/invoice.html` (CLI) and the `docDef` in `app.js` (web) in sync.

## Invoice layout

Minimalist A4: bold "Invoice" heading → metadata (number, date, due date, optional reference) → two-column seller/bill-to → amount-due headline → items table → totals (Subtotal / Total / Amount due) → optional notes.

Seller block includes address, PIB, Matični broj, bank, IBAN, SWIFT, email inline — no separate payment details section.

## Key files

- `cli/settings.json` — seller data, gitignored, copy from `settings.example.json`
- `cli/clients/*.json` — client cards, gitignored
- `cli/invoices/*.pdf` — output, gitignored
- `cli/templates/invoice.html` — Jinja2 template, single source of truth for CLI PDF layout