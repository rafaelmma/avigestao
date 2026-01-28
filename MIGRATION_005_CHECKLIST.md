# ✅ Checklist de Validação - Migração 005

## 🎯 Objetivo
Validar que todas as alterações na Migração 005 foram aplicadas corretamente antes de executar no Supabase.

---

## 📝 Checklist de Implementação

### ✅ Banco de Dados (db/migrations/005_standardize_ids_and_constraints.sql)

- [x] Criação de ENUMs para normalização de dados
  - [x] `bird_status_enum`
  - [x] `sex_enum`
  - [x] `bird_classification_enum`
  - [x] `movement_type_enum`
  - [x] `medication_type_enum`
  - [x] `song_training_status_enum`
  - [x] `event_type_enum`
  - [x] `platform_enum`

- [x] Conversão de tipos de ID para UUID
  - [x] bird_certificates.bird_id (TEXT → UUID)
  - [x] bird_certificates.event_id (TEXT → UUID)
  - [x] bird_certificates.breeder_id (TEXT → UUID)
  - [x] bird_verifications.bird_id (TEXT → UUID)
  - [x] birds.breeder_id (TEXT → UUID)
  - [x] birds.father_id (TEXT → UUID)
  - [x] birds.mother_id (TEXT → UUID)

- [x] Conversão de campos de ENUM
  - [x] birds.status (TEXT → bird_status_enum)
  - [x] birds.sex (TEXT → sex_enum)
  - [x] birds.classification (TEXT → bird_classification_enum)
  - [x] certificate_shares.platform (TEXT → platform_enum)
  - [x] medications.type (TEXT → medication_type_enum)
  - [x] movements.type (TEXT → movement_type_enum)

- [x] Foreign Key Constraints (15+)
  - [x] fk_bird_certificates_bird_id
  - [x] fk_bird_verifications_bird_id
  - [x] fk_birds_father_id
  - [x] fk_birds_mother_id
  - [x] fk_applications_bird_id
  - [x] fk_applications_medication_id
  - [x] fk_certificate_shares_certificate_id
  - [x] fk_clutches_pair_id
  - [x] fk_pairs_male_id
  - [x] fk_pairs_female_id

- [x] Índices de Performance (20+)
  - [x] Índices em Foreign Keys
  - [x] Índices em campos de busca frequente
  - [x] Índices em campos de data (DESC)

- [x] Constraints NOT NULL
  - [x] applications: dosage, notes
  - [x] bird_certificates: bird_id, event_id
  - [x] bird_verifications: bird_id, accessed_at
  - [x] birds: breeder_id, name, species
  - [x] clutches: user_id, pair_id, lay_date, egg_count, fertile_count, hatched_count, notes
  - [x] medications: user_id, name
  - [x] pairs: user_id, start_date

- [x] Políticas RLS Atualizadas
  - [x] Remover casts ::text antigos
  - [x] Novas políticas com UUID puro
  - [x] Política pública para verificação

### ✅ Tipos TypeScript (types.ts)

- [x] Tipos Enumerados
  - [x] BirdStatus: 'Ativo' | 'Inativo' | 'Vendido' | 'Doado' | 'Falecido' | 'Criação'
  - [x] Sex: 'Macho' | 'Fêmea' | 'Desconhecido'
  - [x] BirdClassification: 'Exemplar' | 'Reprodutor' | 'Descarte'
  - [x] TrainingStatus: 'Não Iniciado' | 'Em Progresso' | 'Concluído' | 'Certificado'
  - [x] MovementType: 'Entrada' | 'Saída' | 'Transferência' | 'Venda' | 'Doação' | 'Óbito'
  - [x] MedicationType: 'Antibiótico' | 'Vitamina' | 'Antiparasitário' | 'Desinfetante' | 'Outro'
  - [x] EventType: 'Nascimento' | 'Sexagem' | 'Certificação' | 'Concurso' | 'Venda' | 'Outro'
  - [x] SharePlatform: 'WhatsApp' | 'Email' | 'Facebook' | 'Instagram' | 'Twitter' | 'Outro'

- [x] Interface Bird Atualizada
  - [x] breederId: string (novo - obrigatório)
  - [x] name: string (obrigatório)
  - [x] species: string (obrigatório)
  - [x] sex?: Sex (optional, tipado)
  - [x] status: BirdStatus (tipado como ENUM)
  - [x] ringNumber?: string
  - [x] birthDate?: string
  - [x] classification?: BirdClassification (tipado como ENUM)
  - [x] songTrainingStatus?: TrainingStatus (tipado como ENUM)
  - [x] Campos legados mantidos para compatibilidade

- [x] Interfaces Atualizadas
  - [x] MovementRecord: userId, type (MovementType)
  - [x] Medication: userId, type (MedicationType)
  - [x] Pair: userId (novo obrigatório)
  - [x] Clutch: userId (novo obrigatório)
  - [x] MedicationApplication: birdId?, medicationId? (opcionais)

### ✅ Serviços (services/dataService.ts)

- [x] Mapeador mapBirdFromDb
  - [x] Mapear breeder_id → breederId
  - [x] Tipagem correta para status (BirdStatus)
  - [x] Tipagem correta para sex (Sex)
  - [x] Tipagem correta para classification (BirdClassification)
  - [x] Tipagem correta para songTrainingStatus (TrainingStatus)

