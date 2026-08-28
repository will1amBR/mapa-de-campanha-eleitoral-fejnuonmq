migrate(
  (app) => {
    try {
      const candidatesCol = app.findCollectionByNameOrId('candidates')

      const rawCandidates = [
        // Deputado Federal
        {
          candidate_name: 'MARCELO STRAMA',
          party: 'PSB',
          candidate_number: '4030',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Federal',
        },
        // Deputados Estaduais
        {
          candidate_name: 'ABDUL JAROUR',
          party: 'PSB',
          candidate_number: '40999',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ADALBERTO FREITAS',
          party: 'MDB',
          candidate_number: '15707',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ALBERTINHO MALUF',
          party: 'PP',
          candidate_number: '11011',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ALEXANDRE LEITE',
          party: 'UNIÃO',
          candidate_number: '44250',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANA CAROLINA SERRA',
          party: 'PSDB',
          candidate_number: '45045',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANA PERUGINI',
          party: 'PT',
          candidate_number: '13121',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANALICE FERNANDES',
          party: 'PSD',
          candidate_number: '55455',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANDRE COKITO',
          party: 'MDB',
          candidate_number: '15011',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANDRE FERMINO',
          party: 'PP',
          candidate_number: '11444',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANDRÉ BANDEIRA',
          party: 'PSDB',
          candidate_number: '45000',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BARROS MUNHOZ',
          party: 'PSD',
          candidate_number: '55855',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BARBA',
          party: 'PT',
          candidate_number: '13110',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BETE SIRAQUE',
          party: 'PT',
          candidate_number: '13313',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BETH SAHAO',
          party: 'PT',
          candidate_number: '13456',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BRUNA FURLAN',
          party: 'REPUBLICANOS',
          candidate_number: '10010',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BRUNO ZAMBELLI',
          party: 'PL',
          candidate_number: '22100',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CARLA MORANDO',
          party: 'PSD',
          candidate_number: '55155',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CARLOS GIANNAZI',
          party: 'PSOL',
          candidate_number: '50789',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CARUSO',
          party: 'MDB',
          candidate_number: '15000',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CELSO AMORIM',
          party: 'MOBILIZA',
          candidate_number: '33933',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CONTE LOPES',
          party: 'PL',
          candidate_number: '22138',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CLODOALDO BOLSONARO',
          party: 'PP',
          candidate_number: '11711',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CORONEL HELENA REIS',
          party: 'PSD',
          candidate_number: '55190',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DANILO BALAS',
          party: 'PL',
          candidate_number: '22007',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADA GRACIELA',
          party: 'PL',
          candidate_number: '22888',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADO MESQUITA',
          party: 'PP',
          candidate_number: '11000',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADO OLIM',
          party: 'PP',
          candidate_number: '11777',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADO SANDRO MONTANARI',
          party: 'PL',
          candidate_number: '22230',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANDRÉ GAETTA',
          party: 'PSB',
          candidate_number: '40088',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAIO FRANÇA',
          party: 'PSB',
          candidate_number: '40640',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CANTOR ALISSON SANTOS',
          party: 'PP',
          candidate_number: '11222',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAPITÃO CACCIARI AMBIENTAL',
          party: 'PL',
          candidate_number: '22181',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CLARICE GANEM',
          party: 'PODE',
          candidate_number: '20101',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CORONEL NISHIKAWA',
          party: 'DC',
          candidate_number: '27000',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DANI DIAS DA RÁDIO',
          party: 'REPUBLICANOS',
          candidate_number: '10002',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADO ROMANI',
          party: 'PL',
          candidate_number: '22600',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DENIS GRILLO',
          party: 'PSOL',
          candidate_number: '50027',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAÊ MENDRONI',
          party: 'PDT',
          candidate_number: '12100',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CARLOS AQUINO',
          party: 'PT',
          candidate_number: '13231',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CATIA TAPPI',
          party: 'PP',
          candidate_number: '11077',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CLARA SOUSA',
          party: 'PT',
          candidate_number: '13103',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAMILA GODOI',
          party: 'UNIÃO',
          candidate_number: '44123',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CARLA PRATA',
          party: 'UNIÃO',
          candidate_number: '44200',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CASSIANO PELEGRINI',
          party: 'UNIÃO',
          candidate_number: '44156',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DANIEL SOARES',
          party: 'UNIÃO',
          candidate_number: '44111',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADA LILIANE DORETTO',
          party: 'UNIÃO',
          candidate_number: '44566',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DECIO MARMIROLLI',
          party: 'UNIÃO',
          candidate_number: '44678',
          coalition: 'FEDERAÇÃO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'BOMBEIRO FLAVIO SANTOS',
          party: 'REPUBLICANOS',
          candidate_number: '10193',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ANA MONDINI',
          party: 'REPUBLICANOS',
          candidate_number: '10258',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'ALESSANDRA MATTOS',
          party: 'REPUBLICANOS',
          candidate_number: '10118',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DENNIS GUERRA',
          party: 'REPUBLICANOS',
          candidate_number: '10910',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAIO AOQUI',
          party: 'PSD',
          candidate_number: '55300',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADA RAQUEL',
          party: 'PSD',
          candidate_number: '55550',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'DELEGADO ANDRÉ PEREIRA',
          party: 'PSD',
          candidate_number: '55700',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CABO SAMUEL',
          party: 'PSD',
          candidate_number: '55033',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
        {
          candidate_name: 'CAPITÃO BELARMINO',
          party: 'PSD',
          candidate_number: '55040',
          coalition: 'PARTIDO ISOLADO',
          position: 'Deputado Estadual',
        },
      ]

      // Deduplicate by party + candidate_number to be 100% clean
      const seen = {}
      const uniqueCandidates = []
      for (let i = 0; i < rawCandidates.length; i++) {
        const item = rawCandidates[i]
        const key = item.party + '_' + item.candidate_number
        if (!seen[key]) {
          seen[key] = true
          uniqueCandidates.push(item)
        }
      }

      for (let i = 0; i < uniqueCandidates.length; i++) {
        const item = uniqueCandidates[i]
        const tseId =
          '2026-' + item.candidate_number + '-' + item.party.replace(/[^A-Za-z0-9]/g, '')

        try {
          app.findFirstRecordByData('candidates', 'tse_id', tseId)
          // Already exists, skip
        } catch (_) {
          const record = new Record(candidatesCol)
          record.set('tse_id', tseId)
          record.set('election_year', '2026')
          record.set('uf', 'SP')
          record.set('city_name', 'SÃO PAULO')
          record.set('candidate_number', item.candidate_number)
          record.set('candidate_name', item.candidate_name)
          record.set('social_name', item.candidate_name)
          record.set('position', item.position)
          record.set('party', item.party)
          record.set('coalition', item.coalition)
          record.set('status', 'Aguardando julgamento')
          record.set('is_reelection', false)
          record.set('city_code', '')
          record.set('cpf', '')
          record.set('occupation', '')
          record.set('gender', '')
          record.set('education', '')
          record.set('marital_status', '')
          record.set('age_range', '')
          record.set('campaign_id', null)

          app.save(record)
        }
      }
    } catch (err) {
      console.log('Seed 2026 candidates error:', err)
    }
  },
  (app) => {
    try {
      // Revert 2026 seeded candidates
      const records = app.findRecordsByFilter('candidates', "election_year = '2026'", '', 200, 0)
      for (let i = 0; i < records.length; i++) {
        try {
          app.delete(records[i])
        } catch (_) {}
      }
    } catch (_) {}
  },
)
