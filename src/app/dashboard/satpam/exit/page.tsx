'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Clock,
  CreditCard,
} from 'lucide-react';
import { formatDuration, formatCurrency } from '@/lib/utils';

export default function ExitPage() {
  const [platNumber, setPlatNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/access/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platNumber }),
      });

      const data = await response.json();
      
      setResult({
        success: data.success,
        data: data.data,
        error: data.error?.message,
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
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Akses Keluar Kendaraan</CardTitle>
          <CardDescription>
            Masukkan plat nomor kendaraan untuk mencatat akses keluar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platNumber" className="text-lg">Plat Nomor</Label>
              <Input
                id="platNumber"
                placeholder="B 1234 ABC"
                value={platNumber}
                onChange={(e) => setPlatNumber(e.target.value.toUpperCase())}
                className="text-xl h-14 text-center font-mono"
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-12 bg-blue-500 hover:bg-blue-600"
                disabled={loading || !platNumber}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    Proses Keluar
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
                      Akses Keluar Berhasil
                    </h3>
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Plat Nomor</p>
                          <p className="text-xl font-bold font-mono">{result.data.platNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Durasi Parkir</p>
                          <p className="text-xl font-bold">{formatDuration(result.data.duration)}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Waktu Masuk</p>
                          <p className="font-medium">{new Date(result.data.entryTime).toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Waktu Keluar</p>
                          <p className="font-medium">{new Date(result.data.exitTime).toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      {/* Fine Information */}
                      {result.data.fine && (
                        <Alert variant="destructive" className="mt-4">
                          <CreditCard className="h-4 w-4" />
                          <AlertTitle>Denda Keterlambatan</AlertTitle>
                          <AlertDescription>
                            <div className="mt-2">
                              <p className="font-bold text-lg">
                                {formatCurrency(result.data.fine.amount)}
                              </p>
                              <p className="text-sm mt-1">{result.data.fine.reason}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Result */}
          {!result.success && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
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
