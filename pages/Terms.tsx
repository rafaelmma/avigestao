import React from 'react';
import { APP_LOGO } from '../constants';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full -mr-24 -mt-24 flex items-center justify-center p-24 opacity-40">
            <img src={APP_LOGO} alt="" className="w-full h-full object-contain grayscale opacity-10" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Termos de Uso - AviGestão
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Termos de Uso</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Data da última atualização: 08/02/2026
              </p>
            </div>
            <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-2xl p-1 shadow-sm flex-shrink-0">
              <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700 relative z-10">
            <p>
              Bem-vindo ao AviGestão! Ao utilizar este site, você concorda com os termos descritos
              abaixo. É importante ler atentamente este documento antes de continuar.
            </p>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar ou utilizar o AviGestão, você concorda com estes Termos de Uso. Caso não
                concorde com qualquer parte deste documento, recomendamos que não utilize a
                plataforma.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Sobre a Plataforma</h2>
              <p>
                AviGestão é um sistema criado para auxiliar criadores de pássaros, especialmente
                aqueles registrados no SISPASS, oferecendo ferramentas de organização, controle e
                gestão. A plataforma foi desenvolvida por Rafael Monteiro Montalvão França, criador
                amador, com o objetivo de facilitar o dia a dia de outros criadores.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Uso Permitido</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Utilizar o sistema apenas para fins legais e de forma responsável.</li>
                <li>Não inserir informações falsas ou fraudulentas.</li>
                <li>Não explorar vulnerabilidades ou tentar acessar dados de outros usuários.</li>
                <li>Não usar o sistema para práticas proibidas pela legislação ambiental ou normas do SISPASS.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Conta do Usuário</h2>
              <p>Para utilizar a plataforma, pode ser necessário criar uma conta. O usuário se compromete a:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Fornecer informações verdadeiras.</li>
                <li>Manter suas credenciais de acesso em sigilo.</li>
                <li>Notificar o responsável caso identifique qualquer uso indevido da sua conta.</li>
              </ul>
              <p>
                O AviGestão não se responsabiliza por acessos indevidos resultantes de negligência
                do usuário.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">5. Armazenamento e Disponibilidade</h2>
              <p>A plataforma pode sofrer interrupções temporárias devido a:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manutenções,</li>
                <li>Atualizações,</li>
                <li>Problemas externos (ex.: instabilidade de servidores).</li>
              </ul>
              <p>Não garantimos disponibilidade contínua nem ausência total de falhas.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">6. Conteúdo Inserido pelo Usuário</h2>
              <p>Todos os dados inseridos no sistema pertencem ao próprio usuário. Você é responsável por:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manter informações corretas sobre seus pássaros,</li>
                <li>Respeitar normas do SISPASS, IBAMA e demais legislações ambientais,</li>
                <li>Não cadastrar informações ilegais, inverídicas ou que violem direitos de terceiros.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">7. Propriedade Intelectual</h2>
              <p>
                Todo o código, layout, design e funcionalidades do AviGestão pertencem ao
                desenvolvedor da plataforma. É proibido:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Copiar,</li>
                <li>Reproduzir,</li>
                <li>Distribuir,</li>
                <li>Modificar o sistema sem autorização prévia e por escrito.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">8. Limitação de Responsabilidade</h2>
              <p>A plataforma não substitui sistemas oficiais, como SISPASS ou órgãos ambientais. O AviGestão não se responsabiliza por:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Dados cadastrados incorretamente pelos usuários,</li>
                <li>Penalidades ou sanções aplicadas por órgãos ambientais,</li>
                <li>Decisões tomadas com base nas informações registradas no sistema,</li>
                <li>Perdas de dados decorrentes de falhas externas ou causas naturais.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">9. Encerramento do Acesso</h2>
              <p>O responsável pela plataforma pode suspender ou encerrar contas que:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Violem estes Termos,</li>
                <li>Apresentem uso indevido,</li>
                <li>Comprometam a segurança do sistema.</li>
              </ul>
              <p>O usuário pode solicitar a exclusão da sua conta a qualquer momento.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">10. Alterações nos Termos</h2>
              <p>
                Os Termos de Uso podem ser atualizados. A data da última revisão estará sempre
                disponível no topo da página.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">11. Contato</h2>
              <p>Para dúvidas ou solicitações:</p>
              <p>E-mail: contato@avigestao.com.br</p>
              <p>Responsável: Rafael Monteiro Montalvão França, criador e desenvolvedor da plataforma.</p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h2 className="text-base font-black">Aviso Legal (Disclaimer)</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>O AviGestão é uma ferramenta auxiliar, não oficial, destinada a apoiar criadores de pássaros na organização de informações.</li>
                <li>A plataforma não substitui sistemas oficiais, como o SISPASS, nem se responsabiliza por obrigações legais do criador.</li>
                <li>O desenvolvedor não garante precisão absoluta ou ausência de erros nas informações exibidas.</li>
                <li>Qualquer decisão tomada com base nas informações cadastradas é de total responsabilidade do usuário.</li>
                <li>O AviGestão não se responsabiliza por perdas, danos, multas ou problemas decorrentes de uso indevido do sistema, erros de cadastro ou descumprimento das normas ambientais.</li>
                <li>O usuário é o único responsável por manter seus dados atualizados e seguir as legislações vigentes do IBAMA, SISPASS e demais órgãos competentes.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
