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
import { 
  Search, 
  Loader2,
  LogIn,
  Clock,
} from 'lucide-react';
import { formatDateTime, formatDuration } from '@/lib/utils';

interface AccessRecord {
  id: string;
  entryTime: string;
  exitTime: string | null;
  slotNumber: string | null;
  status: string;
  vehicle: {
    platNumber: string;
    brand: string;
    color: string;
    category: string;
  };
  area?: {
    name: string;
    type: string;
  } | null;
}

export default function WargaHistoryPage() {
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/access?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchRecords();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Riwayat Akses
          </CardTitle>
          <CardDescription>
            Riwayat masuk dan keluar kendaraan Anda
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
                <SelectItem value="ACTIVE">Sedang Parkir</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada riwayat akses</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plat Nomor</TableHead>
                    <TableHead>Waktu Masuk</TableHead>
                    <TableHead>Waktu Keluar</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const duration = record.exitTime
                      ? Math.floor((new Date(record.exitTime).getTime() - new Date(record.entryTime).getTime()) / 60000)
                      : null;

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono font-medium">
                          {record.vehicle.platNumber}
                        </TableCell>
                        <TableCell>{formatDateTime(record.entryTime)}</TableCell>
                        <TableCell>
                          {record.exitTime ? formatDateTime(record.exitTime) : '-'}
                        </TableCell>
                        <TableCell>
                          {duration !== null ? formatDuration(duration) : '-'}
                        </TableCell>
                        <TableCell>{record.slotNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            record.status === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }>
                            {record.status === 'ACTIVE' ? 'Parkir' : 'Selesai'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
