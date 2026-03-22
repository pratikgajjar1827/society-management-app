import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '../theme/tokens';
import { MaintenanceReceiptDetails } from '../utils/receipts';
import { ActionButton, Caption, DetailRow, Pill } from './ui';

export function MaintenanceReceiptCard({
  receipt,
  pdfLabel = 'Open / save PDF receipt',
  whatsappLabel = 'Share PDF + WhatsApp',
  onOpenPdf,
  onSendWhatsapp,
}: {
  receipt: MaintenanceReceiptDetails;
  pdfLabel?: string;
  whatsappLabel?: string;
  onOpenPdf?: () => void;
  onSendWhatsapp?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.summaryRow, pressed ? styles.summaryRowPressed : null]}
      >
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {receipt.residentLabel} - {receipt.receiptNumber}
          </Text>
          <Caption>
            Unit {receipt.unitCode} - {receipt.periodLabel}
          </Caption>
        </View>
        <View style={styles.summaryMeta}>
          <Pill
            label={receipt.currentStatusText}
            tone={
              receipt.paymentStatus === 'captured'
                ? 'success'
                : receipt.paymentStatus === 'pending'
                  ? 'warning'
                  : 'accent'
            }
          />
          <Caption>{expanded ? 'Hide details' : 'Show details'}</Caption>
        </View>
      </Pressable>

      {expanded ? (
        <>
          <View style={styles.detailPanel}>
            <DetailRow label="Resident / office" value={receipt.residentLabel} />
            <DetailRow label="Unit" value={receipt.unitCode} />
            <DetailRow label="Billing period" value={receipt.periodLabel} />
            <DetailRow
              label="Amount"
              value={new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(receipt.amountInr)}
            />
            <DetailRow label="Payment mode" value={humanizeMethod(receipt.method)} />
            <DetailRow label="Paid on" value={formatDateTime(receipt.paidAt)} />
            <DetailRow label="Due date" value={formatDate(receipt.dueDate)} />
            <DetailRow label="Issued on" value={formatDateTime(receipt.receiptIssuedAt)} />
            <DetailRow label="Last payment status" value={receipt.lastPaymentStatusText} />
            {receipt.referenceNote ? <DetailRow label="Reference" value={receipt.referenceNote} /> : null}
            {receipt.reviewedByName && receipt.reviewedAt ? (
              <DetailRow
                label="Verified by"
                value={`${receipt.reviewedByName} on ${formatDateTime(receipt.reviewedAt)}`}
              />
            ) : null}
          </View>

          {onOpenPdf || onSendWhatsapp ? (
            <>
              <View style={styles.divider} />
              <View style={styles.actions}>
                {onOpenPdf ? (
                  <ActionButton label={pdfLabel} onPress={onOpenPdf} variant="secondary" />
                ) : null}
                {onSendWhatsapp ? (
                  <ActionButton
                    label={whatsappLabel}
                    onPress={onSendWhatsapp}
                    variant="secondary"
                    disabled={!receipt.whatsappPhone}
                  />
                ) : null}
              </View>
              {onOpenPdf ? (
                <Caption>Open this receipt as a real PDF file so you can save, download, or share it.</Caption>
              ) : null}
              {onSendWhatsapp ? (
                <Caption>On supported devices this opens a share sheet with the PDF and message together. Choose WhatsApp there.</Caption>
              ) : null}
              {onSendWhatsapp && !receipt.whatsappPhone ? (
                <Caption>No resident WhatsApp number is linked to this receipt yet.</Caption>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    backgroundColor: '#F9F5EE',
    borderWidth: 1,
    borderColor: '#E7DDD0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryRowPressed: {
    opacity: 0.88,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  summaryMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  detailPanel: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E7DDD0',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#E7DDD0',
    paddingTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});

function humanizeMethod(method: MaintenanceReceiptDetails['method']) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
