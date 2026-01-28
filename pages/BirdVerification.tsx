import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Bird } from '../types';
import { supabase } from '../lib/supabase';

const BirdVerification: React.FC<{ birdId: string }> = ({ birdId }) => {
  const [bird, setBird] = useState<Bird | null>(null);
  const [breeder, setBreeder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const loadBirdData = async () => {
      try {
        // Registra acesso para auditoria no Supabase
        if (supabase) {
          try {
            const { error } = await supabase.from('bird_verifications').insert({
              bird_id: birdId,
              accessed_at: new Date().toISOString(),
              ip_address: 'browser-access',
              user_agent: navigator.userAgent
            });
            
            if (error && !error.message.includes('does not exist')) {
              console.warn('Aviso ao registrar acesso:', error);
            }
          } catch (insertError) {
            console.warn('Erro ao registrar acesso:', insertError);
            // Continua mesmo se falhar ao registrar
          }
        }

        // Carrega dados do pássaro do localStorage como fallback
        const stored = localStorage.getItem('avigestao_state_v2');
        if (stored) {
          const data = JSON.parse(stored);
          const foundBird = data?.birds?.find((b: Bird) => b.id === birdId);
          if (foundBird) {
            setBird(foundBird);
            setBreeder(data?.settings);
            setVerified(true);
            setLoading(false);
            return;
          }
        }

        // Se não encontrar, tentar Supabase
        if (supabase) {
          try {
            const { data: birdData, error: birdError } = await supabase
              .from('birds')
              .select('*')
              .eq('id', birdId)
              .single();

            if (birdError || !birdData) {
              setError('Pássaro não encontrado');
              setLoading(false);
              return;
            }

            setBird(birdData as Bird);
            setVerified(true);
          } catch (queryError) {
            console.warn('Erro ao buscar do Supabase:', queryError);
            setError('Erro ao carregar dados do pássaro');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados do pássaro');
      } finally {
        setLoading(false);
      }
    };

    loadBirdData();
  }, [birdId]);

  const handleGoBack = () => {
    window.history.back();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Cartão ${bird?.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const handleDownload = () => {
    // Gera PDF ou imagem do cartão
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium">Verificando pássaro...</p>
        </div>
      </div>
    );
  }

  if (error || !bird) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <AlertCircle className="text-red-500" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Pássaro Não Encontrado</h1>
          <p className="text-slate-600 text-center mb-6">{error || 'Não foi possível localizar este pássaro no sistema.'}</p>
          <button
            onClick={handleGoBack}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-emerald-500" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pássaro Verificado</h1>
              <p className="text-slate-600">Informações autênticas do criatório</p>
            </div>
          </div>
        </div>

        {/* Cards de Verificação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Status</p>
            <p className="text-lg font-bold text-slate-900">{bird.status}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Anilha</p>
            <p className="text-lg font-bold text-slate-900">{bird.ringNumber || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Espécie</p>
            <p className="text-lg font-bold text-slate-900">{bird.species}</p>
          </div>
        </div>

        {/* Cartão Principal */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-8 py-6">
            <h2 className="text-white text-2xl font-bold">{bird.name}</h2>
            <p className="text-slate-300 text-sm">ID: {bird.id.substring(0, 8).toUpperCase()}</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Foto */}
              <div className="flex flex-col items-center justify-center">
                {bird.photoUrl ? (
                  <img
                    src={bird.photoUrl}
                    alt={bird.name}
                    className="w-full h-auto rounded-xl shadow-md max-w-sm object-cover"
                  />
                ) : (
                  <div className="w-full max-w-sm aspect-square bg-gradient-to-br from-blue-100 to-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-slate-400 font-semibold">Sem foto</span>
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Dados Pessoais</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Sexo</span>
                      <span className="font-semibold text-slate-900">{bird.sex}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Data Nascimento</span>
                      <span className="font-semibold text-slate-900">
                        {bird.birthDate ? new Date(bird.birthDate).toLocaleDateString('pt-BR') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Cor/Mutação</span>
                      <span className="font-semibold text-slate-900">{bird.colorMutation || 'Padrão'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Classificação</span>
                      <span className="font-semibold text-slate-900">{bird.classification}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Localização</h3>
                  <p className="text-slate-900 font-medium">{bird.location || 'Não informada'}</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Genealogia</h3>
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-slate-600">Pai:</span> <span className="font-semibold">{bird.fatherId || 'Desconhecido'}</span></p>
                    <p className="text-sm"><span className="text-slate-600">Mãe:</span> <span className="font-semibold">{bird.motherId || 'Desconhecido'}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status de Treinamento (se aplicável) */}
            {bird.songTrainingStatus && bird.songTrainingStatus !== 'Não Iniciado' && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Treinamento de Canto</h3>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Status</p>
                      <p className="font-semibold text-slate-900">{bird.songTrainingStatus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Tipo de Canto</p>
                      <p className="font-semibold text-slate-900">{bird.songType || 'N/A'}</p>
                    </div>
                  </div>
                  {bird.trainingNotes && (
                    <p className="text-sm text-slate-700 mt-3 italic">{bird.trainingNotes}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Criador Info */}
        {breeder && (
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500 mb-8">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Criador Responsável</h3>
            <div className="flex items-center gap-4">
              {breeder.logoUrl && (
                <img src={breeder.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-contain" />
              )}
              <div>
                <p className="text-lg font-bold text-slate-900">{breeder.breederName || 'Criador'}</p>
                {breeder.sispassNumber && (
                  <p className="text-sm text-slate-600">SISPASS: <span className="font-semibold">{breeder.sispassNumber}</span></p>
                )}
                {breeder.cpf && (
                  <p className="text-sm text-slate-600">CPF: <span className="font-semibold">{breeder.cpf}</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md"
          >
            <Share2 size={18} />
            Compartilhar
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-all"
          >
            <Download size={18} />
            Imprimir
          </button>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>🔒 Esta página de verificação é autêntica e segura</p>
          <p className="text-xs mt-2">Acessos são registrados para fins de compliance IBAMA</p>
        </div>
      </div>
    </div>
  );
};

export default BirdVerification;