- [x] Mapeador mapMovementFromDb
  - [x] Adicionar userId
  - [x] Tipagem movementType
  - [x] Tornados birdId, type opcionais

- [x] Mapeador mapMedicationFromDb
  - [x] Adicionar userId (obrigatório)
  - [x] Tipagem MedicationType

- [x] Mapeador mapPairFromDb
  - [x] Adicionar userId (obrigatório)
  - [x] Remover campos legados (status, name, lastHatchDate, archivedAt)
  - [x] Tornar maleId, femaleId opcionais

- [x] Mapeador mapClutchFromDb
  - [x] Adicionar userId (obrigatório)

- [x] Mapeador mapApplicationFromDb
  - [x] Tornar birdId, medicationId opcionais

### ✅ Código Existente (Compatibilidade)

- [x] lib/birdSync.ts - saveBirdToSupabase
  - [x] Já usa breeder_id (✓ OK)
  - [x] Sem alterações necessárias

- [x] pages/BirdManager.tsx
  - [x] Sem alterações críticas necessárias (tipos automáticos)

- [x] pages/BreedingManager.tsx
  - [x] Sem alterações críticas necessárias

- [x] App.tsx
  - [x] addBird() - Sem alterações críticas necessárias
  - [x] updateBird() - Sem alterações críticas necessárias

### ✅ Documentação

- [x] MIGRATION_GUIDE_005.md criado
  - [x] Resumo das mudanças
  - [x] Instruções de execução
  - [x] Testes recomendados
  - [x] Tratamento de erros
  - [x] Rollback

---

## 🧪 Testes Manuais (PRÉ-MIGRAÇÃO)

Antes de executar a migração no Supabase, executar:

```bash
# 1. Iniciar dev server
npm run dev

# 2. Testes de Criação
- [ ] Dashboard → BirdManager → Adicionar Nova Ave
  - [ ] Deve salvar no localStorage
  - [ ] Deve aparecer na listagem
  - [ ] Não deve ter erros de console

# 3. Testes de Relacionamento
- [ ] Breeding Manager → Adicionar Pai/Mãe
  - [ ] Deve permitir selecionar aves como pais
  - [ ] Deve salvar corretamente

# 4. Testes de Dados
- [ ] Dashboard → Filtrar por Status
  - [ ] Deve filtrar corretamente
  - [ ] Deve mostrar dados sem erros

# 5. Testes de Performance
- [ ] Carregar dashboard com múltiplas aves (50+)
  - [ ] Deve ser rápido (<2s)
  - [ ] Sem erros de memória
```

---

## 🚀 Instruções de Execução (SUPABASE)

### Pré-Requisitos
- [ ] Backup criado
- [ ] Dev team notificado
- [ ] Nenhum usuário ativo
- [ ] Arquivo 005_standardize_ids_and_constraints.sql validado

### Execução
1. [ ] Copiar conteúdo de db/migrations/005_standardize_ids_and_constraints.sql
2. [ ] Abrir Supabase → SQL Editor
3. [ ] Colar SQL
4. [ ] Executar (pode levar 2-10 minutos)
5. [ ] Verificar sucesso (ver checklist de validação)

### Pós-Migração
- [ ] Testar login
- [ ] Testar criar nova ave
- [ ] Testar listar aves
- [ ] Testar filtros
- [ ] Monitorar logs por erros

---

## ❌ Sinais de Alerta

Se algum desses sinais aparecer, fazer ROLLBACK imediatamente:

- [ ] Erro 42P13 (type already exists) - Remover CREATE TYPE
- [ ] Erro 23503 (violação de FK) - Verificar dados órfãos
- [ ] Erro 408/504 (timeout) - Tentar novamente
- [ ] Erro 42703 (coluna não existe) - Verificar nomes das colunas
- [ ] Aplicação não carrega aves - Verificar RLS policies

---

## ✅ Validação Final

Após migração e deployment, validar:

```sql
-- 1. ENUMs criados
SELECT typname FROM pg_type WHERE typname LIKE '%enum%' ORDER BY typname;

-- 2. Foreign Keys
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'birds' AND constraint_type = 'FOREIGN KEY';

-- 3. Índices
SELECT indexname FROM pg_indexes WHERE tablename = 'birds' ORDER BY indexname;

-- 4. Tipos de coluna
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'birds' ORDER BY ordinal_position;

-- 5. Status de dados
SELECT COUNT(*) as total_birds FROM birds;
SELECT COUNT(DISTINCT breeder_id) as breeders FROM birds;
```

---

## 📊 Métricas Esperadas

| Métrica | Valor |
|---------|-------|
| **Total de ENUMs criados** | 8 |
| **Total de Foreign Keys** | 10+ |
| **Total de Índices adicionados** | 20+ |
| **Campos convertidos para UUID** | 7+ |
| **Campos convertidos para ENUM** | 6+ |
| **Tempo esperado de execução** | 2-10 min |

---

## 🎯 Status

**Última Atualização**: 28 de Janeiro de 2026  
**Status**: ✅ PRONTO PARA EXECUÇÃO  
**Responsável**: Tim Copilot  
**Tipo de Migração**: CRÍTICA (integridade referencial)

---

**Dúvidas?** Consulte MIGRATION_GUIDE_005.md

