# Evolução completa de Convites, Participações, CRM e Resgate

## Objetivo

Separar o convite inicial das participações recorrentes, impedir duplicidades, permitir renovação segura e conectar todo o histórico ao CRM e aos ciclos de Resgate/Reativação, sem apagar nem reatribuir os 242 convites existentes.

## O que será implementado

### 1. Identidade e convite de ativação
- Centralizar a criação manual em uma operação segura que procura a pessoa por e-mail e telefone antes de criar qualquer registro.
- Reutilizar convite pendente válido e oferecer reenvio sem criar outro código.
- Quando o convite estiver vencido, renová-lo com novo código e validade, mantendo referência ao anterior e registrando o histórico.
- Bloquear novo convite de ativação para Admin, Facilitador ou Membro ativo.
- Criar ou atualizar imediatamente a ficha correspondente no CRM também para convites de Grupo Premium.

### 2. Participações recorrentes de convidados
- Criar uma base própria para autorizações/participações, ligada à pessoa, Grupo, encontro, convidador e convite de origem.
- Convite inicial continuará ativando voluntariamente a conta como Convidado; novas visitas de um Convidado já ativo não criarão outra conta nem outro convite de ativação.
- Permitir convidar novamente uma pessoa ativa para outro encontro ou Grupo Premium, preservando cada participação separadamente.
- Manter temporariamente a leitura legada como fallback durante a transição para não retirar acesso de ninguém.

### 3. Presenças e CRM
- Adicionar a data real da última presença ao CRM.
- Corrigir a contagem e as datas tanto para Convidados com conta quanto para contatos ainda sem conta.
- Ao ativar uma conta, reconciliar o histórico anterior da mesma identidade sem duplicar presenças.
- Atualizar os estados da jornada e o histórico do CRM em cada convite, renovação, participação e presença.

### 4. Ciclos de Resgate e Reativação
- Tornar a régua reiniciável: uma nova presença ou uma nova desativação abrirá um novo ciclo sem apagar disparos antigos.
- Separar corretamente Ex-Membro de Ex-Convidado usando o papel anterior registrado na desativação.
- Usar a última presença real, não a primeira, para calcular a elegibilidade de contatos sem conta.
- Cancelar somente itens futuros do ciclo encerrado quando houver participação, promoção ou reativação.
- Exibir e exportar o ciclo e a audiência corretos na Central de Resgate.

### 5. Telas e ações
- Em Convites, mostrar quando a pessoa já existe e disponibilizar as ações adequadas: **Reenviar**, **Renovar convite** ou **Convidar para nova participação**.
- Exibir o histórico de participações sem misturá-lo com o status de ativação da conta.
- Manter a terminologia em PT_BR e usar sempre “Grupo”.

## Migração dos dados atuais

- Preservar integralmente todos os convites, códigos, atribuições, presenças e disparos existentes.
- Criar participações a partir dos convites aceitos não substituídos, sem alterar o histórico original.
- Calcular a primeira e a última presença pelas duas fontes atuais de presença.
- Associar convites Premium ao CRM usando identidade normalizada, sem criar fichas duplicadas.
- Classificar ciclos antigos de Resgate e manter todos disponíveis no histórico.
- Executar backfills idempotentes para permitir repetição segura em caso de interrupção.

## Segurança e compatibilidade

- Administradores gerenciam tudo; Facilitadores atuam apenas em seus Grupos; Convidados veem somente as próprias participações.
- Membros não recebem acesso administrativo a dados pré-ativação.
- Atribuição original de quem trouxe a pessoa será preservada; uma nova visita registra quem convidou para aquela participação sem substituir a aquisição original.
- Nenhuma participação nova gera pontos, promoção ou presença automaticamente.

## Validação

- Testar convite novo, duplicado, pendente, vencido, aceito e renovado.
- Testar Convidado ativo em várias visitas e Grupos sem duplicar conta, lead, presença ou pontuação.
- Testar presenças com e sem conta e reconciliação após ativação.
- Testar novos ciclos de Resgate para Convidado, Ex-Convidado e Ex-Membro.
- Verificar permissões por papel, tipos, testes automatizados, consistência das migrações, função de Resgate e documentação.
