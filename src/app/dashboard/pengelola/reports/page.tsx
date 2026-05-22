'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Printer, TrendingUp } from 'lucide-react';
import { buildReportPdfHtml } from '@/lib/report-pdf-template';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface Report {
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

type ReportItem = Record<string, string | number | Date | null | undefined>;

type ReportAttachment = {
  name: string;
  dataUrl: string;
};

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

const readFileAsDataUrl = (file: File) =>
  new Promise<ReportAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        dataUrl: String(reader.result ?? ''),
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca file lampiran'));
    reader.readAsDataURL(file);
  });

const shiftDateByMonths = (value: string, offset: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + offset);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const createEmptyAttachments = () => Array.from({ length: 6 }, () => null as ReportAttachment | null);

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('access');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [attachments, setAttachments] = useState<(ReportAttachment | null)[]>(createEmptyAttachments);

  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      alert('Pilih rentang tanggal');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      params.set('from', dateFrom);
      params.set('to', dateTo);

      const response = await fetch(`/api/reports?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
      } else {
        alert('Gagal generate laporan');
      }
    } catch {
      alert('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvExport = async () => {
    if (!report) return;

    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      params.set('from', dateFrom);
      params.set('to', dateTo);
      params.set('format', 'csv');

      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        alert(err?.error?.message || 'Gagal export laporan');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${reportType}-${dateFrom}-${dateTo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Terjadi kesalahan sistem');
    }
  };

  const handleAttachmentChange = async (
    file: File | undefined,
    index: number,
  ) => {
    if (!file) {
      setAttachments((current) => {
        const next = [...current];
        next[index] = null;
        return next;
      });
      return;
    }

    const attachment = await readFileAsDataUrl(file);
    setAttachments((current) => {
      const next = [...current];
      next[index] = attachment;
      return next;
    });
  };

  const filledAttachments = attachments.filter(Boolean).length;
  const visibleAttachmentCount = Math.min(6, Math.max(2, filledAttachments + 1));
  const requiredAttachmentsReady = Boolean(attachments[0]?.dataUrl && attachments[1]?.dataUrl);

  const handleExport = async () => {
    if (!report) return;

    if (exportFormat === 'pdf') {
      if (!requiredAttachmentsReady) {
        alert('Lampiran foto bukti wajib diisi sebelum export PDF');
        return;
      }

      const win = window.open('', '_blank', 'width=1200,height=900');
      if (!win) {
        alert('Popup diblokir. Izinkan popup untuk export PDF.');
        return;
      }

      let previousAccessTotal: number | null = null;
      if (reportType === 'access') {
        try {
          const params = new URLSearchParams();
          params.set('type', 'access');
          params.set('from', shiftDateByMonths(dateFrom, -1));
          params.set('to', shiftDateByMonths(dateTo, -1));

          const response = await fetch(`/api/reports?${params.toString()}`, {
            credentials: 'include',
          });
          const data = await response.json();

          if (data.success) {
            previousAccessTotal = Number(data.data?.summary?.total ?? 0);
          }
        } catch {
          previousAccessTotal = null;
        }
      }

      const html = buildReportPdfHtml(report, reportType, dateFrom, dateTo, {
        attachments: attachments.filter((item): item is ReportAttachment => Boolean(item)),
        previousAccessTotal,
      });

      win.document.write(html);
      win.document.close();
      return;
    }

    await handleCsvExport();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Laporan
          </CardTitle>
          <CardDescription>Buat laporan berdasarkan periode tertentu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Laporan</label>
              <Select
                value={reportType}
                onValueChange={(value) => {
                  setReportType(value);
                  setReport(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Laporan Full</SelectItem>
                  <SelectItem value="access">Laporan Akses</SelectItem>
                  <SelectItem value="violations">Laporan Pelanggaran</SelectItem>
                  <SelectItem value="revenue">Laporan Pendapatan</SelectItem>
                  <SelectItem value="blacklist">Laporan Blacklist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Selesai</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={loading || !dateFrom || !dateTo}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>Periode: {report.period}</CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-40">
                  <Select
                    value={exportFormat}
                    onValueChange={(v) => setExportFormat(v as 'csv' | 'pdf')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={exportFormat === 'pdf' && !requiredAttachmentsReady}
                >
                  {exportFormat === 'pdf' ? (
                    <Printer className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Record</div>
                <div className="text-2xl font-bold">{report.summary.total}</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Nominal</div>
                <div className="text-2xl font-bold">{formatCurrency(report.summary.amount)}</div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="text-sm text-muted-foreground">Generated</div>
                <div className="text-sm">{formatDateTime(report.generatedAt)}</div>
              </div>
            </div>

            {exportFormat === 'pdf' && (
              <div className="mb-6 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="mb-4">
                  <div className="text-sm font-semibold">Lampiran Foto Bukti</div>
                  <div className="text-xs text-muted-foreground">
                    Dua foto pertama wajib diisi. Setelah itu kamu bisa menambah sampai 6 foto.
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {attachments.slice(0, visibleAttachmentCount).map((attachment, index) => {
                    const isRequired = index < 2;
                    return (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`attachment-${index}`}>Foto Bukti {index + 1}{isRequired ? ' (wajib)' : ' (opsional)'}</Label>
                        <Input
                          id={`attachment-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAttachmentChange(e.target.files?.[0], index)}
                        />
                        {attachment ? (
                          <div className="rounded-md border bg-background p-3">
                            <img
                              src={attachment.dataUrl}
                              alt={attachment.name}
                              className="h-28 w-full rounded object-cover"
                            />
                            <div className="mt-2 text-xs text-muted-foreground">{attachment.name}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {isRequired ? 'Lampiran wajib diunggah.' : 'Tambahkan foto jika diperlukan.'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    {reportType === 'full' && (
                      <>
                        <TableHead>Laporan</TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Plat Nomor</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {reportType === 'access' && (
                      <>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Plat Nomor</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Durasi</TableHead>
                      </>
                    )}
                    {reportType === 'violations' && (
                      <>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Plat Nomor</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead className="text-right">Denda</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {reportType === 'revenue' && (
                      <>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                      </>
                    )}
                    {reportType === 'blacklist' && (
                      <>
                        <TableHead>Plat Nomor</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={reportType === 'full' ? 8 : 6} className="text-center py-8 text-muted-foreground">
                        Tidak ada data untuk periode ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.data.map((item: ReportItem, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        {reportType === 'full' && (
                          <>
                            <TableCell className="font-medium">{asText(item.reportType)}</TableCell>
                            <TableCell>{formatDateTime(asDate(item.timestamp))}</TableCell>
                            <TableCell className="font-mono">{asText(item.platNumber)}</TableCell>
                            <TableCell>{asText(item.category)}</TableCell>
                            <TableCell>{asText(item.description)}</TableCell>
                            <TableCell className="text-right">
                              {asNumber(item.amount) > 0 ? formatCurrency(asNumber(item.amount)) : '-'}</TableCell>
                            <TableCell>
                              <Badge variant={asText(item.status).toUpperCase() === 'ACTIVE' ? 'destructive' : 'secondary'}>
                                {asText(item.status)}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'access' && (
                          <>
                            <TableCell>{formatDateTime(asDate(item.entryTime))}</TableCell>
                            <TableCell className="font-mono">{asText(item.platNumber)}</TableCell>
                            <TableCell>{asText(item.category)}</TableCell>
                            <TableCell>{asText(item.duration)}</TableCell>
                          </>
                        )}
                        {reportType === 'violations' && (
                          <>
                            <TableCell>{formatDateTime(asDate(item.violationDate))}</TableCell>
                            <TableCell className="font-mono">{asText(item.platNumber)}</TableCell>
                            <TableCell>{asText(item.violationType)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(asNumber(item.totalFine))}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'PAID' ? 'default' : 'secondary'}>
                                {asText(item.status)}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'revenue' && (
                          <>
                            <TableCell>{formatDateTime(asDate(item.date))}</TableCell>
                            <TableCell>{asText(item.source)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(asNumber(item.amount))}</TableCell>
                          </>
                        )}
                        {reportType === 'blacklist' && (
                          <>
                            <TableCell className="font-mono">{asText(item.platNumber)}</TableCell>
                            <TableCell>{asText(item.reason)}</TableCell>
                            <TableCell>{asText(item.blacklistType)}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'ACTIVE' ? 'destructive' : 'secondary'}>
                                {asText(item.status)}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
