# Neurinho: A Jornada das Sinapses

Documento de design do jogo do Neurinho. O jogo fica em uma aba própria do app (aba **Jogo**, na barra de baixo) e usa as próprias questões de múltipla escolha do banco de estudo. Ou seja: jogar é estudar.

---

## 1. História

Dentro da cabeça de cada estudante existe um reino chamado **Sinápsia**. Lá vive o **Neurinho**, um neurônio pequeno e curioso. Cada coisa que você aprende acende uma luz nas estradas do reino: as **sinapses**.

No centro de Sinápsia brilha a **Grande Sinapse**, que guarda tudo o que você já estudou. Mas, na véspera da **Grande Prova**, **Lorde Apagão**, o senhor do Esquecimento, invadiu o reino. Ele quebrou a Grande Sinapse em **cinco fragmentos** e entregou cada um a um de seus capangas.

Os capangas não são monstros comuns. Cada um é um inimigo real de quem estuda: a preguiça de começar, a distração, a noite mal dormida, a ansiedade e a desorganização.

A única arma do Neurinho é o **conhecimento**: cada resposta certa vira um impulso elétrico que acerta o vilão. Para salvar Sinápsia, o Neurinho precisa recuperar os cinco fragmentos, enfrentar Lorde Apagão na Cidadela do Esquecimento e reacender a Grande Sinapse.

**A mensagem do jogo:** o esquecimento é natural e sempre volta. O que o vence é revisar um pouco, sempre, e cuidar de si no caminho.

---

## 2. Objetivos

### Objetivo principal
Recuperar os **5 fragmentos da Grande Sinapse**, derrotar **Lorde Apagão** e reacender a Grande Sinapse.

### Objetivos de cada batalha
- Zerar a vida do vilão respondendo questões certas.
- Não deixar a **energia** do Neurinho chegar a zero.

### Objetivos de aprendizado (o objetivo real)
- Praticar questões de cada disciplina de forma divertida.
- Ler a explicação depois de cada resposta, inclusive as certas.
- Revisar o que errou: o chefe final usa justamente as questões que você mais errou nas batalhas.

---

## 3. Como se joga

| Elemento | Regra |
|---|---|
| Energia do Neurinho | Começa com 5. Cada erro tira 1. |
| Resposta certa | Tira 1 de vida do vilão. |
| Sinapse turbo | A partir de 3 acertos seguidos, cada acerto tira 2. |
| Água (1 por batalha) | Recupera 2 de energia. Hidratar também é estudar. |
| Respiro (1 por batalha) | Elimina 2 alternativas erradas da questão atual. **Ganha +1 Respiro** se você fez uma pausa de respiração na aba Cuidar naquele dia. |
| Derrota | Sem castigo. O Neurinho só precisa descansar, e o jogo mostra as questões erradas para revisar. |
| XP | +1 por acerto. Vitória: +15 (primeira vez) ou +5 (revanche). Chefe final: +40. O XP é o mesmo do app, então jogar também faz o Neurinho evoluir. |
| Sequência | As questões respondidas no jogo contam como estudo do dia. |

---

## 4. Vilões

Cada capanga guarda um fragmento e tem um **poder especial** que imita o problema que ele representa.

### Procrastino, o Senhor do Amanhã
- **Covil:** Lamaçal do Amanhã
- **Perguntas de:** Bioquímica
- **Quem é:** uma gosma marrom e sonolenta que derrete no sofá. Representa a preguiça de começar.
- **Fala:** "Pra que estudar agora? Amanhã é um dia tão bonito..."
- **Poder, Deixa pra depois:** a cada 3 rodadas ele recupera 1 de vida. Se você enrolar, ele nunca acaba.
- **Ao ser derrotado:** "Tá bom, tá bom... o difícil era só começar."

