import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { PDFDocument, rgb } from 'pdf-lib';

function toISODate(input: string) {
  // input: YYYY-MM-DD
  // Parse as local date to avoid timezone issues with SQLite
  const parts = input.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return date;
}

function formatDateTime(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildCSV(rows: Record<string, any>[], columns: { key: string; label: string }[]) {
  const escape = (v: any) => {
    const str = v === null || v === undefined ? '' : String(v);
    if (/[\n\r",]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(r[c.key])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

export async function GET(request: NextRequest) {
  let searchParams;
  let type = 'access';
  let from = '';
  let to = '';
  let format = 'csv';
  
  try {
    const { searchParams: params } = new URL(request.url);
    searchParams = params;
    type = searchParams.get('type') || 'access';
    from = searchParams.get('from') || '';
    to = searchParams.get('to') || '';
    format = (searchParams.get('format') || 'csv').toLowerCase();

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSING_DATE', message: 'Rentang tanggal harus diisi' },
        },
        { status: 400 },
      );
    }

    const fromDate = toISODate(from);
    const toDate = toISODate(to);
    toDate.setHours(23, 59, 59, 999);

    // We only need full mapping for each report type.
    let title = '';
    let period = `${from} s/d ${to}`;
    let rows: any[] = [];
    let columns: { key: string; label: string }[] = [];

    switch (type) {
      case 'access': {
        title = 'Laporan Akses Kendaraan';
        const accessRecords = await db.accessRecord.findMany({
          where: { entryTime: { gte: fromDate, lte: toDate } },
          include: { vehicle: true },
          orderBy: { entryTime: 'desc' },
        });

        rows = accessRecords.map((record) => ({
          entryTime: record.entryTime,
          platNumber: record.vehicle.platNumber,
          category: record.vehicle.category,
          duration:
            record.exitTime
              ? Math.floor((new Date(record.exitTime).getTime() - new Date(record.entryTime).getTime()) / 60000)
              : null,
        }));

        columns = [
          { key: 'entryTime', label: 'Waktu' },
          { key: 'platNumber', label: 'Plat Nomor' },
          { key: 'category', label: 'Jenis' },
          { key: 'duration', label: 'Durasi (menit)' },
        ];
        break;
      }

      case 'violations': {
        title = 'Laporan Pelanggaran';
        const violations = await db.violation.findMany({
          where: { violationDate: { gte: fromDate, lte: toDate } },
          include: { vehicle: true, violationType: true },
          orderBy: { violationDate: 'desc' },
        });

        rows = violations.map((v) => ({
          violationDate: v.violationDate,
          platNumber: v.vehicle.platNumber,
          violationType: v.violationType.name,
          totalFine: v.totalFine,
          status: v.status,
        }));

        columns = [
          { key: 'violationDate', label: 'Tanggal' },
          { key: 'platNumber', label: 'Plat Nomor' },
          { key: 'violationType', label: 'Jenis' },
          { key: 'totalFine', label: 'Denda' },
          { key: 'status', label: 'Status' },
        ];
        break;
      }

      case 'revenue': {
        title = 'Laporan Pendapatan';
        const payments = await db.payment.findMany({
          where: { paidAt: { gte: fromDate, lte: toDate }, status: 'COMPLETED' },
          include: { violation: { include: { vehicle: true } } },
          orderBy: { paidAt: 'desc' },
        });

        rows = payments.map((p) => ({
          date: p.paidAt,
          source: `Denda - ${p.violation?.vehicle?.platNumber || 'Unknown'}`,
          amount: p.amount,
        }));

        columns = [
          { key: 'date', label: 'Tanggal' },
          { key: 'source', label: 'Sumber' },
          { key: 'amount', label: 'Jumlah' },
        ];
        break;
      }

      case 'blacklist': {
        title = 'Laporan Blacklist';
        const blacklists = await db.blacklist.findMany({
          where: { createdAt: { gte: fromDate, lte: toDate } },
          include: { vehicle: true },
          orderBy: { createdAt: 'desc' },
        });

        rows = blacklists.map((b) => ({
          platNumber: b.vehicle.platNumber,
          reason: b.reason,
          blacklistType: b.blacklistType,
          status: b.status,
        }));

        columns = [
          { key: 'platNumber', label: 'Plat Nomor' },
          { key: 'reason', label: 'Alasan' },
          { key: 'blacklistType', label: 'Tipe' },
          { key: 'status', label: 'Status' },
        ];
        break;
      }

      default: {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_TYPE', message: 'Tipe laporan tidak valid' } },
          { status: 400 },
        );
      }
    }

    const generatedAt = new Date().toISOString();
    const filename = `laporan-${type}-${from}-${to}`;

    if (format === 'csv') {
      const csvRows = rows.map((r) => {
        const out: Record<string, any> = { ...r };
        // normalize date fields for nicer CSV
        for (const col of columns) {
          if (out[col.key] instanceof Date) out[col.key] = formatDateTime(out[col.key]);
        }
        return out;
      });

      const csv = buildCSV(csvRows, columns);
      const csvFilename = `${filename}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${csvFilename}"`,
        },
      });
    }

    if (format !== 'pdf') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FORMAT', message: 'Format harus pdf atau csv' } },
        { status: 400 },
      );
    }

    // PDF generation dengan pdfmake yang sudah punya fonts built-in
    try {
      const pdfFilename = `${filename}.pdf`;
      return await generatePDF(title, period, generatedAt, rows, columns, pdfFilename);
    } catch (pdfError: any) {
      // Jika PDF generation tetap gagal, fallback ke CSV sebagai backup
      console.warn('PDF generation failed, fallback to CSV:', pdfError.message);
      const csvRows = rows.map((r) => {
        const out: Record<string, any> = { ...r };
        for (const col of columns) {
          if (out[col.key] instanceof Date) out[col.key] = formatDateTime(out[col.key]);
        }
        return out;
      });

      const csv = buildCSV(csvRows, columns);
      const csvFilename = `laporan-${type}-${from}-${to}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${csvFilename}"`,
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Export report error:', {
      message: errorMessage,
      stack: errorStack,
      params: searchParams ? { type: searchParams.get('type'), from: searchParams.get('from'), to: searchParams.get('to'), format: searchParams.get('format') } : 'Unable to parse params',
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem', details: errorMessage },
      },
      { status: 500 },
    );
  }
}

