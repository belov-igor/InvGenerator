// Default minimalist English invoice template
function generateDefault(data) {
  const { seller, client, number, invDate, dueDate, currency, reference, notes, items, total } = data;
  const GREY  = '#555555';

  const sellerAddr = [seller.address, seller.city, seller.country].filter(Boolean).join('\n');
  const sellerExtra = [
    seller.pib          ? `Tax ID: ${seller.pib}` : null,
    seller.maticni_broj ? `Reg. No: ${seller.maticni_broj}` : null,
    seller.bank       || null,
    seller.iban       ? `IBAN: ${seller.iban}` : null,
    seller.swift      ? `SWIFT: ${seller.swift}` : null,
    seller.email      || null,
    seller.phone      || null,
  ].filter(Boolean).join('\n');

  const clientAddr = [
    client.address, client.city, client.country,
    client.reg_number ? `Reg. No: ${client.reg_number}` : null,
    client.vat_number ? `VAT: ${client.vat_number}` : null,
    client.email || null,
  ].filter(Boolean).join('\n');

  const itemRows = items.map(item => [
    { text: item.description, fontSize: 9.5 },
    { text: item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(2), alignment: 'right', fontSize: 9.5 },
    { text: item.unit, fontSize: 9.5 },
    { text: fmtNum(item.rate), alignment: 'right', fontSize: 9.5 },
    { text: fmtNum(item.quantity * item.rate), alignment: 'right', fontSize: 9.5 },
  ]);

  const docDef = {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 70],
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#111111', lineHeight: 1.4 },
    content: [
      { text: 'Invoice', fontSize: 24, bold: true, margin: [0, 0, 0, 14] },
      {
        table: {
          widths: [100, '*'],
          body: [
            [{ text: 'Invoice number', fontSize: 9.5, color: GREY }, { text: number,           fontSize: 9.5 }],
            [{ text: 'Date of issue',  fontSize: 9.5, color: GREY }, { text: fmtDate(invDate), fontSize: 9.5 }],
            [{ text: 'Date due',       fontSize: 9.5, color: GREY }, { text: fmtDate(dueDate), fontSize: 9.5 }],
            ...(reference ? [[{ text: 'Reference', fontSize: 9.5, color: GREY }, { text: reference, fontSize: 9.5 }]] : []),
          ]
        },
        layout: {
          hLineWidth: () => 0, vLineWidth: () => 0,
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 1, paddingBottom: () => 1,
        },
        margin: [0, 0, 0, 28],
      },
      {
        columns: [
          {
            stack: [
              { text: 'From:', fontSize: 9.5, color: GREY, margin: [0, 0, 0, 2] },
              { text: seller.name, bold: true, fontSize: 9.5 },
              ...(sellerAddr  ? [{ text: sellerAddr,  fontSize: 9.5, color: GREY, margin: [0, 2, 0, 0], lineHeight: 1.6 }] : []),
              ...(sellerExtra ? [{ text: sellerExtra, fontSize: 9.5, color: GREY, lineHeight: 1.6 }] : []),
            ],
            width: '*',
          },
          {
            stack: [
              { text: 'Bill to:', fontSize: 9.5, color: GREY, margin: [0, 0, 0, 2] },
              { text: client.name, bold: true, fontSize: 9.5, margin: [0, 0, 0, 2] },
              { text: clientAddr, fontSize: 9.5, color: GREY, lineHeight: 1.6 },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 28],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 40, 52, 65, 65],
          body: [
            [
              { text: 'Description', style: 'th' },
              { text: 'Qty',        style: 'th', alignment: 'right' },
              { text: 'Unit',       style: 'th' },
              { text: 'Unit price', style: 'th', alignment: 'right' },
              { text: 'Amount',     style: 'th', alignment: 'right' },
            ],
            ...itemRows,
          ]
        },
        layout: {
          hLineWidth: (i, node) => (i === 0) ? 0 : (i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i) => i === 1 ? '#bbbbbb' : '#e0e0e0',
          paddingLeft:   () => 0,
          paddingRight:  (i, node) => i === node.table.widths.length - 1 ? 0 : 8,
          paddingTop:    (i) => i === 0 ? 6 : 10,
          paddingBottom: (i) => i === 0 ? 6 : 10,
        },
        margin: [0, 0, 0, 16],
      },
      {
        columns: [
          { text: '', width: '*' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Subtotal',   fontSize: 9.5, color: GREY }, { text: `${currency} ${fmtNum(total)}`, fontSize: 9.5, alignment: 'right' }],
                [{ text: 'Total',      fontSize: 9.5, color: GREY }, { text: `${currency} ${fmtNum(total)}`, fontSize: 9.5, alignment: 'right' }],
                [{ text: 'Amount due', fontSize: 9.5, bold: true   }, { text: `${currency} ${fmtNum(total)}`, fontSize: 9.5, bold: true, alignment: 'right' }],
              ]
            },
            layout: {
              hLineWidth: (i) => i === 2 ? 1 : 0,
              vLineWidth: () => 0,
              hLineColor: () => '#bbbbbb',
              paddingLeft:   () => 24,
              paddingRight:  () => 0,
              paddingTop:    (i) => i === 2 ? 8 : 3,
              paddingBottom: () => 3,
            },
            width: 210,
          },
        ],
        margin: [0, 0, 0, 28],
      },
      ...(notes ? [
        { text: 'Notes', bold: true, fontSize: 9.5, margin: [0, 0, 0, 4] },
        { text: notes, fontSize: 9, color: GREY, lineHeight: 1.6, margin: [0, 0, 0, 16] },
      ] : []),
    ],
    styles: {
      th: { fontSize: 9, color: '#555555' },
    },
  };

  pdfMake.createPdf(docDef).download(`invoice-${number}.pdf`);
}