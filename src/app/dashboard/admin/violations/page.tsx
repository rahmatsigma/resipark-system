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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { formatDateTime, formatCurrency, getStatusColor } from '@/lib/utils';
import { VIOLATION_LABELS } from '@/lib/utils';

interface Violation {
  id: string;
  totalFine: number;
  status: string;
  violationDate: string;
  description: string | null;
  multiplier: number;
  violationType: {
    code: string;
    name: string;
  };
  vehicle: {
    platNumber: string;
    brand: string;
    color: string;
  };
  recorder: {
    fullName: string;
  };
}

export default function AdminViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/violations?${params}`);
      const data = await response.json();

      if (data.success) {
        setViolations(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch violations:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchViolations();
  });

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm('Tandai denda ini sebagai sudah dibayar?')) return;

    try {
      const response = await fetch(`/api/violations/${id}/pay`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (data.success) {
        fetchViolations();
      } else {
        alert(data.error?.message || 'Gagal mengupdate status');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  const totalUnpaid = violations
    .filter(v => v.status === 'PENDING')
    .reduce((sum, v) => sum + v.totalFine, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ringkasan Denda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold">{violations.length}</div>
              <div className="text-sm text-muted-foreground">Total Pelanggaran</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {violations.filter(v => v.status === 'PENDING').length}
              </div>
              <div className="text-sm text-muted-foreground">Belum Bayar</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalUnpaid)}
              </div>
              <div className="text-sm text-muted-foreground">Total Tertunda</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Daftar Pelanggaran
          </CardTitle>
          <CardDescription>
            Semua pelanggaran kendaraan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari plat nomor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="PENDING">Belum Bayar</SelectItem>
                <SelectItem value="PAID">Lunas</SelectItem>
                <SelectItem value="WAIVED">Dibebaskan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : violations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pelanggaran</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Plat Nomor</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead className="text-right">Denda</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell>{formatDateTime(violation.violationDate)}</TableCell>
                        <TableCell className="font-mono">
                          <div className="font-medium">{violation.vehicle.platNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {violation.vehicle.brand} - {violation.vehicle.color}
                          </div>
                        </TableCell>
                        <TableCell>
                          {VIOLATION_LABELS[violation.violationType?.code] || violation.violationType?.name}
                        </TableCell>
                        <TableCell>
                          {violation.multiplier > 1 && (
                            <Badge variant="outline">x{violation.multiplier}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(violation.totalFine)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(violation.status)}>
                            {violation.status === 'PENDING' ? 'Belum Bayar' :
                             violation.status === 'PAID' ? 'Lunas' : 'Dibebaskan'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {violation.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(violation.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Bayar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
