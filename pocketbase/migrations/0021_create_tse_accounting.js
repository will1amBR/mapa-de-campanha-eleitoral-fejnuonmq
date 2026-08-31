migrate(
  (app) => {
    let campCol
    try {
      campCol = app.findCollectionByNameOrId('campaigns')
    } catch (_) {
      return
    }

    // 1. tse_transactions collection (receitas / doações e despesas / gastos)
    let tseTransCol
    try {
      tseTransCol = app.findCollectionByNameOrId('tse_transactions')
    } catch (_) {
      tseTransCol = new Collection({
        name: 'tse_transactions',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'campaign_id',
            type: 'relation',
            required: true,
            collectionId: campCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['receita', 'despesa'],
            maxSelect: 1,
          },
          {
            name: 'category',
            type: 'select',
            required: true,
            values: [
              'doacao_pf',
              'recurso_proprio',
              'fundo_partidario',
              'fundo_especial',
              'outras_receitas',
              'material_grafico',
              'impulsionamento_ads',
              'transporte_combustivel',
              'alimentacao',
              'servicos_advocaticios',
              'servicos_contabeis',
              'producao_audiovisual',
              'locacao_imovel',
              'comicio_eventos',
              'diversas_despesas',
            ],
            maxSelect: 1,
          },
          {
            name: 'description',
            type: 'text',
            required: true,
          },
          {
            name: 'amount',
            type: 'number',
            required: true,
          },
          {
            name: 'transaction_date',
            type: 'date',
            required: true,
          },
          {
            name: 'document_number',
            type: 'text',
          },
          {
            name: 'document_type',
            type: 'select',
            values: [
              'nota_fiscal',
              'recibo_eleitoral',
              'contrato',
              'boleto',
              'comprovante_pix',
              'outro',
            ],
            maxSelect: 1,
          },
          {
            name: 'party_name', // fornecedor ou doador
            type: 'text',
            required: true,
          },
          {
            name: 'party_document', // CPF ou CNPJ
            type: 'text',
          },
          {
            name: 'proof_status', // status da comprovação documental
            type: 'select',
            values: ['comprovado', 'pendente_doc', 'em_analise', 'divergente'],
            maxSelect: 1,
          },
          {
            name: 'receipt_file',
            type: 'file',
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          },
          {
            name: 'notes',
            type: 'text',
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_tse_trans_camp ON tse_transactions (campaign_id)',
          'CREATE INDEX idx_tse_trans_type ON tse_transactions (type)',
          'CREATE INDEX idx_tse_trans_status ON tse_transactions (proof_status)',
          'CREATE INDEX idx_tse_trans_date ON tse_transactions (transaction_date)',
        ],
      })
      app.save(tseTransCol)
    }

    // 2. tse_deliveries collection (Checklist de obrigações e prazos do TRE)
    let tseDeliveriesCol
    try {
      tseDeliveriesCol = app.findCollectionByNameOrId('tse_deliveries')
    } catch (_) {
      tseDeliveriesCol = new Collection({
        name: 'tse_deliveries',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'campaign_id',
            type: 'relation',
            required: true,
            collectionId: campCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'legal_deadline',
            type: 'date',
            required: true,
          },
          {
            name: 'delivery_type',
            type: 'select',
            values: [
              'parcial',
              'relatorio_72h',
              'prestacao_final',
              'abertura_conta',
              'extrato_bancario',
              'outro',
            ],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['pendente', 'em_andamento', 'concluido', 'em_atraso'],
            maxSelect: 1,
          },
          {
            name: 'delivered_at',
            type: 'date',
          },
          {
            name: 'protocol_number',
            type: 'text',
          },
          {
            name: 'mandatory',
            type: 'bool',
          },
          {
            name: 'notes',
            type: 'text',
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_tse_deliv_camp ON tse_deliveries (campaign_id)',
          'CREATE INDEX idx_tse_deliv_status ON tse_deliveries (status)',
          'CREATE INDEX idx_tse_deliv_deadline ON tse_deliveries (legal_deadline)',
        ],
      })
      app.save(tseDeliveriesCol)
    }

    // 3. SEED INITIAL REALISTIC DATA
    try {
      const defaultCampaigns = app.findRecordsByFilter('campaigns', '', '-created', 1, 0)
      if (defaultCampaigns && defaultCampaigns.length > 0) {
        const campId = defaultCampaigns[0].id

        // Seed Transactions (Receitas & Despesas)
        const sampleTransactions = [
          {
            campaign_id: campId,
            type: 'receita',
            category: 'doacao_pf',
            description: 'Doação eleitoral via PIX - Apoiador Dr. Arnaldo Silveira',
            amount: 25000,
            transaction_date: '2026-08-16 10:30:00.000Z',
            document_number: 'REC-2026-0001',
            document_type: 'recibo_eleitoral',
            party_name: 'Dr. Arnaldo Silveira',
            party_document: '123.456.789-00',
            proof_status: 'comprovado',
            notes: 'Recibo eleitoral emitido e assinado digitalmente.',
          },
          {
            campaign_id: campId,
            type: 'receita',
            category: 'recurso_proprio',
            description: 'Aporte de recurso próprio do candidato',
            amount: 40000,
            transaction_date: '2026-08-18 14:00:00.000Z',
            document_number: 'REC-2026-0002',
            document_type: 'recibo_eleitoral',
            party_name: 'Candidato Oficial',
            party_document: '987.654.321-11',
            proof_status: 'comprovado',
            notes: 'Transferência bancária da conta pessoal para a conta eleitoral.',
          },
          {
            campaign_id: campId,
            type: 'receita',
            category: 'fundo_partidario',
            description: 'Repasse Direção Municipal do Partido',
            amount: 85000,
            transaction_date: '2026-08-25 16:45:00.000Z',
            document_number: 'REP-PART-0826',
            document_type: 'recibo_eleitoral',
            party_name: 'Diretório Municipal',
            party_document: '00.123.456/0001-99',
            proof_status: 'comprovado',
            notes: 'Repasse Fundo Especial / Diretório Municipal regularizado no SPCE.',
          },
          {
            campaign_id: campId,
            type: 'despesa',
            category: 'impulsionamento_ads',
            description: 'Impulsionamento Meta Ads (Instagram/Facebook)',
            amount: 18500,
            transaction_date: '2026-08-22 09:15:00.000Z',
            document_number: 'NF-e 849201',
            document_type: 'nota_fiscal',
            party_name: 'Facebook Serviços do Brasil Ltda',
            party_document: '13.347.016/0001-17',
            proof_status: 'comprovado',
            notes: 'Nota fiscal com CNPJ da campanha emitido pela Meta.',
          },
          {
            campaign_id: campId,
            type: 'despesa',
            category: 'material_grafico',
            description: 'Impressão de santinhos, praguinhas e adesivos de rua',
            amount: 22400,
            transaction_date: '2026-08-28 11:20:00.000Z',
            document_number: 'NF-e 10294',
            document_type: 'nota_fiscal',
            party_name: 'Gráfica Express Eleitoral SP',
            party_document: '22.888.999/0001-01',
            proof_status: 'comprovado',
            notes: 'Material entregue no comitê central com comprovante de tiragem e CNPJ.',
          },
          {
            campaign_id: campId,
            type: 'despesa',
            category: 'servicos_contabeis',
            description: 'Assessoria contábil especializada e SPCE',
            amount: 12000,
            transaction_date: '2026-08-30 15:00:00.000Z',
            document_number: 'NF-e 5541',
            document_type: 'nota_fiscal',
            party_name: 'Auditoria & Contabilidade Eleitoral Ltda',
            party_document: '33.111.222/0001-44',
            proof_status: 'comprovado',
            notes: 'Honorários de acompanhamento contábil e prestação de contas parcial.',
          },
          {
            campaign_id: campId,
            type: 'despesa',
            category: 'transporte_combustivel',
            description: 'Abastecimento da frota de carreatas e vans',
            amount: 6850,
            transaction_date: '2026-09-02 18:30:00.000Z',
            document_number: 'NF-e 77312',
            document_type: 'nota_fiscal',
            party_name: 'Posto Estrela Central Ltda',
            party_document: '44.555.666/0001-77',
            proof_status: 'pendente_doc',
            notes:
              'Aguardando envio do canhoto de controle de placas pela coordenação de logística.',
          },
          {
            campaign_id: campId,
            type: 'despesa',
            category: 'producao_audiovisual',
            description: 'Gravação e edição de programas eleitorais de TV/Internet',
            amount: 35000,
            transaction_date: '2026-09-05 17:00:00.000Z',
            document_number: 'NF-e 3901',
            document_type: 'nota_fiscal',
            party_name: 'Produtora Criativa Cinema & Vídeo Ltda',
            party_document: '55.666.777/0001-88',
            proof_status: 'comprovado',
            notes: 'Contrato registrado e nota fiscal atestada pela coordenação de comunicação.',
          },
        ]

        sampleTransactions.forEach((tx) => {
          try {
            app.findFirstRecordByData('tse_transactions', 'document_number', tx.document_number)
          } catch (_) {
            const r = new Record(tseTransCol)
            Object.keys(tx).forEach((k) => {
              if (tx[k] !== undefined && tx[k] !== null) r.set(k, tx[k])
            })
            app.save(r)
          }
        })

        // Seed TRE Deliveries / Obligations Checklist
        const sampleDeliveries = [
          {
            campaign_id: campId,
            title: 'Abertura das Contas Bancárias Eleitorais (Doações, Outros Recursos, FEFC)',
            description:
              'Abertura obrigatória das 3 contas bancárias oficiais no Banco do Brasil/CEF e obtenção dos extratos iniciais.',
            legal_deadline: '2026-08-15 23:59:00.000Z',
            delivery_type: 'abertura_conta',
            status: 'concluido',
            delivered_at: '2026-08-12 14:00:00.000Z',
            protocol_number: 'TRE-SP-2026-004812',
            mandatory: true,
            notes: 'Contas validadas e cadastradas no sistema SPCE.',
          },
          {
            campaign_id: campId,
            title: 'Envio de Relatórios Financeiros de 72 Horas (Doações Recebidas)',
            description:
              'Obrigação legal de comunicar ao TSE no prazo de 72 horas todas as doações financeiras recebidas.',
            legal_deadline: '2026-08-28 23:59:00.000Z',
            delivery_type: 'relatorio_72h',
            status: 'concluido',
            delivered_at: '2026-08-27 18:30:00.000Z',
            protocol_number: 'TRE-SP-2026-019234',
            mandatory: true,
            notes: 'Doações de PF e Fundo Partidário enviadas sem atrasos.',
          },
          {
            campaign_id: campId,
            title: 'Prestação de Contas Parcial Obrigatória (SPCE)',
            description:
              'Envio do demonstrativo detalhado de todas as receitas e despesas efetuadas desde o início até 08/09.',
            legal_deadline: '2026-09-13 23:59:00.000Z',
            delivery_type: 'parcial',
            status: 'em_andamento',
            delivered_at: null,
            protocol_number: '',
            mandatory: true,
            notes: 'Contabilidade compilando notas fiscais e conciliação bancária.',
          },
          {
            campaign_id: campId,
            title: 'Conciliação dos Extratos Bancários Eletrônicos Definitivos',
            description:
              'Juntada dos arquivos eletrônicos de extratos bancários de todas as contas sem descontinuidade.',
            legal_deadline: '2026-10-15 23:59:00.000Z',
            delivery_type: 'extrato_bancario',
            status: 'pendente',
            delivered_at: null,
            protocol_number: '',
            mandatory: true,
            notes: 'Aguardando fechamento do ciclo eleitoral do 1º turno.',
          },
          {
            campaign_id: campId,
            title: 'Prestação de Contas Final com Sobras de Campanha',
            description:
              'Entrega final da prestação de contas de 1º turno ao TRE, com parecer contábil e jurídico.',
            legal_deadline: '2026-11-05 23:59:00.000Z',
            delivery_type: 'prestacao_final',
            status: 'pendente',
            delivered_at: null,
            protocol_number: '',
            mandatory: true,
            notes: 'Prazo final improrrogável perante o Tribunal Regional Eleitoral.',
          },
        ]

        sampleDeliveries.forEach((deliv) => {
          try {
            app.findFirstRecordByData('tse_deliveries', 'title', deliv.title)
          } catch (_) {
            const r = new Record(tseDeliveriesCol)
            Object.keys(deliv).forEach((k) => {
              if (deliv[k] !== undefined && deliv[k] !== null) r.set(k, deliv[k])
            })
            app.save(r)
          }
        })
      }
    } catch (err) {
      console.log('Error seeding TSE accounting records:', err)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('tse_deliveries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('tse_transactions'))
    } catch (_) {}
  },
)
