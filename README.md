# Adiciona em massa Moldura em Vídeos

Aplicação web para **criar, personalizar e aplicar molduras em vídeos diretamente no navegador**.

O projeto funciona no lado do cliente e utiliza **FFmpeg.wasm** para realizar o processamento dos vídeos sem necessidade de enviar os arquivos para um servidor.

## ✨ Recursos

* 🖼️ Envio de molduras em PNG
* 🎨 Criação de molduras diretamente no navegador
* 👤 Upload de foto de perfil
* 🔵 Foto de perfil circular ou arredondada
* ✏️ Personalização de username
* 📝 Personalização de legenda
* 🎨 Escolha da cor de fundo
* 🔤 Escolha automática ou manual da cor do texto
* 📐 Ajuste da área do vídeo
* 🖱️ Arrastar e redimensionar elementos no preview
* 🔍 Detecção automática da área transparente da moldura
* 🎯 Centralização da área do vídeo
* 🎬 Processamento de vários vídeos
* 📂 Drag & drop de vídeos
* 📊 Barra de progresso individual e geral
* ✅ Status de processamento por vídeo
* 💾 Download individual dos vídeos processados
* 📦 Download de todos os resultados em `.zip`
* 🔒 Processamento local no navegador
* 🚫 Nenhum vídeo precisa ser enviado para um servidor

## 🛠️ Tecnologias

O projeto utiliza:

* HTML5
* CSS3
* JavaScript
* Canvas API
* File API
* Web APIs de Drag & Drop
* Pointer Events
* FFmpeg.wasm
* JSZip
* Google Fonts

O FFmpeg.wasm é carregado pelo navegador através de:

```text
https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js
```

O JSZip é carregado somente quando necessário para gerar o arquivo ZIP.

## 🚀 Como funciona

### 1. Escolha ou crie uma moldura

O usuário pode escolher entre:

* **Enviar PNG**
* **Criar moldura**

No modo de envio, o sistema analisa a imagem PNG e tenta identificar automaticamente a região transparente onde o vídeo deverá ficar.

Também é possível ajustar manualmente:

* X
* Y
* largura
* altura

A área pode ser movimentada e redimensionada diretamente no preview.

### 2. Criar uma moldura

O editor permite criar uma moldura vertical com resolução base de:

```text
1080 × 1942
```

É possível configurar:

* foto de perfil
* formato da foto
* username
* legenda
* fundo
* cor do texto
* posição e tamanho da área do vídeo

Os elementos podem ser movimentados diretamente no preview.

### 3. Adicionar vídeos

É possível adicionar vários vídeos simultaneamente.

Formatos indicados pela interface:

```text
MP4
MOV
WEBM
```

Os vídeos são colocados em uma fila antes do processamento.

### 4. Processamento

Ao iniciar o processamento, o FFmpeg.wasm é carregado no navegador.

O sistema:

1. carrega o vídeo;
2. carrega a moldura;
3. redimensiona o vídeo para a área definida;
4. posiciona o vídeo dentro da moldura;
5. aplica a moldura;
6. mantém o áudio original;
7. gera um novo MP4;
8. disponibiliza o arquivo para download.

O processamento utiliza `libx264`, `ultrafast`, `crf 23` e mantém o áudio original quando disponível.

## 🔒 Privacidade

O processamento dos vídeos é realizado localmente no navegador.

O projeto não possui backend para receber os vídeos durante o processamento.

Isso significa que os arquivos selecionados permanecem no ambiente do navegador enquanto a aplicação trabalha com eles.

A própria interface informa:

> Processamento local

> Sem upload para servidor

> FFmpeg no navegador

## ⚡ SharedArrayBuffer

O projeto verifica se `SharedArrayBuffer` está disponível.

Quando não está disponível, a aplicação mostra um aviso informando que o processamento poderá ocorrer em single-thread e ficar mais lento.

Para melhor desempenho, recomenda-se utilizar uma versão recente de:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox

preferencialmente através de HTTPS.

## 📦 Download

Cada vídeo processado pode ser baixado individualmente.

Também existe a opção:

```text
Baixar todos (.zip)
```

Nesse caso, o JSZip é carregado no navegador e os vídeos processados são agrupados em um arquivo ZIP.

## 🌐 Deploy

O projeto pode ser hospedado como uma aplicação estática.

Exemplo de estrutura:

```text
/
├── index.html
├── README.md
├── vercel.json
└── package.json
```

Não é necessário um servidor Node.js para realizar o processamento dos vídeos.

## ▶️ Executar localmente

Como o projeto utiliza recursos modernos do navegador e FFmpeg.wasm, recomenda-se executar através de um servidor HTTP local.

Por exemplo:

```bash
npx serve .
```

ou:

```bash
python -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080
```

## ☁️ Vercel

O projeto pode ser publicado na Vercel como um site estático.

Não é necessário criar uma API para processar os vídeos.

O navegador executa o processamento diretamente no dispositivo do usuário.

## 📁 Arquivo principal

### `index.html`

O `index.html` contém:

* estrutura HTML;
* CSS completo;
* interface do editor;
* lógica JavaScript;
* gerenciamento dos arquivos;
* editor de molduras;
* integração com FFmpeg.wasm;
* processamento dos vídeos;
* geração dos downloads.

Atualmente o projeto está concentrado em um único arquivo HTML.

## 🎬 Fluxo da aplicação

```text
Usuário
   │
   ├── Envia PNG
   │      │
   │      └── Detecta área do vídeo
   │
   ├── OU cria uma moldura
   │      │
   │      └── Gera PNG através do Canvas
   │
   └── Adiciona vídeos
          │
          ▼
     Fila de vídeos
          │
          ▼
      FFmpeg.wasm
          │
          ▼
    Vídeos processados
          │
       ┌──┴──┐
       ▼     ▼
   Download  ZIP
```

## ⚠️ Desempenho

O processamento de vídeo utilizando FFmpeg.wasm exige bastante CPU e memória do dispositivo.

Vídeos grandes, longos ou em grande quantidade podem consumir muitos recursos do navegador.

O projeto processa os vídeos sequencialmente, evitando executar todos os vídeos simultaneamente.

## 🔐 Segurança e privacidade

Como os arquivos são manipulados através das APIs do navegador e processados localmente, o projeto não precisa armazenar os vídeos em banco de dados ou servidor.

Os objetos temporários criados pelo navegador também são liberados quando deixam de ser necessários em diferentes partes da aplicação.

## 📜 Licença

Defina aqui a licença desejada para o projeto, por exemplo:

```text
MIT License
```

Caso nenhuma licença tenha sido definida no repositório, não assuma automaticamente que o projeto está licenciado como MIT.

## 👨‍💻 Projeto

**Moldura Studio**

Aplicação para criação e aplicação de molduras em vídeos diretamente no navegador.

Repositório:

https://github.com/taldorafael/Video-com-Moldura-Edicao

Site:

https://videocommoldura.vercel.app/

Processamento:

https://ffmpeg.org/
