import React, { useState, useEffect } from 'react';
import { Bird as BirdIcon, Search, Filter, MapPin, Calendar, Eye, ChevronDown, X, Users, Award, TreePine, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Bird, BreederSettings } from '../types';
import PedigreeTreeNew from '../components/PedigreeTreeNew';

interface PublicBird extends Bird {
  breederName?: string;
  breederCity?: string;
  breederState?: string;
  breederLogo?: string;
  breederAccentColor?: string;
  breederPrimaryColor?: string;
}

interface PublicBirdsProps {
  onNavigateToHome?: () => void;
}

const PublicBirds: React.FC<PublicBirdsProps> = ({ onNavigateToHome }) => {
  const [birds, setBirds] = useState<PublicBird[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('Todas');
  const [selectedSex, setSelectedSex] = useState<string>('Todos');
  const [selectedBird, setSelectedBird] = useState<PublicBird | null>(null);
  const [allBirds, setAllBirds] = useState<Bird[]>([]);
  const [breederSettings, setBreederSettings] = useState<BreederSettings | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPublicBirds();
  }, []);

  const fetchPublicBirds = async () => {
    setLoading(true);
    try {
      const birdsRef = collection(db, 'public_birds');
      const q = query(
        birdsRef,
        where('isPublic', '==', true),
        where('status', '==', 'Ativo')
      );
      
      const snapshot = await getDocs(q);
      const birdsData = snapshot.docs.map(birdDoc => ({
        id: birdDoc.id,
        ...birdDoc.data()
      } as PublicBird));
      
      setBirds(birdsData);
    } catch (error) {
      console.error('Erro ao buscar pássaros públicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBirdFamily = async (bird: PublicBird) => {
    if (!bird.breederId) return;
    
    try {
      // Buscar todos os pássaros do mesmo criador para árvore genealógica
      const birdsRef = collection(db, 'public_birds');
      const q = query(birdsRef, where('breederId', '==', bird.breederId));
      const snapshot = await getDocs(q);
      const familyBirds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bird));
      setAllBirds(familyBirds);
      
      // Configurações padrão mínimas para renderizar a árvore
      setBreederSettings({
        breederName: bird.breederName || 'Criador',
        accentColor: '#f59e0b',
        primaryColor: '#1e293b',
        logoUrl: bird.breederLogo,
        cpfCnpj: '',
        sispassNumber: '',
        registrationDate: '',
        renewalDate: '',
        plan: 'Básico'
      } as BreederSettings);
      
      setSelectedBird(bird);
    } catch (error) {
      console.error('Erro ao buscar família do pássaro:', error);
    }
  };

  const species = ['Todas', ...Array.from(new Set(birds.map(b => b.species)))];
  const sexOptions = ['Todos', 'Macho', 'Fêmea', 'Desconhecido'];

  const filteredBirds = birds.filter(bird => {
    const matchesSearch = bird.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bird.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bird.ringNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bird.breederName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecies = selectedSpecies === 'Todas' || bird.species === selectedSpecies;
    const matchesSex = selectedSex === 'Todos' || bird.sex === selectedSex;
    return matchesSearch && matchesSpecies && matchesSex;
  });

  const handleCardClick = (bird: PublicBird) => {
    fetchBirdFamily(bird);
  };

  const closeModal = () => {
    setSelectedBird(null);
    setAllBirds([]);
    setBreederSettings(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          {onNavigateToHome && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={onNavigateToHome}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-brand/40 hover:text-brand transition-all shadow-sm"
              >
                <ArrowLeft size={16} />
                Voltar para início
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <BirdIcon size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Galeria de Pássaros</h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Explore os pássaros cadastrados pelos criadores da plataforma e veja suas árvores genealógicas
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 text-slate-600">
              <BirdIcon size={20} className="text-brand" />
              <span className="font-bold">{birds.length}</span>
              <span className="text-sm">Pássaros Públicos</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users size={20} className="text-purple-600" />
              <span className="font-bold">{new Set(birds.map(b => b.breederId)).size}</span>
              <span className="text-sm">Criadores</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, espécie, anilha ou criador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand transition-colors"
          >
            <Filter size={16} />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Espécie</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {species.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sexo</label>
                <select
                  value={selectedSex}
                  onChange={(e) => setSelectedSex(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {sexOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="text-center text-sm text-slate-600">
          {loading ? (
            <span>Carregando...</span>
          ) : (
            <span>Mostrando <strong>{filteredBirds.length}</strong> de <strong>{birds.length}</strong> pássaros</span>
          )}
        </div>

        {/* Birds Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
              <p className="text-slate-400 font-medium">Carregando pássaros...</p>
            </div>
          </div>
        ) : filteredBirds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBirds.map((bird) => (
              <div
                key={bird.id}
                onClick={() => handleCardClick(bird)}
                className="group bg-white rounded-3xl shadow-md hover:shadow-xl border border-slate-100 hover:border-brand/30 transition-all cursor-pointer overflow-hidden"
              >
                {/* Photo */}
                <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {bird.photoUrl ? (
                    <img
                      src={bird.photoUrl}
                      alt={bird.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BirdIcon size={64} className="text-slate-300" />
                    </div>
                  )}
                  
                  {/* Sex Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold uppercase shadow-lg ${
                    bird.sex === 'Macho' 
                      ? 'bg-blue-500 text-white' 
                      : bird.sex === 'Fêmea'
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-400 text-white'
                  }`}>
                    {bird.sex || 'N/D'}
                  </div>

                  {/* View Icon */}
                  <div className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={18} className="text-brand" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  {/* Name and Ring */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand transition-colors truncate">
                      {bird.name}
                    </h3>
                    {bird.ringNumber && (
                      <p className="text-xs text-slate-400 font-mono mt-1">Anilha: {bird.ringNumber}</p>
                    )}
                  </div>

                  {/* Species */}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BirdIcon size={16} className="text-brand flex-shrink-0" />
                    <span className="font-medium truncate">{bird.species}</span>
                  </div>

                  {/* Breeder */}
                  {bird.breederName && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Award size={16} className="text-purple-600 flex-shrink-0" />
                      <span className="truncate">{bird.breederName}</span>
                    </div>
                  )}

                  {/* Location */}
                  {bird.breederCity && bird.breederState && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{bird.breederCity}, {bird.breederState}</span>
                    </div>
                  )}

                  {/* Birth Date */}
                  {bird.birthDate && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span>Nascido em {new Date(bird.birthDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Ver árvore genealógica</span>
                      <TreePine size={16} className="text-brand group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <BirdIcon size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-lg font-bold text-slate-400">Nenhum pássaro encontrado</p>
            <p className="text-sm text-slate-400 mt-2">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>

      {/* Modal - Bird Details with Pedigree */}
      {selectedBird && breederSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{selectedBird.name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedBird.species} • {selectedBird.breederName}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Photo and Info */}
                <div className="space-y-6">
                  {/* Photo */}
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 aspect-square">
                    {selectedBird.photoUrl ? (
                      <img
                        src={selectedBird.photoUrl}
                        alt={selectedBird.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BirdIcon size={80} className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info Cards */}
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Sexo</p>
                      <p className="text-lg font-bold text-slate-900">{selectedBird.sex || 'Desconhecido'}</p>
                    </div>
                    
                    {selectedBird.ringNumber && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Anilha</p>
                        <p className="text-lg font-mono font-bold text-slate-900">{selectedBird.ringNumber}</p>
                      </div>
                    )}
                    
                    {selectedBird.birthDate && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Data de Nascimento</p>
                        <p className="text-lg font-bold text-slate-900">
                          {new Date(selectedBird.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    
                    {selectedBird.colorMutation && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mutação</p>
                        <p className="text-lg font-bold text-slate-900">{selectedBird.colorMutation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Pedigree Tree */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-50 rounded-2xl p-6">
                    <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                      <TreePine size={20} className="text-brand" />
                      Árvore Genealógica
                    </h3>
                    <div className="overflow-x-auto">
                      <PedigreeTreeNew
                        bird={selectedBird}
                        allBirds={allBirds}
                        settings={breederSettings}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBirds;