### Distrax, a Rainha das Notificações
- **Covil:** Pântano dos Micróbios
- **Perguntas de:** Micro e Imunologia
- **Quem é:** um celular com olhos, cercado de balõezinhos vermelhos de notificação. Representa a distração.
- **Fala:** "Só uma olhadinha no celular... só mais um vídeo..."
- **Poder, Notificação!:** a cada 3 rodadas um pop-up cobre a questão. Você precisa ignorá-lo antes de responder.
- **Ao ser derrotada:** "Modo foco ativado?! Isso não vale!"

### Barão Insônia
- **Covil:** Cidade dos Sistemas
- **Perguntas de:** Morfofisiologia
- **Quem é:** uma lua escura de cartola e olheiras enormes. Representa a noite virada estudando.
- **Fala:** "Durma depois! Vire a noite comigo, só mais um capítulo..."
- **Poder, Noite em claro:** a cada 4 rodadas ele drena 1 de energia do Neurinho (mas nunca abaixo de 1).
- **Ao ser derrotado:** "Uma boa noite de sono... meu pior pesadelo."

### Ansiax, o Sussurro do "E se?"
- **Covil:** Labirinto do DNA
- **Perguntas de:** Genética
- **Quem é:** uma bolinha espinhosa e tremida, de olhos arregalados e suando frio. Representa a ansiedade.
- **Fala:** "E se você esquecer tudo? E se cair justo o que você não estudou?"
- **Poder, Coração acelerado:** cada erro tira 2 de energia em vez de 1. É aqui que o Respiro faz diferença.
- **Ao ser derrotado:** "Você respirou... e lembrou. Como?!"

### Dona Bagunça, a Mestra do Caos
- **Covil:** Torre da Qualidade
- **Perguntas de:** Gestão da Qualidade
- **Quem é:** um redemoinho de papéis soltos, post-its e canetas sem tampa. Representa a desorganização.
- **Fala:** "Cronograma? Checklist? Eu prefiro o caos!"
- **Poder, Escudo do Caos:** ela começa protegida. O escudo só quebra com 2 acertos seguidos e volta sempre que você erra. Constância vence o caos.
- **Ao ser derrotada:** "Tudo organizado... que horror!"

### Chefe final: Lorde Apagão, o Senhor do Esquecimento
- **Covil:** Cidadela do Esquecimento (libera com os 5 fragmentos)
- **Perguntas de:** todas as disciplinas, **dando preferência às questões que você mais errou** no jogo.
- **Quem é:** uma nuvem de sombra coroada, de olhos brancos, segurando uma lâmpada apagada.
- **Fala:** "Tudo o que não é revisado, um dia é meu."
- **Vida:** 12.
- **Poder, Apagão total:** quando perde metade da vida, cada erro passa a tirar 2 de energia.
- **Ao ser derrotado:** "Você me venceu hoje... mas eu volto sempre que você parar de revisar."

> Se o banco de questões de alguma disciplina tiver menos de 5 questões (por exemplo, em outro período), o vilão usa a próxima disciplina disponível. Assim o jogo funciona com qualquer conteúdo, inclusive com questões criadas por você.

---

## 5. O final (alcance final)

Ao derrotar Lorde Apagão:

1. A **Grande Sinapse reacende** e a luz volta para todas as estradas de Sinápsia.
2. O Neurinho recebe o título de **Guardião da Sinapse**.
3. O jogo libera o **Modo Plantão**, o desafio sem fim: questões de todas as disciplinas, 3 de energia, sem Água nem Respiro. Quantas você aguenta? O app guarda o seu **recorde**.

O final deixa um gancho de propósito: Lorde Apagão promete voltar sempre que a revisão parar. É a curva do esquecimento contada como história, e o motivo para continuar revisando no app.

---

## 6. Ideias para as próximas versões

- Vilões dos outros períodos (Farmacologia, Patologia, Atenção Básica...) com novos covis.
- Chefe semanal que usa os cartões atrasados da revisão espaçada.
- Itens cosméticos para o Neurinho (jaleco, estetoscópio, touca) comprados com fragmentos.
- Diário do Neurinho: uma página da história liberada a cada vilão derrotado.
- Trilha sonora e efeitos sonoros, respeitando a opção de reduzir movimento.
