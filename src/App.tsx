
import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'

import './App.css'

type Transacao = {
  id: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa'
  categoria: string
  data?: string
}

type Aba = 'overview' | 'mensal'

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const CORES = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const moeda = (numero: number) =>
  numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const percentual = (numero: number) =>
  `${numero.toFixed(1).replace('.', ',')}%`

const hoje = () => new Date().toLocaleDateString('sv-SE')

function App() {
  // Dados persistidos no navegador
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    try {
      const salvas = localStorage.getItem('financeflow-transacoes')
      const dados: unknown = salvas ? JSON.parse(salvas) : []
      return Array.isArray(dados) ? dados as Transacao[] : []
    } catch {
      return []
    }
  })

  const [abaAtiva, setAbaAtiva] = useState<Aba>('overview')
  const [mesSelecionado, setMesSelecionado] = useState(
    hoje().slice(0, 7)
  )
  const [anoSelecionado, setAnoSelecionado] = useState(
    Number(hoje().slice(0, 4))
  )

  // Formulário
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita')
  const [categoria, setCategoria] = useState('Alimentação')
  const [data, setData] = useState(hoje())
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState<
    string | null
  >(null)

  // Meta anual independente das transações
  const [metas, setMetas] = useState<Record<string, number>>(() => {
    try {
      const salvas = localStorage.getItem('financeflow-metas')
      return salvas ? JSON.parse(salvas) : {}
    } catch {
      return {}
    }
  })

  const [valorMeta, setValorMeta] = useState('')

  useEffect(() => {
    localStorage.setItem(
      'financeflow-transacoes',
      JSON.stringify(transacoes)
    )
  }, [transacoes])

  useEffect(() => {
    localStorage.setItem(
      'financeflow-metas',
      JSON.stringify(metas)
    )
  }, [metas])


  // Seleção de anos
  const anosDisponiveis = Array.from(
    new Set([
      new Date().getFullYear(),
      anoSelecionado,
      ...transacoes
        .filter((t) => t.data && /^\d{4}-\d{2}-\d{2}$/.test(t.data))
        .map((t) => Number(t.data!.slice(0, 4))),
    ])
  ).sort((a, b) => b - a)

  // CONTROLE MENSAL
  const transacoesDoMes = transacoes.filter(
    (t) => t.data?.slice(0, 7) === mesSelecionado
  )

  const receitas = transacoesDoMes
    .filter((t) => t.tipo === 'receita')
    .reduce((total, t) => total + t.valor, 0)

  const despesas = transacoesDoMes
    .filter((t) => t.tipo === 'despesa')
    .reduce((total, t) => total + t.valor, 0)

  const saldo = receitas - despesas

  const despesasPorCategoria = transacoesDoMes
    .filter((t) => t.tipo === 'despesa')
    .reduce<Record<string, number>>((categorias, t) => {
      const nome = t.categoria || 'Sem categoria'
      categorias[nome] = (categorias[nome] || 0) + t.valor
      return categorias
    }, {})

  const dadosGrafico = Object.entries(despesasPorCategoria).map(
    ([name, value]) => ({ name, value })
  )

  // OVERVIEW ANUAL
  const transacoesDoAno = transacoes.filter(
    (t) => t.data?.slice(0, 4) === String(anoSelecionado)
  )

  const receitasAnuais = transacoesDoAno
    .filter((t) => t.tipo === 'receita')
    .reduce((total, t) => total + t.valor, 0)

  const despesasAnuais = transacoesDoAno
    .filter((t) => t.tipo === 'despesa')
    .reduce((total, t) => total + t.valor, 0)

  const resultadoAnual = receitasAnuais - despesasAnuais

  const taxaPoupanca = receitasAnuais > 0
    ? (resultadoAnual / receitasAnuais) * 100
    : 0


  const dadosAnuais = MESES.reduce<
    {
      mes: string
      receita: number
      despesa: number
      resultado: number
      acumulado: number
    }[]
  >((dados, mes, indice) => {
    const chaveMes = `${anoSelecionado}-${String(indice + 1).padStart(2, '0')}`

    const doMes = transacoesDoAno.filter(
      (t) => t.data?.slice(0, 7) === chaveMes
    )

    const receita = doMes
      .filter((t) => t.tipo === 'receita')
      .reduce((total, t) => total + t.valor, 0)

    const despesa = doMes
      .filter((t) => t.tipo === 'despesa')
      .reduce((total, t) => total + t.valor, 0)

    const resultado = receita - despesa

    const acumuladoAnterior =
      dados.length > 0 ? dados[dados.length - 1].acumulado : 0

    return [
      ...dados,
      {
        mes,
        receita,
        despesa,
        resultado,
        acumulado: acumuladoAnterior + resultado,
      },
    ]
  }, [])


  const mesesComDados = dadosAnuais.filter(
    (m) => m.receita > 0 || m.despesa > 0
  )

  const mesesPositivos = mesesComDados.filter(
    (m) => m.resultado > 0
  ).length

  const mesesNegativos = mesesComDados.filter(
    (m) => m.resultado < 0
  ).length

  const melhorMes = mesesComDados.length > 0
    ? mesesComDados.reduce((melhor, atual) =>
      atual.resultado > melhor.resultado ? atual : melhor
    )
    : null

  const metaAnual = metas[String(anoSelecionado)] || 0

  const progressoMeta = metaAnual > 0
    ? Math.max(0, Math.min((resultadoAnual / metaAnual) * 100, 100))
    : 0

  const faltaMeta = Math.max(metaAnual - resultadoAnual, 0)

  const despesasCategoriasAno = transacoesDoAno
    .filter((t) => t.tipo === 'despesa')
    .reduce<Record<string, number>>((categorias, t) => {
      const nome = t.categoria || 'Sem categoria'
      categorias[nome] = (categorias[nome] || 0) + t.valor
      return categorias
    }, {})

  const rankingCategorias = Object.entries(despesasCategoriasAno)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)

  // FORMULÁRIO
  function limparFormulario() {
    setDescricao('')
    setValor('')
    setTipo('receita')
    setCategoria('Alimentação')
    setData(hoje())
    setTransacaoEmEdicao(null)
  }

  function adicionarTransacao(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault()

    const numero = Number(valor)

    if (
      !descricao.trim() ||
      !Number.isFinite(numero) ||
      numero <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
      alert('Preencha descrição, valor e data corretamente.')
      return
    }

    if (transacaoEmEdicao !== null) {
      setTransacoes((anteriores) =>
        anteriores.map((t) =>
          t.id === transacaoEmEdicao
            ? {
              ...t,
              descricao: descricao.trim(),
              valor: numero,
              tipo,
              categoria,
              data,
            }
            : t
        )
      )
    } else {
      const novaTransacao: Transacao = {
        id: crypto.randomUUID(),
        descricao: descricao.trim(),
        valor: numero,
        tipo,
        categoria,
        data,
      }

      setTransacoes((anteriores) => [
        novaTransacao,
        ...anteriores,
      ])
    }

    limparFormulario()
  }

  function iniciarEdicao(transacao: Transacao) {
    setAbaAtiva('mensal')
    setTransacaoEmEdicao(transacao.id)
    setDescricao(transacao.descricao)
    setValor(String(transacao.valor))
    setTipo(transacao.tipo)
    setCategoria(transacao.categoria || 'Outros')
    setData(transacao.data || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function excluirTransacao(id: string) {
    if (!window.confirm('Deseja realmente excluir esta transação?')) {
      return
    }

    setTransacoes((anteriores) =>
      anteriores.filter((t) => t.id !== id)
    )
  }

  function salvarMeta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const numero = Number(valorMeta)

    if (!Number.isFinite(numero) || numero < 0) {
      alert('Informe uma meta válida.')
      return
    }

    setMetas((anteriores) => ({
      ...anteriores,
      [String(anoSelecionado)]: numero,
    }))
  }

  return (
    <main className="dashboard">
      <header>
        <h1>FinanceFlow </h1>
        <p>Seu dinheiro sob controle.</p>
      </header>

      {/* Navegação */}
      <nav className="navegacao-abas" aria-label="Navegação principal">
        <button
          type="button"
          className={abaAtiva === 'overview' ? 'aba-ativa' : ''}
          onClick={() => setAbaAtiva('overview')}
          aria-current={abaAtiva === 'overview' ? 'page' : undefined}
        >
          Overview Anual
        </button>

        <button
          type="button"
          className={abaAtiva === 'mensal' ? 'aba-ativa' : ''}
          onClick={() => setAbaAtiva('mensal')}
          aria-current={abaAtiva === 'mensal' ? 'page' : undefined}
        >
          Controle Mensal
        </button>
      </nav>

      {abaAtiva === 'overview' ? (
        <>
          {/* OVERVIEW ANUAL */}
          <section className="painel">
            <h2> Visão Geral Anual</h2>
            <p>
              Analise receitas, despesas e a evolução do seu
              resultado financeiro.
            </p>

            <label htmlFor="ano">Selecione o ano:</label>
            <select
              id="ano"
              value={anoSelecionado}

              onChange={(e) => {
                const novoAno = Number(e.target.value)
                setAnoSelecionado(novoAno)

                const meta = metas[String(novoAno)]
                setValorMeta(meta ? String(meta) : '')
              }}

            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </section>

          <section className="cards">
            <article className="card">
              <h2>Receitas anuais</h2>
              <strong className="saldo-positivo">
                {moeda(receitasAnuais)}
              </strong>
            </article>

            <article className="card">
              <h2>Despesas anuais</h2>
              <strong>{moeda(despesasAnuais)}</strong>
            </article>

            <article className="card">
              <h2>Resultado líquido</h2>
              <strong
                className={
                  resultadoAnual < 0
                    ? 'saldo-negativo'
                    : resultadoAnual > 0
                      ? 'saldo-positivo'
                      : 'saldo-zero'
                }
              >
                {moeda(resultadoAnual)}
              </strong>
            </article>

            <article className="card">
              <h2>Taxa de poupança</h2>
              <strong
                className={
                  taxaPoupanca < 0
                    ? 'saldo-negativo'
                    : 'saldo-positivo'
                }
              >
                {percentual(taxaPoupanca)}
              </strong>
            </article>
          </section>

          <section className="painel">
            <h2> Receitas x despesas por mês</h2>

            {mesesComDados.length === 0 ? (
              <p>Não há transações registradas neste ano.</p>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 360,
                  minWidth: 0,
                  minHeight: 360,
                }}
              >


                <BarChart
                  responsive
                  style={{ width: '100%', height: 320 }}
                  data={dadosAnuais}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis width={75} />
                  <Tooltip
                    formatter={(value) => moeda(Number(value))}
                  />
                  <Legend />
                  <Bar
                    dataKey="receita"
                    name="Receitas"
                    fill="#10b981"
                  />
                  <Bar
                    dataKey="despesa"
                    name="Despesas"
                    fill="#ef4444"
                  />
                </BarChart>

              </div>
            )}
          </section>

          <section className="painel">
            <h2> Evolução do resultado acumulado</h2>
            <p>
              Soma dos resultados mensais desde janeiro.
              Não representa necessariamente o saldo da conta.
            </p>

            {mesesComDados.length === 0 ? (
              <p>Cadastre transações para visualizar a evolução.</p>
            ) : (

              <div style={{ width: '100%', minWidth: 0 }}>
                <LineChart
                  responsive
                  style={{ width: '100%', height: 320 }}
                  data={dadosAnuais}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis width={75} />
                  <Tooltip formatter={(value) => moeda(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="acumulado"
                    name="Resultado acumulado"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot
                  />
                </LineChart>
              </div>

            )}
          </section>

          <section className="painel">
            <h2> Meta de economia anual</h2>
            <p>
              Defina quanto deseja economizar ao longo de {anoSelecionado}.
            </p>

            <form onSubmit={salvarMeta}>
              <label htmlFor="meta">Meta em R$</label>
              <input
                id="meta"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex.: 12000"
                value={valorMeta}
                onChange={(e) => setValorMeta(e.target.value)}
              />
              <button type="submit">Salvar meta</button>
            </form>

            {metaAnual > 0 && (
              <div style={{ marginTop: 20 }}>
                <p>
                  <strong>
                    {percentual(progressoMeta)} da meta atingida
                  </strong>
                </p>

                <progress
                  value={progressoMeta}
                  max={100}
                  style={{ width: '100%', height: 18 }}
                />

                <p>
                  Resultado líquido: {moeda(resultadoAnual)}
                </p>

                <p>
                  {resultadoAnual >= metaAnual
                    ? '🎉 Sua meta foi atingida!'
                    : `Faltam ${moeda(faltaMeta)} para a meta.`}
                </p>
              </div>
            )}

            <small>
              A meta é comparada ao resultado líquido registrado.
              Ela não confirma depósitos em poupança ou investimentos.
            </small>
          </section>

          <section className="painel">

            <h2>Indicadores de desempenho</h2>

            <div className="indicadores-grid">
              <div className="indicador-item">
                <span className="indicador-label">Meses positivos</span>
                <strong className="indicador-valor positivo">
                  {mesesPositivos}
                </strong>
                <small>Meses com resultado positivo</small>
              </div>

              <div className="indicador-item">
                <span className="indicador-label">Meses negativos</span>
                <strong className="indicador-valor negativo">
                  {mesesNegativos}
                </strong>
                <small>Meses com resultado negativo</small>
              </div>

              <div className="indicador-item">
                <span className="indicador-label">Melhor mês registrado</span>
                <strong className="indicador-valor">
                  {melhorMes ? melhorMes.mes : '—'}
                </strong>
                <small>
                  {melhorMes ? moeda(melhorMes.resultado) : 'Sem dados'}
                </small>
              </div>

              <div className="indicador-item">
                <span className="indicador-label">Média de receitas</span>
                <strong className="indicador-valor">
                  {moeda(
                    mesesComDados.length > 0
                      ? receitasAnuais / mesesComDados.length
                      : 0
                  )}
                </strong>
                <small>Por mês com movimentação</small>
              </div>

              <div className="indicador-item">
                <span className="indicador-label">Média de despesas</span>
                <strong className="indicador-valor">
                  {moeda(
                    mesesComDados.length > 0
                      ? despesasAnuais / mesesComDados.length
                      : 0
                  )}
                </strong>
                <small>Por mês com movimentação</small>
              </div>
            </div>
          </section>


          <section className="painel">
            <h2> Maiores despesas do ano</h2>

            {rankingCategorias.length === 0 ? (
              <p>Nenhuma despesa registrada neste ano.</p>
            ) : (
              <ul>
                {rankingCategorias.map((item) => (
                  <li key={item.nome}>
                    <strong>{item.nome}:</strong>{' '}
                    {moeda(item.total)} —{' '}
                    {percentual(
                      despesasAnuais > 0
                        ? (item.total / despesasAnuais) * 100
                        : 0
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="painel">
            <h2> Análise financeira</h2>

            {mesesComDados.length === 0 ? (
              <p>
                Comece cadastrando receitas e despesas na aba
                Controle Mensal para receber uma análise.
              </p>
            ) : (
              <>
                <p>
                  {resultadoAnual > 0
                    ? 'Seu resultado financeiro acumulado no ano é positivo.'
                    : resultadoAnual < 0
                      ? 'Atenção: suas despesas registradas superaram as receitas.'
                      : 'Suas receitas e despesas estão equilibradas no período.'}
                </p>

                {rankingCategorias.length > 0 && (
                  <p>
                    Sua maior categoria de despesa é{' '}
                    <strong>{rankingCategorias[0].nome}</strong>,
                    com {moeda(rankingCategorias[0].total)}.
                    Vale avaliar se há oportunidades de redução.
                  </p>
                )}

                <p>
                  Você teve {mesesPositivos} mês(es) positivos
                  e {mesesNegativos} mês(es) negativos
                  entre os meses com movimentação.
                </p>
              </>
            )}
          </section>
        </>
      ) : (
        <>
          {/* CONTROLE MENSAL */}
          <div className="filtro-mes">
            <label htmlFor="mes">Selecione o mês:</label>
            <input
              id="mes"
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
            />
          </div>

          <section className="cards">
            <article className="card">
              <h2>Saldo do mês</h2>
              <strong
                className={
                  saldo < 0
                    ? 'saldo-negativo'
                    : saldo > 0
                      ? 'saldo-positivo'
                      : 'saldo-zero'
                }
              >
                {moeda(saldo)}
              </strong>
            </article>

            <article className="card">
              <h2>Receitas</h2>
              <strong>{moeda(receitas)}</strong>
            </article>

            <article className="card">
              <h2>Despesas</h2>
              <strong>{moeda(despesas)}</strong>
            </article>
          </section>

          <section className="painel">
            <h2>Despesas por categoria</h2>

            {dadosGrafico.length === 0 ? (
              <p>Cadastre uma despesa para visualizar o gráfico.</p>
            ) : (

              <div style={{ width: '100%', minWidth: 0 }}>
                <PieChart
                  responsive
                  style={{ width: '100%', height: 340 }}
                >
                  <Pie
                    data={dadosGrafico}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                  >
                    {dadosGrafico.map((entrada, index) => (
                      <Cell
                        key={entrada.name}
                        fill={CORES[index % CORES.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => moeda(Number(value))}
                  />

                  <Legend verticalAlign="bottom" />
                </PieChart>
              </div>

            )}
          </section>

          <section className="painel">
            <h2>
              {transacaoEmEdicao !== null
                ? 'Editar transação'
                : 'Nova transação'}
            </h2>

            <form onSubmit={adicionarTransacao}>
              <input
                type="text"
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />

              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />

              <input
                type="number"
                placeholder="Valor em R$"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />

              <select
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as 'receita' | 'despesa')
                }
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>

              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Lazer">Lazer</option>
                <option value="Saúde">Saúde</option>
                <option value="Educação">Educação</option>
                <option value="Salário">Salário</option>
                <option value="Outros">Outros</option>
              </select>

              <button type="submit">
                {transacaoEmEdicao !== null
                  ? 'Salvar alterações'
                  : 'Adicionar transação'}
              </button>

              {transacaoEmEdicao !== null && (
                <button
                  type="button"
                  className="botao-cancelar"
                  onClick={limparFormulario}
                >
                  Cancelar edição
                </button>
              )}
            </form>
          </section>

          <section className="painel">
            <h2>Histórico de transações</h2>

            {transacoes.some((t) => !t.data) && (
              <button
                type="button"
                onClick={() => {
                  const antiga = transacoes.find((t) => !t.data)
                  if (antiga) iniciarEdicao(antiga)
                }}
              >
                Corrigir primeira transação sem data
              </button>
            )}

            {transacoesDoMes.length === 0 ? (
              <p>Nenhuma transação cadastrada neste mês.</p>
            ) : (
              <ul className="transacoes">
                {transacoesDoMes.map((transacao) => (
                  <li key={transacao.id}>
                    <span>
                      {transacao.descricao}
                      <small className="categoria">
                        {transacao.categoria || 'Sem categoria'}
                        {' • '}
                        {transacao.data
                          ? transacao.data.split('-').reverse().join('/')
                          : 'Sem data'}
                      </small>
                    </span>

                    <div className="acoes-transacao">
                      <strong className={transacao.tipo}>
                        {transacao.tipo === 'receita' ? '+' : '-'}
                        {moeda(transacao.valor)}
                      </strong>

                      <button
                        type="button"
                        className="botao-editar"
                        onClick={() => iniciarEdicao(transacao)}
                        aria-label={`Editar transação ${transacao.descricao}`}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="botao-excluir"
                        onClick={() => excluirTransacao(transacao.id)}
                        aria-label={`Excluir transação ${transacao.descricao}`}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )
      }
    </main >
  )
}

export default App
