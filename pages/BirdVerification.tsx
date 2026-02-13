/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  AlertCircle,
  CheckCircle,
  Search,
  QrCode,
} from 'lucide-react';
import { Bird } from '../types';
import { APP_LOGO } from '../constants';
import {
  recordBirdVerification,
  getPublicBirdById,
  getPublicBirdByRingNumber,
  getPublicBreederByBirdId,
} from '../services/firestoreService';

export const calculateFullAge = (birthDateString?: string) => {
  if (!birthDateString) return 'Idade desc.';
  const birthDate = new Date(birthDateString);
  const today = new Date();

  if (birthDate > today) return 'Recém-nascido';

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }

  if (years < 0) return 'Recém-nascido';
  
  const yearPart = years > 0 ? `${years} ano${years !== 1 ? 's' : ''}` : '';
  const monthPart = months > 0 ? `${months} ${months !== 1 ? 'meses' : 'mês'}` : '';

  if (years > 0 && months > 0) return `${yearPart} e ${monthPart}`;
  if (years > 0) return yearPart;
  if (months > 0) return monthPart;
  return 'Recém-nascido';
};

const BirdVerification: React.FC<{ birdId?: string }> = ({ birdId: initialBirdId }) => {
  const [searchId, setSearchId] = useState('');
  const [currentBirdId, setCurrentBirdId] = useState(initialBirdId || '');
  const [bird, setBird] = useState<Bird | null>(null);
  const [breeder, setBreeder] = useState<any>(null);
  const [parentNames, setParentNames] = useState<{ fatherName?: string; motherName?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (currentBirdId) {
      loadBirdData(currentBirdId);
    }
  }, [currentBirdId]);

  const loadBirdData = async (id: string) => {
    setLoading(true);
    setError(null);
    setVerified(false);
    
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setError('Tempo esgotado ao carregar dados. Verifique a conexão.');
        setLoading(false);
      }
    }, 15000);

    try {
      if (!id || id.trim() === '') {
        setLoading(false);
        return;
      }

      // 1. Registrar leitura (apenas se for ID direto do QR, opcional)
      try { await recordBirdVerification(id); } catch (verErr) { console.warn(verErr); }

      // 2. Tentar buscar por ID (Padrão QR Code)
      let birdData = await getPublicBirdById(id);

      if (birdData) {
        // Verificar se o pássaro é público antes de mostrar
        if (!birdData.isPublic) {
          setError('Este pássaro está configurado como Privado pelo criador e não pode ser consultado publicamente.');
          setLoading(false);
          return;
        }

        setBird(birdData);
        const actualId = birdData.id; // Usar o ID real do pássaro para as próximas buscas

        // 4. Buscar nomes de pai e mãe
        const pNames: { fatherName?: string; motherName?: string } = {};
        if (birdData.fatherId) {
          const f = await getPublicBirdById(birdData.fatherId);
          if (f?.name) pNames.fatherName = f.name;
        }
        if (birdData.motherId) {
          const m = await getPublicBirdById(birdData.motherId);
          if (m?.name) pNames.motherName = m.name;
        }
        setParentNames(pNames);

        // 5. Buscar dados do criador
        const breederData = await getPublicBreederByBirdId(actualId);
        if (breederData) setBreeder(breederData);

        setVerified(true);
        setLoading(false);
      } else {
        setError('Pássaro não encontrado na base de dados.');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setCurrentBirdId(searchId.trim());
    }
  };

  const handleGoBack = () => {
    if (currentBirdId && !initialBirdId) {
      setBird(null);
      setCurrentBirdId('');
      setError(null);
    } else {
      window.history.back();
    }
  };

  if (!currentBirdId && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-white py-12 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full text-center">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-white rounded-[40px] p-5 flex items-center justify-center shadow-xl shadow-indigo-100 border border-slate-100">
              <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Verificação de Autenticidade</h1>
          <p className="text-lg text-slate-500 font-medium mb-10">
            Consulte a validade de certificados registrados na plataforma AviGestão através do ID único da ave.
          </p>
          
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="Digite o ID da Ave (Ex: frnR6NM...)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full px-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] outline-none text-lg text-slate-700 font-bold focus:border-indigo-400 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-lg"
            />
            <button
              type="submit"
              className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
            >
              <Search size={20} className="md:hidden" />
              <span className="hidden md:inline">Verificar ID</span>
            </button>
          </form>

          {/* Guia de como obter o ID */}
          <div className="mt-12 bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-8 text-left">
            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={18} /> Como obter o ID da Ave?
            </h4>
            <ul className="space-y-3 text-sm text-indigo-700 font-medium">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                Acesse seu **Plantel** e clique na ave desejada.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                Na aba **Dados Básicos**, localize o campo **ID de Verificação**.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                Clique sobre o código para copiá-lo e cole aqui.
              </li>
            </ul>
            <div className="mt-6 pt-6 border-t border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">
                Nota: Apenas aves marcadas como "Públicas" no cadastro podem ser consultadas por terceiros.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-black text-slate-900">Consultando Base de Dados...</h2>
          <p className="text-slate-500 font-medium mt-2">Buscando informações do pássaro {currentBirdId.substring(0, 8)}</p>
        </div>
      </div>
    );
  }

  if (error || !bird) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-[48px] shadow-2xl p-12 max-w-lg w-full text-center border border-red-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Pássaro Não Encontrado</h1>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            {error || 'Não foi possível localizar este registro em nossa base de dados oficial.'}
          </p>
          <div className="bg-slate-50 rounded-[24px] p-6 mb-10 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">ID Consultada</p>
            <p className="text-sm font-mono font-bold text-slate-700 break-all">{currentBirdId}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setCurrentBirdId(''); setError(null); }}
              className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
            >
              Nova Busca
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-white py-12 px-4 shadow-inner">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-content, #printable-content * { visibility: visible; }
          #printable-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
          .rounded-[40px] { border-radius: 20px !important; }
          .shadow-sm, .shadow-xl { box-shadow: none !important; border: 1px solid #eee !important; }
        }
      `}} />
      <div className="max-w-4xl mx-auto" id="printable-content">
        {/* Brand Header */}
        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-white rounded-[24px] p-3 flex items-center justify-center shadow-lg shadow-indigo-100 border border-slate-100">
            <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">AviGestão</h1>
            <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest">Autenticidade Garantida</p>
          </div>
        </div>

        {/* Back Link */}
        <button
          onClick={handleGoBack}
          className="no-print inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-black uppercase text-[10px] tracking-[0.2em] bg-white px-6 py-3 rounded-full border border-indigo-100 shadow-sm transition-all mb-10"
        >
          <ArrowLeft size={14} /> Voltar para Consulta
        </button>

        {/* Status Banner */}
        <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-white rounded-[40px] border border-emerald-100 shadow-xl shadow-emerald-500/5 mb-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[28px] flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle size={40} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro Verificado</h2>
            <p className="text-slate-500 font-medium">Este exemplar possui uma identidade digital única validada pela plataforma.</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Foto/Preview */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <QrCode size={120} className="text-indigo-600" />
            </div>
            {bird.photoUrl ? (
              <img src={bird.photoUrl} alt={bird.name} className="w-full h-64 object-cover rounded-[32px] shadow-2xl relative z-10" />
            ) : (
              <div className="w-full h-64 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                <AlertCircle size={40} />
                <span className="font-black uppercase text-[10px] tracking-widest">Foto não disponível</span>
              </div>
            )}
          </div>

          {/* Core Data */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.25em] mb-1">Identificação</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{bird.name}</h3>
                <p className="text-sm font-mono text-slate-400 mt-2 font-bold uppercase">ID: {bird.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Status</p>
                  <p className="font-black text-slate-800">{bird.status}</p>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-2xl">
                  <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">Anilha</p>
                  <p className="font-black text-indigo-700">{bird.ringNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="no-print flex gap-4 mt-8">
              <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-slate-200 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Download size={14} /> Imprimir Ficha
              </button>
              <button onClick={() => navigator.share ? navigator.share({url: window.location.href}) : alert('URL Copiada!')} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-100 transition-all">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm mb-8 overflow-hidden relative">
          <div className="absolute right-0 bottom-0 opacity-[0.03] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle size={400} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-8 tracking-tight flex items-center gap-3">
            <AlertCircle className="text-indigo-600" size={24} /> Ficha Técnica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-5">
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Espécie</span>
                <span className="font-black text-slate-900">{bird.species}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sexo</span>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    bird.sex === 'Macho'
                      ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                      : bird.sex === 'Fêmea'
                      ? 'bg-pink-50 text-pink-600 border border-pink-100 shadow-sm'
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  <span className="text-base leading-none">
                    {bird.sex === 'Macho' ? '♂' : bird.sex === 'Fêmea' ? '♀' : '○'}
                  </span>
                  <span>{bird.sex}</span>
                </div>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Idade</span>
                <span className="font-black text-slate-900">{calculateFullAge(bird.birthDate)}</span>
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pai</span>
                <span className="font-black text-slate-900">{parentNames.fatherName || 'Público'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mãe</span>
                <span className="font-black text-slate-900">{parentNames.motherName || 'Público'}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Criatório</span>
                <span className="font-black text-slate-900">{breeder?.breederName || 'Privado'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-4 p-5 rounded-3xl border border-slate-200">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 italic font-black">IB</div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug tracking-widest">Conformidade com normas de manejo de passeriformes silvestres.</p>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-3xl border border-slate-200">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><CheckCircle size={18}/></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug tracking-widest">Sistema de auditoria digital com timestamp imutável.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BirdVerification;
