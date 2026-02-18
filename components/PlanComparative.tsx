import React, { useState } from 'react';
import { Check, X, Zap, X as XClose, AlertCircle } from 'lucide-react';
import { assinarPlano } from '../lib/stripe';
import { iniciarPagamentoMercadoPago } from '../lib/mercadopago';

interface PlanComparativeProps {
  currentPlan?: string;
  onUpgrade?: (plan: 'monthly' | 'quarterly' | 'semiannual' | 'annual') => void;
}

const PlanComparative: React.FC<PlanComparativeProps> = ({ currentPlan, onUpgrade }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly' | 'semiannual' | 'annual' | null>(null);

  const PRICE_ID_MAP: Record<string, string> = {
    monthly: 'price_1SwSz20YB6ELT5UOHr8IVksz',
    quarterly: 'price_1SwSzZ0YB6ELT5UO6VKg534d',
    semiannual: 'price_1SwT000YB6ELT5UOd7cZBbz6',
    annual: 'price_1SwT0N0YB6ELT5UOjrjILdg5',
  };

  const PLAN_DETAILS = {
    monthly: { label: 'Mensal', price: 19.9, months: 1 },
    quarterly: { label: 'Trimestral', price: 53.7, months: 3 },
    semiannual: { label: 'Semestral', price: 95.5, months: 6 },
    annual: { label: 'Anual', price: 167.1, months: 12 },
  };

  const handleSelectPaymentMethod = async (gateway: 'stripe' | 'mercadopago') => {
    if (!selectedPlan) return;

    setIsLoading(true);
    setError(null);
    try {
      if (gateway === 'stripe') {
        const priceId = PRICE_ID_MAP[selectedPlan];
        await assinarPlano(priceId);
      } else {
        const details = PLAN_DETAILS[selectedPlan];
        await iniciarPagamentoMercadoPago({
          planId: selectedPlan,
          planLabel: details.label,
          price: details.price,
          months: details.months,
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao processar pagamento';
      console.error('Erro:', errorMsg);
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (planType: 'monthly' | 'quarterly' | 'semiannual' | 'annual') => {
    setSelectedPlan(planType);
    setShowPaymentGateway(true);
  };
  const features = [
    {
      name: 'Plantel até 5 Aves',
      basic: true,
      pro: true,
      proText: 'Ilimitado',
      description: 'Adicione aves ao seu criatório',
      isFuture: false,
    },
    {
      name: 'Pedigree Completo',
      basic: true,
      pro: true,
      description: 'Rastreamento de gerações',
      isFuture: false,
    },
    {
      name: 'Etiquetas e Certificados',
      basic: true,
      pro: true,
      description: 'Imprima documentos profissionais',
      isFuture: false,
    },
    {
      name: 'Histórico e Rastreabilidade',
      basic: true,
      pro: true,
      description: 'Movimentações completas',
      isFuture: false,
    },
    {
      name: 'Relatórios Básicos',
      basic: true,
      pro: true,
      description: 'Dados essenciais do plantel',
      isFuture: false,
    },
    {
      name: 'Suporte por Email',
      basic: true,
      pro: true,
      description: 'Resposta em até 24 horas',
      isFuture: false,
    },
    {
      name: 'Logo Personalizado',
      basic: false,
      pro: true,
      description: 'Adicione sua marca nos documentos',
      isFuture: false,
    },
    {
      name: 'Relatórios Avançados',
      basic: false,
      pro: true,
      description: 'Análises estatísticas completas',
      isFuture: false,
    },
    {
      name: 'Integração com Comunidade',
      basic: false,
      pro: true,
      description: 'Mostre suas aves para outros criadores',
      isFuture: false,
    },
    {
      name: 'Prioritário em Torneios',
      basic: false,
      pro: true,
      description: 'Acesso antecipado a eventos',
      isFuture: false,
    },
    {
      name: 'Suporte Prioritário',
      basic: false,
      pro: true,
      description: 'Chat direto com especialistas',
      isFuture: false,
    },
    {
      name: 'Backup Automático Premium',
      basic: false,
      pro: true,
      description: 'Backup diário garantido',
      isFuture: false,
    },
    {
      name: 'Webinars Exclusivos',
      basic: false,
      pro: false,
      description: 'Treinamentos com especialistas',
      isFuture: true,
    },
    {
      name: 'Comunidade Premium',
      basic: false,
      pro: false,
      description: 'Acesso a discussões avançadas',
      isFuture: true,
    },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Comparativo de Planos</h2>
        <p className="text-gray-600 text-sm">Escolha o plano ideal para seu criatório</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {/* Plano Básico */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors flex flex-col h-full">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 text-white flex-none">
            <h3 className="text-xl font-bold mb-1">Plano Básico</h3>
            <p className="text-gray-100 text-xs mb-4">Perfeito para começar</p>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">Gratuito</span>
            </div>
          </div>
          <div className="p-6 flex-grow flex flex-col justify-end">
            <button
              disabled={currentPlan === 'Básico'}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                currentPlan === 'Básico'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {currentPlan === 'Básico' ? 'Seu Plano Atual' : 'Fazer Downgrade'}
            </button>
          </div>
        </div>

        {/* Plano Profissional */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-blue-500 hover:border-indigo-600 transition-colors flex flex-col h-full">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex-none">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold">Plano Profissional</h3>
                <p className="text-blue-100 text-xs mt-1">Máximo potencial para seu negócio</p>
              </div>
              <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2">
                Popular
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">R$ 19,90</span>
              <span className="text-blue-100 text-xs">/mês</span>
            </div>
            <p className="text-blue-100 text-xs mt-1">Ou economize com planos anuais</p>
          </div>
          <div className="p-6 flex-grow flex flex-col justify-end">
            <button
              disabled={currentPlan === 'Profissional'}
              onClick={() => setShowUpgradeModal(true)}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                currentPlan === 'Profissional'
                  ? 'bg-blue-300 text-blue-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentPlan === 'Profissional' ? (
                <>
                  <Check className="w-4 h-4" />
                  Plano Ativo
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Fazer Upgrade
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
          <div className="font-bold text-gray-700 text-sm">Funcionalidade</div>
          <div className="font-bold text-gray-700 text-center text-sm">Básico</div>
          <div className="font-bold text-gray-700 text-center text-sm">Profissional</div>
        </div>

        {features.map((feature, index) => (
          <div
            key={index}
            className={`grid grid-cols-3 gap-4 p-3 border-b last:border-b-0 text-sm ${
              index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            } ${(feature as any).isFuture ? 'opacity-60' : ''}`}
          >
            <div>
              <p className="font-semibold text-gray-800 text-sm">{feature.name}</p>
              <p className="text-xs text-gray-500">{feature.description}</p>
              {(feature as any).isFuture && (
                <span className="inline-block mt-0.5 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                  Em breve
                </span>
              )}
            </div>
            <div className="flex justify-center items-center">
              {feature.basic ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className="flex justify-center items-center">
              {feature.pro ? (
                (feature as any).isFuture ? (
                  <span className="text-xs text-gray-500 text-center">Em breve</span>
                ) : (feature as any).proText ? (
                  <span className="text-xs font-semibold text-blue-600 text-center">{(feature as any).proText}</span>
                ) : (
                  <Check className="w-5 h-5 text-blue-600" />
                )
              ) : (
                <X className="w-5 h-5 text-gray-300" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Value Proposition */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-600">
          <h4 className="font-bold text-blue-900 mb-1 text-sm">💰 Valor Excepcional</h4>
          <p className="text-xs text-blue-800">Menos de R$1 por dia para profissionalizar seu criatório</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-600">
          <h4 className="font-bold text-purple-900 mb-1 text-sm">📈 Crescimento Garantido</h4>
          <p className="text-xs text-purple-800">Acesso a ferramentas que duplicam o alcance da sua marca</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 border-l-4 border-indigo-600">
          <h4 className="font-bold text-indigo-900 mb-1 text-sm">🎁 Bônus Exclusivos</h4>
          <p className="text-xs text-indigo-800">Acesso a webinars, tutoriais e comunidade premium</p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pt-6 border-t">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Dúvidas Frequentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="font-semibold text-gray-800 mb-1 text-sm">Posso mudar de plano a qualquer momento?</p>
            <p className="text-gray-600 text-xs">Sim! Você pode fazer upgrade ou downgrade quando quiser. Alterações em planos anuais são processadas no próximo ciclo.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1 text-sm">Há contrato de permanência mínima?</p>
            <p className="text-gray-600 text-xs">Não! Você pode cancelar sua assinatura a qualquer momento sem penalidades. Não há compromisso de longo prazo.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1 text-sm">O que acontece se eu fizer downgrade?</p>
            <p className="text-gray-600 text-xs">Seus dados são 100% preservados. Você perderá acesso apenas às funcionalidades premium, mas tudo mais continuará disponível.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1 text-sm">Qual é o melhor plano anual?</p>
            <p className="text-gray-600 text-xs">O plano anual oferece a melhor economia com cerca de 17% de desconto em relação aos pagamentos mensais.</p>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Assinatura */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold">Escolha seu Plano</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                disabled={isLoading}
                className="text-white hover:text-blue-100 transition-colors disabled:opacity-50"
              >
                <XClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mensal */}
              <div className="border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                onClick={() => !isLoading && handleSelectPlan('monthly')}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800">MENSAL</h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">Flexível</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-blue-600">R$ 19,9</span>
                  <span className="text-gray-600 text-sm">/mês</span>
                </div>
                <ul className="space-y-1 mb-4 text-xs text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Plantel e pedigree ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Etiquetas, certificados e relatórios
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Histórico e rastreabilidade completa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Backup seguro e suporte prioritário
                  </li>
                </ul>
                <button
                  onClick={() => !isLoading && handleSelectPlan('monthly')}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'SELECIONAR'}
                </button>
              </div>

              {/* Trimestral */}
              <div className="border-2 border-yellow-500 rounded-lg p-4 cursor-pointer hover:bg-yellow-50 transition-all bg-yellow-50/30 relative"
                onClick={() => !isLoading && handleSelectPlan('quarterly')}>
                <div className="absolute -top-3 left-4 bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded text-xs font-bold">
                  MAIS USADO
                </div>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <h3 className="text-lg font-bold text-gray-800">TRIMESTRAL</h3>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">10% OFF</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-yellow-600">R$ 53,7</span>
                  <span className="text-gray-600 text-sm">/3 meses</span>
                </div>
                <p className="text-xs text-yellow-600 font-semibold mb-3">Economize 10% no período</p>
                <ul className="space-y-1 mb-4 text-xs text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Plantel e pedigree ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Etiquetas, certificados e relatórios
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Histórico e rastreabilidade completa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Backup seguro e suporte prioritário
                  </li>
                </ul>
                <button
                  onClick={() => !isLoading && handleSelectPlan('quarterly')}
                  disabled={isLoading}
                  className="w-full bg-yellow-600 text-white py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'SELECIONAR'}
                </button>
              </div>

              {/* Semestral */}
              <div className="border-2 border-teal-500 rounded-lg p-4 cursor-pointer hover:bg-teal-50 transition-all bg-teal-50/30"
                onClick={() => !isLoading && handleSelectPlan('semiannual')}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800">SEMESTRAL</h3>
                  <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-semibold">20% OFF</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-teal-600">R$ 95,5</span>
                  <span className="text-gray-600 text-sm">/5 meses</span>
                </div>
                <p className="text-xs text-teal-600 font-semibold mb-3">Economize 20% no período</p>
                <ul className="space-y-1 mb-4 text-xs text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Plantel e pedigree ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Etiquetas, certificados e relatórios
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Histórico e rastreabilidade completa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Backup seguro e suporte prioritário
                  </li>
                </ul>
                <button
                  onClick={() => !isLoading && handleSelectPlan('semiannual')}
                  disabled={isLoading}
                  className="w-full bg-teal-600 text-white py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'SELECIONAR'}
                </button>
              </div>

              {/* Anual */}
              <div className="border-2 border-green-500 rounded-lg p-4 cursor-pointer hover:bg-green-50 transition-all bg-green-50 relative"
                onClick={() => !isLoading && handleSelectPlan('annual')}>
                <div className="absolute -top-3 right-4 bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                  MELHOR CUSTO-BENEFÍCIO
                </div>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <h3 className="text-lg font-bold text-gray-800">ANUAL</h3>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">30% OFF</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-green-600">R$ 167,1</span>
                  <span className="text-gray-600 text-sm">/ano</span>
                </div>
                <p className="text-xs text-green-600 font-semibold mb-3">Economize 30% no período</p>
                <ul className="space-y-1 mb-4 text-xs text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Plantel e pedigree ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Etiquetas, certificados e relatórios
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Histórico e rastreabilidade completa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Backup seguro e suporte prioritário
                  </li>
                </ul>
                <button
                  onClick={() => !isLoading && handleSelectPlan('annual')}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'SELECIONAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Gateway de Pagamento */}
      {showPaymentGateway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Escolha a forma de pagamento</h2>
              <button
                onClick={() => {
                  setShowPaymentGateway(false);
                  setSelectedPlan(null);
                  setError(null);
                }}
                disabled={isLoading}
                className="text-white hover:text-blue-100 transition-colors disabled:opacity-50"
              >
                <XClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Erro */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold mb-1">Erro ao processar pagamento:</p>
                    <p>{error}</p>
                    <p className="text-xs mt-2 text-red-600">Verifique sua conexão e tente novamente</p>
                  </div>
                </div>
              )}

              {/* Stripe */}
              <div className="border-2 border-blue-500 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-all bg-blue-50"
                onClick={() => !isLoading && handleSelectPaymentMethod('stripe')}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">💳</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Stripe</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">Cartão de crédito seguro</p>
                <button
                  onClick={() => !isLoading && handleSelectPaymentMethod('stripe')}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'Continuar com Stripe'}
                </button>
              </div>

              {/* MercadoPago */}
              <div className="border-2 border-yellow-500 rounded-lg p-4 cursor-pointer hover:bg-yellow-50 transition-all bg-yellow-50"
                onClick={() => !isLoading && handleSelectPaymentMethod('mercadopago')}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">💰</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">MercadoPago</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">PIX, boleto ou cartão</p>
                <button
                  onClick={() => !isLoading && handleSelectPaymentMethod('mercadopago')}
                  disabled={isLoading}
                  className="w-full bg-yellow-500 text-white py-2 rounded-lg font-semibold hover:bg-yellow-600 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'Continuar com MercadoPago'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Seus dados de pagamento são processados de forma segura pelos provedores de pagamento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanComparative;
