import React, { useState, useEffect } from 'react';
import { Trophy, Download, Star } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Tournament {
  id: string;
  name: string;
  numberOfStages?: number;
  categories?: string[];
  status?: string;
}

interface Inscription {
  id: string;
  tournamentId: string;
  userName: string;
  birdName: string;
  category?: string;
  notes?: Record<number, number>;
  score?: number;
  city?: string;
  state?: string;
  status?: 'pending' | 'registered' | 'disqualified' | 'completed';
}

interface Props {
  onBack: () => void;
}

const TournamentResults: React.FC<Props> = ({ onBack }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'inscritos' | 'resultados' | 'classificacao'>(
    'inscritos',
  );
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    const fromStorage = localStorage.getItem('tournament_results_selected');
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('tournamentId') || undefined;
    const chosen = fromQuery || fromStorage || '';
    if (chosen) setSelectedTournament(chosen);
  }, []);

  useEffect(() => {
    if (selectedTournament) loadInscriptions();
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as Tournament[];
      setTournaments(data);
    } catch (err) {
      console.error('Erro ao carregar torneios', err);
    }
  };

  const loadInscriptions = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'tournament_inscriptions'),
        where('tournamentId', '==', selectedTournament),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as Inscription[];
      setInscriptions(data);
    } catch (err) {
      console.error('Erro ao carregar inscrições', err);
    } finally {
      setLoading(false);
    }
  };

  const tournament = tournaments.find((t) => t.id === selectedTournament);
  const stages = tournament?.numberOfStages || 1;

  const getFiltered = () => {
    let list = inscriptions.filter((i) => i.status === 'registered');
    if (selectedCategory !== 'all') list = list.filter((i) => i.category === selectedCategory);
    return list;
  };

  const groupedByCategory = () => {
    const filtered = getFiltered();
    const grouped: Record<string, Inscription[]> = {};
    filtered.forEach((i) => {
      const k = i.category || 'Sem Categoria';
      (grouped[k] ||= []).push(i);
    });
    return grouped;
  };

  const resultsByStage = () => {
    const filtered = getFiltered();
    return filtered
      .filter((i) => i.notes && i.notes[selectedStage] !== undefined)
      .sort((a, b) => (b.notes?.[selectedStage] || 0) - (a.notes?.[selectedStage] || 0));
  };

  const generalClassification = () => {
    const filtered = getFiltered();
    return filtered
      .filter((i) => i.score && i.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const handlePrint = () => window.print();

  const inscritosGrouped = groupedByCategory();
  const stageResults = resultsByStage();
  const general = generalClassification();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto print:max-w-full">
        <PageHeader
          title={
            <>
              <Trophy size={28} className="text-amber-500" /> Resultados e Classificações
            </>
          }
          subtitle="Acompanhe os resultados dos torneios"
          actions={<PrimaryButton onClick={onBack}>Voltar</PrimaryButton>}
        />

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione o Torneio
              </label>
              <select
                value={selectedTournament}
                onChange={(e) => {
                  setSelectedTournament(e.target.value);
                  setSelectedCategory('all');
                  setViewMode('inscritos');
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Escolha um torneio...</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTournament && stages > 1 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Selecione a Etapa
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white"
                >
                  {Array.from({ length: stages }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}ª Etapa
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedTournament && (
            <div className="flex gap-2 pt-4 border-t print:hidden">
              <button
                onClick={() => setViewMode('inscritos')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm ${
                  viewMode === 'inscritos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Inscritos ({getFiltered().length})
              </button>
              <button
                onClick={() => setViewMode('resultados')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm ${
                  viewMode === 'resultados'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Resultados por Etapa
              </button>
              <button
                onClick={() => setViewMode('classificacao')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm ${
                  viewMode === 'classificacao'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Classificação Geral
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 flex items-center gap-2"
              >
                <Download size={16} /> Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600">Carregando dados...</p>
          </div>
        ) : selectedTournament ? (
          <>
            {viewMode === 'inscritos' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Lista de Inscritos - {tournament?.name}
                </h2>
                {Object.entries(inscritosGrouped).map(([category, inscs]) => (
                  <div
                    key={category}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="bg-green-600 text-white px-6 py-3">
                      <h3 className="font-bold text-lg">Categoria: {category.toUpperCase()}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                              Nº
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                              Expositor
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                              Nome da Ave
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                              UF
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                              Cidade
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {inscs.map((insc, idx) => (
                            <tr
                              key={insc.id}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 uppercase">
                                {insc.userName}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-blue-600 uppercase">
                                {insc.birdName}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {insc.state || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {insc.city || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'resultados' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">
                    {tournament?.name} - {selectedStage}ª ETAPA
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Posição
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Expositor
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Nome da Ave
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Cidade
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">UF</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                          Nota
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                          Pontos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageResults.length > 0 ? (
                        stageResults.map((insc, idx) => {
                          const notaNum = Number(insc.notes?.[selectedStage] ?? 0);
                          const pontos =
                            idx === 0
                              ? 21
                              : idx === 1
                              ? 18
                              : idx === 2
                              ? 15
                              : Math.max(21 - idx * 3, 0);
                          return (
                            <tr
                              key={insc.id}
                              className={`border-b border-slate-100 ${
                                idx < 3 ? 'bg-amber-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-bold text-slate-900">
                                {idx + 1}º
                                {idx < 3 && (
                                  <Star size={14} className="inline ml-1 text-amber-500" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 uppercase">
                                {insc.userName}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-blue-600 uppercase">
                                {insc.birdName}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {insc.city || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {insc.state || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-bold text-green-600">
                                {notaNum.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                                {pontos}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            Nenhum resultado disponível para esta etapa
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'classificacao' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-amber-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">CLASSIFICAÇÃO GERAL - {tournament?.name}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Posição
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Nome da Ave
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Expositor
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">
                          Cidade
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">UF</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                          Pontos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {general.length > 0 ? (
                        general.map((insc, idx) => (
                          <tr
                            key={insc.id}
                            className={`border-b border-slate-100 ${
                              idx < 3 ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-bold text-slate-900">
                              {idx + 1}º
                              {idx === 0 && (
                                <Trophy size={16} className="inline ml-2 text-amber-500" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-600 uppercase italic">
                              {insc.birdName}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 uppercase">
                              {insc.userName}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {insc.city || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {insc.state || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-amber-600">
                              {insc.score}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Nenhuma classificação disponível ainda
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {general.length > 0 && (
                    <div className="bg-slate-50 px-6 py-4 border-t-2 border-slate-200">
                      <p className="text-sm text-slate-600 text-center font-semibold">
                        Total de Participantes: {general.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Selecione um campeonato para ver os resultados</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:max-w-full, .print\\:max-w-full * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:mb-4 { margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default TournamentResults;
