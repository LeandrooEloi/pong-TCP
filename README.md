# Pong Multiplayer - TCP e UDP

Projeto de um jogo Pong multiplayer em JavaScript desenvolvido para um trabalho acadêmico sobre comunicação entre processos. [file:1][cite:18]

A proposta é sincronizar o estado do jogo entre dois jogadores em máquinas diferentes, incluindo bola, raquetes e pontuação. [file:1]

Atualmente, o projeto possui a versão TCP funcionando e servirá de base para a implementação da versão UDP, que será usada na comparação de desempenho e experiência de uso. [file:1]

## Funcionalidades atuais

- Partida multiplayer para 2 jogadores
- Sincronização de bola, raquetes e placar
- Arquitetura cliente-servidor
- Reinício de partida
- Execução em rede local

## Tecnologias

- JavaScript
- Node.js
- Express
- WebSocket
- HTML/CSS
- Canvas

## Execução

### 1. Clonar o projeto

```bash
git clone URL_DO_SEU_REPOSITORIO
```

### 2. Entrar na pasta

```bash
cd NOME_DO_PROJETO
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Iniciar servidor

```bash
npm start
```

### 5. Abrir no navegador

```bash
http://localhost:3000
```

### 6. Testar em outro dispositivo

Se quiser testar em outro computador ou celular, use o IP local da máquina que está rodando o servidor, por exemplo: `http://192.168.0.10:3000`. [file:1]

## Controles

- Esquerda: `W` e `S`
- Direita: `↑` e `↓`

## Estrutura

- `server.js`
- `public/index.html`
- `public/game.js`


