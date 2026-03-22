import { MaintenanceFrequency, PaymentMethod, PaymentStatus, SeedData } from '../types/domain';

export interface MaintenanceReceiptDetails {
  paymentId: string;
  receiptNumber: string;
  receiptIssuedAt: string;
  societyName: string;
  frequency: MaintenanceFrequency;
  residentLabel: string;
  residentPhone?: string;
  residentEmail?: string;
  whatsappPhone?: string;
  unitCode: string;
  periodLabel: string;
  dueDate: string;
  amountInr: number;
  method: PaymentMethod;
  paidAt: string;
  paymentStatus: PaymentStatus;
  currentStatusText: string;
  referenceNote?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  lastPaymentStatusText: string;
}

export type MaintenanceReceiptShareResult =
  | 'shared'
  | 'unsupported'
  | 'cancelled'
  | 'failed';

export function buildMaintenanceReceiptDetails(
  data: SeedData,
  paymentId: string,
): MaintenanceReceiptDetails | null {
  const payment = data.payments.find((item) => item.id === paymentId);
  const receipt = data.receipts.find((item) => item.paymentId === paymentId);

  if (!payment || !receipt) {
    return null;
  }

  const invoice = data.invoices.find((item) => item.id === payment.invoiceId);

  if (!invoice) {
    return null;
  }

  const society = data.societies.find((item) => item.id === payment.societyId);
  const unit = data.units.find((item) => item.id === invoice.unitId);
  const plan = data.maintenancePlans.find((item) => item.id === invoice.planId);
  const reviewedBy = payment.reviewedByUserId
    ? data.users.find((item) => item.id === payment.reviewedByUserId)
    : undefined;
  const submittedBy = payment.submittedByUserId
    ? data.users.find((item) => item.id === payment.submittedByUserId)
    : undefined;
  const linkedResidents = data.occupancy
    .filter((entry) => entry.societyId === payment.societyId && entry.unitId === invoice.unitId)
    .map((entry) => data.users.find((item) => item.id === entry.userId))
    .filter(Boolean) as SeedData['users'];
  const primaryResident = submittedBy ?? linkedResidents[0];
  const previousInvoice = [...data.invoices]
    .filter(
      (item) =>
        item.unitId === invoice.unitId &&
        item.planId === invoice.planId &&
        Date.parse(item.dueDate) < Date.parse(invoice.dueDate),
    )
    .sort((left, right) => Date.parse(right.dueDate) - Date.parse(left.dueDate))[0];

  return {
    paymentId: payment.id,
    receiptNumber: receipt.number,
    receiptIssuedAt: receipt.issuedAt,
    societyName: society?.name ?? 'Society',
    frequency: plan?.frequency ?? 'monthly',
    residentLabel: primaryResident?.name ?? 'Resident',
    residentPhone: primaryResident?.phone,
    residentEmail: primaryResident?.email,
    whatsappPhone: normalizeWhatsappPhone(primaryResident?.phone),
    unitCode: unit?.code ?? 'Unit',
    periodLabel: invoice.periodLabel,
    dueDate: invoice.dueDate,
    amountInr: payment.amountInr,
    method: payment.method,
    paidAt: payment.paidAt,
    paymentStatus: payment.status,
    currentStatusText: humanizeCurrentPaymentStatus(payment.status),
    referenceNote: payment.referenceNote,
    reviewedByName: reviewedBy?.name,
    reviewedAt: payment.reviewedAt,
    lastPaymentStatusText: buildLastPaymentStatusText(data, previousInvoice),
  };
}

