from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional
import json

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

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

    @property
    def total(self) -> float:
        return round(sum(item.amount for item in self.items), 2)


def generate_pdf(invoice: Invoice, output_path: Optional[Path] = None) -> Path:
    INVOICES_DIR.mkdir(exist_ok=True)
    if output_path is None:
        output_path = INVOICES_DIR / f"invoice-{invoice.number}.pdf"

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    html = env.get_template("invoice.html").render(invoice=invoice)
    HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf(str(output_path))
    return output_path
