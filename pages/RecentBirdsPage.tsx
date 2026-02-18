import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Feather, MapPin, Calendar } from 'lucide-react';

interface RecentBird {
  id: string;
  name: string;
  species: string;
  mutacao?: string;
  sex?: string;
  createdAt?: string;
  breederName?: string;
  city?: string;
  uf?: string;
  status?: string;
  image?: string;
}

const RecentBirdsPage: React.FC = () => {
  const [birds, setBirds] = useState<RecentBird[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentBirds = async () => {
      try {
        setLoading(true);
        // Buscar aves públicas recentes
        const birdsRef = collection(db, 'public_birds');
        const q = query(
          birdsRef,
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(q);
        const recentBirds: RecentBird[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data() as any;
          
          // Filtrar aves com status Óbito
          if (data.status === 'Óbito') continue;
          
          // Só mostrar se tem dados básicos
          if (data.name && data.species) {
            recentBirds.push({
              id: doc.id,
              name: data.name,
              species: data.species,
              mutacao: data.mutacao,
              sex: data.sex || 'Desconhecido',
              createdAt: data.createdAt ? new Date(data.createdAt.toDate?.() || data.createdAt).toLocaleDateString('pt-BR') : 'Data desconhecida',
              breederName: data.breederName || 'Criador(a) Anônimo(a)',
              city: data.breederCity || '',
              uf: data.breederUf || '',
              status: data.status || 'Ativo',
              image: data.imageUrl || undefined,
            });
          }
        }
        
        setBirds(recentBirds); // Todas as aves recentes (limite 100 na query)
      } catch (error) {
        console.error('Erro ao buscar aves recentes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBirds();
  }, []);

  const getSpeciesColor = (species: string): string => {
    const colors: Record<string, string> = {
      'Canário': 'from-amber-400 to-yellow-500',
      'Pintassilgo': 'from-rose-400 to-pink-500',
      'Coleiro': 'from-violet-400 to-purple-500',
      'Tikpe': 'from-emerald-400 to-green-500',
      'Curió': 'from-slate-600 to-slate-700',
      'Bicudo': 'from-blue-400 to-indigo-500',
    };
    return colors[species] || 'from-cyan-400 to-teal-500';
  };

  const getSexIcon = (sex?: string): string => {
    if (!sex) return '?';
    if (sex.toLowerCase() === 'macho' || sex.toLowerCase() === 'male') return '♂';
    if (sex.toLowerCase() === 'fêmea' || sex.toLowerCase() === 'female') return '♀';
    return '?';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Feather className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
              Aves Recentes
            </h1>
            <Feather className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-gray-600 text-lg">Índice das aves mais recentemente adicionadas à comunidade</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center min-h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600">Carregando aves recentes...</p>
            </div>
          </div>
        )}

        {/* Birds List */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {birds.length === 0 ? (
              <div className="text-center py-16">
                <Feather className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhuma ave disponível no momento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-emerald-900">Nome</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-emerald-900">Espécie</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-emerald-900">Sexo</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-emerald-900">Mutação</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-emerald-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Data
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-emerald-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Localização
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-emerald-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {birds.map((bird, index) => (
                      <tr 
                        key={bird.id} 
                        className="hover:bg-emerald-50/50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getSpeciesColor(bird.species)} flex items-center justify-center flex-shrink-0`}>
                              <Feather className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{bird.name}</div>
                              <div className="text-xs text-gray-500">{bird.breederName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">{bird.species}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 font-bold text-lg">
                            {getSexIcon(bird.sex)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {bird.mutacao || <span className="text-gray-400 italic">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{bird.createdAt}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {bird.city || bird.uf ? (
                            `${bird.city || ''}${bird.city && bird.uf ? ', ' : ''}${bird.uf || ''}`
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            {bird.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentBirdsPage;
