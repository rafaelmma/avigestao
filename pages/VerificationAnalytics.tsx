import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Eye, Calendar } from 'lucide-react';
import { getAllBirdVerifications, getPublicBirdById } from '../services/firestoreService';

interface VerificationRecord {
  bird_id: string;
  bird_name: string;
  count: number;
  last_accessed: Date;
  locations: LocationData[];
}

interface LocationData {
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  count: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

// Converter UTC para horário local (Brasil BRT)
const formatBrazilTime = (date: Date) => {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const VerificationAnalytics: React.FC = () => {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVerifications, setTotalVerifications] = useState(0);
  const [expandedBirdId, setExpandedBirdId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  useEffect(() => {
    const loadVerifications = async () => {
      try {
        setLoading(true);

        // Carrega pássaros do localStorage
        const stored = localStorage.getItem('avigestao_state_v2');
        const birdsMap: Record<string, string> = {};

        if (stored) {
          const data = JSON.parse(stored);
          const birds = data?.birds || [];
          birds.forEach((bird: Record<string, unknown>) => {
            const id = typeof bird.id === 'string' ? bird.id : '';
            const name = typeof bird.name === 'string' ? bird.name : '';
            if (id) birdsMap[id] = name;
          });
        }

        // Busca verificações do Firebase
        const allVerifications = await getAllBirdVerifications();

        // Filtrar por data
        const toDateFrom = (t: unknown): Date => {
          if (
            t &&
            typeof t === 'object' &&
            'toDate' in t &&
            typeof (t as { toDate?: unknown }).toDate === 'function'
          ) {
            return (t as { toDate: () => Date }).toDate();
          }
          return new Date(String(t));
        };

        const filtered = allVerifications.filter((v) => {
          const timestamp = toDateFrom((v as unknown as Record<string, unknown>).timestamp);
          return timestamp >= dateRange.from && timestamp <= dateRange.to;
        });

        // Agrupar por bird_id e localização
        const grouped: Record<
          string,
          {
            count: number;
            last_accessed: Date;
            locationMap: Record<string, Record<string, unknown>>;
          }
        > = {};

        for (const record of filtered) {
          const timestamp = toDateFrom((record as unknown as Record<string, unknown>).timestamp);
          const location = (record as unknown as Record<string, unknown>).location as
            | Record<string, unknown>
            | undefined;
          const loc =
            location ||
            ({ city: 'Desconhecida', region: 'Desconhecida', country: 'Desconhecida' } as Record<
              string,
              unknown
            >);
          const locationKey = `${loc.city}|${loc.region}|${loc.country}`;

          const bid = (record as unknown as Record<string, unknown>).birdId as string;
          if (!grouped[bid]) {
            grouped[bid] = { count: 0, last_accessed: timestamp, locationMap: {} };
          }
          grouped[bid].count++;

          if (timestamp > grouped[bid].last_accessed) {
            grouped[bid].last_accessed = timestamp;
          }

          if (!grouped[bid].locationMap[locationKey]) {
            grouped[bid].locationMap[locationKey] = {
              city: loc.city,
              region: loc.region,
              country: loc.country,
              latitude: loc.latitude,
              longitude: loc.longitude,
              isp: loc.isp,
              count: 0,
            } as Record<string, unknown>;
          }
          grouped[bid].locationMap[locationKey].count =
            ((grouped[bid].locationMap[locationKey].count as number) || 0) + 1;
        }

        // Converte para array e busca nomes do Firestore
        const verificationRecords: VerificationRecord[] = [];

        for (const [bird_id, data] of Object.entries(grouped)) {
          let bird_name = birdsMap[bird_id];

          // Se não encontrar no localStorage, buscar do Firestore publicamente
          if (!bird_name) {
            try {
              const publicBird = await getPublicBirdById(bird_id);
              bird_name = publicBird?.name || `Pássaro ${bird_id.substring(0, 8)}`;
            } catch (err) {
              console.warn('Erro ao buscar nome do pássaro:', bird_id, err);
              bird_name = `Pássaro ${bird_id.substring(0, 8)}`;
            }
          }

          // Converter locationMap em array ordenado
          const locations = Object.values(data.locationMap).sort(
            (a, b) => (b.count as number) - (a.count as number),
          ) as unknown as LocationData[];

          verificationRecords.push({
            bird_id,
            bird_name,
            count: data.count,
            last_accessed: data.last_accessed,
            locations,
          });
        }

        // Ordena por contagem
        verificationRecords.sort((a, b) => b.count - a.count);

        setVerifications(verificationRecords);
        setTotalVerifications(verificationRecords.reduce((sum, v) => sum + v.count, 0));
      } catch (err) {
        console.error('Erro ao carregar verificações:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVerifications();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Analytics de Verificações</h2>
          <p className="text-slate-600 font-medium mt-1">
            Monitore acessos ao seu catálogo de pássaros
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={dateRange.from.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, from: new Date(e.target.value) })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 transition-all"
          />
          <input
            type="date"
            value={dateRange.to.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, to: new Date(e.target.value) })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Total de Verificações
            </h3>
            <Eye className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalVerifications}</p>
          <p className="text-xs text-slate-500 mt-2">Último mês</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Pássaros Verificados
            </h3>
            <BarChart3 className="text-emerald-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{verifications.length}</p>
          <p className="text-xs text-slate-500 mt-2">Únicos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Média por Pássaro
            </h3>
            <TrendingUp className="text-amber-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {verifications.length > 0 ? Math.round(totalVerifications / verifications.length) : 0}
          </p>
          <p className="text-xs text-slate-500 mt-2">Acessos</p>
        </div>
      </div>

      {/* Top Pássaros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="text-blue-500" size={24} />
          <h3 className="text-xl font-bold text-slate-900">Pássaros Mais Verificados</h3>
        </div>

        {verifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nenhuma verificação registrada ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {verifications.map((bird, idx) => {
              const maxCount = Math.max(...verifications.map((v) => v.count));
              const percentage = (bird.count / maxCount) * 100;
              const isExpanded = expandedBirdId === bird.bird_id;

              return (
                <div key={bird.bird_id} className="group">
                  <div
                    className="flex items-center justify-between mb-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                    onClick={() => setExpandedBirdId(isExpanded ? null : bird.bird_id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-slate-900">{bird.bird_name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{bird.count} acessos</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Último acesso: {formatBrazilTime(bird.last_accessed)}
                  </p>

                  {/* Expansão com dados de localização */}
                  {isExpanded && bird.locations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        📍 Regiões de Acesso:
                      </p>
                      <div className="space-y-2">
                        {bird.locations.map((loc, locIdx) => (
                          <div key={locIdx} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {loc.city}, {loc.region}
                                </p>
                                <p className="text-xs text-slate-600">{loc.country}</p>
                                {loc.isp && (
                                  <p className="text-xs text-slate-500 mt-1">ISP: {loc.isp}</p>
                                )}
                              </div>
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                                {loc.count} acesso{loc.count > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-purple-500" size={24} />
          <h3 className="text-xl font-bold text-slate-900">Atividade Recente</h3>
        </div>

        <div className="space-y-4">
          {verifications.slice(0, 5).map((bird) => (
            <div
              key={bird.bird_id}
              className="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-0"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Eye size={16} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{bird.bird_name} foi verificado</p>
                <p className="text-sm text-slate-600">{formatBrazilTime(bird.last_accessed)}</p>
              </div>
              <span className="text-2xl font-bold text-blue-500">{bird.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-3">💡 Dica PRO</h4>
          <p className="text-sm text-blue-800">
            Pássaros com mais verificações indicam maior interesse do mercado. Considere produzir
            mais filhotes desses indivíduos!
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <h4 className="font-bold text-emerald-900 mb-3">🎯 Oportunidade</h4>
          <p className="text-sm text-emerald-800">
            Compartilhe o link de verificação nas redes sociais para aumentar a confiabilidade e
            atrair mais clientes!
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationAnalytics;
