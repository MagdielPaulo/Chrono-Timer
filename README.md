# ⏱ Chronos Timer

Sistema Pomodoro moderno para produtividade, com gestão de tarefas, estatísticas e personalização completa.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Bootstrap 5](https://img.shields.io/badge/Bootstrap-7952B3?style=flat&logo=bootstrap&logoColor=white)


**🔗 Live:** [Chronos Timer App](https://chrono-timer-lilac.vercel.app/)

---

## Funcionalidades

### Timer Pomodoro
- Configuração de tempo de foco, pausa e número de sessões
- Anel de progresso SVG animado com indicação visual de fase
- Controles de pausar, resetar e pular fase
- Indicador de sessões com dots animados
- Atualização dinâmica do título da aba do navegador
- Presets rápidos: Clássico (25/5/4), Deep Work (50/10/2), Sprint (15/3/6), Ultra (90/20/1)

### Lista de Tarefas
- Adicionar tarefas com 3 níveis de prioridade (Alta, Média, Baixa)
- Marcar como concluída / desfazer
- Filtros: Todas, Pendentes, Concluídas
- Exclusão individual
- Persistência via localStorage

### Estatísticas de Produtividade
- Dias seguidos (streak)
- Tempo total focado
- Total de sessões concluídas
- Melhor dia registrado
- Gráfico de barras dos últimos 7 dias
- Histórico recente com data, sessões e minutos

### Sons de Alerta
- Gerados via Web Audio API (sem arquivos MP3 necessários)
- Som suave de sino ao terminar o foco
- Escala ascendente ao retornar ao foco
- Melodia de conclusão ao finalizar todas as sessões
- Volume ajustável nas configurações

### Personalização
- Tema escuro e claro
- 6 cores de destaque: Cyan, Violeta, Esmeralda, Rosa, Âmbar, Azul
- Notificações do navegador (opcional)
- Toggle de som de alerta com controle de volume
- Todas as preferências salvas em localStorage

### Responsividade
- Layout adaptável para desktop, tablet e celular
- Sidebar retrátil com overlay em telas menores
- Cards de configuração reorganizados em coluna no mobile

---

## Estrutura do Projeto

```
CHRONO-TIMER/
├── audio/
│   ├── bell.mp3
│   ├── final.mp3
│   ├── lo-fi.mp3
│   └── volta.mp3
├── img/
│   └── relogio.png
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica |
| CSS3 (Custom Properties) | Sistema de temas e cores dinâmicas |
| JavaScript ES6+ | Lógica do timer, tarefas, stats e UI |
| Bootstrap 5 | Grid e utilitários base |
| Font Awesome 6 | Ícones |
| Google Fonts | Outfit (display) + JetBrains Mono (monospace) |
| Web Audio API | Sons de alerta gerados por código |
| localStorage | Persistência de dados no navegador |
| SVG | Anel de progresso do timer |

---

## Como Usar

1. Clone ou baixe o repositório
2. Abra o `index.html` no navegador

Não precisa de instalação, build ou servidor. Funciona direto no navegador.

---

## Atalhos de Teclado

| Tecla | Ação |
|---|---|
| `Espaço` | Pausar / Continuar o timer (quando ativo) |

---

## Dados e Privacidade

Todos os dados (tarefas, estatísticas, configurações) ficam salvos exclusivamente no localStorage do seu navegador. Nada é enviado para servidores externos.

---

## Licença

MIT
