# CRM Secretaria Granemann

CRM inicial para cadastro de promotores/CTGs, prospecção de secretaria de rodeios e MDL, agenda de retornos e histórico de contatos. Usa Google Sheets como banco e Google Apps Script como aplicação web.

## Arquivos
- `Code.gs`: lógica do Apps Script, leitura/escrita na planilha e integração com WhatsApp Cloud API.
- `Index.html`: interface responsiva para celular e computador.

## 1. Criar a planilha e publicar o CRM
1. Crie uma planilha nova no Google Sheets com sua conta Google.
2. Na planilha, abra **Extensões → Apps Script**.
3. No arquivo `Code.gs`, apague o conteúdo padrão e cole o conteúdo do arquivo `Code.gs` deste pacote.
4. Clique no **+** ao lado de Arquivos e crie um arquivo HTML chamado exatamente `Index`. Cole nele o conteúdo de `Index.html`.
5. Salve o projeto. No seletor de funções, escolha `setupCrm` e clique em **Executar**. Autorize o acesso à planilha quando solicitado. Isso cria a aba `Contatos`.
6. Para publicar, clique em **Implantar → Nova implantação → Aplicativo da web**.
7. Escolha **Executar como: você** e **Quem tem acesso: somente você** para a primeira versão. Clique em Implantar e autorize. Copie o URL do aplicativo.
8. Abra o URL no celular e computador usando a mesma conta Google. No iPhone, pode usar **Compartilhar → Adicionar à Tela de Início** para criar um atalho.
9. Se fizer alterações no código depois, use **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.

> O código usa `SpreadsheetApp.getActiveSpreadsheet()`, por isso deve ser criado a partir de **Extensões → Apps Script** dentro da planilha, e não como um projeto independente.

## 2. Integração oficial com WhatsApp Cloud API
O envio automático precisa de uma conta empresarial Meta configurada para WhatsApp Cloud API, número de telefone conectado, token de acesso e modelo de mensagem aprovado. O CRM não consegue criar/validar essas credenciais por você.

1. Configure o WhatsApp Business Platform/Cloud API no Meta for Developers e obtenha o **Phone Number ID** e um token com permissão de envio de mensagens (`whatsapp_business_messaging`). Para produção, use um token de sistema duradouro e guarde-o com segurança.
2. No WhatsApp Manager, crie e envie para aprovação um modelo de mensagem de categoria adequada para prospecção/marketing, com **três variáveis no corpo**, nesta ordem: nome do contato, serviço e evento. Exemplo de texto para adaptar e submeter à aprovação:

   `Olá, {{1}}! Aqui é da Secretaria Granemann. Estou entrando em contato para apresentar nossos serviços de {{2}}. Se fizer sentido para {{3}}, posso te passar mais informações? Se não quiser receber mensagens, é só me avisar.`

   O modelo e a categoria precisam ser aprovados pela Meta. Não presuma que o nome acima estará disponível: configure o nome exato que aparecer no WhatsApp Manager.
3. No editor Apps Script, abra **Configurações do projeto → Propriedades do script → Adicionar propriedade do script** e cadastre:
   - `WHATSAPP_TOKEN` = token da Cloud API
   - `WHATSAPP_PHONE_NUMBER_ID` = Phone Number ID
   - `WHATSAPP_TEMPLATE_NAME` = nome exato do modelo aprovado (ex.: `prospeccao_servicos`)
   - `WHATSAPP_TEMPLATE_LANGUAGE` = código de idioma do modelo (normalmente `pt_BR`)
4. Salve as propriedades e publique uma **nova versão** da implantação.
5. No cadastro de cada contato, marque **Autorizou mensagens pelo WhatsApp? = Sim** somente quando houver autorização apropriada. Então use **Enviar modelo**. O envio é registrado no histórico quando a API aceita a solicitação.

### Importante sobre as regras do WhatsApp
- Mensagens iniciadas pela empresa fora da janela de atendimento aplicável exigem modelo aprovado.
- Registre e respeite o consentimento (opt-in), pedidos para parar e limites de qualidade da Meta. Não use o CRM para disparos indiscriminados.
- A mensagem de exemplo é um ponto de partida e precisa ser ajustada/aprovada na conta Meta.
- Esta versão registra que a API aceitou o pedido, mas ainda não recebe webhooks de entrega, leitura ou falha posterior. Isso pode ser adicionado numa etapa seguinte.

## 3. Como usar
1. Clique em **Novo contato** e cadastre promotor, CTG, telefone, cidade, rodeio, serviço e próxima data de retorno.
2. Use os filtros **Para hoje**, **Atrasados**, **Próximos 7 dias** e **Em negociação** para planejar o trabalho comercial.
3. Após conversar, edite o contato e atualize a etapa, último contato, próxima data e observações.
4. **Abrir chat** abre o WhatsApp para conversa manual. **Enviar modelo** chama a integração oficial, depois de configurar a API e confirmar consentimento.
5. **Exportar CSV** baixa uma cópia dos contatos para Excel.

## Limitações desta primeira versão
- Sem login/usuários adicionais, notificações push ou lembretes automáticos fora da tela.
- Não acompanha automaticamente respostas do WhatsApp; atualize o histórico manualmente.
- O botão de envio usa um modelo fixo com três variáveis.
- Mantenha o acesso da implantação restrito a você até configurar autenticação e permissões para uma equipe.
