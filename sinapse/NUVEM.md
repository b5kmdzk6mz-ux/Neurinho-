# Ligar a nuvem do Sinapse (Supabase)

Leva uns 10 minutos e é tudo gratuito no começo.

## 1. Criar o projeto

1. Entre em **supabase.com** e toque em **Start your project**. Dá para entrar com a conta do GitHub.
2. Toque em **New project**:
   - **Name:** `sinapse`
   - **Database Password:** crie uma senha forte e guarde (não vou precisar dela).
   - **Region:** **South America (São Paulo)**
   - **Plan:** Free
3. Espere uns 2 minutos até o projeto ficar pronto.

## 2. Criar o banco de dados

1. No menu da esquerda, abra **SQL Editor** e toque em **New query**.
2. Abra o arquivo `sinapse/nuvem.sql` deste repositório (no GitHub, botão **Raw**), copie tudo e cole no editor.
3. Toque em **Run**. Deve aparecer **Success. No rows returned**.

Esse arquivo cria as tabelas e as **regras de segurança**: cada pessoa só vê os próprios cadernos e os que foram compartilhados com ela. Essas regras foram testadas com quatro usuários diferentes antes de chegar aqui.

## 3. Login por código no e-mail

O Sinapse entra com um código de 6 números enviado por e-mail (funciona melhor no iPad do que um link).

1. Abra **Authentication › Emails** (ou **Email Templates**).
2. No modelo **Magic Link**, troque o texto por:

   - Assunto: `Seu código do Sinapse`
   - Corpo:
     ```html
     <h2>Seu código do Sinapse ✦</h2>
     <p>Digite este código no app:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>Se não foi você, é só ignorar.</p>
     ```
3. Faça o mesmo no modelo **Confirm signup** (é o que vai para quem entra pela primeira vez).
4. Salve.

## 4. Endereço do app

Em **Authentication › URL Configuration**, coloque em **Site URL**:

```
https://b5kmdzk6mz-ux.github.io/Neurinho-/sinapse/
```

## 5. Me mandar dois dados

Em **Project Settings › API** (ou **Data API** e **API Keys**), copie:

- **Project URL**: algo como `https://abcdefgh.supabase.co`
- **Chave pública**: a **anon public** (começa com `eyJ…`) ou a **publishable** (começa com `sb_publishable_…`)

Essas duas são **públicas por natureza**: vão dentro do app, e a segurança fica por conta das regras do passo 2. **Nunca** mande a chave **service_role** ou **secret**.

## Bom saber

- **Uso próprio:** o e-mail que vem pronto no Supabase entrega para quem é dona do projeto, então serve para você sem configurar mais nada. Você entra uma vez em cada aparelho (iPad, celular, computador) e o login fica salvo. Ele tem um limite de poucos e-mails por hora, o que só atrapalha se pedir vários códigos seguidos.
- **Compartilhar depois:** se um dia quiser compartilhar cadernos com outras pessoas, elas também precisam receber o código. Aí é só ligar um serviço de e-mail próprio (por exemplo, o Resend, que é grátis) em **Authentication › Emails › SMTP Settings**.
- **Limites do plano grátis:** 500 MB de banco, 1 GB de arquivos (PDFs, fotos, áudios) e 50 mil pessoas ativas por mês. Para começar, sobra.
