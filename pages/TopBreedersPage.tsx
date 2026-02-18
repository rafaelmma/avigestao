import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { Trophy, Star, Users, Home, Mail, Globe } from 'lucide-react';

interface BreederProfile {
  id: string;
  breederName: string;
  email?: string;
  city?: string;
  uf?: string;
  celular?: string;
  site?: string;
  totalBirds?: number;
  plan?: string;
  createdAt?: string;
  displayName?: string;
}

const TopBreedersPage: React.FC = () => {
  const [breeders, setBreeders] = useState<BreederProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopBreeders = async () => {
      try {
        setLoading(true);

        // 1. Buscar aves públicas e agrupar por criador
        const publicBirdsRef = collection(db, 'public_birds');
        const birdsQuery = query(
          publicBirdsRef,
          where('isPublic', '==', true),
          limit(1000)
        );
        const birdsSnapshot = await getDocs(birdsQuery);

        // Contar aves por criador (breederId)
        const breederBirdCount: Record<string, { count: number; breederName: string; city: string; uf: string }> = {};
        for (const doc of birdsSnapshot.docs) {
          const data = doc.data() as any;
          if (!data.breederId) continue;
          if (!breederBirdCount[data.breederId]) {
            breederBirdCount[data.breederId] = {
              count: 0,
              breederName: data.breederName || 'Criador(a) Anônimo(a)',
              city: data.breederCity || '',
              uf: data.breederUf || '',
            };
          }
          breederBirdCount[data.breederId].count += 1;
        }

        // 2. Ordenar por quantidade de aves
        const sortedBreeders = Object.entries(breederBirdCount)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 20);

        // 3. Buscar dados extras de cada criador (settings/preferences)
        const result: BreederProfile[] = [];
        for (const [breederId, info] of sortedBreeders) {
          let city = info.city;
          let uf = info.uf;
          let plan = 'Básico';
          try {
            const prefDoc = await getDocs(
              query(collection(db, 'users', breederId, 'settings'), limit(1))
            );
            if (!prefDoc.empty) {
              const pref = prefDoc.docs[0].data() as any;
              city = pref.breederCity || pref.cidade || city;
              uf = pref.breederUf || pref.uf || uf;
              plan = pref.plan || plan;
            }
          } catch {
            // sem settings, usa dados das aves
          }

          result.push({
            id: breederId,
            breederName: info.breederName,
            city,
            uf,
            totalBirds: info.count,
            plan,
          });
        }

        setBreeders(result);
      } catch (error) {
        console.error('Erro ao buscar top criadores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBreeders();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Top Criadores
            </h1>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600 text-lg">Conheça os melhores criadores da comunidade</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center min-h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Carregando top criadores...</p>
            </div>
          </div>
        )}

        {/* Breeders Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breeders.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum criador disponível no momento</p>
              </div>
            ) : (
              breeders.map((breeder, index) => (
                <div
                  key={breeder.id}
                  className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-t-4 border-blue-500 hover:border-purple-500"
                >
                  {/* Ranking Badge */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {index === 0 && <Trophy className="w-6 h-6 text-yellow-300" />}
                      {index === 1 && <Trophy className="w-6 h-6 text-gray-300" />}
                      {index === 2 && <Trophy className="w-6 h-6 text-orange-300" />}
                      {index > 2 && <span className="text-2xl font-bold text-white">#{index + 1}</span>}
                      <h3 className="text-white font-bold text-lg truncate">{breeder.breederName}</h3>
                    </div>
                    {breeder.plan === 'Profissional' && (
                      <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> PRO
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Total de Aves */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total de Aves</p>
                      <p className="text-3xl font-bold text-blue-600">{breeder.totalBirds || 0}</p>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-3">
                      {breeder.city && breeder.uf && (
                        <div className="flex items-start gap-2">
                          <Home className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{breeder.city}, {breeder.uf}</span>
                        </div>
                      )}

                      {breeder.celular && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-gray-700 break-all">{breeder.celular}</span>
                        </div>
                      )}

                      {breeder.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <a href={`mailto:${breeder.email}`} className="text-sm text-blue-600 hover:text-blue-700 break-all">
                            {breeder.email}
                          </a>
                        </div>
                      )}

                      {breeder.site && (
                        <div className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <a 
                            href={breeder.site} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 break-all"
                          >
                            Visitar site
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBreedersPage;
