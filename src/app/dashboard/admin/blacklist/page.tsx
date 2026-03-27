'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Ban, 
  Trash2, 
  AlertCircle, 
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDateTime, getStatusColor } from '@/lib/utils';

interface BlacklistItem {
  id: string;
  vehicle: {
    platNumber: string;
    brand: string;
    color: string;
  };
  reason: string;
  blacklistType: string;
  startDate: string;
  endDate: string | null;
  status: string;
  creator?: {
    fullName: string;
  };
}

export default function BlacklistPage() {
  const [blacklists, setBlacklists] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    platNumber: '',
    reason: '',
    blacklistType: 'TEMPORARY',
    durationDays: '',
  });

  const fetchBlacklists = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (search) params.set('search', search);

      const response = await fetch(`/api/blacklist?${params}`);
      const data = await response.json();

      if (data.success) {
        setBlacklists(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch blacklists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklists();
  }, [page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kendaraan berhasil ditambahkan ke blacklist');
        setDialogOpen(false);
        setFormData({
          platNumber: '',
          reason: '',
          blacklistType: 'TEMPORARY',
          durationDays: '',
        });
        fetchBlacklists();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal menambahkan ke blacklist');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Yakin ingin menghapus dari blacklist?')) return;

    try {
      const response = await fetch(`/api/blacklist?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchBlacklists();
      } else {
        alert(data.error?.message || 'Gagal menghapus dari blacklist');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Blacklist</CardTitle>
              <CardDescription>Kendaraan yang dilarang masuk ke perumahan</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 hover:bg-red-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Blacklist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Tambah ke Blacklist</DialogTitle>
                    <DialogDescription>
                      Masukkan kendaraan ke daftar blacklist
                    </DialogDescription>
                  </DialogHeader>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="platNumber">Plat Nomor</Label>
                      <Input
                        id="platNumber"
                        placeholder="B 1234 ABC"
                        value={formData.platNumber}
                        onChange={(e) => setFormData({ ...formData, platNumber: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="reason">Alasan</Label>
                      <Textarea
                        id="reason"
                        placeholder="Alasan blacklist..."
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="blacklistType">Tipe</Label>
                        <Select
                          value={formData.blacklistType}
                          onValueChange={(value) => setFormData({ ...formData, blacklistType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEMPORARY">Sementara</SelectItem>
                            <SelectItem value="PERMANENT">Permanen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.blacklistType === 'TEMPORARY' && (
                        <div className="grid gap-2">
                          <Label htmlFor="durationDays">Durasi (hari)</Label>
                          <Input
                            id="durationDays"
                            type="number"
                            placeholder="30"
                            value={formData.durationDays}
                            onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-red-500 hover:bg-red-600">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Tambahkan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari plat nomor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : blacklists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada kendaraan dalam blacklist</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plat Nomor</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Berakhir</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklists.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium font-mono">
                          {item.vehicle.platNumber}
                        </TableCell>
                        <TableCell>
                          {item.vehicle.brand} - {item.vehicle.color}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.reason}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.blacklistType === 'PERMANENT' ? 'destructive' : 'secondary'}>
                            {item.blacklistType === 'PERMANENT' ? 'Permanen' : 'Sementara'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(item.startDate)}</TableCell>
                        <TableCell>
                          {item.endDate ? formatDateTime(item.endDate) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(item.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
