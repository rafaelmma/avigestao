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
                Termos de Uso - AviGestao
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Termos de Uso</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Data da ultima atualizacao: 08/02/2026
              </p>
            </div>
            <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-2xl p-1 shadow-sm flex-shrink-0">
              <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700 relative z-10">
            <p>
              Bem-vindo ao AviGestao! Ao utilizar este site, voce concorda com os termos descritos
              abaixo. E importante ler atentamente este documento antes de continuar.
            </p>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Aceitacao dos Termos</h2>
              <p>
                Ao acessar ou utilizar o AviGestao, voce concorda com estes Termos de Uso. Caso nao
                concorde com qualquer parte deste documento, recomendamos que nao utilize a
                plataforma.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Sobre a Plataforma</h2>
              <p>
                AviGestao e um sistema criado para auxiliar criadores de passaros, especialmente
                aqueles registrados no SISPASS, oferecendo ferramentas de organizacao, controle e
                gestao. A plataforma foi desenvolvida por Rafael Monteiro Montalvao Franca, criador
                amador, com o objetivo de facilitar o dia a dia de outros criadores.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Uso Permitido</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Utilizar o sistema apenas para fins legais e de forma responsavel.</li>
                <li>Nao inserir informacoes falsas ou fraudulentas.</li>
                <li>Nao explorar vulnerabilidades ou tentar acessar dados de outros usuarios.</li>
                <li>Nao usar o sistema para praticas proibidas pela legislacao ambiental ou normas do SISPASS.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Conta do Usuario</h2>
              <p>Para utilizar a plataforma, pode ser necessario criar uma conta. O usuario se compromete a:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Fornecer informacoes verdadeiras.</li>
                <li>Manter suas credenciais de acesso em sigilo.</li>
                <li>Notificar o responsavel caso identifique qualquer uso indevido da sua conta.</li>
              </ul>
              <p>
                O AviGestao nao se responsabiliza por acessos indevidos resultantes de negligencia
                do usuario.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">5. Armazenamento e Disponibilidade</h2>
              <p>A plataforma pode sofrer interrupcoes temporarias devido a:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manutencoes,</li>
                <li>Atualizacoes,</li>
                <li>Problemas externos (ex.: instabilidade de servidores).</li>
              </ul>
              <p>Nao garantimos disponibilidade continua nem ausencia total de falhas.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">6. Conteudo Inserido pelo Usuario</h2>
              <p>Todos os dados inseridos no sistema pertencem ao proprio usuario. Voce e responsavel por:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manter informacoes corretas sobre seus passaros,</li>
                <li>Respeitar normas do SISPASS, IBAMA e demais legislacoes ambientais,</li>
                <li>Nao cadastrar informacoes ilegais, inveridicas ou que violem direitos de terceiros.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">7. Propriedade Intelectual</h2>
              <p>
                Todo o codigo, layout, design e funcionalidades do AviGestao pertencem ao
                desenvolvedor da plataforma. E proibido:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Copiar,</li>
                <li>Reproduzir,</li>
                <li>Distribuir,</li>
                <li>Modificar o sistema sem autorizacao previa e por escrito.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">8. Limitacao de Responsabilidade</h2>
              <p>A plataforma nao substitui sistemas oficiais, como SISPASS ou orgaos ambientais. O AviGestao nao se responsabiliza por:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Dados cadastrados incorretamente pelos usuarios,</li>
                <li>Penalidades ou sancoes aplicadas por orgaos ambientais,</li>
                <li>Decisoes tomadas com base nas informacoes registradas no sistema,</li>
                <li>Perdas de dados decorrentes de falhas externas ou causas naturais.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">9. Encerramento do Acesso</h2>
              <p>O responsavel pela plataforma pode suspender ou encerrar contas que:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Violem estes Termos,</li>
                <li>Apresentem uso indevido,</li>
                <li>Comprometam a seguranca do sistema.</li>
              </ul>
              <p>O usuario pode solicitar a exclusao da sua conta a qualquer momento.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">10. Alteracoes nos Termos</h2>
              <p>
                Os Termos de Uso podem ser atualizados. A data da ultima revisao estara sempre
                disponivel no topo da pagina.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">11. Contato</h2>
              <p>Para duvidas ou solicitacoes:</p>
              <p>E-mail: contato@avigestao.com.br</p>
              <p>Responsavel: Rafael Monteiro Montalvao Franca, criador e desenvolvedor da plataforma.</p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h2 className="text-base font-black">Aviso Legal (Disclaimer)</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>O AviGestao e uma ferramenta auxiliar, nao oficial, destinada a apoiar criadores de passaros na organizacao de informacoes.</li>
                <li>A plataforma nao substitui sistemas oficiais, como o SISPASS, nem se responsabiliza por obrigacoes legais do criador.</li>
                <li>O desenvolvedor nao garante precisao absoluta ou ausencia de erros nas informacoes exibidas.</li>
                <li>Qualquer decisao tomada com base nas informacoes cadastradas e de total responsabilidade do usuario.</li>
                <li>O AviGestao nao se responsabiliza por perdas, danos, multas ou problemas decorrentes de uso indevido do sistema, erros de cadastro ou descumprimento das normas ambientais.</li>
                <li>O usuario e o unico responsavel por manter seus dados atualizados e seguir as legislacoes vigentes do IBAMA, SISPASS e demais orgaos competentes.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
