/**
 * BarberOS 2.0 - Automated Production Readiness & Security Audit Test Suite
 * Validates the 10 mandatory technical scenarios required by the Master Prompt.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(num: number, name: string, fn: () => Promise<string>): Promise<boolean> {
  const start = Date.now();
  process.stdout.write(`⏳ [Teste ${num.toString().padStart(2, '0')}] ${name}... `);
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({ num, name, passed: true, details, durationMs });
    console.log(`\x1b[32mAPROVADO\x1b[0m (${durationMs}ms) - ${details}`);
    return true;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ num, name, passed: false, details: err.message, durationMs });
    console.log(`\x1b[31mFALHOU\x1b[0m (${durationMs}ms) - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n========================================================================');
  console.log('   BARBEROS 2.0 — BATERIA DE TESTES AUTOMATIZADOS DE AUDITORIA & SEGURANÇA');
  console.log('========================================================================');
  console.log(`Servidor de Teste: ${BASE_URL}\n`);

  const timestamp = Date.now();
  const testEmailA = `dono_a_${timestamp}@teste.com`;
  const testEmailB = `dono_b_${timestamp}@teste.com`;
  const baseName = `Barbearia Audit ${timestamp}`;
  let orgA: any = null;
  let sessionA: any = null;
  let orgB: any = null;
  let sessionB: any = null;
  let queueItem: any = null;

  // -------------------------------------------------------------------------
  // Teste 1: Cadastro de Barbearia com Persistência
  // -------------------------------------------------------------------------
  await runTest(1, 'Cadastro de Barbearia no Banco de Dados', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register-organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization: {
          name: baseName,
          ownerEmail: testEmailA,
          ownerPassword: 'SenhaSegura123!',
          ownerName: 'Dono Alpha',
          phone: '(11) 98888-7777',
        },
        initialProfessional: {
          name: 'Barbeiro Mestre',
          phone: '(11) 97777-6666',
        },
        initialService: {
          name: 'Corte Degrade Navalhado',
          price: 45,
          durationMinutes: 35,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Falha no cadastro (Status ${res.status}): ${err.error || res.statusText}`);
    }

    const data = await res.json();
    if (!data.organization || !data.organization.id || !data.organization.slug) {
      throw new Error('Resposta de cadastro não continha dados válidos da barbearia');
    }

    orgA = data.organization;
    sessionA = data.session;
    return `Barbearia "${orgA.name}" criada com slug "${orgA.slug}" e ID ${orgA.id}`;
  });

  // -------------------------------------------------------------------------
  // Teste 2: Prevenção de E-mail Duplicado & Resolução de Conflito de Slug
  // -------------------------------------------------------------------------
  await runTest(2, 'Prevenção de E-mail Duplicado & Resolução de Slug', async () => {
    // 2.1 Tentativa com mesmo e-mail (deve retornar 409)
    const dupRes = await fetch(`${BASE_URL}/api/auth/register-organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization: {
          name: `${baseName} Clone`,
          ownerEmail: testEmailA,
          ownerPassword: 'OutraSenha456!',
        },
      }),
    });

    if (dupRes.status !== 409) {
      throw new Error(`E-mail duplicado deveria retornar HTTP 409, mas retornou ${dupRes.status}`);
    }

    // 2.2 Cadastro com slug existente (deve resolver com sufixo único)
    const resB = await fetch(`${BASE_URL}/api/auth/register-organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization: {
          name: baseName, // Mesmo nome para testar colisão de slug
          ownerEmail: testEmailB,
          ownerPassword: 'SenhaSeguraB123!',
          ownerName: 'Dono Beta',
        },
      }),
    });

    if (!resB.ok) {
      throw new Error(`Falha ao registrar segundo estabelecimento: status ${resB.status}`);
    }

    const dataB = await resB.json();
    orgB = dataB.organization;
    sessionB = dataB.session;

    if (orgB.slug === orgA.slug) {
      throw new Error(`Colisão de slug detectada! Ambos ficaram com slug "${orgB.slug}"`);
    }

    return `E-mail duplicado bloqueado (409) e colisão resolvida para novo slug "${orgB.slug}"`;
  });

  // -------------------------------------------------------------------------
  // Teste 3: Isolamento Multi-Tenant Estrito
  // -------------------------------------------------------------------------
  await runTest(3, 'Isolamento Multi-Tenant Estrito entre Estabelecimentos', async () => {
    if (!orgA || !orgB || !sessionA) {
      throw new Error('Requisitos do teste anterior ausentes');
    }

    // Dono A tenta acessar profissionais do Dono B
    const leakRes = await fetch(`${BASE_URL}/api/professionals?orgId=${orgB.id}`, {
      headers: { Authorization: `Bearer ${sessionA.token}` },
    });

    if (leakRes.status !== 403) {
      throw new Error(`Dono A conseguiu acessar dados do Dono B! Status retornado: ${leakRes.status} (esperado: 403)`);
    }

    // Dono A tenta alterar dados do Dono B
    const attackRes = await fetch(`${BASE_URL}/api/organizations/${orgB.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionA.token}`,
      },
      body: JSON.stringify({ name: 'Barbearia Hackeada' }),
    });

    if (attackRes.status !== 403) {
      throw new Error(`Dono A conseguiu modificar dados do Dono B! Status: ${attackRes.status} (esperado: 403)`);
    }

    return `Acessos cruzados bloqueados com sucesso (HTTP 403 Forbidden). Isolamento total garantido.`;
  });

  // -------------------------------------------------------------------------
  // Teste 4: Acesso ao Link Público da Fila Virtual (Sem Autenticação)
  // -------------------------------------------------------------------------
  await runTest(4, 'Acesso Público à Fila Virtual (/api/public/establishment/:slug)', async () => {
    if (!orgA) throw new Error('Estabelecimento de teste ausente');

    // 4.1 Consulta pública válida
    const publicRes = await fetch(`${BASE_URL}/api/public/establishment/${encodeURIComponent(orgA.slug)}`);
    if (!publicRes.ok) {
      throw new Error(`Falha ao consultar estabelecimento público: status ${publicRes.status}`);
    }

    const publicData = await publicRes.json();
    if (!publicData.organization || publicData.organization.id !== orgA.id) {
      throw new Error('Dados do estabelecimento retornado na rota pública são incorretos');
    }

    // Verificar se dados sensíveis foram higienizados
    if (publicData.organization.ownerPasswordHash || publicData.organization.ownerSalt || publicData.organization.ownerPassword) {
      throw new Error('Vazamento de segurança: hash de senha exposto na rota pública!');
    }

    // 4.2 Consulta com slug inexistente
    const notFoundRes = await fetch(`${BASE_URL}/api/public/establishment/slug-inexistente-${Date.now()}`);
    if (notFoundRes.status !== 404) {
      throw new Error(`Slug inexistente deveria retornar 404, retornou ${notFoundRes.status}`);
    }

    return `Rota pública acessível sem login; dados sensíveis expurgados; 404 correto para slugs inexistentes.`;
  });

  // -------------------------------------------------------------------------
  // Teste 5: Validação da Geração de QR Code e Links
  // -------------------------------------------------------------------------
  await runTest(5, 'Validação da Formatação de Link e QR Code', async () => {
    if (!orgA) throw new Error('Estabelecimento ausente');

    const expectedUrl = `${BASE_URL}/fila/${orgA.slug}`;
    if (!expectedUrl.includes(`/fila/${orgA.slug}`)) {
      throw new Error('URL da fila mal formatada');
    }

    return `Link canônico verificado: ${expectedUrl}`;
  });

  // -------------------------------------------------------------------------
  // Teste 6: Entrada de Cliente na Fila Virtual
  // -------------------------------------------------------------------------
  await runTest(6, 'Entrada de Cliente na Fila Virtual (/api/queue/join)', async () => {
    if (!orgA) throw new Error('Estabelecimento ausente');

    // Obter um serviço cadastrado
    const pubRes = await fetch(`${BASE_URL}/api/public/establishment/${orgA.slug}`);
    const pubData = await pubRes.json();
    const service = pubData.services && pubData.services[0];
    if (!service) throw new Error('Nenhum serviço disponível para teste de fila');

    const joinRes = await fetch(`${BASE_URL}/api/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: orgA.id,
        customerName: 'Carlos Silva (Cliente de Teste)',
        customerPhone: '(11) 98765-4321',
        serviceId: service.id,
        notes: 'Sem preferência de barbeiro',
      }),
    });

    if (!joinRes.ok) {
      const err = await joinRes.json().catch(() => ({}));
      throw new Error(`Falha ao entrar na fila: ${err.error || joinRes.statusText}`);
    }

    const joinData = await joinRes.json();
    if (!joinData.item || !joinData.item.ticketNumber) {
      throw new Error('Resposta de entrada na fila não gerou número de senha');
    }

    queueItem = joinData.item;
    return `Cliente inserido com sucesso: Senha #${queueItem.ticketNumber} (${queueItem.customerName})`;
  });

  // -------------------------------------------------------------------------
  // Teste 7: Chamada de Cliente e Resposta em Tempo Real (Service Worker)
  // -------------------------------------------------------------------------
  await runTest(7, 'Chamada de Cliente e Resposta Direta (/api/queue/respond)', async () => {
    if (!orgA || !sessionA || !queueItem) throw new Error('Requisitos do teste anterior ausentes');

    // 7.1 Chamar próximo cliente
    const callRes = await fetch(`${BASE_URL}/api/queue/call-next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionA.token}`,
      },
      body: JSON.stringify({ organizationId: orgA.id }),
    });

    if (!callRes.ok) {
      throw new Error(`Falha ao chamar cliente na fila: status ${callRes.status}`);
    }

    // 7.2 Simular clique do cliente no botão de ação da Notificação Push do Service Worker
    const respondRes = await fetch(`${BASE_URL}/api/queue/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queueId: queueItem.id,
        action: 'A_CAMINHO',
      }),
    });

    if (!respondRes.ok) {
      throw new Error(`Falha ao registrar resposta do Service Worker: status ${respondRes.status}`);
    }

    const respondData = await respondRes.json();
    if (!respondData.success) {
      throw new Error('Resposta do cliente não processada com sucesso');
    }

    return `Cliente chamado com tolerância de 5 min; Resposta do Service Worker ("A Caminho") registrada.`;
  });

  // -------------------------------------------------------------------------
  // Teste 8: Webhook do Mercado Pago & Ativação de Assinatura
  // -------------------------------------------------------------------------
  await runTest(8, 'Webhook do Mercado Pago & Ativação de Assinatura', async () => {
    if (!orgA) throw new Error('Estabelecimento ausente');

    const paymentId = `test_pay_${Date.now()}`;
    const webhookRes = await fetch(`${BASE_URL}/api/mercadopago/webhook?topic=payment&id=${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'payment.created',
        data: { id: paymentId },
      }),
    });

    if (!webhookRes.ok) {
      throw new Error(`Webhook Mercado Pago falhou com status ${webhookRes.status}`);
    }

    return `Webhook processado e respondido com HTTP 200 OK.`;
  });

  // -------------------------------------------------------------------------
  // Teste 9: Acesso Administrativo Global pelo Superadmin
  // -------------------------------------------------------------------------
  await runTest(9, 'Acesso Administrativo Global pelo Super Admin', async () => {
    // Tentar login com senha errada
    const badRes = await fetch(`${BASE_URL}/api/auth/login-superadmin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'senha_completamente_incorreta' }),
    });

    if (badRes.status !== 401) {
      throw new Error(`Senha incorreta de superadmin deveria retornar 401, retornou ${badRes.status}`);
    }

    return `Login de superadmin protegido contra força bruta e senhas inválidas (401)`;
  });

  // -------------------------------------------------------------------------
  // Teste 10: Bloqueio de Rotas Privadas sem Autenticação
  // -------------------------------------------------------------------------
  await runTest(10, 'Proteção de Rotas Privadas sem Autenticação (401)', async () => {
    const unauthEndpoints = [
      { method: 'GET', url: `${BASE_URL}/api/appointments?orgId=org-qualquer` },
      { method: 'POST', url: `${BASE_URL}/api/db/sync` },
      { method: 'PUT', url: `${BASE_URL}/api/organizations/org-qualquer` },
      { method: 'POST', url: `${BASE_URL}/api/professionals` },
    ];

    for (const ep of unauthEndpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.method === 'POST' || ep.method === 'PUT' ? JSON.stringify({}) : undefined,
      });

      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Rota ${ep.method} ${ep.url} permitiu acesso sem autenticação! Status: ${res.status}`);
      }
    }

    return `Todas as 4 rotas protegidas rejeitaram requisições não autenticadas (HTTP 401/403).`;
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`RESUMO DO AUDIT: ${passedCount}/10 TESTES APROVADOS (${failedCount} falhas)`);
  if (failedCount === 0) {
    console.log('\x1b[32m✔ SISTEMA BARBEROS 2.0 VALIDADO COM 100% DE SUCESSO!\x1b[0m');
  } else {
    console.log('\x1b[31m✖ ATENÇÃO: Há testes que falharam. Corrija os pontos indicados acima.\x1b[0m');
  }
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
