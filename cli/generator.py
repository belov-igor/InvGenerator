from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional
import json

from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright


def _srb_num(value: float) -> str:
    """Format a number in Serbian style: 1.600,00"""
    formatted = f"{value:,.2f}"
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")

BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
INVOICES_DIR = BASE_DIR / "invoices"
CLIENTS_DIR = BASE_DIR / "clients"
SETTINGS_FILE = BASE_DIR / "settings.json"


@dataclass
class Seller:
    name: str
    address: str
    city: str
    country: str
    pib: str = ""
    maticni_broj: str = ""
    iban: str = ""
    swift: str = ""
    bank: str = ""
    email: str = ""
    phone: str = ""

    @classmethod
    def from_file(cls) -> "Seller":
        if not SETTINGS_FILE.exists():
            raise FileNotFoundError(
                "settings.json not found — copy settings.example.json and fill in your details."
            )
        return cls(**json.loads(SETTINGS_FILE.read_text()))


@dataclass
class Client:
    name: str
    address: str
    city: str
    country: str
    reg_number: str = ""
    vat_number: str = ""
    email: str = ""

    @classmethod
    def from_json(cls, path: Path) -> "Client":
        return cls(**json.loads(path.read_text()))

    def save(self, path: Path):
        path.write_text(json.dumps(self.__dict__, indent=2, ensure_ascii=False))


@dataclass
class LineItem:
    description: str
    quantity: float
    unit: str
    rate: float

    @property
    def amount(self) -> float:
        return round(self.quantity * self.rate, 2)


@dataclass
class Invoice:
    number: str
    date: date
    due_date: date
    seller: Seller
    client: Client
    items: list
    currency: str = "EUR"
    notes: str = "VAT not applicable – export of services (B2B)"
    reference: str = ""

    @property
    def total(self) -> float:
        return round(sum(item.amount for item in self.items), 2)


def generate_pdf(invoice: Invoice, output_path: Optional[Path] = None, template: str = "default") -> Path:
    INVOICES_DIR.mkdir(exist_ok=True)
    if output_path is None:
        safe = invoice.number.replace("/", "-").replace(" ", "-")
        suffix = f"-{template}" if template != "default" else ""
        output_path = INVOICES_DIR / f"invoice-{safe}{suffix}.pdf"

    template_file = "invoice_serbian.html" if template == "serbian" else "invoice.html"
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    env.filters["srb_num"] = _srb_num
    html = env.get_template(template_file).render(invoice=invoice)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        page.pdf(path=str(output_path), format="A4", print_background=True)
        browser.close()

    return output_path
