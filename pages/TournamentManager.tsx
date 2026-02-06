import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, Trophy, Clock, Users, AlertCircle, CheckCircle, MapPin, User } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

interface Tournament {
  id?: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  species: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  createdBy: string;
  createdAt?: any;
  maxParticipants: number;
  rules?: string;
  address?: string;
  city?: string;
  state?: string;
  organizer?: string;
  numberOfStages?: number;
  categories?: string[];
}

interface Inscription {
  id?: string;
  tournamentId: string;
  userId: string;
  userName: string;
  birdName: string;
  birdId: string;
  birdSpecies: string;
  registeredAt: any;
  status: 'registered' | 'disqualified' | 'completed';
  category?: string;
  placement?: number;
  score?: number;
  notes?: Record<number, number>; // notas por etapa: {1: 8.5, 2: 9.0}
}

const BRAZILIAN_SPECIES = [
  'Curió',
  'Bicudo',
  'Trinca Ferro',
  'Canário da Terra',
  'Azulão',
  'Coleiro',
  'Sabiá'
];

// Helper para converter data do Firebase
const convertToDate = (date: any): Date => {
  if (date instanceof Date) return date;
  if (date?.toDate) return date.toDate();
  return new Date(date);
};

// Helper para converter para string ISO
const toISOString = (date: any): string => {
  return convertToDate(date).toISOString().slice(0, 16);
};