export function buildMaintenanceReceiptWhatsappMessage(receipt: MaintenanceReceiptDetails) {
  const lines = [
    `${receipt.societyName}`,
    `${receipt.frequency === 'quarterly' ? 'Quarterly' : 'Monthly'} maintenance receipt`,
    `Receipt no: ${receipt.receiptNumber}`,
    `Resident / office: ${receipt.residentLabel}`,
    `Unit: ${receipt.unitCode}`,
    `Billing period: ${receipt.periodLabel}`,
    `Amount received: ${formatReceiptCurrency(receipt.amountInr)}`,
    `Paid on: ${formatReceiptDateTime(receipt.paidAt)}`,
    `Payment method: ${humanizePaymentMethod(receipt.method)}`,
    `Current status: ${receipt.currentStatusText}`,
    `Last payment status: ${receipt.lastPaymentStatusText}`,
    `Due date: ${formatReceiptDate(receipt.dueDate)}`,
    `Issued on: ${formatReceiptDateTime(receipt.receiptIssuedAt)}`,
  ];

  if (receipt.referenceNote?.trim()) {
    lines.push(`Reference: ${receipt.referenceNote.trim()}`);
  }

  if (receipt.reviewedByName && receipt.reviewedAt) {
    lines.push(`Verified by: ${receipt.reviewedByName} on ${formatReceiptDateTime(receipt.reviewedAt)}`);
  }

  return lines.join('\n');
}

export async function downloadMaintenanceReceiptPdf(receipt: MaintenanceReceiptDetails) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return false;
  }

  const pdfUrl = await createMaintenanceReceiptPdfObjectUrl(receipt);

  if (!pdfUrl) {
    return false;
  }

  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = getMaintenanceReceiptFilename(receipt);
  downloadLink.rel = 'noopener';
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  return true;
}

export async function openMaintenanceReceiptPdf(receipt: MaintenanceReceiptDetails) {
  if (typeof window === 'undefined' || typeof URL === 'undefined') {
    return false;
  }

  const pdfUrl = await createMaintenanceReceiptPdfObjectUrl(receipt);

  if (!pdfUrl) {
    return false;
  }

  const receiptWindow = window.open(pdfUrl, '_blank');

  if (!receiptWindow) {
    const downloaded = await downloadMaintenanceReceiptPdf(receipt);
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    return downloaded;
  }

  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  return true;
}

export async function shareMaintenanceReceiptPdfWithMessage(
  receipt: MaintenanceReceiptDetails,
): Promise<MaintenanceReceiptShareResult> {
  if (typeof navigator === 'undefined' || typeof File === 'undefined') {
    return 'unsupported';
  }

  const pdfBlob = await buildMaintenanceReceiptPdfBlob(receipt);

  if (!pdfBlob) {
    return 'failed';
  }

  const pdfFile = new File([pdfBlob], getMaintenanceReceiptFilename(receipt), {
    type: 'application/pdf',
  });
  const shareData = {
    title: `${receipt.receiptNumber} receipt`,
    text: buildMaintenanceReceiptWhatsappMessage(receipt),
    files: [pdfFile],
  };
  const webNavigator = navigator as Navigator & {
    share?: (data?: { title?: string; text?: string; files?: File[] }) => Promise<void>;
    canShare?: (data?: { files?: File[] }) => boolean;
  };

  if (typeof webNavigator.share !== 'function') {
    return 'unsupported';
  }

  if (typeof webNavigator.canShare === 'function' && !webNavigator.canShare({ files: [pdfFile] })) {
    return 'unsupported';
  }

  try {
    await webNavigator.share(shareData);
    return 'shared';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'cancelled';
    }

    return 'failed';
  }
}

export function getMaintenanceReceiptFilename(receipt: MaintenanceReceiptDetails) {
  return `${sanitizeFilename(receipt.societyName)}-${sanitizeFilename(receipt.receiptNumber)}.pdf`;
}

async function createMaintenanceReceiptPdfObjectUrl(receipt: MaintenanceReceiptDetails) {
  if (typeof URL === 'undefined') {
    return null;
  }

  const pdfBlob = await buildMaintenanceReceiptPdfBlob(receipt);

  if (!pdfBlob) {
    return null;
  }

  return URL.createObjectURL(pdfBlob);
}

