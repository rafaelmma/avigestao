#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = r'c:\avigestao\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Primeira substituição - quando não tem sessão
old1 = """  if (!session && !supabaseUnavailable) {
    // Verifica se é uma página de reset de senha (token vem como hash)
    const hash = window.location.hash;
    const isResetPassword = hash.includes('type=recovery') || hash.includes('type=magiclink');"""

new1 = """  if (!session && !supabaseUnavailable) {
    // Verifica se é uma página de reset de senha (token vem como hash ou query)
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const hasResetToken = searchParams.has('resetToken');
    const isResetPassword = hash.includes('type=recovery') || hash.includes('type=magiclink') || hasResetToken;"""

if old1 in content:
    content = content.replace(old1, new1)
    print("✓ Primeira substituição realizada")
else:
    print("✗ Primeira substituição NÃO encontrada")

# Segunda substituição - quando tem sessão
old2 = """  // Verifica reset de senha mesmo com sessão ativa (caso token expire)
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {"""

new2 = """  // Verifica reset de senha mesmo com sessão ativa (caso token expire)
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const hasResetToken = searchParams.has('resetToken');
  if (hash.includes('type=recovery') || hasResetToken) {"""

if old2 in content:
    content = content.replace(old2, new2)
    print("✓ Segunda substituição realizada")
else:
    print("✗ Segunda substituição NÃO encontrada")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Arquivo atualizado com sucesso")