const TournamentManager: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'inscriptions'>('list');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [formData, setFormData] = useState<Tournament>({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    species: [],
    status: 'upcoming',
    createdBy: 'admin',
    maxParticipants: 50,
    rules: '',
    address: '',
    city: '',
    state: '',
    organizer: '',
    numberOfStages: 1
  });

  // Carregar torneios
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      setTournaments(data);
    } catch (error) {
      console.error('Erro ao carregar torneios:', error);
    }
  };

  const loadInscriptions = async (tournamentId: string) => {
    try {
      const q = query(
        collection(db, 'tournament_inscriptions'),
        where('tournamentId', '==', tournamentId),
        orderBy('registeredAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Inscription[];
      setInscriptions(data);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    }
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMessage('Você precisa estar logado para criar torneios!');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'tournaments', editingId), {
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate)
        });
      } else {
        await addDoc(collection(db, 'tournaments'), {
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          createdBy: currentUser.uid,
          createdAt: new Date()
        });
      }

      setSaveStatus('success');
      setTimeout(() => {
        loadTournaments();
        setShowForm(false);
        setEditingId(null);
        resetForm();
        setSaveStatus('idle');
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao salvar torneio:', error);
      setErrorMessage(error.message || 'Erro ao salvar torneio. Verifique sua conexão.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este torneio?')) {
      try {
        await deleteDoc(doc(db, 'tournaments', id));
        loadTournaments();
      } catch (error) {
        console.error('Erro ao deletar torneio:', error);
      }
    }
  };

  const handleDeleteInscription = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta inscrição?')) {
      try {
        await deleteDoc(doc(db, 'tournament_inscriptions', id));
        if (selectedTournament?.id) {
          loadInscriptions(selectedTournament.id);
        }
      } catch (error) {
        console.error('Erro ao deletar inscrição:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      species: [],
      status: 'upcoming',
      createdBy: 'admin',
      maxParticipants: 50,
      rules: '',
      address: '',
      city: '',
      state: '',
      organizer: '',
      numberOfStages: 1
    });
  };

  const handleEditTournament = (tournament: Tournament) => {
    setFormData(tournament);
    setEditingId(tournament.id || null);
    setShowForm(true);
  };

  const handleViewDetails = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setViewMode('details');
  };

  const handleViewInscriptions = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    loadInscriptions(tournament.id || '');
    setViewMode('inscriptions');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '📅 Próximo';
      case 'ongoing':
        return '🔴 Em Andamento';
      case 'completed':
        return '✅ Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy size={32} /> Central de Torneios
            </h1>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              <Plus size={18} />
              Novo Torneio
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Torneio' : 'Criar Novo Torneio'}
              </h2>
              <form onSubmit={handleSaveTournament} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nome do Torneio"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="upcoming">Próximo</option>
                    <option value="ongoing">Em Andamento</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>

                <textarea
                  placeholder="Descrição do Torneio"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Data Início</label>
                    <input
                      type="datetime-local"
                      value={toISOString(formData.startDate)}
                      onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Data Fim</label>
                    <input
                      type="datetime-local"
                      value={toISOString(formData.endDate)}
                      onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Máx. Participantes</label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Espécies Permitidas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BRAZILIAN_SPECIES.map(species => (
                      <label key={species} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.species.includes(species)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                species: [...formData.species, species]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                species: formData.species.filter(s => s !== species)
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">{species}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Organizador</label>
                    <input
                      type="text"
                      placeholder="Nome ou Entidade"
                      value={formData.organizer || ''}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Número de Etapas</label>
                    <input
                      type="number"
                      placeholder="Ex: 3"
                      value={formData.numberOfStages || 1}
                      onChange={(e) => setFormData({ ...formData, numberOfStages: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      min={1}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Local do Torneio</label>
                  <input
                    type="text"
                    placeholder="Endereço Completo"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Estado (UF)"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                      maxLength={2}
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Regulamento/Regras do Torneio (opcional)"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />

                {/* Feedback de status */}
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    <CheckCircle size={20} />
                    <span>Torneio salvo com sucesso!</span>
                  </div>
                )}
                
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <AlertCircle size={20} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Torneio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                      setEditingId(null);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map(tournament => (
              <div
                key={tournament.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 flex-1">{tournament.name}</h3>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(tournament.status)}`}>
                    {getStatusLabel(tournament.status)}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mb-3">{tournament.description}</p>

                <div className="space-y-2 text-sm text-slate-700 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                        {convertToDate(tournament.startDate).toLocaleDateString('pt-BR')} -{' '}
                        {convertToDate(tournament.endDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    <span>Máx: {tournament.maxParticipants} participantes</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(tournament)}
                    className="flex-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold"
                  >
                    <Eye size={14} className="inline mr-1" /> Ver
                  </button>
                  <button
                    onClick={() => handleViewInscriptions(tournament)}
                    className="flex-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 font-semibold"
                  >
                    <Users size={14} className="inline mr-1" /> Inscritos
                  </button>
                  <button
                    onClick={() => handleEditTournament(tournament)}
                    className="px-3 py-1 text-sm bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTournament(tournament.id || '')}
                    className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {tournaments.length === 0 && (
            <div className="text-center py-12">
              <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-semibold mb-4">Nenhum torneio criado ainda</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Criar Primeiro Torneio
              </button>
            </div>
          )}
        </>
      )}

      {viewMode === 'details' && selectedTournament && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <button
            onClick={() => setViewMode('list')}
            className="mb-4 text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Voltar
          </button>

          <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedTournament.name}</h2>
          <p className="text-slate-600 mb-6">{selectedTournament.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 font-semibold">Status</p>
              <p className="text-lg font-bold text-blue-600">{getStatusLabel(selectedTournament.status)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 font-semibold">Data Início</p>
              <p className="text-lg font-bold text-green-600">
                {convertToDate(selectedTournament.startDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 font-semibold">Data Fim</p>
              <p className="text-lg font-bold text-amber-600">
                {convertToDate(selectedTournament.endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 font-semibold">Máx. Part.</p>
              <p className="text-lg font-bold text-purple-600">{selectedTournament.maxParticipants}</p>
            </div>
          </div>

          {/* Informações do Local */}
          {(selectedTournament.address || selectedTournament.city || selectedTournament.organizer) && (
            <div className="bg-slate-50 p-6 rounded-lg mb-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Informações do Evento
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {selectedTournament.organizer && (
                  <div>
                    <p className="text-sm text-slate-600 font-semibold">Organizador</p>
                    <p className="text-slate-900">{selectedTournament.organizer}</p>
                  </div>
                )}
                {selectedTournament.numberOfStages && (
                  <div>
                    <p className="text-sm text-slate-600 font-semibold">Número de Etapas</p>
                    <p className="text-slate-900">{selectedTournament.numberOfStages}</p>
                  </div>
                )}
                {selectedTournament.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600 font-semibold">Endereço</p>
                    <p className="text-slate-900">{selectedTournament.address}</p>
                    {selectedTournament.city && selectedTournament.state && (
                      <p className="text-slate-600">{selectedTournament.city}/{selectedTournament.state}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTournament.rules && (
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-2">Regulamento</h3>
              <div className="bg-slate-50 p-4 rounded-lg text-slate-700 whitespace-pre-wrap">
                {selectedTournament.rules}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-slate-900 mb-2">Espécies Permitidas</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTournament.species.map(species => (
                <span key={species} className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm font-semibold">
                  {species}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'inscriptions' && selectedTournament && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <button
            onClick={() => setViewMode('list')}
            className="mb-4 text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Voltar
          </button>

          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Inscrições - {selectedTournament.name} ({inscriptions.length} inscritos)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">#</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Participante</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Ave</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Data Inscrição</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Colocação</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((inscription, idx) => (
                  <tr key={inscription.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{inscription.userName}</td>
                    <td className="px-4 py-3">{inscription.birdName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {inscription.registeredAt instanceof Date
                        ? inscription.registeredAt.toLocaleDateString('pt-BR')
                        : inscription.registeredAt?.toDate?.().toLocaleDateString('pt-BR') ?? 
                          new Date(inscription.registeredAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        inscription.status === 'registered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {inscription.status === 'registered' ? '✅ Registrado' : inscription.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {inscription.placement ? `${inscription.placement}º` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteInscription(inscription.id || '')}
                        className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inscriptions.length === 0 && (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-600">Nenhuma inscrição neste torneio</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentManager;
