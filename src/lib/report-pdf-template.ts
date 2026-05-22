type ReportItem = Record<string, unknown>;

type ReportAttachment = {
  name: string;
  dataUrl: string;
};

export interface ReportForPdf {
  type: string;
  title: string;
  period: string;
  generatedAt: string;
  data: ReportItem[];
  summary: {
    total: number;
    amount: number;
  };
}

export interface ReportPdfOptions {
  attachments?: ReportAttachment[];
  attachmentOne?: ReportAttachment | null;
  attachmentTwo?: ReportAttachment | null;
  previousAccessTotal?: number | null;
}

const asText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDate = (value: unknown) => {
  if (value instanceof Date) return value;
  return new Date(String(value));
};

const formatDateTime = (value: unknown) => {
  const date = asDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(asNumber(value));

const escapeHtml = (value: unknown) =>
  asText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildReportPdfHtml(
  report: ReportForPdf,
  reportType: string,
  dateFrom: string,
  dateTo: string,
  options: ReportPdfOptions = {},
): string {
  const now = new Date();
  const printDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const reportId = `#REP-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const titleMap: Record<string, string> = {
    full: 'Laporan Full',
    access: 'Laporan Akses Parkir',
    violations: 'Laporan Pelanggaran Parkir',
    revenue: 'Laporan Pendapatan Parkir',
    blacklist: 'Laporan Blacklist Kendaraan',
  };

  const labelMap: Record<string, string> = {
    full: 'TOTAL LAPORAN',
    access: 'TOTAL AKSES',
    violations: 'TOTAL PELANGGARAN',
    revenue: 'TOTAL PENDAPATAN',
    blacklist: 'TOTAL BLACKLIST',
  };

  const pendingLabelMap: Record<string, string> = {
    full: 'TOTAL NOMINAL',
    access: 'DURASI RATA-RATA',
    violations: 'DENDA TERTUNDA',
    revenue: 'RATA-RATA HARIAN',
    blacklist: 'AKTIF BLACKLIST',
  };

  const statusLabel: Record<string, string> = {
    full: 'TOTAL ENTRI',
    access: 'TINGKAT KEPATUHAN',
    violations: 'STATUS PENYELESAIAN',
    revenue: 'TARGET TERCAPAI',
    blacklist: 'TERSELESAIKAN',
  };

  const completionRate = (
    (report.data.filter((item) => {
      const status = String(item.status || '').toUpperCase();
      return status === 'PAID' || status === 'ACTIVE' || status === 'COMPLETED';
    }).length /
      Math.max(report.data.length, 1)) *
    100
  ).toFixed(1);

  const previousAccessTotal = Number(options.previousAccessTotal ?? 0);
  const currentAccessTotal = Number(report.summary.total ?? 0);
  const growthRate =
    reportType === 'access' && previousAccessTotal > 0
      ? (((currentAccessTotal - previousAccessTotal) / previousAccessTotal) * 100).toFixed(1)
      : null;
  const growthPrefix = growthRate && Number(growthRate) >= 0 ? '+' : '';
  const growthLabel =
    reportType === 'access'
      ? previousAccessTotal > 0
        ? `${growthPrefix}${growthRate}% dibanding bulan sebelumnya`
        : 'Data bulan sebelumnya tidak tersedia'
      : '+12% bln ini';

  const attachments = (options.attachments ?? [options.attachmentOne, options.attachmentTwo])
    .filter(Boolean)
    .slice(0, 6) as ReportAttachment[];

  const accessDurationCount = report.data.filter((item) => typeof item.duration === 'number').length;
  const accessAverageDuration =
    accessDurationCount > 0
      ? Math.round(
          report.data.reduce((sum, item) => sum + (typeof item.duration === 'number' ? item.duration : 0), 0) /
            accessDurationCount,
        )
      : 0;
  const violationsPaidCount = report.data.filter((item) => String(item.status || '').toUpperCase() === 'PAID').length;
  const blacklistActiveCount = report.data.filter((item) => String(item.status || '').toUpperCase() === 'ACTIVE').length;
  const blacklistResolvedCount = report.data.filter((item) => {
    const status = String(item.status || '').toUpperCase();
    return status && status !== 'ACTIVE';
  }).length;

  const tableConfig = (() => {
    switch (reportType) {
      case 'full':
        return {
          columns: '<th>Laporan</th><th>Waktu</th><th>Plat Nomor</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Status</th>',
          colSpan: 8,
        };
      case 'access':
        return {
          columns: '<th>Waktu Masuk</th><th>Plat Nomor</th><th>Jenis Kendaraan</th><th>Durasi Parkir</th>',
          colSpan: 5,
        };
      case 'violations':
        return {
          columns: '<th>Tanggal</th><th>Plat Nomor</th><th>Jenis Pelanggaran</th><th>Denda</th><th>Status</th>',
          colSpan: 6,
        };
      case 'revenue':
        return {
          columns: '<th>Tanggal</th><th>Sumber</th><th>Jumlah</th>',
          colSpan: 4,
        };
      case 'blacklist':
        return {
          columns: '<th>Plat Nomor</th><th>Alasan</th><th>Tipe</th><th>Status</th>',
          colSpan: 5,
        };
      default:
        return {
          columns: '<th>Data</th>',
          colSpan: 2,
        };
    }
  })();

  const summaryCards = (() => {
    switch (reportType) {
      case 'full':
        return [
          { icon: '📚', label: 'TOTAL LAPORAN', value: report.summary.total.toLocaleString('id-ID'), sub: 'gabungan semua laporan', accent: '' },
          { icon: '💰', label: 'TOTAL NOMINAL', value: formatCurrency(report.summary.amount), sub: 'akumulasi denda dan pendapatan', accent: 'accent-red' },
          { icon: '✓', label: 'TOTAL ENTRI', value: `${report.data.length.toLocaleString('id-ID')} baris`, sub: 'semua data dalam periode', accent: 'accent-green' },
        ];
      case 'access':
        return [
          { icon: '⚠', label: 'TOTAL AKSES', value: report.summary.total.toLocaleString('id-ID'), sub: growthLabel, accent: '' },
          { icon: '⏱', label: 'RATA-RATA DURASI', value: `${accessAverageDuration} menit`, sub: `${accessDurationCount} data selesai`, accent: 'accent-red' },
          { icon: '✓', label: 'KENDARAAN SELESAI', value: `${completionRate}%`, sub: 'berdasarkan data akses', accent: 'accent-green' },
        ];
      case 'violations':
        return [
          { icon: '⚠', label: 'TOTAL PELANGGARAN', value: report.summary.total.toLocaleString('id-ID'), sub: growthLabel, accent: '' },
          { icon: '💰', label: 'TOTAL DENDA', value: formatCurrency(report.summary.amount), sub: `${violationsPaidCount} pelanggaran terselesaikan`, accent: 'accent-red' },
          { icon: '✓', label: 'STATUS PENYELESAIAN', value: `${completionRate}%`, sub: 'berdasarkan status data', accent: 'accent-green' },
        ];
      case 'revenue':
        return [
          { icon: '💰', label: 'TOTAL TRANSAKSI', value: report.summary.total.toLocaleString('id-ID'), sub: growthLabel, accent: '' },
          { icon: '💵', label: 'TOTAL PENDAPATAN', value: formatCurrency(report.summary.amount), sub: 'akumulasi periode laporan', accent: 'accent-red' },
          { icon: '📈', label: 'RATA-RATA TRANSAKSI', value: report.summary.total > 0 ? formatCurrency(report.summary.amount / report.summary.total) : formatCurrency(0), sub: 'per transaksi', accent: 'accent-green' },
        ];
      case 'blacklist':
        return [
          { icon: '⚠', label: 'TOTAL BLACKLIST', value: report.summary.total.toLocaleString('id-ID'), sub: growthLabel, accent: '' },
          { icon: '⛔', label: 'BLACKLIST AKTIF', value: blacklistActiveCount.toLocaleString('id-ID'), sub: 'masih diblokir', accent: 'accent-red' },
          { icon: '✓', label: 'BLACKLIST SELESAI', value: blacklistResolvedCount.toLocaleString('id-ID'), sub: 'sudah ditutup', accent: 'accent-green' },
        ];
      default:
        return [
          { icon: '⚠', label: 'TOTAL RECORD', value: report.summary.total.toLocaleString('id-ID'), sub: growthLabel, accent: '' },
          { icon: '$', label: 'TOTAL NOMINAL', value: formatCurrency(report.summary.amount), sub: '&nbsp;', accent: 'accent-red' },
          { icon: '✓', label: 'STATUS', value: `${completionRate}%`, sub: '&nbsp;', accent: 'accent-green' },
        ];
    }
  })();

  const tbodyRows = report.data
    .map((item, index) => {
      let cells = '';

      if (reportType === 'full') {
        const amount = asNumber(item.amount);
        cells = `
        <td>${escapeHtml(asText(item.reportType))}</td>
        <td>${escapeHtml(formatDateTime(item.timestamp))}</td>
        <td class="mono">${escapeHtml(item.platNumber)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="text-right">${amount > 0 ? escapeHtml(formatCurrency(amount)) : '-'}</td>
        <td><span class="badge ${String(item.status || '').toUpperCase() === 'ACTIVE' ? 'status-unpaid' : 'status-legal'}">${escapeHtml(item.status)}</span></td>`;
      } else if (reportType === 'access') {
        cells = `
        <td>${escapeHtml(formatDateTime(item.entryTime))}</td>
        <td class="mono">${escapeHtml(item.platNumber)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${typeof item.duration === 'number' ? `${item.duration} menit` : escapeHtml(item.duration)}</td>`;
      } else if (reportType === 'violations') {
        const rawStatus = asText(item.status).toUpperCase();
        const displayStatus = rawStatus === 'PAID' ? 'Terselesaikan' : rawStatus === 'UNPAID' ? 'Belum Bayar' : asText(item.status);
        const statusClass = rawStatus === 'PAID' ? 'status-paid' : rawStatus === 'UNPAID' ? 'status-unpaid' : 'status-legal';

        cells = `
        <td>${escapeHtml(formatDateTime(item.violationDate))}</td>
        <td class="mono">${escapeHtml(item.platNumber)}</td>
        <td>${escapeHtml(item.violationType)}</td>
        <td>${escapeHtml(item.location) !== '-' ? escapeHtml(item.location) : 'Zona A - Ground Floor'}</td>
        <td>${escapeHtml(formatDateTime(item.violationDate))}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(displayStatus)}</span></td>`;
      } else if (reportType === 'revenue') {
        cells = `
        <td>${escapeHtml(formatDateTime(item.date))}</td>
        <td>${escapeHtml(item.source)}</td>
        <td class="text-right">${escapeHtml(formatCurrency(item.amount))}</td>`;
      } else if (reportType === 'blacklist') {
        const statusClass = item.status === 'ACTIVE' ? 'status-unpaid' : 'status-paid';
        const displayStatus = item.status === 'ACTIVE' ? 'Aktif' : asText(item.status);

        cells = `
        <td class="mono">${escapeHtml(item.platNumber)}</td>
        <td>${escapeHtml(item.reason)}</td>
        <td>${escapeHtml(item.blacklistType)}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(displayStatus)}</span></td>`;
      }

      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    })
    .join('');

  const emptyRow = `<tr><td colspan="${tableConfig.colSpan}" class="empty-row">Tidak ada data untuk periode ini</td></tr>`;

  const attachmentCard = (attachment: ReportAttachment, index: number) => {
    if (attachment?.dataUrl) {
      return `
    <div class="attachment-item">
      <div class="attachment-preview">
        <img src="${escapeHtml(attachment.dataUrl)}" alt="${escapeHtml(attachment.name || `Foto Bukti ${index + 1}`)}" />
      </div>
      <div class="attachment-label">${escapeHtml(attachment.name || `FOTO BUKTI ${index + 1}`)}</div>
    </div>`;
    }

    return '';
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(titleMap[reportType] || report.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #fff;
    padding: 40px 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1.5px solid #e5e7eb;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo-box {
    width: 52px;
    height: 52px;
    background: #1a7a4a;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .logo-box img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    display: block;
  }
  .brand-text h1 {
    font-size: 22px;
    font-weight: 700;
    color: #1a7a4a;
    letter-spacing: 0.5px;
  }
  .brand-text p {
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 2px;
    font-weight: 500;
  }
  .report-meta {
    text-align: right;
    line-height: 1.8;
  }
  .report-meta h2 {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }
  .report-meta p {
    font-size: 12px;
    color: #6b7280;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
  }
  .stat-card .icon {
    position: absolute;
    top: 14px;
    right: 16px;
    opacity: 0.18;
    font-size: 38px;
    color: #374151;
  }
  .stat-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .stat-value {
    font-size: 26px;
    font-weight: 700;
    color: #111827;
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-sub {
    font-size: 12px;
    color: #6b7280;
  }
  .stat-value.accent-red { color: #dc2626; }
  .stat-value.accent-green { color: #1a7a4a; }

  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead tr {
    background: #f0faf4;
  }
  th {
    padding: 11px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: #374151;
    border-bottom: 1.5px solid #d1fae5;
  }
  td {
    padding: 10px 14px;
    border-bottom: 0.5px solid #f3f4f6;
    color: #374151;
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f9fafb; }
  .mono { font-family: 'Courier New', monospace; font-weight: 600; font-size: 12px; }
  .text-right { text-align: right; }
  .empty-row { text-align: center; padding: 32px; color: #9ca3af; }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-unpaid { background: #fee2e2; color: #991b1b; }
  .status-legal { background: #fef3c7; color: #92400e; }

  .section-divider {
    border: none;
    border-top: 1.5px solid #e5e7eb;
    margin: 32px 0;
  }

  .attachment-title {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 16px;
  }
  .attachment-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 32px;
  }
  .attachment-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }
  .attachment-preview {
    background: #f9fafb;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #e5e7eb;
    overflow: hidden;
  }
  .attachment-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .attachment-preview .placeholder-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #9ca3af;
  }
  .attachment-preview svg { width: 40px; height: 40px; }
  .attachment-preview span { font-size: 11px; font-weight: 500; }
  .attachment-label {
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
  }
  .signature-block { text-align: center; }
  .signature-role {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 48px;
  }
  .signature-line {
    border-top: 1.5px solid #374151;
    margin-bottom: 8px;
    width: 60%;
    margin-left: auto;
    margin-right: auto;
  }
  .signature-name {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }
  .signature-id {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
  }

  .footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 16px;
    text-align: center;
    font-size: 11px;
    color: #9ca3af;
    letter-spacing: 0.5px;
  }

  @media print {
    body { padding: 24px 32px; }
    .no-print { display: none !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>

  <div class="header">
    <div class="logo-area">
      <div class="logo-box">
        <img src="/favicon.png" alt="Logo Resipark" />
      </div>
      <div class="brand-text">
        <h1>RESIPARK SYSTEM</h1>
        <p>Sistem Manajemen Parkir Perumahan</p>
      </div>
    </div>
    <div class="report-meta">
      <h2>${escapeHtml(titleMap[reportType] || report.title)}</h2>
      <p>ID Laporan: ${escapeHtml(reportId)}</p>
      <p>Tanggal Cetak: ${escapeHtml(printDate)}</p>
      <p>Periode: ${escapeHtml(report.period || `${dateFrom} - ${dateTo}`)}</p>
    </div>
  </div>

  <div class="stats-grid">
    ${summaryCards
      .map(
        (card) => `
    <div class="stat-card">
      <div class="icon">${escapeHtml(card.icon)}</div>
      <div class="stat-label">${escapeHtml(card.label)}</div>
      <div class="stat-value ${card.accent}">${escapeHtml(card.value)}</div>
      <div class="stat-sub">${card.sub}</div>
    </div>`,
      )
      .join('')}
  </div>

  <div class="section-title">Rincian ${escapeHtml(titleMap[reportType] || report.title)} Terbaru</div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">No</th>
        ${tableConfig.columns}
      </tr>
    </thead>
    <tbody>
      ${report.data.length === 0 ? `<tr><td colspan="${tableConfig.colSpan}" class="empty-row">Tidak ada data untuk periode ini</td></tr>` : tbodyRows}
    </tbody>
  </table>

  <div class="section-divider"></div>

  <div class="attachment-title">Lampiran Foto Bukti</div>
  <div class="attachment-grid">
    ${attachments.length > 0 ? attachments.map((attachment, index) => attachmentCard(attachment, index)).join('') : ''}
  </div>

  <div class="signature-grid">
    <div class="signature-block">
      <div class="signature-role">Petugas Lapangan</div>
      <div class="signature-line"></div>
      <div class="signature-name">Riski Rahmattillah Pratama</div>
      <div class="signature-id">NIM: 25051204338</div>
    </div>
    <div class="signature-block">
      <div class="signature-role">Manager Operasional</div>
      <div class="signature-line"></div>
      <div class="signature-name">Farouq Gusmo Abdilah</div>
      <div class="signature-id">NIM: 25051204337</div>
    </div>
  </div>

  <div class="footer">
    DOKUMEN INI DIHASILKAN SECARA OTOMATIS OLEH SISTEM RESIPARK &bull; SALINAN SAH &amp; TERVERIFIKASI
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

export function openReportPdfWindow(
  report: ReportForPdf,
  reportType: string,
  dateFrom: string,
  dateTo: string,
  options: ReportPdfOptions = {},
): boolean {
  const html = buildReportPdfHtml(report, reportType, dateFrom, dateTo, options);
  const win = window.open('', '_blank', 'width=1200,height=900');
  if (!win) return false;

  win.document.write(html);
  win.document.close();
  return true;
}
