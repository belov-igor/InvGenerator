from datetime import date, timedelta
from pathlib import Path

import click

from generator import Seller, Client, LineItem, Invoice, generate_pdf, CLIENTS_DIR


@click.group()
def cli():
    """Invoice Generator — create professional PDF invoices."""


@cli.command()
@click.option("--client", "-c", required=True,
              help="Client name (from clients/) or path to JSON file")
@click.option("--number", "-n", required=True,
              help="Invoice number, e.g. 2026-001")
@click.option("--date", "-d", "inv_date", default=str(date.today()),
              show_default=True, help="Invoice date (YYYY-MM-DD)")
@click.option("--due-days", default=14, show_default=True,
              help="Days until due")
@click.option("--currency", default="EUR", show_default=True)
@click.option("--notes", default="VAT not applicable – export of services (B2B)",
              help="Footer notes")
@click.option("--reference", "-r", default="", help="Payment reference number")
@click.option("--output", "-o", default=None, help="Output PDF path")
def create(client, number, inv_date, due_days, currency, notes, reference, output):
    """Create a new invoice interactively."""
    try:
        seller = Seller.from_file()
    except FileNotFoundError as e:
        raise click.ClickException(str(e))

    client_path = Path(client)
    if not client_path.exists():
        client_path = CLIENTS_DIR / f"{client}.json"
    if not client_path.exists():
        raise click.ClickException(f"Client not found: {client}")

    client_obj = Client.from_json(client_path)

    inv_date_obj = date.fromisoformat(inv_date)
    due_date_obj = inv_date_obj + timedelta(days=due_days)

    click.echo(f"\nCreating invoice {number} for {client_obj.name}")
    click.echo("Enter line items (empty description to finish):\n")

    items = []
    while True:
        description = click.prompt("  Description", default="", show_default=False)
        if not description:
            if not items:
                click.echo("  At least one item is required.")
                continue
            break
        quantity = click.prompt("  Quantity", type=float, default=1.0)
        unit = click.prompt("  Unit", default="service")
        rate = click.prompt("  Rate", type=float)
        items.append(LineItem(description=description, quantity=quantity, unit=unit, rate=rate))
        click.echo(f"  → {currency} {quantity * rate:.2f}\n")

    invoice = Invoice(
        number=number,
        date=inv_date_obj,
        due_date=due_date_obj,
        seller=seller,
        client=client_obj,
        items=items,
        currency=currency,
        notes=notes,
        reference=reference,
    )

    click.echo(f"\nTotal: {currency} {invoice.total:.2f}")

    output_path = Path(output) if output else None
    pdf_path = generate_pdf(invoice, output_path)
    click.secho(f"PDF saved: {pdf_path}", fg="green")


@cli.command("list-clients")
def list_clients():
    """List saved client cards."""
    clients = sorted(CLIENTS_DIR.glob("*.json"))
    if not clients:
        click.echo("No clients saved yet.")
        return
    for p in clients:
        click.echo(f"  {p.stem}")


if __name__ == "__main__":
    cli()
