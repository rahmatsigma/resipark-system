'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Users, LogIn, LogOut, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Bike } from 'lucide-react';
import Link from 'next/link';

interface ParkingArea {
  capacity: number;
  occupied: number;
  percentage: number;
  motorSlots: number;
  mobilSlots: number;
  currentMotor: number;
  currentMobil: number;
  motorAvailable: number;
  mobilAvailable: number;
}

interface DashboardStats {
  today: {
    totalEntries: number;
    totalExits: number;
    currentParked: number;
    guests: number;
  };
  parking: {
    main: ParkingArea;
    guest: ParkingArea;
  };
}

function ParkingAreaCard({ 
  title, 
  area, 
  expanded,
  onToggle 
}: { 
  title: string; 
  area: ParkingArea; 
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>
              {area.occupied} / {area.capacity} slot terisi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={area.percentage >= 90 ? 'destructive' : 'secondary'}>
              {area.percentage >= 90 ? 'Hampir Penuh' : 'Tersedia'}
            </Badge>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress 
            value={area.percentage} 
            className={`h-3 ${area.percentage >= 90 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Terisi: {area.percentage}%</span>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Motor Section */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bike className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">Motor</span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {area.motorAvailable} tersedia
                </Badge>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={(area.currentMotor / area.motorSlots) * 100} 
                  className="h-2 [&>div]:bg-emerald-500"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {area.currentMotor} / {area.motorSlots} slot
                  </span>
                  <span className="text-emerald-600 font-medium">
                    {Math.round((area.currentMotor / area.motorSlots) * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Mobil Section */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">Mobil</span>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {area.mobilAvailable} tersedia
                </Badge>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={(area.currentMobil / area.mobilSlots) * 100} 
                  className="h-2 [&>div]:bg-blue-500"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {area.currentMobil} / {area.mobilSlots} slot
                  </span>
                  <span className="text-blue-600 font-medium">
                    {Math.round((area.currentMobil / area.mobilSlots) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SatpamDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainExpanded, setMainExpanded] = useState(false);
  const [guestExpanded, setGuestExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/satpam/entry">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-emerald-200 bg-emerald-50 dark:bg-emerald-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <LogIn className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Akses Masuk</h3>
                  <p className="text-muted-foreground">Catat kendaraan masuk</p>
                </div>
                <ArrowRight className="w-6 h-6 ml-auto text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/satpam/exit">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center">
                  <LogOut className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Akses Keluar</h3>
                  <p className="text-muted-foreground">Catat kendaraan keluar</p>
                </div>
                <ArrowRight className="w-6 h-6 ml-auto text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Masuk Hari Ini</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.today.totalEntries || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keluar Hari Ini</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.today.totalExits || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parkir Saat Ini</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today.currentParked || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamu Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.today.guests || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Parking Capacity with Motor/Mobil */}
      <div className="grid gap-4 md:grid-cols-2">
        <ParkingAreaCard 
          title="Area Parkir Utama" 
          area={stats?.parking.main || {
            capacity: 100,
            occupied: 0,
            percentage: 0,
            motorSlots: 50,
            mobilSlots: 50,
            currentMotor: 0,
            currentMobil: 0,
            motorAvailable: 50,
            mobilAvailable: 50,
          }}
          expanded={mainExpanded}
          onToggle={() => setMainExpanded(!mainExpanded)}
        />
        
        <ParkingAreaCard 
          title="Area Parkir Tamu" 
          area={stats?.parking.guest || {
            capacity: 20,
            occupied: 0,
            percentage: 0,
            motorSlots: 10,
            mobilSlots: 10,
            currentMotor: 0,
            currentMobil: 0,
            motorAvailable: 10,
            mobilAvailable: 10,
          }}
          expanded={guestExpanded}
          onToggle={() => setGuestExpanded(!guestExpanded)}
        />
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Lainnya</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <Link href="/dashboard/satpam/guests">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Registrasi Tamu
              </Button>
            </Link>
            <Link href="/dashboard/satpam/violations">
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Catat Pelanggaran
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
