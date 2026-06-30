// Serbian / bilingual invoice template (Faktura)
function generateSerbian(data) {
  const { seller, client, number, invDate, dueDate, currency, reference, notes, items, total } = data;
  const GREY  = '#555555';
  const SHADE = '#f0f0f0';
  const nData = items.length;

  const sellerLines = [
    seller.name,
    seller.address,
    seller.city,
    seller.country,
    seller.pib          ? `VAT / EIB / PIB: ${seller.pib}` : null,
    seller.maticni_broj ? `ID no / MB / Matični broj: ${seller.maticni_broj}` : null,
    seller.iban         ? `IBAN: ${seller.iban}` : null,
    seller.swift        ? `SWIFT: ${seller.swift}` : null,
    seller.email        ? `E-mail: ${seller.email}` : null,
    seller.phone        ? `Tel: ${seller.phone}` : null,
  ].filter(Boolean).join('\n');

  const clientLines = [
    `Address / Adresa: ${client.address || ''}`,
    `City / Grad: ${client.city || ''}`,
    `Country / Država: ${client.country || ''}`,
    client.vat_number ? `VAT / EIB / PIB: ${client.vat_number}` : null,
    client.reg_number ? `ID no / MB / Matični broj: ${client.reg_number}` : null,
    reference         ? `Reference / Poziv: ${reference}` : null,
  ].filter(Boolean).join('\n');

  const itemRows = items.map(item => [
    { text: item.description, fontSize: 9.5 },
    { text: item.unit, fontSize: 9.5 },
    { text: fmtSrb(item.quantity), alignment: 'right', fontSize: 9.5 },
    { text: fmtSrb(item.rate), alignment: 'right', fontSize: 9.5 },
    { text: '0,00', alignment: 'right', fontSize: 9.5, fillColor: SHADE },
    { text: fmtSrb(item.quantity * item.rate), alignment: 'right', fontSize: 9.5, fillColor: SHADE },
  ]);

  const th = (txt, opts = {}) => ({ text: txt, fontSize: 8.5, bold: true, lineHeight: 1.25, ...opts });
  const sep = { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 481, y2: 0, lineWidth: 0.5, lineColor: '#000000' }] };

  const docDef = {
    pageSize: 'A4',
    pageMargins: [57, 50, 57, 55],
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#000000', lineHeight: 1.45 },
    footer: (currentPage, pageCount) => ({
      canvas: [{ type: 'line', x1: 57, y1: 0, x2: 538, y2: 0, lineWidth: 0.5, lineColor: '#000000' }],
      // text drawn below the line via a column stack isn't straightforward in pdfmake footer,
      // so we use a table trick
    }),
    content: [
      // Title left + meta right
      {
        columns: [
          {
            stack: [
              { text: 'Invoice / Faktura:', fontSize: 17, bold: true, lineHeight: 1.1 },
              { text: number, fontSize: 17, bold: true, lineHeight: 1.1 },
            ],
            width: 'auto',
            margin: [0, 0, 24, 0],
          },
          {
            columns: [
              {
                stack: [
                  { text: 'Invoice date / Datum fakture', fontSize: 9, color: GREY },
                  { text: fmtDateSrb(invDate), fontSize: 9.5, margin: [0, 0, 0, 6] },
                ],
                width: '*',
              },
              {
                stack: [
                  { text: 'Trading date / Datum prometa', fontSize: 9, color: GREY },
                  { text: fmtDateSrb(invDate), fontSize: 9.5, margin: [0, 0, 0, 6] },
                  { text: 'Trading place / Mesto prometa', fontSize: 9, color: GREY },
                  { text: client.country || '', fontSize: 9.5 },
                ],
                width: '*',
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 10],
      },
      { ...sep, margin: [0, 0, 0, 10] },
      // Parties
      {
        columns: [
          {
            stack: [
              { text: 'From / Od:', fontSize: 9.5, color: GREY, margin: [0, 0, 0, 3] },
              { text: seller.name, bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
              { text: sellerLines, fontSize: 9.5, lineHeight: 1.6 },
            ],
            width: '*',
          },
          {
            stack: [
              { text: 'Bill to / Klijent:', fontSize: 9.5, color: GREY, margin: [0, 0, 0, 3] },
              { text: client.name, bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
              { text: clientLines, fontSize: 9.5, lineHeight: 1.6 },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 10],
      },
      { ...sep, margin: [0, 0, 0, 8] },
      // Items + Totals in one table for continuous gray column
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 50, 40, 55, 52],
          body: [
            [
              th('Type of service\n(Vrsta usluge)'),
              th('Unit\n(Jedinica)'),
              th('Quantity\n(Količina)'),
              th('Price\n(Cena)'),
              th('Discount\n(Rabat %)', { fillColor: SHADE }),
              th('Total\n(Ukupno)', { fillColor: SHADE }),
            ],
            ...itemRows,
            // Totals rows — colspan keeps gray column continuous
            [
              { text: `Total / Ukupno (${currency})`, bold: true, fontSize: 10, colSpan: 4 }, {}, {}, {},
              { text: fmtSrb(total), bold: true, alignment: 'right', fontSize: 10, fillColor: SHADE, colSpan: 2 }, {},
            ],
            [
              { text: `Discount / Rabat (${currency})`, bold: true, fontSize: 10, colSpan: 4 }, {}, {}, {},
              { text: '0,00', bold: true, alignment: 'right', fontSize: 10, fillColor: SHADE, colSpan: 2 }, {},
            ],
            [
              { text: `Total for payment / Ukupno za uplatu (${currency})`, bold: true, fontSize: 10, colSpan: 4 }, {}, {}, {},
              { text: fmtSrb(total), bold: true, alignment: 'right', fontSize: 10, fillColor: SHADE, colSpan: 2 }, {},
            ],
          ],
        },
        layout: {
          hLineWidth: (i) => {
            if (i === 0) return 1.5;
            if (i === 1) return 1;
            if (i === 1 + nData) return 1;
            return 0.5;
          },
          hLineColor: (i) => (i === 0 || i === 1 || i === 1 + nData) ? '#000000' : '#cccccc',
          vLineWidth: () => 0,
          paddingLeft:   () => 5,
          paddingRight:  () => 5,
          paddingTop:    (i) => i === 0 ? 5 : 7,
          paddingBottom: (i) => i === 0 ? 4 : 7,
        },
        margin: [0, 0, 0, 14],
      },
      // Comment
      ...(notes ? [
        { text: 'Comment / Opis usluge', bold: true, fontSize: 9.5, margin: [0, 0, 0, 3] },
        { text: notes, fontSize: 9.5, lineHeight: 1.5 },
      ] : []),
      // Page footer
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 481, y2: 0, lineWidth: 0.5, lineColor: '#000000' }],
        margin: [0, 20, 0, 4],
        absolutePosition: { x: 57, y: 790 },
      },
      {
        text: 'Page 1 from 1',
        fontSize: 8,
        color: GREY,
        absolutePosition: { x: 57, y: 798 },
      },
    ],
  };

  pdfMake.createPdf(docDef).download(`invoice-${number}.pdf`);
}

function fmtSrb(n) {
  const [int, dec] = parseFloat(n).toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

function fmtDateSrb(str) {
  const d = new Date(str + 'T00:00:00');
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('.');
}