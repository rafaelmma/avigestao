import React from 'react';
import { APP_LOGO } from '../constants';

const About: React.FC = () => {
        return (
                <div className="min-h-screen bg-slate-50">
                        <div className="mx-auto max-w-4xl px-6 py-14">
                                <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                                                Sobre o AviGestão
                                                        </p>
                                                        <h1 className="mt-2 text-3xl font-black text-slate-900">AviGestão</h1>
                                                        <p className="mt-2 text-sm font-semibold text-slate-500">
                                                                Sistema simples e direto para criadores SISPASS.
                                                        </p>
                                                </div>
                                                <div className="bg-white p-2 rounded-2xl shadow-lg border-2 border-slate-200 ring-4 ring-slate-50">
                                                        <img
                                                                src={APP_LOGO}
                                                                alt="Logo AviGestão"
                                                                className="h-32 w-auto object-contain"
                                                                loading="lazy"
                                                        />
                                                </div>
                                        </div>

                                        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
                                                <p>
                                                        O AviGestão nasceu da rotina de criadores amadores que precisavam organizar seus
                                                        pássaros, anilhas, registros e histórico sem depender de planilhas. A ideia é deixar
                                                        tudo claro, rápido e no mesmo lugar.
                                                </p>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Para quem é</h2>
                                                        <p>
                                                                Criadores registrados no SISPASS que querem controle do plantel, documentos,
                                                                reprodução, finanças e tarefas, com foco no dia a dia.
                                                        </p>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">O que você encontra</h2>
                                                        <ul className="list-disc space-y-1 pl-5">
                                                                <li>Cadastro completo de pássaros, pares e ninhadas.</li>
                                                                <li>Controle de movimentos, tratamentos e histórico.</li>
                                                                <li>Financeiro simples com receitas e despesas.</li>
                                                                <li>Documentos do criador e dados do SISPASS.</li>
                                                                <li>Relatórios e visão clara do plantel.</li>
                                                        </ul>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Compromisso</h2>
                                                        <p>
                                                                O foco é facilitar a vida do criador, com dados organizados e acesso rápido.
                                                                Nenhuma informação é compartilhada com terceiros.
                                                        </p>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Contato</h2>
                                                        <p>Dúvidas ou sugestões?</p>
                                                        <p>E-mail: contato@avigestao.com.br</p>
                                                </section>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};

export default About;