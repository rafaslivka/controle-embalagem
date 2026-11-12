# Manual de uso do Controle de Embalagens | Buiatte

**Acesso:** https://rafaslivka.github.io/controle-embalagem/

O site pode ser usado no computador, celular ou coletor RF com acesso à internet. Ao abrir, confira se aparece **Banco compartilhado** no topo. O acesso é sem login.

**Bipar um produto serve para consultar a embalagem. A consulta não dá baixa no estoque.**

## 1. Como saber qual caixa usar

1. Abra a aba **Consulta SKU**.
2. Em **Consultar por**, deixe selecionado **Produto · SKU ou EAN**.
3. Toque no campo **Código** e bipe a etiqueta do produto. Se o leitor não enviar Enter automaticamente, toque em **Consultar**. No computador, você também pode digitar o SKU e apertar Enter.
4. Confira o **código e a descrição da caixa**. Para compressores, veja também o reforço, o calço, o kit, os componentes e a movimentação indicados no manual.
5. No coletor ou celular, **role a tela para baixo** até **Fotos e manual de montagem**. Toque em uma foto para ampliar ou no nome do PDF para abrir o manual.
6. Para consultar outra peça, volte ao campo **Código** e bipe a próxima etiqueta.

**Exemplo para testar:** o SKU `05502067` indica a caixa `CONSCOD00142`, referência **Caixa 3129**, com **KIT 5**.

Se quiser ouvir a indicação, marque **Ler indicação em voz alta** antes de bipar. Essa opção depende do navegador do equipamento.

### O que fazer quando houver dúvida

| O que apareceu | Como proceder |
|---|---|
| **Sugestão por dimensão** | A caixa foi sugerida pelas medidas da peça. Valide encaixe, proteção e orientação antes de embalar. |
| **Produto não localizado** | Digite o SKU. Se funcionar digitando, confira se o código de barras da etiqueta está associado ao SKU conforme a seção 3. |
| **Sem caixa definida** | Confirme com o responsável qual embalagem está aprovada para a peça. Depois, registre o vínculo conforme a seção 3. |
| **Nenhuma foto ou manual cadastrado** | Confira as instruções de texto do produto. Se faltar informação para montar a embalagem, consulte o responsável antes de prosseguir. |

## 2. Como consultar uma caixa pela referência

1. Em **Consulta SKU**, altere **Consultar por** para **Caixa · referência ou CONSCOD**.
2. Digite a referência completa, os quatro últimos dígitos ou o código CONSCOD.
3. Toque em **Consultar**. Se aparecer mais de uma caixa, confira as descrições e selecione a correta.

**Exemplo:** a referência `3569` retorna a caixa `CONSCOD00155`.

## 3. Como cadastrar uma etiqueta ou definir a caixa do produto

### Para o leitor reconhecer a etiqueta

1. Abra **Cadastros → Códigos de barras**.
2. Clique em **Adicionar registro**.
3. No campo **EAN / código da etiqueta**, bipe o código de barras.
4. No campo **SKU do produto**, informe o SKU já cadastrado.
5. Clique em **Salvar registro** e teste a mesma etiqueta na **Consulta SKU**. Se for testar em outro coletor que já estava com o site aberto, atualize a página primeiro.

### Para registrar qual caixa o produto usa

1. Abra **Cadastros → SKU × caixa** e pesquise o SKU.
2. Se o vínculo já existir, clique em **Editar**. Para criar um vínculo, clique em **Adicionar registro**.
3. Preencha o SKU, a descrição da peça, o código da caixa, a origem da orientação e a validação.
4. Clique em **Salvar registro**. Volte à **Consulta SKU**, bipe o produto e confira a caixa indicada.

## 4. Como enviar fotos ou manual de montagem

1. Consulte o produto ou a referência e **confira o código da caixa na tela**.
2. Em **Fotos e manual de montagem**, toque em **Adicionar foto ou manual**.
3. Escolha um arquivo **JPG, PNG, WebP ou PDF de até 3 MB**.
4. Toque em **Enviar arquivo** e aguarde a mensagem **Arquivo salvo**.
5. Para incluir fotos de outras etapas da montagem, repita o envio, um arquivo por vez.

**O anexo pertence à caixa.** Todos os produtos vinculados à mesma caixa exibem essas fotos e PDFs. Para orientações específicas de um compressor, use **Cadastros → Manual de compressores**.

## 5. Como importar o inventário semanal

1. Prepare a planilha em **XLSX ou XLSM**. Nas primeiras dez linhas da aba, devem aparecer os cabeçalhos **Código** ou **Código CONSCOD** e **Quantidade** ou **Estoque atual**.
2. Abra **Inventário** e informe a **data real da contagem**.
3. Selecione a planilha e clique em **Conferir importação**.
4. Na prévia, confira a aba identificada, os códigos reconhecidos, as quantidades e as pendências. Linhas repetidas da mesma caixa são somadas.
5. Se os dados estiverem corretos, clique em **Confirmar inventário**.
6. Confira os registros em **Histórico semanal** e os itens que exigem revisão em **Pendências do inventário**.

**Atenção à quantidade:** informe o total físico contado. Se havia 100 caixas e foram contadas 80, informe **80**. Ao reimportar a mesma caixa para a mesma data, a nova contagem substitui a anterior. Caixas ausentes na planilha mantêm o saldo. Uma contagem retroativa preserva o saldo da contagem mais recente.

## 6. Como registrar e acompanhar uma compra

1. Abra **Compra futura → Adicionar compra**. Para atualizar um lançamento existente, clique em **Editar** na linha correspondente.
2. Selecione a caixa e preencha quantidade, NF, data de emissão, origem, status e observação.
3. Clique em **Salvar compra**.
4. Confira o **Em trânsito** e o **Projetado** no painel. Uma compra entra na projeção quando possui NF, quantidade positiva e status **PENDENTE**, **PARCIAL** ou **EM TRÂNSITO**.
5. Ao receber ou cancelar, edite o lançamento e atualize o status para **RECEBIDO** ou **CANCELADO**.

**Recebimento:** marcar a compra como **RECEBIDO** retira a quantidade do trânsito. O saldo físico é atualizado pela contagem do inventário.

## 7. Como acompanhar estoque e consumo

- **Painel semanal:** pesquise pelo código, referência, descrição ou status da caixa. Confira o saldo físico, a média semanal, o estoque mínimo, a cobertura e as compras em trânsito. **Saldo projetado = saldo físico + quantidade em trânsito.**
- **Dashboard:** selecione hoje, semana, mês, todo o histórico ou um período personalizado. Consulte consumo, entradas, rankings e últimos inventários. O sistema apura consumo e entradas pela diferença entre contagens sucessivas.
- **Cadastros → Parâmetros de estoque:** consulte ou ajuste prazo de entrega, margem de segurança e cobertura crítica. Esses valores afetam os alertas de compra.

Se aparecer a mensagem de que **outra estação salvou alterações**, atualize a página, confira o registro mais recente e reaplique sua alteração se ela ainda for necessária.
