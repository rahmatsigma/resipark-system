'use client';

import { useState, useEffect } from 'react';
import type { HouseWithResidents } from '@/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    houseId: '',
    houseNumber: '',
  });

  const [houses, setHouses] = useState<HouseWithResidents[]>([]);

  const fetchHouses = async () => {
    try {
      const response = await fetch('/api/houses?vacant=true');
      const data = await response.json();
      if (data.success) {
        setHouses(data.data as HouseWithResidents[]);
      }
    } catch {
      console.error('Failed to fetch houses');
    }
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validasi
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
          houseNumber: formData.houseId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.error?.message || 'Registrasi gagal');
      }
    } catch {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Registrasi Berhasil!</h2>
            <p className="text-muted-foreground mb-4">
              Akun Anda telah dibuat. Anda akan dialihkan ke halaman login...
            </p>
            <Link href="/">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                Kembali ke Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Daftar Akun Baru</CardTitle>
            <CardDescription className="mt-2">
              Daftar sebagai warga perumahan
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap *</Label>
              <Input
                id="fullName"
                placeholder="Masukkan nama lengkap"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon</Label>
                <Input
                  id="phone"
                  placeholder="081234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Pilih username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="houseNumber">Pilih Rumah Kosong</Label>
              <Select value={formData.houseId} onValueChange={(value) => setFormData({ ...formData, houseId: value, houseNumber: value ? value.split('-')[1] || value : '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rumah kosong" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-house">Tanpa rumah</SelectItem>
                  {houses.map((house: HouseWithResidents) => (
                    <SelectItem key={house.id} value={house.id}>
                      Blok {house.block} - {house.houseNumber} (Kosong)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Hanya rumah kosong yang tersedia. Hubungi admin untuk rumah baru.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link href="/" className="text-emerald-600 hover:underline font-medium">
                Login di sini
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
