# Portal de Arquivos para GitHub Pages

Projeto estático e pronto para upload no GitHub.

## O que ele faz

- Organiza arquivos por categoria
- Busca por título, descrição, tipo e área
- Mostra destaques e resumo por categoria
- Permite cadastrar arquivos manualmente pelo navegador
- Exporta a lista atual em JSON
- Pode listar automaticamente arquivos de uma pasta pública do Google Drive

## Estrutura

- `index.html` → página principal
- `styles.css` → visual do portal
- `app.js` → lógica de carregamento, filtros, destaques e cadastro manual
- `config.js` → configuração principal do portal
- `config.example.js` → modelo de configuração
- `data/manual-files.json` → arquivos cadastrados manualmente como base inicial
- `.nojekyll` → evita problemas no GitHub Pages com build automático

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, vá em **Settings > Pages**.
4. Em **Build and deployment**, escolha publicar a partir da branch principal.
5. Salve.
6. Aguarde o link do GitHub Pages ser gerado.

Referência oficial do GitHub sobre publicação por branch: citeturn427106search2turn427106search7

## Como ativar a leitura automática do Google Drive

A listagem automática usa o método `files.list` da API do Google Drive com o parâmetro `q` para buscar os arquivos dentro da pasta e `fields` para limitar os dados retornados. A documentação oficial do Google mostra esse padrão e os parâmetros de busca do endpoint. citeturn427106search0turn427106search1

### Passos

1. Deixe a pasta do Google Drive pública ou acessível por link.
2. Crie uma chave da Google API no Google Cloud.
3. Edite o arquivo `config.js`.
4. Preencha:
   - `folderUrl`
   - `folderId`
   - `apiKey`
   - `enabled: true`

Exemplo:

```js
window.APP_CONFIG = {
  branding: {
    title: 'Portal de Arquivos',
    subtitle: 'Meu acervo organizado por área.'
  },
  drive: {
    folderUrl: 'https://drive.google.com/drive/folders/SEU_FOLDER_ID',
    folderId: 'SEU_FOLDER_ID',
    apiKey: 'SUA_CHAVE_API',
    enabled: true,
    orderBy: 'modifiedTime desc',
    pageSize: 100
  },
  categories: ['Controle e Financeiro', 'MAPAs e Atividades', 'Estágio e Formação', 'Extensão e Evidências', 'Outros'],
  localStorageKey: 'portal-arquivos-manual-files',
  featuredLimit: 4
};
```

## O que já deixei configurado

O projeto já vem com os arquivos que foram identificados na pasta usada como referência, separados em grupos como:

- Controle e Financeiro, incluindo `Controle Extensões` e `Orçamento Mensal Familia` fileciteturn0file4L1-L6 fileciteturn0file0L1-L8
- MAPAs e Atividades, incluindo materiais de mentalidade criativa, teologia, futsal/futebol e gestão da qualidade fileciteturn0file1L1-L8 fileciteturn0file2L1-L8 fileciteturn0file3L1-L8 fileciteturn0file6L1-L8
- Estágio e Formação, com `Atividade 1 - Estágio Supervisionado VI` fileciteturn0file7L1-L8
- Extensão e Evidências, com `Relatório de Evidência - Contação de História` fileciteturn0file5L1-L8

## Limitação importante

O botão “Adicionar arquivo” cadastra itens no navegador do usuário e salva no `localStorage`. Ele não envia arquivos reais para o Google Drive. Para upload real em Drive, seria preciso autenticação OAuth e backend, ou um Apps Script / serviço externo.

## Como personalizar rápido

- Troque título e subtítulo em `config.js`
- Edite categorias em `config.js`
- Adicione ou remova itens base em `data/manual-files.json`
- Se quiser uma identidade visual própria, altere as cores no `:root` de `styles.css`
