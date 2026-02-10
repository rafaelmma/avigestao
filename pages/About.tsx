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
                                                                Sobre o AviGestao
                                                        </p>
                                                        <h1 className="mt-2 text-3xl font-black text-slate-900">AviGestao</h1>
                                                        <p className="mt-2 text-sm font-semibold text-slate-500">
                                                                Sistema simples e direto para criadores SISPASS.
                                                        </p>
                                                </div>
                                                <img
                                                        src={APP_LOGO}
                                                        alt="Logo AviGestao"
                                                        className="h-16 w-auto rounded-xl bg-white p-2 shadow-sm"
                                                />
                                        </div>

                                        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
                                                <p>
                                                        O AviGestao nasceu da rotina de criadores amadores que precisavam organizar seus
                                                        passaros, anilhas, registros e historico sem depender de planilhas. A ideia e deixar
                                                        tudo claro, rapido e no mesmo lugar.
                                                </p>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Para quem e</h2>
                                                        <p>
                                                                Criadores registrados no SISPASS que querem controle do plantel, documentos,
                                                                reproducao, financas e tarefas, com foco no dia a dia.
                                                        </p>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">O que voce encontra</h2>
                                                        <ul className="list-disc space-y-1 pl-5">
                                                                <li>Cadastro completo de passaros, pares e ninhadas.</li>
                                                                <li>Controle de movimentos, tratamentos e historico.</li>
                                                                <li>Financeiro simples com receitas e despesas.</li>
                                                                <li>Documentos do criador e dados do SISPASS.</li>
                                                                <li>Relatorios e visao clara do plantel.</li>
                                                        </ul>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Compromisso</h2>
                                                        <p>
                                                                O foco e facilitar a vida do criador, com dados organizados e acesso rapido.
                                                                Nenhuma informacao e compartilhada com terceiros.
                                                        </p>
                                                </section>

                                                <section className="space-y-2">
                                                        <h2 className="text-base font-black text-slate-900">Contato</h2>
                                                        <p>Duvidas ou sugestoes?</p>
                                                        <p>E-mail: contato@avigestao.com.br</p>
                                                </section>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};

export default About;