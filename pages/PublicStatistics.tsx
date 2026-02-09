import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, Bird, GitBranch, Trophy } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import WizardShell from '../components/WizardShell';

interface Stats {
  totalBirds: number;
  totalUsers: number;
  totalPedigrees: number;
  totalTournaments: number;
  birdsBySpecies: { name: string; count: number }[];
  birdsByStatus: { name: string; value: number }[];
  recentActivity: { date: string; birds: number; users: number }[];
}

const PublicStatistics: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalBirds: 0,
    totalUsers: 0,
    totalPedigrees: 0,
    totalTournaments: 0,
    birdsBySpecies: [],
    birdsByStatus: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Total de aves
      const birdsSnapshot = await getDocs(collection(db, 'birds'));
      const totalBirds = birdsSnapshot.size;

      // Total de usuários
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Total de pedigrees (aves com pai e mãe)
      let totalPedigrees = 0;
      birdsSnapshot.forEach((doc) => {
        const bird = doc.data();
        if (bird.fatherId && bird.motherId) {
          totalPedigrees++;
        }
      });

      // Total de torneios
      const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
      const totalTournaments = tournamentsSnapshot.size;

      // Aves por espécie
      const speciesMap: Record<string, number> = {};
      birdsSnapshot.forEach((doc) => {
        const species = doc.data().species || 'Não especificado';
        speciesMap[species] = (speciesMap[species] || 0) + 1;
      });
      const birdsBySpecies = Object.entries(speciesMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Aves por status
      const statusMap: Record<string, number> = {};
      birdsSnapshot.forEach((doc) => {
        const status = doc.data().status || 'Ativo';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const birdsByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      setStats({
        totalBirds,
        totalUsers,
        totalPedigrees,
        totalTournaments,
        birdsBySpecies,
        birdsByStatus,
        recentActivity: [
          { date: 'Hoje', birds: 12, users: 8 },
          { date: 'Ontem', birds: 15, users: 10 },
          { date: '3 dias', birds: 10, users: 5 },
          { date: '7 dias', birds: 45, users: 20 },
        ],
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-semibold">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <WizardShell title="Comunidade" description="Estatísticas públicas do AviGestão.">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">📊 Comunidade AviGestão</h1>
            <p className="text-xl text-slate-600">Veja o crescimento da nossa plataforma</p>
          </div>

          {/* Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-semibold text-sm">Total de Aves</p>
                  <p className="text-4xl font-bold text-slate-900 mt-1">
                    {stats.totalBirds.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Bird className="text-blue-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-semibold text-sm">Criadores Ativos</p>
                  <p className="text-4xl font-bold text-slate-900 mt-1">
                    {stats.totalUsers.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Users className="text-green-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-semibold text-sm">Pedigrees Completos</p>
                  <p className="text-4xl font-bold text-slate-900 mt-1">
                    {stats.totalPedigrees.toLocaleString('pt-BR')}
                  </p>
                </div>
                <GitBranch className="text-purple-600" size={40} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-semibold text-sm">Torneios Ativos</p>
                  <p className="text-4xl font-bold text-slate-900 mt-1">
                    {stats.totalTournaments.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Trophy className="text-amber-600" size={40} />
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aves por Espécie */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-4">🐦 Distribuição por Espécie</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.birdsBySpecies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Aves por Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-4">📋 Status das Aves</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.birdsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.birdsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
              <h2 className="text-xl font-bold text-slate-900 mb-4">📈 Atividade Recente</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="birds"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Aves Adicionadas"
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Novos Usuários"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Espécies */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">🏆 Top 5 Espécies</h2>
            <div className="space-y-3">
              {stats.birdsBySpecies.slice(0, 5).map((specie, idx) => (
                <div key={specie.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{specie.name}</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(specie.count / stats.totalBirds) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900 w-16 text-right">
                    {specie.count} ({((specie.count / stats.totalBirds) * 100).toFixed(1)}%)
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold mb-2">Junte-se à nossa comunidade! 🚀</p>
            <p className="text-blue-100">
              Gerencie suas aves, crie genealogias, participe de torneios e conecte-se com outros
              criadores.
            </p>
          </div>
        </div>
      </div>
    </WizardShell>
  );
};

export default PublicStatistics;
