'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText,
  Download,
  Loader2,
  Filter,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface Report {
  type: string;
  title: string;
  period: string;
  generatedAt: string;
  data: any[];
  summary: {
    total: number;
    amount: number;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('access');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<Report | null>(null);

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

      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
      } else {
        alert('Gagal generate laporan');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!report) return;

    // Generate simple text report
    let content = `LAPORAN ${report.title.toUpperCase()}\n`;
    content += `Periode: ${report.period}\n`;
    content += `Generated: ${report.generatedAt}\n\n`;
    content += `Ringkasan:\n`;
    content += `- Total: ${report.summary.total}\n`;
    content += `- Total Nominal: ${formatCurrency(report.summary.amount)}\n\n`;
    content += `Detail:\n`;

    report.data.forEach((item: any, index: number) => {
      content += `${index + 1}. ${item.description || item.platNumber || item.date}\n`;
    });

    // Create download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${reportType}-${dateFrom}-${dateTo}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Laporan
          </CardTitle>
          <CardDescription>
            Buat laporan berdasarkan periode tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Jenis Laporan</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="access">Laporan Akses</SelectItem>
                  <SelectItem value="violations">Laporan Pelanggaran</SelectItem>
                  <SelectItem value="revenue">Laporan Pendapatan</SelectItem>
                  <SelectItem value="blacklist">Laporan Blacklist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
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

      {/* Report Result */}
      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>
                  Periode: {report.period}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={exportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
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
                <div className="text-sm text-muted-foreground">Jenis Laporan</div>
                <div className="text-lg font-medium capitalize">{reportType}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-muted-foreground">Generated</div>
                <div className="text-sm">{formatDateTime(report.generatedAt)}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada data untuk periode ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.data.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        {reportType === 'access' && (
                          <>
                            <TableCell>{formatDateTime(item.entryTime)}</TableCell>
                            <TableCell className="font-mono">{item.platNumber}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.duration || '-'}</TableCell>
                          </>
                        )}
                        {reportType === 'violations' && (
                          <>
                            <TableCell>{formatDateTime(item.violationDate)}</TableCell>
                            <TableCell className="font-mono">{item.platNumber}</TableCell>
                            <TableCell>{item.violationType}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalFine)}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'PAID' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'revenue' && (
                          <>
                            <TableCell>{formatDateTime(item.date)}</TableCell>
                            <TableCell>{item.source}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          </>
                        )}
                        {reportType === 'blacklist' && (
                          <>
                            <TableCell className="font-mono">{item.platNumber}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>{item.blacklistType}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'ACTIVE' ? 'destructive' : 'secondary'}>
                                {item.status}
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
