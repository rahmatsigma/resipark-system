'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { formatDateTime, formatCurrency, getStatusColor } from '@/lib/utils';
import { VIOLATION_LABELS } from '@/lib/utils';

interface Violation {
  id: string;
  totalFine: number;
  status: string;
  violationDate: string;
  description: string | null;
  violationType: {
    code: string;
    name: string;
  };
  vehicle: {
    platNumber: string;
  };
}

export default function WargaViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/violations');
      const data = await response.json();

      if (data.success) {
        setViolations(data.data || []);
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

  const totalUnpaid = violations
    .filter(v => v.status === 'PENDING')
    .reduce((sum, v) => sum + v.totalFine, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Ringkasan Pelanggaran
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
              <div className="text-sm text-muted-foreground">Total Denda</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggaran</CardTitle>
          <CardDescription>Riwayat pelanggaran kendaraan Anda</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Plat Nomor</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Denda</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>{formatDateTime(violation.violationDate)}</TableCell>
                      <TableCell className="font-mono">
                        {violation.vehicle.platNumber}
                      </TableCell>
                      <TableCell>
                        {VIOLATION_LABELS[violation.violationType?.code] || violation.violationType?.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {violation.description || '-'}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
