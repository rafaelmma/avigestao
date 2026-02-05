import React, { useEffect, useState } from 'react';
import { Eye, TrendingUp, Calendar, BarChart3, MapPin } from 'lucide-react';
import { getBirdVerifications, getAllBirdVerifications, getPublicBirdById } from '../services/firestoreService';
import { Bird } from '../types';

interface VerificationStats {
  birdId: string;
  birdName: string;
  totalVerifications: number;
  lastVerificationTime: Date | null;
  recentVerifications: any[];
}

interface DateRange {
  from: Date;
  to: Date;
}

const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<VerificationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVerifications, setTotalVerifications] = useState(0);
  const [locationStats, setLocationStats] = useState<{ city: string; count: number }[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [selectedBirdId, setSelectedBirdId] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Carregar pássaros do localStorage
      const stored = localStorage.getItem('avigestao_state_v2');
      const birds: Bird[] = stored ? JSON.parse(stored)?.birds || [] : [];
      const birdsMap = new Map(birds.map(b => [b.id, b.name]));

      // Carregar todas as verificações
      const verifications = await getAllBirdVerifications();

      // Filtrar por data
      const filtered = verifications.filter(v => {
        const timestamp = v.timestamp.toDate ? v.timestamp.toDate() : new Date(v.timestamp as any);
        return timestamp >= dateRange.from && timestamp <= dateRange.to;
      });

      // Agrupar por pássaro
      const grouped = new Map<string, any[]>();
      filtered.forEach(v => {
        if (!grouped.has(v.birdId)) {
          grouped.set(v.birdId, []);
        }
        grouped.get(v.birdId)!.push(v);
      });

      // Processar estatísticas
      const statsArray: VerificationStats[] = [];
      for (const [birdId, verifications] of grouped.entries()) {
        let birdName = birdsMap.get(birdId);
        
        // Se não encontrar no localStorage, buscar do Firestore publicamente
        if (!birdName) {
          try {
            const publicBird = await getPublicBirdById(birdId);
            birdName = publicBird?.name || `Pássaro ${birdId.substring(0, 8)}`;
          } catch (err) {
            console.warn('Erro ao buscar nome do pássaro:', birdId);
            birdName = `Pássaro ${birdId.substring(0, 8)}`;
          }
        }

        const timestamps = verifications.map(v => 
          v.timestamp.toDate ? v.timestamp.toDate() : new Date(v.timestamp as any)
        );
        
        statsArray.push({
          birdId,
          birdName,
          totalVerifications: verifications.length,
          lastVerificationTime: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null,
          recentVerifications: verifications.sort((a, b) => {
            const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp as any);
            const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp as any);
            return dateB.getTime() - dateA.getTime();
          })
        });
      }

      // Ordenar por número de verificações
      statsArray.sort((a, b) => b.totalVerifications - a.totalVerifications);

      // Agrupar por localização
      const locationMap = new Map<string, number>();
      filtered.forEach(v => {
        if (v.location && v.location.city && v.location.city !== 'Desconhecida') {
          const cityKey = `${v.location.city}, ${v.location.region || v.location.country}`;
          locationMap.set(cityKey, (locationMap.get(cityKey) || 0) + 1);
        }
      });

      const locationArray = Array.from(locationMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 cidades

      setStats(statsArray);
      setTotalVerifications(filtered.length);
      setLocationStats(locationArray);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics de Verificações</h1>
        <p className="text-slate-600 mt-1">Monitore os acessos aos QR codes dos seus pássaros</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Data Inicial</label>
          <input
            type="date"
            value={dateRange.from.toISOString().split('T')[0]}
            onChange={(e) => setDateRange(prev => ({
              ...prev,
              from: new Date(e.target.value)
            }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Data Final</label>
          <input
            type="date"
            value={dateRange.to.toISOString().split('T')[0]}
            onChange={(e) => setDateRange(prev => ({
              ...prev,
              to: new Date(e.target.value)
            }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total de Leituras</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalVerifications}</p>
            </div>
            <Eye className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pássaros Verificados</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.length}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Média por Pássaro</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats.length > 0 ? Math.round(totalVerifications / stats.length) : 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Card de Localizações */}
      {locationStats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <MapPin className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Principais Localizações</h2>
              <p className="text-sm text-slate-600">Cidades de onde foram feitas as verificações</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationStats.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-sm">#{idx + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{loc.city}</p>
                      <p className="text-xs text-slate-600">{loc.count} leitura{loc.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-2xl">📍</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Pássaros */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Pássaros Mais Verificados</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Carregando...</div>
        ) : stats.length === 0 ? (
          <div className="p-6 text-center text-slate-500">Nenhuma verificação registrada neste período</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {stats.map((stat) => (
              <div key={stat.birdId} className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedBirdId(selectedBirdId === stat.birdId ? null : stat.birdId)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{stat.birdName}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {stat.totalVerifications} leitura{stat.totalVerifications !== 1 ? 's' : ''} {' '}
                      {stat.lastVerificationTime && (
                        <>
                          • Última leitura: {formatDate(stat.lastVerificationTime)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{stat.totalVerifications}</p>
                  </div>
                </div>

                {/* Verificações recentes expandidas */}
                {selectedBirdId === stat.birdId && stat.recentVerifications.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Últimas 10 leituras:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Data/Hora</th>
                            <th className="px-3 py-2 text-left font-semibold">Localização</th>
                            <th className="px-3 py-2 text-left font-semibold">Dispositivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stat.recentVerifications.slice(0, 10).map((v, idx) => {
                            const timestamp = v.timestamp.toDate ? v.timestamp.toDate() : new Date(v.timestamp as any);
                            const location = v.location || {};
                            const locationText = location.city && location.city !== 'Desconhecida' 
                              ? `${location.city}, ${location.region || location.country}`
                              : 'Localização não disponível';
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                  {formatDate(timestamp)}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  <span className="inline-flex items-center gap-1">
                                    📍 {locationText}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                  {v.userAgent?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} - {v.userAgent?.substring(0, 30)}...
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