async function generatePDF(
  title: string,
  period: string,
  generatedAt: string,
  rows: any[],
  columns: { key: string; label: string }[],
  filename: string,
): Promise<NextResponse> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  let yOffset = height - 40;

  // Title
  page.drawText(`LAPORAN ${title}`, {
    x: 40,
    y: yOffset,
    size: 14,
    color: rgb(0, 0, 0),
  });
  yOffset -= 20;

  // Period and Generated date
  page.drawText(`Periode: ${period}`, {
    x: 40,
    y: yOffset,
    size: 10,
    color: rgb(0, 0, 0),
  });
  yOffset -= 15;

  page.drawText(`Generated: ${generatedAt}`, {
    x: 40,
    y: yOffset,
    size: 10,
    color: rgb(0, 0, 0),
  });
  yOffset -= 20;

  // Total data
  page.drawText(`Total data: ${rows.length}`, {
    x: 40,
    y: yOffset,
    size: 11,
    color: rgb(0, 0, 0),
  });
  yOffset -= 25;

  // Table header
  const columnWidth = (width - 80) / columns.length;
  let xOffset = 40;

  columns.forEach((col) => {
    page.drawText(col.label, {
      x: xOffset,
      y: yOffset,
      size: 9,
      color: rgb(0, 0, 0),
    });
    xOffset += columnWidth;
  });
  yOffset -= 15;

  // Separator line
  page.drawLine({
    start: { x: 40, y: yOffset },
    end: { x: width - 40, y: yOffset },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  yOffset -= 10;

  // Table rows
  const maxRows = Math.min(rows.length, 50); // Limit to 50 rows per page to avoid overflow
  rows.slice(0, maxRows).forEach((r) => {
    xOffset = 40;
    columns.forEach((col) => {
      const v = (r as any)[col.key];
      let cellText = '';

      if (v instanceof Date) {
        cellText = formatDateTime(v);
      } else if (typeof v === 'number') {
        cellText = col.key === 'totalFine' ? v.toLocaleString('id-ID') : String(v);
      } else {
        cellText = v === null || v === undefined ? '-' : String(v);
      }

      // Truncate text if too long
      const truncated = cellText.length > 20 ? cellText.substring(0, 17) + '...' : cellText;

      page.drawText(truncated, {
        x: xOffset,
        y: yOffset,
        size: 8,
        color: rgb(0, 0, 0),
      });
      xOffset += columnWidth;
    });
    yOffset -= 12;

    // Add new page if running out of space
    if (yOffset < 40 && rows.indexOf(r) < rows.length - 1) {
      const newPage = pdfDoc.addPage([595, 842]);
      yOffset = 800;
      page.drawText(`${title} (continued)`, {
        x: 40,
        y: yOffset,
        size: 10,
        color: rgb(0, 0, 0),
      });
      yOffset -= 20;
    }
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