async function buildMaintenanceReceiptPdfBlob(receipt: MaintenanceReceiptDetails) {
  if (typeof Blob === 'undefined') {
    return null;
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 42;
  const top = 38;
  const contentWidth = pageWidth - left * 2;
  const title =
    receipt.frequency === 'quarterly' ? 'Quarterly Maintenance Receipt' : 'Monthly Maintenance Receipt';
  const metaRows = [
    ['Resident / office', receipt.residentLabel],
    ['Unit', receipt.unitCode],
    ['Billing period', receipt.periodLabel],
    ['Payment mode', humanizePaymentMethod(receipt.method)],
    ['Paid on', formatReceiptDateTime(receipt.paidAt)],
    ['Due date', formatReceiptDate(receipt.dueDate)],
    ['Issued on', formatReceiptDateTime(receipt.receiptIssuedAt)],
    ['Last payment status', receipt.lastPaymentStatusText],
  ];

  if (receipt.referenceNote?.trim()) {
    metaRows.push(['Reference', receipt.referenceNote.trim()]);
  }

  if (receipt.reviewedByName && receipt.reviewedAt) {
    metaRows.push([
      'Verified by',
      `${receipt.reviewedByName} on ${formatReceiptDateTime(receipt.reviewedAt)}`,
    ]);
  }

  doc.setFillColor(23, 75, 59);
  doc.roundedRect(left, top, contentWidth, 124, 22, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), left + 24, top + 26);
  doc.setFontSize(28);
  doc.text(receipt.receiptNumber, left + 24, top + 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(receipt.societyName, left + 24, top + 86);
  doc.setFontSize(11);
  doc.text(
    `${receipt.residentLabel} - ${receipt.unitCode} - ${receipt.periodLabel}`,
    left + 24,
    top + 106,
  );

  doc.setFillColor(223, 241, 231);
  doc.roundedRect(pageWidth - left - 152, top + 22, 128, 28, 14, 14, 'F');
  doc.setTextColor(23, 87, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(receipt.currentStatusText.toUpperCase(), pageWidth - left - 88, top + 40, {
    align: 'center',
  });

  const summaryTop = top + 146;
  const summaryWidth = (contentWidth - 16) / 2;
  drawSummaryCard(doc, left, summaryTop, summaryWidth, 88, 'Amount received', formatReceiptCurrency(receipt.amountInr));
  drawSummaryCard(doc, left + summaryWidth + 16, summaryTop, summaryWidth, 88, 'Last payment status', receipt.lastPaymentStatusText, 16);

  let y = summaryTop + 108;
  doc.setFont('helvetica', 'normal');

  for (const [label, value] of metaRows) {
    const rowHeight = drawMetaRow(doc, left, y, contentWidth, label, value);
    y += rowHeight;
  }

  y += 16;
  doc.setTextColor(92, 107, 99);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const footerLines = doc.splitTextToSize(
    'This receipt confirms maintenance payment capture in the society billing ledger. Keep this PDF for records and resident sharing.',
    contentWidth,
  );
  doc.text(footerLines, left, Math.min(y, pageHeight - 48));

  return doc.output('blob');
}

export function buildMaintenanceReceiptHtml(receipt: MaintenanceReceiptDetails) {
  const title =
    receipt.frequency === 'quarterly' ? 'Quarterly Maintenance Receipt' : 'Monthly Maintenance Receipt';
  const amount = formatReceiptCurrency(receipt.amountInr);
  const reviewedByLine =
    receipt.reviewedByName && receipt.reviewedAt
      ? `<div class="meta-line"><span>Verified by</span><strong>${escapeHtml(
          `${receipt.reviewedByName} on ${formatReceiptDateTime(receipt.reviewedAt)}`,
        )}</strong></div>`
      : '';
  const referenceLine = receipt.referenceNote?.trim()
    ? `<div class="meta-line"><span>Reference</span><strong>${escapeHtml(receipt.referenceNote.trim())}</strong></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(receipt.receiptNumber)}</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #18352b;
        background: #f3eee6;
      }
      .page {
        width: 100%;
        max-width: 780px;
        margin: 0 auto;
        background: #fffdf9;
        border: 1px solid #e6dccd;
        border-radius: 20px;
        overflow: hidden;
      }
      .hero {
        padding: 28px 32px 22px;
        background: linear-gradient(135deg, #174b3b, #245b47);
        color: #ffffff;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        opacity: 0.82;
        margin-bottom: 10px;
        font-weight: 700;
      }
      .hero-row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: flex-start;
      }
      .hero h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.12;
      }
      .hero p {
        margin: 8px 0 0;
        font-size: 14px;
        line-height: 1.5;
        opacity: 0.88;
      }
      .status-pill {
        display: inline-block;
        white-space: nowrap;
        padding: 9px 14px;
        border-radius: 999px;
        background: #dff1e7;
        color: #17573d;
        font-size: 12px;
        font-weight: 700;
      }
      .section {
        padding: 24px 32px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .summary-card {
        padding: 18px 20px;
        border-radius: 16px;
        background: #f8f3eb;
        border: 1px solid #e8ddcf;
      }
      .summary-card .label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6a776f;
        margin-bottom: 8px;
      }
      .summary-card .value {
        font-size: 22px;
        font-weight: 800;
        color: #18352b;
      }
      .meta-panel {
        margin-top: 18px;
        padding: 18px 20px;
        border-radius: 16px;
        background: #ffffff;
        border: 1px solid #e8ddcf;
      }
      .meta-line {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 9px 0;
        border-top: 1px solid #f0e6db;
        font-size: 14px;
      }
      .meta-line:first-child {
        border-top: 0;
        padding-top: 0;
      }
      .meta-line:last-child {
        padding-bottom: 0;
      }
      .meta-line span {
        color: #6a776f;
      }
      .meta-line strong {
        color: #18352b;
        text-align: right;
      }
      .footer {
        padding: 18px 32px 30px;
        color: #5c6b63;
        font-size: 12px;
        line-height: 1.6;
      }
      .footer strong {
        color: #18352b;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .page {
          border: 0;
          border-radius: 0;
        }
      }
      @media (max-width: 720px) {
        .hero-row,
        .meta-line {
          display: block;
        }
        .summary-grid {
          grid-template-columns: 1fr;
        }
        .meta-line strong {
          display: block;
          margin-top: 4px;
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="eyebrow">${escapeHtml(title)}</div>
        <div class="hero-row">
          <div>
            <h1>${escapeHtml(receipt.receiptNumber)}</h1>
            <p>${escapeHtml(receipt.societyName)}</p>
            <p>${escapeHtml(receipt.residentLabel)} - ${escapeHtml(receipt.unitCode)} - ${escapeHtml(
              receipt.periodLabel,
            )}</p>
          </div>
          <div class="status-pill">${escapeHtml(receipt.currentStatusText)}</div>
        </div>
      </section>

      <section class="section">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Amount Received</div>
            <div class="value">${escapeHtml(amount)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Last Payment Status</div>
            <div class="value" style="font-size:18px;">${escapeHtml(receipt.lastPaymentStatusText)}</div>
          </div>
        </div>

        <div class="meta-panel">
          <div class="meta-line"><span>Resident / office</span><strong>${escapeHtml(receipt.residentLabel)}</strong></div>
          <div class="meta-line"><span>Unit</span><strong>${escapeHtml(receipt.unitCode)}</strong></div>
          <div class="meta-line"><span>Billing period</span><strong>${escapeHtml(receipt.periodLabel)}</strong></div>
          <div class="meta-line"><span>Payment mode</span><strong>${escapeHtml(
            humanizePaymentMethod(receipt.method),
          )}</strong></div>
          <div class="meta-line"><span>Paid on</span><strong>${escapeHtml(formatReceiptDateTime(receipt.paidAt))}</strong></div>
          <div class="meta-line"><span>Due date</span><strong>${escapeHtml(formatReceiptDate(receipt.dueDate))}</strong></div>
          <div class="meta-line"><span>Issued on</span><strong>${escapeHtml(
            formatReceiptDateTime(receipt.receiptIssuedAt),
          )}</strong></div>
          ${referenceLine}
          ${reviewedByLine}
        </div>
      </section>

      <section class="footer">
        <strong>Note:</strong> This receipt confirms maintenance payment capture in the society billing ledger.
        Save this page as PDF from the browser print dialog for records or WhatsApp attachment.
      </section>
    </main>
  </body>
</html>`;
}

function buildLastPaymentStatusText(data: SeedData, previousInvoice?: SeedData['invoices'][number]) {
  if (!previousInvoice) {
    return 'No earlier maintenance payment recorded.';
  }

  const previousPayments = [...data.payments]
    .filter((payment) => payment.invoiceId === previousInvoice.id)
    .sort((left, right) => Date.parse(right.paidAt) - Date.parse(left.paidAt));
  const latestPayment = previousPayments[0];
  const previousReceipt = latestPayment
    ? data.receipts.find((receipt) => receipt.paymentId === latestPayment.id)
    : undefined;

  if (latestPayment?.status === 'captured' || previousInvoice.status === 'paid') {
    const paidOn = latestPayment ? ` on ${formatReceiptDate(latestPayment.paidAt)}` : '';
    const receiptSuffix = previousReceipt ? ` (${previousReceipt.number})` : '';
    return `Paid for ${previousInvoice.periodLabel}${paidOn}${receiptSuffix}`;
  }

  if (latestPayment?.status === 'pending') {
    return `Pending review for ${previousInvoice.periodLabel}`;
  }

  if (latestPayment?.status === 'rejected') {
    return `Rejected for ${previousInvoice.periodLabel}`;
  }

  if (previousInvoice.status === 'overdue') {
    return `Overdue for ${previousInvoice.periodLabel}`;
  }

  return `Pending for ${previousInvoice.periodLabel}`;
}

function humanizeCurrentPaymentStatus(status: PaymentStatus) {
  switch (status) {
    case 'captured':
      return 'Paid and receipt issued';
    case 'pending':
      return 'Pending verification';
    case 'rejected':
      return 'Rejected by admin';
    default:
      return status;
  }
}

function humanizePaymentMethod(method: PaymentMethod) {
  switch (method) {
    case 'upi':
      return 'UPI';
    case 'netbanking':
      return 'Netbanking';
    case 'cash':
      return 'Cash';
    default:
      return method;
  }
}

function normalizeWhatsappPhone(value?: string) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) {
    return undefined;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return undefined;
}

function formatReceiptCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatReceiptDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function drawSummaryCard(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  valueFontSize = 22,
) {
  doc.setFillColor(248, 243, 235);
  doc.setDrawColor(232, 221, 207);
  doc.roundedRect(x, y, width, height, 16, 16, 'FD');
  doc.setTextColor(106, 119, 111);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(label.toUpperCase(), x + 18, y + 24);
  doc.setTextColor(24, 53, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(valueFontSize);
  const valueLines = doc.splitTextToSize(value, width - 36);
  doc.text(valueLines, x + 18, y + 52);
}

function drawMetaRow(doc: any, x: number, y: number, width: number, label: string, value: string) {
  const labelLines = doc.splitTextToSize(label, 150);
  const valueLines = doc.splitTextToSize(value, width - 220);
  const lineCount = Math.max(labelLines.length, valueLines.length);
  const rowHeight = Math.max(42, 18 + lineCount * 16);

  doc.setDrawColor(240, 230, 219);
  doc.line(x, y + rowHeight, x + width, y + rowHeight);

  doc.setTextColor(106, 119, 111);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(labelLines, x + 18, y + 20);

  doc.setTextColor(24, 53, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(valueLines, x + 180, y + 20);

  return rowHeight;
}

function sanitizeFilename(value: string) {
  return String(value)
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'receipt';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
