/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Bird } from '../types';
import {
  recordBirdVerification,
  getPublicBirdById,
  getPublicBreederByBirdId,
} from '../services/firestoreService';

const BirdVerification: React.FC<{ birdId: string }> = ({ birdId }) => {
  const [bird, setBird] = useState<Bird | null>(null);
  const [breeder, setBreeder] = useState<any>(null);
  const [parentNames, setParentNames] = useState<{ fatherName?: string; motherName?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.error('[BirdVerification] Timeout: Dados demoraram muito para carregar');
        setError('Tempo esgotado ao carregar dados. Verifique sua conexão.');
        setLoading(false);
      }
    }, 15000); // 15 segundos de timeout

    const loadBirdData = async () => {
      try {
        console.log('[BirdVerification] Carregando dados para birdId:', birdId);

        if (!birdId || birdId.trim() === '') {
          throw new Error('ID do pássaro inválido');
        }

        // 1. Registrar leitura do QR code (público) - não bloqueia se falhar
        try {
          await recordBirdVerification(birdId);
        } catch (verErr) {
          console.warn('[BirdVerification] Falha ao registrar verificação:', verErr);
        }

        // 2. Buscar dados públicos do pássaro no Firestore
        const birdData = await getPublicBirdById(birdId);
        console.log('[BirdVerification] Dados retornados:', birdData);

        if (!mounted) return;

        if (birdData) {
          setBird(birdData);

          // 3. Buscar nomes de pai e mãe (não bloqueia se falhar)
          try {
            const parentNames: { fatherName?: string; motherName?: string } = {};

            if (birdData.fatherId) {
              try {
                const fatherData = await getPublicBirdById(birdData.fatherId);
                if (fatherData?.name) {
                  parentNames.fatherName = fatherData.name;
                }
              } catch (err) {
                console.warn('Erro ao buscar dados do pai:', err);
              }
            }

            if (birdData.motherId) {
              try {
                const motherData = await getPublicBirdById(birdData.motherId);
                if (motherData?.name) {
                  parentNames.motherName = motherData.name;
                }
              } catch (err) {
                console.warn('Erro ao buscar dados da mãe:', err);
              }
            }

            if (mounted) {
              setParentNames(parentNames);
            }
          } catch (parentErr) {
            console.warn('[BirdVerification] Falha ao buscar nomes dos pais:', parentErr);
          }

          // 4. Buscar dados do criador (não bloqueia se falhar)
          try {
            const breederData = await getPublicBreederByBirdId(birdId);
            console.log('[BirdVerification] Dados do criador:', breederData);

            if (breederData && mounted) {
              setBreeder(breederData);
            }
          } catch (breederErr) {
            console.warn('[BirdVerification] Falha ao buscar criador:', breederErr);
          }

          if (mounted) {
            setVerified(true);
            setLoading(false);
            clearTimeout(timeoutId);
          }
          return;
        }

        // Se não encontrar
        if (mounted) {
          console.error('[BirdVerification] Pássaro não encontrado para ID:', birdId);
          setError('Pássaro não encontrado na base de dados');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('[BirdVerification] Erro ao carregar dados:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados do pássaro');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    loadBirdData();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-blue-100 mx-auto mb-6 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verificando Autenticidade</h2>
          <p className="text-slate-600 font-medium mb-4">
            Aguarde enquanto carregamos os dados do pássaro...
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-slate-500">ID: {birdId.substring(0, 12)}...</p>
          </div>
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
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Pássaro Não Encontrado
          </h1>
          <p className="text-slate-600 text-center mb-4">
            {error || 'Não foi possível localizar este pássaro no sistema.'}
          </p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-500 text-center">ID buscado:</p>
            <p className="text-sm text-slate-700 text-center font-mono break-all">{birdId}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all mb-3"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => window.close()}
            className="w-full px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
          >
            Fechar
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
              <h1 className="text-2xl font-bold text-slate-900">Autenticidade verificada</h1>
              <p className="text-slate-600 text-sm">Este pássaro está registrado no AviGestão.</p>
            </div>
          </div>
        </div>

        {/* Cards de Verificação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">
              Status
            </p>
            <p className="text-lg font-bold text-slate-900">{bird.status}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">
              Anilha
            </p>
            <p className="text-lg font-bold text-slate-900">{bird.ringNumber || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">
              Espécie
            </p>
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
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">
                    Dados Pessoais
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Sexo</span>
                      <span className="font-semibold text-slate-900">{bird.sex}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Data Nascimento</span>
                      <span className="font-semibold text-slate-900">
                        {bird.birthDate
                          ? new Date(bird.birthDate).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Cor/Mutação</span>
                      <span className="font-semibold text-slate-900">
                        {bird.colorMutation || 'Padrão'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Classificação</span>
                      <span className="font-semibold text-slate-900">{bird.classification}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">
                    Localização
                  </h3>
                  <p className="text-slate-900 font-medium">{bird.location || 'Não informada'}</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">
                    Genealogia
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-slate-600">Pai:</span>
                      <span className="font-semibold">
                        {' '}
                        {parentNames.fatherName ||
                          (bird.fatherId ? bird.fatherId.substring(0, 12) + '...' : 'Desconhecido')}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-slate-600">Mãe:</span>
                      <span className="font-semibold">
                        {' '}
                        {parentNames.motherName ||
                          (bird.motherId ? bird.motherId.substring(0, 12) + '...' : 'Desconhecido')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status de Treinamento (se aplicável) */}
            {bird.songTrainingStatus && bird.songTrainingStatus !== 'Não Iniciado' && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">
                  Treinamento de Canto
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Status</p>
                      <p className="font-semibold text-slate-900">{bird.songTrainingStatus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-1">Tipo de Canto</p>
                      <p className="font-semibold text-slate-900">
                        {bird.songType || 'Não definido'}
                      </p>
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
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
              Criador Responsável
            </h3>
            <div className="flex items-center gap-4">
              {breeder.logoUrl && (
                <img
                  src={breeder.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 rounded-lg object-contain"
                />
              )}
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {breeder.breederName || 'Criador'}
                </p>
                {breeder.sispassNumber && (
                  <p className="text-sm text-slate-600">
                    SISPASS: <span className="font-semibold">{breeder.sispassNumber}</span>
                  </p>
                )}
                {breeder.cpfCnpj && (
                  <p className="text-sm text-slate-600">
                    CPF/CNPJ: <span className="font-semibold">{breeder.cpfCnpj}</span>
                  </p>
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
