'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  LogIn, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Camera,
} from 'lucide-react';
import { VEHICLE_CATEGORY_LABELS } from '@/lib/utils';

export default function EntryPage() {
  const [platNumber, setPlatNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
    isBlacklisted?: boolean;
    isGuest?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/access/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platNumber }),
      });

      const data = await response.json();
      
      setResult({
        success: data.success,
        data: data.data,
        error: data.error?.message,
        isBlacklisted: data.error?.code === 'VEHICLE_BLACKLISTED',
        isGuest: data.error?.isGuest,
      });
    } catch (err) {
      setResult({
        success: false,
        error: 'Terjadi kesalahan sistem',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPlatNumber('');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Akses Masuk Kendaraan</CardTitle>
          <CardDescription>
            Masukkan plat nomor kendaraan untuk mencatat akses masuk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platNumber" className="text-lg">Plat Nomor</Label>
              <div className="flex gap-2">
                <Input
                  id="platNumber"
                  placeholder="B 1234 ABC"
                  value={platNumber}
                  onChange={(e) => setPlatNumber(e.target.value.toUpperCase())}
                  className="text-xl h-14 text-center font-mono"
                  required
                  disabled={loading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  className="h-14 w-14"
                  title="Scan (simulasi)"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600"
                disabled={loading || !platNumber}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Proses Masuk
                  </>
                )}
              </Button>
              {result && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <>
          {/* Success Result */}
          {result.success && result.data && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                      Akses Diizinkan
                    </h3>
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Plat Nomor</p>
                          <p className="text-xl font-bold font-mono">{result.data.vehicle.platNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Kategori</p>
                          <Badge variant="outline" className="mt-1">
                            {VEHICLE_CATEGORY_LABELS[result.data.vehicle.category]}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Kendaraan</p>
                          <p className="font-medium">{result.data.vehicle.brand} - {result.data.vehicle.color}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Slot Parkir</p>
                          <p className="font-bold text-lg">{result.data.slot.slotNumber || 'Otomatis'}</p>
                        </div>
                      </div>

                      {result.data.vehicle.house && (
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Rumah</p>
                          <p className="font-medium">
                            {result.data.vehicle.house.block}-{result.data.vehicle.house.houseNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blacklist Result */}
          {result.isBlacklisted && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                      ⛔ AKSES DITOLAK - BLACKLIST
                    </h3>
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Kendaraan Dilarang Masuk</AlertTitle>
                      <AlertDescription>
                        {result.error}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guest Vehicle Not Found */}
          {result.isGuest && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                      Kendaraan Tidak Terdaftar
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-2">
                      {result.error}
                    </p>
                    <Button
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => window.location.href = '/dashboard/satpam/guests'}
                    >
                      Daftarkan Sebagai Tamu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Errors */}
          {!result.success && !result.isBlacklisted && !result.isGuest && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
