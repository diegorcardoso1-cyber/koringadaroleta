/* =========================================================
   🃏 KORINGA DA ROLETA
   Motor de análise dos últimos 7 giros
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const LIMITE_OBSERVACAO = 50;
const LIMITE_POSSIVEL = 54;
const LIMITE_ENTRADA = 58;


/* =========================================================
   NÚMEROS DA ROLETA EUROPEIA
   ========================================================= */

const vermelhos = [
    1, 3, 5, 7, 9,
    12, 14, 16, 18,
    19, 21, 23, 25, 27,
    30, 32, 34, 36
];

const pretos = [
    2, 4, 6, 8, 10, 11,
    13, 15, 17,
    20, 22, 24, 26, 28,
    29, 31, 33, 35
];


/* =========================================================
   SETORES DA ROLETA
   ========================================================= */

const voisins = [
    22, 18, 29, 7, 28,
    12, 35, 3, 26, 0,
    32, 15, 19, 4,
    21, 2, 25
];

const tiers = [
    27, 13, 36, 11,
    30, 8, 23, 10,
    5, 24, 16, 33
];

const orphelins = [
    1, 20, 14, 31,
    9, 17, 34, 6
];


/* =========================================================
   ELEMENTOS DA TELA
   ========================================================= */

const inputs = document.querySelectorAll(".giro-input");

const btnAnalisar = document.getElementById("btnAnalisar");
const btnLimpar = document.getElementById("btnLimpar");

const proximoNumero = document.getElementById("proximoNumero");
const btnRegistrarGiro = document.getElementById("btnRegistrarGiro");
const resultadoProximoGiro = document.getElementById(
    "resultadoProximoGiro"
);


/* =========================================================
   ESTADO DO KORINGA
   ========================================================= */

let ultimosGiros = [];

let analiseAtual = null;

let totalGreens = 0;
let totalReds = 0;
let totalSinais = 0;

let historico = [];

// Placar de desempenho por estratégia.
// GREEN = ciclo encerrado com acerto.
// RED = somente RED FINAL (3/3).
// Giros de pausa e RED intermediário não entram no placar.
let desempenhoEstrategias = {
    setores: { green: 0, red: 0 },
    cores: { green: 0, red: 0 },
    parImpar: { green: 0, red: 0 },
    altosBaixos: { green: 0, red: 0 }
};


/* =========================================================
   CICLOS ADAPTATIVOS — ATÉ 3 GIROS

   REGRAS:

   1) Cada estratégia trabalha independente:
      - SETORES
      - CORES
      - PAR / ÍMPAR
      - ALTOS / BAIXOS

   2) Quando atingir ENTRADA:
      o alvo fica travado.

   3) O ciclo pode durar até 3 giros:
      tentativa 1/3
      tentativa 2/3
      tentativa 3/3

   4) Se der GREEN:
      encerra imediatamente.

   5) Se errar 3 vezes:
      RED FINAL.

   6) Depois de GREEN ou RED FINAL:
      espera exatamente 1 giro.

   7) O giro de espera:
      - NÃO valida sinal
      - entra normalmente nos últimos 7 giros
      - ajuda a mesa a se adaptar

   8) Depois da pausa:
      recalcula com os 7 giros mais recentes
      e pode liberar um NOVO sinal.
   ========================================================= */

function criarCicloVazio() {

    return {

        ativo: false,

        tentativa: 0,

        alvo: null,

        scoreEntrada: 0,

        espera: 0
    };
}


let ciclosKoringa = {

    setores:
        criarCicloVazio(),

    cores:
        criarCicloVazio(),

    parImpar:
        criarCicloVazio(),

    altosBaixos:
        criarCicloVazio()
};


const MAPA_CICLOS = {

    Setores:
        "setores",

    Cores:
        "cores",

    ParImpar:
        "parImpar",

    AltosBaixos:
        "altosBaixos"
};


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function limitar(
    valor,
    minimo = 0,
    maximo = 100
) {

    return Math.max(
        minimo,
        Math.min(
            maximo,
            valor
        )
    );
}


function arredondar(valor) {

    return Math.round(
        valor
    );
}


function porcentagem(
    parte,
    total
) {

    if (
        total === 0
    ) {

        return 0;
    }

    return (
        parte /
        total
    ) * 100;
}


/* =========================================================
   CLASSIFICAÇÃO DO STATUS
   ========================================================= */

function obterStatus(score) {

    /*
       ENTRADA
       58% ou mais
    */

    if (
        score >=
        LIMITE_ENTRADA
    ) {

        return {

            texto:
                "🚨 ENTRADA",

            classe:
                "entrada"
        };
    }


    /*
       POSSÍVEL ENTRADA
       54% a 57%
    */

    if (
        score >=
        LIMITE_POSSIVEL
    ) {

        return {

            texto:
                "⚠ POSSÍVEL ENTRADA",

            classe:
                "possivel"
        };
    }


    /*
       OBSERVAÇÃO
       50% a 53%
    */

    if (
        score >=
        LIMITE_OBSERVACAO
    ) {

        return {

            texto:
                "👀 OBSERVAÇÃO",

            classe:
                "observacao"
        };
    }


    /*
       ABAIXO DE 50%
    */

    return {

        texto:
            "⏳ AGUARDAR",

        classe:
            "aguardar"
    };
}


/* =========================================================
   DESCOBRIR COR
   ========================================================= */

function obterCor(numero) {

    if (
        numero === 0
    ) {

        return "ZERO";
    }


    if (
        vermelhos.includes(
            numero
        )
    ) {

        return "VERMELHO";
    }


    return "PRETO";
}


/* =========================================================
   PAR / ÍMPAR
   ========================================================= */

function obterParidade(
    numero
) {

    if (
        numero === 0
    ) {

        return "ZERO";
    }


    return (
        numero % 2 === 0
    )
        ? "PAR"
        : "ÍMPAR";
}


/* =========================================================
   ALTOS / BAIXOS
   ========================================================= */

function obterFaixa(
    numero
) {

    if (
        numero === 0
    ) {

        return "ZERO";
    }


    return (
        numero <= 18
    )
        ? "BAIXO"
        : "ALTO";
}


/* =========================================================
   SETOR
   ========================================================= */

function obterSetor(
    numero
) {

    if (
        voisins.includes(
            numero
        )
    ) {

        return "VOISINS";
    }


    if (
        tiers.includes(
            numero
        )
    ) {

        return "TIERS";
    }


    if (
        orphelins.includes(
            numero
        )
    ) {

        return "ORPHELINS";
    }


    return "DESCONHECIDO";
}


/* =========================================================
   LEITURA DE PADRÃO
   Repetição / alternância
   ========================================================= */

function analisarPadrao(
    lista
) {

    const filtrada =
        lista.filter(
            item =>
                item !== "ZERO"
        );


    if (
        filtrada.length < 2
    ) {

        return {

            repeticoes: 0,

            alternancias: 0,

            sequenciaFinal: 1
        };
    }


    let repeticoes = 0;

    let alternancias = 0;


    for (
        let i = 1;
        i < filtrada.length;
        i++
    ) {

        if (
            filtrada[i] ===
            filtrada[i - 1]
        ) {

            repeticoes++;

        } else {

            alternancias++;
        }
    }


    /*
       Descobre quantas vezes
       o último padrão se repetiu
       consecutivamente.
    */

    let sequenciaFinal = 1;


    for (
        let i =
            filtrada.length - 1;

        i > 0;

        i--
    ) {

        if (
            filtrada[i] ===
            filtrada[i - 1]
        ) {

            sequenciaFinal++;

        } else {

            break;
        }
    }


    return {

        repeticoes,

        alternancias,

        sequenciaFinal
    };
}


/* =========================================================
   SCORE DA LEITURA
   ========================================================= */

function calcularScore(
    dominancia,
    padrao
) {

    let score =
        dominancia;


    /*
       Pequenos bônus utilizados
       somente para representar
       a força observada
       na sequência recente.
    */


    /*
       2 iguais seguidos
    */

    if (
        padrao.sequenciaFinal === 2
    ) {

        score += 2;
    }


    /*
       3 iguais seguidos
    */

    if (
        padrao.sequenciaFinal === 3
    ) {

        score += 4;
    }


    /*
       4 ou mais iguais
    */

    if (
        padrao.sequenciaFinal >= 4
    ) {

        score += 5;
    }


    /*
       Forte alternância
    */

    if (
        padrao.alternancias >= 5
    ) {

        score += 3;
    }


    /*
       Nunca permite
       abaixo de 0
       ou acima de 100
    */

    return limitar(
        score
    );
}


/* =========================================================
   ANALISAR SETORES
   ========================================================= */

function analisarSetores(
    giros
) {

    let qtdVoisins = 0;

    let qtdTiers = 0;

    let qtdOrphelins = 0;


    giros.forEach(
        numero => {

            const setor =
                obterSetor(
                    numero
                );


            if (
                setor ===
                "VOISINS"
            ) {

                qtdVoisins++;
            }


            if (
                setor ===
                "TIERS"
            ) {

                qtdTiers++;
            }


            if (
                setor ===
                "ORPHELINS"
            ) {

                qtdOrphelins++;
            }
        }
    );


    const pctVoisins =
        porcentagem(
            qtdVoisins,
            giros.length
        );


    const pctTiers =
        porcentagem(
            qtdTiers,
            giros.length
        );


    const pctOrphelins =
        porcentagem(
            qtdOrphelins,
            giros.length
        );


    const setores = [

        {
            nome:
                "VOISINS",

            percentual:
                pctVoisins
        },

        {
            nome:
                "TIERS",

            percentual:
                pctTiers
        },

        {
            nome:
                "ORPHELINS",

            percentual:
                pctOrphelins
        }
    ];


    /*
       Ordena do maior percentual
       para o menor.
    */

    setores.sort(
        (a, b) =>
            b.percentual -
            a.percentual
    );


    const dominante =
        setores[0];


    const score =
        limitar(
            dominante.percentual
        );


    return {

        nome:
            "SETORES",

        dominante:
            dominante.nome,

        percentual:
            score,

        pctVoisins,

        pctTiers,

        pctOrphelins
    };
}


/* =========================================================
   FIM DA PARTE 1
   NÃO EXECUTE AINDA.
   A PARTE 2 CONTINUA LOGO ABAIXO.
   ==================================================
   /* =========================================================
   🃏 KORINGA DA ROLETA
   APP.JS — PARTE 2
   ========================================================= */


/* =========================================================
   ANALISAR CORES
   ========================================================= */

function analisarCores(giros) {

    const lista =
        giros.map(
            numero =>
                obterCor(numero)
        );

    const validos =
        lista.filter(
            item =>
                item !== "ZERO"
        );

    const vermelhosQtd =
        validos.filter(
            item =>
                item === "VERMELHO"
        ).length;

    const pretosQtd =
        validos.filter(
            item =>
                item === "PRETO"
        ).length;


    const dominante =
        vermelhosQtd >= pretosQtd
            ? "VERMELHO"
            : "PRETO";


    const maior =
        Math.max(
            vermelhosQtd,
            pretosQtd
        );


    const dominancia =
        porcentagem(
            maior,
            validos.length
        );


    const padrao =
        analisarPadrao(
            lista
        );


    const score =
        calcularScore(
            dominancia,
            padrao
        );


    let tendencia =
        "SEM PADRÃO";


    if (
        padrao.sequenciaFinal >= 3
    ) {

        tendencia =
            "REPETIÇÃO FORTE";

    } else if (
        padrao.alternancias >
        padrao.repeticoes
    ) {

        tendencia =
            "ALTERNÂNCIA";

    } else if (
        padrao.repeticoes >
        padrao.alternancias
    ) {

        tendencia =
            "REPETIÇÃO";
    }


    return {

        nome:
            "CORES",

        dominante,

        percentual:
            score,

        tendencia,

        texto:
            `${vermelhosQtd} vermelho(s) • ${pretosQtd} preto(s)`
    };
}


/* =========================================================
   ANALISAR PAR / ÍMPAR
   ========================================================= */

function analisarParImpar(giros) {

    const lista =
        giros.map(
            numero =>
                obterParidade(numero)
        );


    const validos =
        lista.filter(
            item =>
                item !== "ZERO"
        );


    const pares =
        validos.filter(
            item =>
                item === "PAR"
        ).length;


    const impares =
        validos.filter(
            item =>
                item === "ÍMPAR"
        ).length;


    const dominante =
        pares >= impares
            ? "PAR"
            : "ÍMPAR";


    const maior =
        Math.max(
            pares,
            impares
        );


    const dominancia =
        porcentagem(
            maior,
            validos.length
        );


    const padrao =
        analisarPadrao(
            lista
        );


    const score =
        calcularScore(
            dominancia,
            padrao
        );


    let tendencia =
        "SEM PADRÃO";


    if (
        padrao.sequenciaFinal >= 3
    ) {

        tendencia =
            "REPETIÇÃO FORTE";

    } else if (
        padrao.alternancias >
        padrao.repeticoes
    ) {

        tendencia =
            "ALTERNÂNCIA";

    } else if (
        padrao.repeticoes >
        padrao.alternancias
    ) {

        tendencia =
            "REPETIÇÃO";
    }


    return {

        nome:
            "PAR / ÍMPAR",

        dominante,

        percentual:
            score,

        tendencia,

        texto:
            `${pares} par(es) • ${impares} ímpar(es)`
    };
}


/* =========================================================
   ANALISAR ALTOS / BAIXOS
   ========================================================= */

function analisarAltosBaixos(giros) {

    const lista =
        giros.map(
            numero =>
                obterFaixa(numero)
        );


    const validos =
        lista.filter(
            item =>
                item !== "ZERO"
        );


    const baixos =
        validos.filter(
            item =>
                item === "BAIXO"
        ).length;


    const altos =
        validos.filter(
            item =>
                item === "ALTO"
        ).length;


    const dominante =
        baixos >= altos
            ? "BAIXO"
            : "ALTO";


    const maior =
        Math.max(
            baixos,
            altos
        );


    const dominancia =
        porcentagem(
            maior,
            validos.length
        );


    const padrao =
        analisarPadrao(
            lista
        );


    const score =
        calcularScore(
            dominancia,
            padrao
        );


    let tendencia =
        "SEM PADRÃO";


    if (
        padrao.sequenciaFinal >= 3
    ) {

        tendencia =
            "REPETIÇÃO FORTE";

    } else if (
        padrao.alternancias >
        padrao.repeticoes
    ) {

        tendencia =
            "ALTERNÂNCIA";

    } else if (
        padrao.repeticoes >
        padrao.alternancias
    ) {

        tendencia =
            "REPETIÇÃO";
    }


    return {

        nome:
            "ALTOS / BAIXOS",

        dominante,

        percentual:
            score,

        tendencia,

        texto:
            `${baixos} baixo(s) • ${altos} alto(s)`
    };
}


/* =========================================================
   ATUALIZAR STATUS
   ========================================================= */

function aplicarStatus(
    elemento,
    score
) {

    if (!elemento) {
        return;
    }


    const status =
        obterStatus(score);


    elemento.textContent =
        status.texto;


    elemento.className =
        `mini-status ${status.classe}`;
}


/* =========================================================
   ATUALIZAR PAINEL DETALHADO — SETORES
   ========================================================= */

function atualizarSetores(resultado) {

    const voisinsPct =
        document.getElementById(
            "voisinsPct"
        );

    const tiersPct =
        document.getElementById(
            "tiersPct"
        );

    const orphelinsPct =
        document.getElementById(
            "orphelinsPct"
        );


    const voisinsBar =
        document.getElementById(
            "voisinsBar"
        );

    const tiersBar =
        document.getElementById(
            "tiersBar"
        );

    const orphelinsBar =
        document.getElementById(
            "orphelinsBar"
        );


    const setorDominante =
        document.getElementById(
            "setorDominante"
        );


    const statusSetores =
        document.getElementById(
            "statusSetores"
        );


    if (voisinsPct) {

        voisinsPct.textContent =
            `${arredondar(
                resultado.pctVoisins
            )}%`;
    }


    if (tiersPct) {

        tiersPct.textContent =
            `${arredondar(
                resultado.pctTiers
            )}%`;
    }


    if (orphelinsPct) {

        orphelinsPct.textContent =
            `${arredondar(
                resultado.pctOrphelins
            )}%`;
    }


    if (voisinsBar) {

        voisinsBar.style.width =
            `${limitar(
                resultado.pctVoisins
            )}%`;
    }


    if (tiersBar) {

        tiersBar.style.width =
            `${limitar(
                resultado.pctTiers
            )}%`;
    }


    if (orphelinsBar) {

        orphelinsBar.style.width =
            `${limitar(
                resultado.pctOrphelins
            )}%`;
    }


    if (setorDominante) {

        setorDominante.textContent =
            resultado.dominante;
    }


    aplicarStatus(
        statusSetores,
        resultado.percentual
    );
}


/* =========================================================
   ATUALIZAR PAINEL DETALHADO — CORES
   ========================================================= */

function atualizarCores(resultado) {

    const dominante =
        document.getElementById(
            "corDominante"
        );

    const percentual =
        document.getElementById(
            "corPct"
        );

    const tendencia =
        document.getElementById(
            "corTendencia"
        );

    const texto =
        document.getElementById(
            "corTexto"
        );

    const status =
        document.getElementById(
            "statusCores"
        );


    if (dominante) {

        dominante.textContent =
            resultado.dominante;
    }


    if (percentual) {

        percentual.textContent =
            `${arredondar(
                resultado.percentual
            )}%`;
    }


    if (tendencia) {

        tendencia.textContent =
            resultado.tendencia;
    }


    if (texto) {

        texto.textContent =
            resultado.texto;
    }


    aplicarStatus(
        status,
        resultado.percentual
    );
}


/* =========================================================
   ATUALIZAR PAINEL DETALHADO — PAR / ÍMPAR
   ========================================================= */

function atualizarParImpar(resultado) {

    const dominante =
        document.getElementById(
            "parImparDominante"
        );

    const percentual =
        document.getElementById(
            "parImparPct"
        );

    const tendencia =
        document.getElementById(
            "parImparTendencia"
        );

    const texto =
        document.getElementById(
            "parImparTexto"
        );

    const status =
        document.getElementById(
            "statusParImpar"
        );


    if (dominante) {

        dominante.textContent =
            resultado.dominante;
    }


    if (percentual) {

        percentual.textContent =
            `${arredondar(
                resultado.percentual
            )}%`;
    }


    if (tendencia) {

        tendencia.textContent =
            resultado.tendencia;
    }


    if (texto) {

        texto.textContent =
            resultado.texto;
    }


    aplicarStatus(
        status,
        resultado.percentual
    );
}


/* =========================================================
   ATUALIZAR PAINEL DETALHADO — ALTOS / BAIXOS
   ========================================================= */

function atualizarAltosBaixos(resultado) {

    const dominante =
        document.getElementById(
            "altoBaixoDominante"
        );

    const percentual =
        document.getElementById(
            "altoBaixoPct"
        );

    const tendencia =
        document.getElementById(
            "altoBaixoTendencia"
        );

    const texto =
        document.getElementById(
            "altoBaixoTexto"
        );

    const status =
        document.getElementById(
            "statusAltosBaixos"
        );


    if (dominante) {

        dominante.textContent =
            resultado.dominante;
    }


    if (percentual) {

        percentual.textContent =
            `${arredondar(
                resultado.percentual
            )}%`;
    }


    if (tendencia) {

        tendencia.textContent =
            resultado.tendencia;
    }


    if (texto) {

        texto.textContent =
            resultado.texto;
    }


    aplicarStatus(
        status,
        resultado.percentual
    );
}


/* =========================================================
   PAINEL LATERAL — ENTRADAS DO KORINGA

   IMPORTANTE:

   Se existe ciclo ativo:
   NÃO altera o alvo.

   Exemplo:

   CORES → VERMELHO
   tentativa 1/3

   Mesmo que a análise mude para PRETO,
   continua VERMELHO até:

   GREEN

   ou

   RED FINAL 3/3.
   ========================================================= */

function atualizarSinalBox(
    prefixo,
    resultado,
    detalhe = ""
) {

    const statusElemento =
        document.getElementById(
            `sinalStatus${prefixo}`
        );


    const entradaElemento =
        document.getElementById(
            `sinalEntrada${prefixo}`
        );


    const scoreElemento =
        document.getElementById(
            `sinalScore${prefixo}`
        );


    const chave =
        MAPA_CICLOS[prefixo];


    const ciclo =
        chave
            ? ciclosKoringa[chave]
            : null;


    /*
       CICLO ATIVO
    */

    if (
        ciclo &&
        ciclo.ativo
    ) {

        if (statusElemento) {

            statusElemento.textContent =
                `🎯 ${ciclo.tentativa}/3`;


            statusElemento.className =
                "sinal-status entrada";
        }


        if (entradaElemento) {

            entradaElemento.textContent =
                `MANTER → ${ciclo.alvo}`;
        }


        if (scoreElemento) {

            scoreElemento.textContent =
                `${arredondar(
                    ciclo.scoreEntrada
                )}%`;
        }

    }


    /*
       GIRO DE PAUSA
    */

    else if (
        ciclo &&
        ciclo.espera > 0
    ) {

        if (statusElemento) {

            statusElemento.textContent =
                "⏸️ PAUSA";


            statusElemento.className =
                "sinal-status aguardar";
        }


        if (entradaElemento) {

            entradaElemento.textContent =
                "AGUARDAR 1 GIRO";
        }


        if (scoreElemento) {

            scoreElemento.textContent =
                `${arredondar(
                    resultado.percentual
                )}%`;
        }

    }


    /*
       SEM CICLO ATIVO
    */

    else {

        const status =
            obterStatus(
                resultado.percentual
            );


        if (statusElemento) {

            statusElemento.textContent =
                status.texto;


            statusElemento.className =
                `sinal-status ${status.classe}`;
        }


        if (entradaElemento) {


            /*
               ENTRADA
            */

            if (
                resultado.percentual >=
                LIMITE_ENTRADA
            ) {

                entradaElemento.textContent =
                    `ENTRAR → ${resultado.dominante}`;
            }


            /*
               POSSÍVEL
            */

            else if (
                resultado.percentual >=
                LIMITE_POSSIVEL
            ) {

                entradaElemento.textContent =
                    `POSSÍVEL → ${resultado.dominante}`;
            }


            /*
               AGUARDAR
            */

            else {

                entradaElemento.textContent =
                    `AGUARDAR → ${resultado.dominante}`;
            }
        }


        if (scoreElemento) {

            scoreElemento.textContent =
                `${arredondar(
                    resultado.percentual
                )}%`;
        }
    }


    /*
       DETALHE DOS SETORES
    */

    if (
        detalhe &&
        prefixo === "Setores"
    ) {

        const numeros =
            document.getElementById(
                "sinalNumerosSetores"
            );


        if (numeros) {

            numeros.textContent =
                detalhe;
        }
    }
}


/* =========================================================
   ATUALIZAR TODOS OS SINAIS
   ========================================================= */

function atualizarSinais(
    setores,
    cores,
    parImpar,
    altosBaixos
) {

    atualizarSinalBox(
        "Setores",
        setores,
        `Voisins ${arredondar(
            setores.pctVoisins
        )}% • Tiers ${arredondar(
            setores.pctTiers
        )}% • Orphelins ${arredondar(
            setores.pctOrphelins
        )}%`
    );


    atualizarSinalBox(
        "Cores",
        cores
    );


    atualizarSinalBox(
        "ParImpar",
        parImpar
    );


    atualizarSinalBox(
        "AltosBaixos",
        altosBaixos
    );
}


/* =========================================================
   LEITURA PRINCIPAL DO KORINGA
   ========================================================= */

function atualizarLeituraPrincipal(
    setores,
    cores,
    parImpar,
    altosBaixos
) {

    const estrategias = [

        {
            nome:
                `SETORES — ${setores.dominante}`,

            percentual:
                setores.percentual
        },

        {
            nome:
                `CORES — ${cores.dominante}`,

            percentual:
                cores.percentual
        },

        {
            nome:
                `PAR/ÍMPAR — ${parImpar.dominante}`,

            percentual:
                parImpar.percentual
        },

        {
            nome:
                `ALTOS/BAIXOS — ${altosBaixos.dominante}`,

            percentual:
                altosBaixos.percentual
        }
    ];


    estrategias.sort(
        (a, b) =>
            b.percentual -
            a.percentual
    );


    const melhor =
        estrategias[0];


    const melhorEstrategia =
        document.getElementById(
            "melhorEstrategia"
        );


    const scorePrincipal =
        document.getElementById(
            "scorePrincipal"
        );


    const barraPrincipal =
        document.getElementById(
            "barraPrincipal"
        );


    const statusPrincipal =
        document.getElementById(
            "statusPrincipal"
        );


    const mensagemPrincipal =
        document.getElementById(
            "mensagemPrincipal"
        );


    const status =
        obterStatus(
            melhor.percentual
        );


    if (melhorEstrategia) {

        melhorEstrategia.textContent =
            melhor.nome;
    }


    if (scorePrincipal) {

        scorePrincipal.textContent =
            `${arredondar(
                melhor.percentual
            )}%`;
    }


    if (barraPrincipal) {

        barraPrincipal.style.width =
            `${limitar(
                melhor.percentual
            )}%`;
    }


    if (statusPrincipal) {

        statusPrincipal.textContent =
            status.texto;


        statusPrincipal.className =
            `status ${status.classe}`;
    }


    if (mensagemPrincipal) {

        if (
            melhor.percentual >=
            LIMITE_ENTRADA
        ) {

            mensagemPrincipal.textContent =
                "🃏 O Koringa identificou força suficiente para abrir um ciclo. O alvo será mantido por até 3 giros.";

        } else if (
            melhor.percentual >=
            LIMITE_POSSIVEL
        ) {

            mensagemPrincipal.textContent =
                "A mesa está ganhando força. Continue acompanhando antes da entrada.";

        } else {

            mensagemPrincipal.textContent =
                "A mesa continua em leitura. Aguarde maior confirmação dos últimos giros.";
        }
    }
}


/* =========================================================
   EXECUTAR TODA A LEITURA
   ========================================================= */

function executarLeitura(
    giros
) {

    const setores =
        analisarSetores(
            giros
        );


    const cores =
        analisarCores(
            giros
        );


    const parImpar =
        analisarParImpar(
            giros
        );


    const altosBaixos =
        analisarAltosBaixos(
            giros
        );


    atualizarSetores(
        setores
    );


    atualizarCores(
        cores
    );


    atualizarParImpar(
        parImpar
    );


    atualizarAltosBaixos(
        altosBaixos
    );


    atualizarLeituraPrincipal(
        setores,
        cores,
        parImpar,
        altosBaixos
    );


    analiseAtual = {

        setores,

        cores,

        parImpar,

        altosBaixos
    };


    /*
       Verifica se alguma leitura
       pode iniciar um ciclo.
    */

    sincronizarCiclosComAnalise();


    /*
       Atualiza novamente o painel lateral
       depois de abrir os ciclos.
    */

    atualizarSinais(
        setores,
        cores,
        parImpar,
        altosBaixos
    );


    return analiseAtual;
}


/* =========================================================
   ANALISAR OS 7 GIROS DIGITADOS
   ========================================================= */

function analisarMesa() {

    const numeros =
        Array.from(
            inputs
        ).map(
            input =>
                input.value.trim()
        );


    /*
       PRECISA DOS 7
    */

    if (
        numeros.some(
            valor =>
                valor === ""
        )
    ) {

        alert(
            "🃏 Informe os 7 últimos giros."
        );

        return;
    }


    const giros =
        numeros.map(
            Number
        );


    /*
       VALIDAÇÃO 0–36
    */

    const invalido =
        giros.some(
            numero =>
                !Number.isInteger(numero) ||
                numero < 0 ||
                numero > 36
        );


    if (invalido) {

        alert(
            "Todos os giros precisam ser números inteiros entre 0 e 36."
        );

        return;
    }


    /*
       GUARDA OS 7 GIROS
    */

    ultimosGiros =
        [...giros];


    /*
       EXECUTA A LEITURA
    */

    executarLeitura(
        ultimosGiros
    );


    if (
        resultadoProximoGiro
    ) {

        resultadoProximoGiro.innerHTML = `
            <span>
                🃏 Mesa analisada.
                Registre o próximo giro para acompanhar os ciclos.
            </span>
        `;
    }


    /*
       COLOCA CURSOR NO PRÓXIMO GIRO
    */

    if (
        proximoNumero
    ) {

        proximoNumero.focus();
    }
}


/* =========================================================
   FIM DA PARTE 2

   A PARTE 3 VAI TER A PARTE MAIS IMPORTANTE:

   🎯 MOTOR 1/3 → 2/3 → 3/3
   🟢 GREEN
   🔴 RED FINAL
   ⏸️ 1 GIRO DE PAUSA
   🧠 ADAPTAÇÃO AUTOMÁTICA DOS ÚLTIMOS 7
   📊 HISTÓRICO
   🔄 LIMPAR / RESETAR
   ========================================================= */
   /* =========================================================
   🃏 KORINGA DA ROLETA
   APP.JS — PARTE 3/3
   MOTOR DOS CICLOS
   ========================================================= */


/* =========================================================
   VALOR REAL DO RESULTADO

   Descobre em qual grupo caiu o número:
   - SETOR
   - COR
   - PARIDADE
   - FAIXA
   ========================================================= */

function valorRealDoTipo(
    chave,
    numero
) {

    if (
        chave === "setores"
    ) {

        return obterSetor(
            numero
        );
    }


    if (
        chave === "cores"
    ) {

        return obterCor(
            numero
        );
    }


    if (
        chave === "parImpar"
    ) {

        return obterParidade(
            numero
        );
    }


    if (
        chave === "altosBaixos"
    ) {

        return obterFaixa(
            numero
        );
    }


    return "";
}


/* =========================================================
   NOME VISUAL DA ESTRATÉGIA
   ========================================================= */

function nomeDoTipo(
    chave
) {

    const nomes = {

        setores:
            "SETORES",

        cores:
            "CORES",

        parImpar:
            "PAR / ÍMPAR",

        altosBaixos:
            "ALTOS / BAIXOS"
    };


    return (
        nomes[chave] ||
        chave
    );
}


/* =========================================================
   INICIAR CICLO

   O ciclo somente inicia quando:

   - não existe ciclo ativo
   - não está no giro de pausa
   - percentual atingiu LIMITE_ENTRADA
   - existe um alvo válido

   IMPORTANTE:

   Depois que o ciclo abre,
   o alvo fica TRAVADO.

   Exemplo:

   CORES → VERMELHO

   Mesmo que durante a tentativa 2
   a leitura passe a indicar PRETO,
   o ciclo continua VERMELHO
   até GREEN ou RED FINAL.
   ========================================================= */

function iniciarCicloSeLiberado(
    chave,
    resultado
) {

    const ciclo =
        ciclosKoringa[chave];


    if (
        !ciclo
    ) {

        return false;
    }


    /*
       Já existe ciclo.
    */

    if (
        ciclo.ativo
    ) {

        return false;
    }


    /*
       Está cumprindo giro de pausa.
    */

    if (
        ciclo.espera > 0
    ) {

        return false;
    }


    /*
       Ainda não atingiu entrada.
    */

    if (
        !resultado ||
        resultado.percentual <
        LIMITE_ENTRADA
    ) {

        return false;
    }


    /*
       Alvo inválido.
    */

    if (
        !resultado.dominante ||
        resultado.dominante === "--"
    ) {

        return false;
    }


    /*
       ABRE O CICLO
    */

    ciclo.ativo =
        true;


    ciclo.tentativa =
        1;


    ciclo.alvo =
        resultado.dominante;


    /*
       Guarda a força que existia
       no momento da entrada.

       Ela ficará visível durante
       todo o ciclo.
    */

    ciclo.scoreEntrada =
        resultado.percentual;


    return true;
}


/* =========================================================
   SINCRONIZAR CICLOS COM A MESA

   Cada estratégia é independente.

   Uma pode estar:

   🟢 em ciclo

   enquanto outra pode estar:

   ⏳ aguardando

   e outra:

   ⏸️ em pausa.
   ========================================================= */

function sincronizarCiclosComAnalise() {

    if (
        !analiseAtual
    ) {

        return;
    }


    iniciarCicloSeLiberado(
        "setores",
        analiseAtual.setores
    );


    iniciarCicloSeLiberado(
        "cores",
        analiseAtual.cores
    );


    iniciarCicloSeLiberado(
        "parImpar",
        analiseAtual.parImpar
    );


    iniciarCicloSeLiberado(
        "altosBaixos",
        analiseAtual.altosBaixos
    );
}


/* =========================================================
   AVALIAR CICLO NO NOVO GIRO

   Aqui acontece:

   1/3
   2/3
   3/3

   GREEN

   RED FINAL

   PAUSA
   ========================================================= */

function avaliarCicloNoGiro(
    chave,
    numero
) {

    const ciclo =
        ciclosKoringa[chave];


    const nome =
        nomeDoTipo(
            chave
        );


    /*
       =========================================
       GIRO DE PAUSA
       =========================================

       O número entra normalmente nos últimos 7,
       porém NÃO valida sinal.

       Depois desse giro:
       espera volta para 0.

       A nova análise poderá então
       liberar outro sinal.
    */

    if (
        ciclo.espera > 0
    ) {

        ciclo.espera--;


        return {

            participou:
                false,

            encerrou:
                false,

            green:
                false,

            redFinal:
                false,

            pausa:
                true,

            mensagem:
                `⏸️ ${nome} — GIRO DE PAUSA concluído com o número ${numero}. Mesa será recalculada antes de uma nova entrada.`
        };
    }


    /*
       NÃO EXISTE CICLO ATIVO
    */

    if (
        !ciclo.ativo
    ) {

        return {

            participou:
                false,

            encerrou:
                false,

            green:
                false,

            redFinal:
                false,

            pausa:
                false,

            mensagem:
                null
        };
    }


    /*
       Descobre onde o número caiu.
    */

    const valorReal =
        valorRealDoTipo(
            chave,
            numero
        );


    const tentativaAtual =
        ciclo.tentativa;


    const alvoAtual =
        ciclo.alvo;


    /*
       =========================================
       VERIFICAR GREEN / PROTEÇÃO ZERO
       =========================================
    */

    const greenProtecaoZero =
        numero === 0;

    const acertou =
        greenProtecaoZero ||
        valorReal ===
        alvoAtual;


    if (
        acertou
    ) {

        /*
           Guarda informações antes
           de limpar o ciclo.
        */

        const tentativaGreen =
            tentativaAtual;


        const alvoGreen =
            alvoAtual;


        /*
           Encerra ciclo
           e ativa 1 giro de pausa.
        */

        ciclosKoringa[chave] = {

            ...criarCicloVazio(),

            espera: 1
        };


        /*
           Estatísticas.

           Um ciclo encerrado
           contabiliza 1 sinal.
        */

        if (desempenhoEstrategias[chave]) {
            desempenhoEstrategias[chave].green++;
        }

        totalGreens++;

        totalSinais++;


        return {

            participou:
                true,

            encerrou:
                true,

            green:
                true,

            redFinal:
                false,

            pausa:
                false,

            mensagem:
                greenProtecaoZero
                    ? `🟢 GREEN — PROTEÇÃO ZERO — ${nome} → ${alvoGreen} NA ${tentativaGreen}ª TENTATIVA. CICLO ENCERRADO. ⏸️ Próximo giro será apenas de pausa.`
                    : `🟢 GREEN — ${nome} → ${alvoGreen} NA ${tentativaGreen}ª TENTATIVA. CICLO ENCERRADO. ⏸️ Próximo giro será apenas de pausa.`
        };
    }


    /*
       =========================================
       ERRO NA 3ª TENTATIVA
       RED FINAL
       =========================================
    */

    if (
        tentativaAtual >= 3
    ) {

        const alvoRed =
            alvoAtual;


        /*
           Limpa ciclo
           e coloca pausa.
        */

        ciclosKoringa[chave] = {

            ...criarCicloVazio(),

            espera: 1
        };


        if (desempenhoEstrategias[chave]) {
            desempenhoEstrategias[chave].red++;
        }

        totalReds++;

        totalSinais++;


        return {

            participou:
                true,

            encerrou:
                true,

            green:
                false,

            redFinal:
                true,

            pausa:
                false,

            mensagem:
                `🔴 RED FINAL — ${nome} → ${alvoRed}. 3/3 concluído. ⏸️ Próximo giro será apenas de pausa.`
        };
    }


    /*
       =========================================
       RED INTERMEDIÁRIO

       Ainda existe nova tentativa.
       =========================================
    */

    ciclo.tentativa++;


    return {

        participou:
            true,

        encerrou:
            false,

        green:
            false,

        redFinal:
            false,

        pausa:
            false,

        mensagem:
            `🔴 RED ${tentativaAtual}/3 — ${nome} → ${alvoAtual}. ➡️ MANTER O MESMO SINAL NA TENTATIVA ${ciclo.tentativa}/3.`
    };
}


/* =========================================================
   REGISTRAR PRÓXIMO GIRO
   ========================================================= */

function registrarProximoGiro() {

    /*
       Precisa existir uma análise inicial.
    */

    if (
        !analiseAtual
    ) {

        alert(
            "🃏 Primeiro informe os 7 giros e clique em ANALISAR MESA."
        );

        return;
    }


    if (
        !proximoNumero
    ) {

        return;
    }


    const texto =
        proximoNumero.value.trim();


    /*
       Campo vazio.
    */

    if (
        texto === ""
    ) {

        alert(
            "Informe o número do próximo giro."
        );


        proximoNumero.focus();


        return;
    }


    const numero =
        Number(
            texto
        );


    /*
       Validação.
    */

    if (
        !Number.isInteger(numero) ||
        numero < 0 ||
        numero > 36
    ) {

        alert(
            "O próximo giro precisa estar entre 0 e 36."
        );


        proximoNumero.focus();


        return;
    }


    /*
       =========================================
       GARANTE QUE OS SINAIS VISÍVEIS
       ESTEJAM REGISTRADOS COMO CICLO
       =========================================
    */

    sincronizarCiclosComAnalise();


    /*
       =========================================
       AVALIA AS 4 LEITURAS
       INDEPENDENTEMENTE
       =========================================
    */

    const resultadosCiclo = [

        avaliarCicloNoGiro(
            "setores",
            numero
        ),

        avaliarCicloNoGiro(
            "cores",
            numero
        ),

        avaliarCicloNoGiro(
            "parImpar",
            numero
        ),

        avaliarCicloNoGiro(
            "altosBaixos",
            numero
        )
    ];


    /*
       Reúne mensagens.
    */

    const mensagens =

        resultadosCiclo

            .map(
                item =>
                    item.mensagem
            )

            .filter(
                Boolean
            );


    /*
       Nenhum sinal e nenhuma pausa.
    */

    if (
        mensagens.length === 0
    ) {

        mensagens.push(
            "⏳ Nenhum ciclo ativo neste giro. Resultado incorporado à leitura adaptativa."
        );
    }


    /* =====================================================
       HISTÓRICO DO GIRO
       ===================================================== */

    historico.unshift({

        numero,

        hora:
            new Date()
                .toLocaleTimeString(
                    "pt-BR",
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit"
                    }
                ),

        mensagens:
            [...mensagens]
    });


    /*
       Limita o histórico visual.
    */

    if (
        historico.length > 20
    ) {

        historico.pop();
    }


    /* =====================================================
       🧠 ADAPTAÇÃO DA MESA

       O novo número entra.

       Exemplo:

       Antes:
       5 10 20 31 8 12 15

       Sai 5.

       Entra 22.

       Nova base:
       10 20 31 8 12 15 22

       Todas as análises são
       refeitas usando essa nova base.
       ===================================================== */

    ultimosGiros.push(
        numero
    );


    /*
       Mantém somente os 7
       resultados mais recentes.
    */

    if (
        ultimosGiros.length > 7
    ) {

        ultimosGiros.shift();
    }


    /*
       Atualiza automaticamente
       os 7 campos da tela.
    */

    inputs.forEach(
        (
            input,
            index
        ) => {

            input.value =
                ultimosGiros[index] ??
                "";
        }
    );


    /* =====================================================
       RECALCULA A MESA
       ===================================================== */

    recalcularAposGiro();


    /*
       =========================================
       IMPORTANTE

       Só depois que o novo giro foi incorporado
       aos últimos 7 é que verificamos se
       alguma estratégia pode abrir NOVO CICLO.

       Estratégias ainda em progressão
       continuam com o alvo antigo.

       Estratégias em pausa NÃO abrem sinal.

       Estratégias livres podem se adaptar
       à nova mesa.
       =========================================
    */

    sincronizarCiclosComAnalise();


    /*
       Atualiza o painel lateral
       mostrando:

       MANTER
       PAUSA
       ENTRAR
       POSSÍVEL
       AGUARDAR
    */

    atualizarSinais(
        analiseAtual.setores,
        analiseAtual.cores,
        analiseAtual.parImpar,
        analiseAtual.altosBaixos
    );


    /*
       Atualiza histórico
       e estatísticas.
    */

    atualizarHistorico();

    atualizarEstatisticas();

    atualizarPlacarEstrategiasV3();


    /*
       Mostra o resultado
       no painel PRÓXIMO GIRO.
    */

    if (
        resultadoProximoGiro
    ) {

        resultadoProximoGiro.innerHTML = `

            <div class="resultado-numero">

                GIRO:
                <strong>
                    ${numero}
                </strong>

            </div>

            <div class="resultado-sinais">

                ${mensagens.join(
                    "<br>"
                )}

            </div>
        `;
    }


    /*
       Limpa próximo giro.
    */

    proximoNumero.value =
        "";


    proximoNumero.focus();
}


/* =========================================================
   RECALCULAR APÓS CADA GIRO
   ========================================================= */

function recalcularAposGiro() {

    /*
       Segurança:
       a análise precisa ter exatamente 7 giros.
    */

    if (
        ultimosGiros.length !== 7
    ) {

        return;
    }


    /*
       Recalcula SETORES
    */

    const setores =
        analisarSetores(
            ultimosGiros
        );


    /*
       Recalcula CORES
    */

    const cores =
        analisarCores(
            ultimosGiros
        );


    /*
       Recalcula PAR / ÍMPAR
    */

    const parImpar =
        analisarParImpar(
            ultimosGiros
        );


    /*
       Recalcula ALTOS / BAIXOS
    */

    const altosBaixos =
        analisarAltosBaixos(
            ultimosGiros
        );


    /*
       Atualiza os quadros detalhados.
    */

    atualizarSetores(
        setores
    );


    atualizarCores(
        cores
    );


    atualizarParImpar(
        parImpar
    );


    atualizarAltosBaixos(
        altosBaixos
    );


    /*
       Atualiza leitura principal.
    */

    atualizarLeituraPrincipal(
        setores,
        cores,
        parImpar,
        altosBaixos
    );


    /*
       Guarda a NOVA leitura da mesa.
    */

    analiseAtual = {

        setores,

        cores,

        parImpar,

        altosBaixos
    };


    /*
       Atualiza painel lateral.

       Se houver ciclo ativo,
       atualizarSinalBox vai manter
       o alvo original do ciclo.
    */

    atualizarSinais(
        setores,
        cores,
        parImpar,
        altosBaixos
    );
}


/* =========================================================
   ATUALIZAR ESTATÍSTICAS
   ========================================================= */

function atualizarEstatisticas() {

    const greens =
        document.getElementById(
            "totalGreens"
        );


    const reds =
        document.getElementById(
            "totalReds"
        );


    const sinais =
        document.getElementById(
            "totalSinais"
        );


    const taxa =
        document.getElementById(
            "taxaAcerto"
        );


    if (
        greens
    ) {

        greens.textContent =
            totalGreens;
    }


    if (
        reds
    ) {

        reds.textContent =
            totalReds;
    }


    if (
        sinais
    ) {

        sinais.textContent =
            totalSinais;
    }


    /*
       Taxa considerando
       somente ciclos encerrados.
    */

    if (
        taxa
    ) {

        const total =
            totalGreens +
            totalReds;


        const percentual =

            total === 0

                ? 0

                : (
                    totalGreens /
                    total
                ) * 100;


        taxa.textContent =
            `${arredondar(
                percentual
            )}%`;
    }
}


/* =========================================================
   ATUALIZAR HISTÓRICO
   ========================================================= */

function atualizarHistorico() {

    const lista = document.getElementById("historicoLista");

    if (!lista) return;

    if (historico.length === 0) {
        lista.className = "historico-vazio";
        lista.innerHTML = "Nenhum giro registrado ainda.";
        return;
    }

    lista.className = "historico-tabela-wrap";

    const classificarMensagem = (msg) => {
        const t = String(msg || "").toUpperCase();

        if (t.includes("GREEN")) return "green";
        if (t.includes("RED FINAL")) return "red";
        if (t.includes("RED ")) return "red-parcial";
        if (t.includes("PAUSA")) return "pausa";
        return "neutro";
    };

    const limparMensagem = (msg) =>
        String(msg || "")
            .replace(/^🟢\s*/u, "")
            .replace(/^🔴\s*/u, "")
            .replace(/^⏸️\s*/u, "")
            .replace(/^➡️\s*/u, "");

    const obterTentativa = (mensagens) => {
        const texto = mensagens.join(" ").toUpperCase();

        let m = texto.match(/NA\s+([123])ª\s+TENTATIVA/);
        if (m) return `${m[1]}/3`;

        m = texto.match(/RED\s+([123])\/3/);
        if (m) return `${m[1]}/3`;

        m = texto.match(/TENTATIVA\s+([123])\/3/);
        if (m) return `${m[1]}/3`;

        if (texto.includes("PAUSA")) return "PAUSA";
        return "—";
    };

    const obterResultado = (mensagens) => {
        const texto = mensagens.join(" ").toUpperCase();

        if (texto.includes("GREEN")) {
            return { classe: "green", texto: "GREEN", icone: "●" };
        }

        if (texto.includes("RED FINAL")) {
            return { classe: "red", texto: "RED FINAL", icone: "●" };
        }

        if (texto.includes("RED ")) {
            return { classe: "red-parcial", texto: "EM CICLO", icone: "●" };
        }

        if (texto.includes("PAUSA")) {
            return { classe: "pausa", texto: "PAUSA", icone: "Ⅱ" };
        }

        return { classe: "neutro", texto: "REGISTRO", icone: "•" };
    };

    const obterStatus = (mensagens) => {
        const texto = mensagens.join(" ").toUpperCase();

        if (texto.includes("GREEN") || texto.includes("RED FINAL")) {
            return { classe: "encerrado", texto: "CICLO ENCERRADO" };
        }

        if (texto.includes("PAUSA")) {
            return { classe: "pausa", texto: "AGUARDANDO" };
        }

        if (texto.includes("RED ")) {
            return { classe: "andamento", texto: "EM ANDAMENTO" };
        }

        return { classe: "neutro", texto: "REGISTRADO" };
    };

    const linhas = historico.map((item, index) => {
        const mensagens = Array.isArray(item.mensagens) ? item.mensagens : [];
        const resultado = obterResultado(mensagens);
        const status = obterStatus(mensagens);
        const tentativa = obterTentativa(mensagens);

        const detalhes = mensagens.map(msg => {
            const classe = classificarMensagem(msg);
            return `
                <div class="hist-detalhe ${classe}">
                    <span class="hist-dot"></span>
                    <span>${limparMensagem(msg)}</span>
                </div>
            `;
        }).join("");

        return `
            <div class="hist-row">
                <div class="hist-col hist-numero">
                    <span class="hist-indice">${historico.length - index}</span>
                    <strong>${item.numero}</strong>
                </div>

                <div class="hist-col">
                    <span class="hist-resultado ${resultado.classe}">
                        <b>${resultado.icone}</b> ${resultado.texto}
                    </span>
                </div>

                <div class="hist-col hist-estrategia">
                    ${detalhes || '<span class="hist-sem-dado">Sem sinal ativo</span>'}
                </div>

                <div class="hist-col">
                    <span class="hist-tentativa">${tentativa}</span>
                </div>

                <div class="hist-col">
                    <span class="hist-status ${status.classe}">${status.texto}</span>
                </div>

                <div class="hist-col hist-hora">◷ ${item.hora}</div>
            </div>
        `;
    }).join("");

    lista.innerHTML = `
        <div class="historico-tabela">
            <div class="hist-head">
                <div>NÚMERO</div>
                <div>RESULTADO</div>
                <div>ESTRATÉGIA / LEITURA</div>
                <div>TENTATIVA</div>
                <div>STATUS</div>
                <div>HORA</div>
            </div>
            ${linhas}
        </div>
        <div class="hist-legenda">
            <span><i class="leg green"></i> GREEN = acerto</span>
            <span><i class="leg red"></i> RED FINAL = ciclo perdido</span>
            <span><i class="leg pausa"></i> PAUSA = aguardando próximo giro</span>
        </div>
    `;
}


/* =========================================================
   RESETAR PAINEL LATERAL
   ========================================================= */

function resetarSinais() {

    const configuracoes = [

        {
            prefixo:
                "Setores",

            detalhe:
                "Voisins • Tiers • Orphelins"
        },

        {
            prefixo:
                "Cores"
        },

        {
            prefixo:
                "ParImpar"
        },

        {
            prefixo:
                "AltosBaixos"
        }
    ];


    configuracoes.forEach(
        item => {

            const status =
                document.getElementById(
                    `sinalStatus${item.prefixo}`
                );


            const entrada =
                document.getElementById(
                    `sinalEntrada${item.prefixo}`
                );


            const score =
                document.getElementById(
                    `sinalScore${item.prefixo}`
                );


            if (
                status
            ) {

                status.textContent =
                    "⏳ AGUARDAR";


                status.className =
                    "sinal-status aguardar";
            }


            if (
                entrada
            ) {

                entrada.textContent =
                    "Nenhuma entrada";
            }


            if (
                score
            ) {

                score.textContent =
                    "0%";
            }
        }
    );


    /*
       Texto especial dos setores.
    */

    const numerosSetores =
        document.getElementById(
            "sinalNumerosSetores"
        );


    if (
        numerosSetores
    ) {

        numerosSetores.textContent =
            "Voisins • Tiers • Orphelins";
    }
}


/* =========================================================
   LIMPAR TUDO
   ========================================================= */

function limparTudo() {

    /*
       Limpa os 7 campos.
    */

    inputs.forEach(
        input => {

            input.value =
                "";
        }
    );


    /*
       Limpa estado.
    */

    ultimosGiros =
        [];


    analiseAtual =
        null;


    totalGreens =
        0;


    totalReds =
        0;


    totalSinais =
        0;


    historico =
        [];

    desempenhoEstrategias = {
        setores: { green: 0, red: 0 },
        cores: { green: 0, red: 0 },
        parImpar: { green: 0, red: 0 },
        altosBaixos: { green: 0, red: 0 }
    };


    /*
       Reseta TODOS os ciclos.
    */

    ciclosKoringa = {

        setores:
            criarCicloVazio(),

        cores:
            criarCicloVazio(),

        parImpar:
            criarCicloVazio(),

        altosBaixos:
            criarCicloVazio()
    };


    /*
       Próximo giro.
    */

    if (
        proximoNumero
    ) {

        proximoNumero.value =
            "";
    }


    /*
       LEITURA PRINCIPAL
    */

    const melhorEstrategia =
        document.getElementById(
            "melhorEstrategia"
        );


    if (
        melhorEstrategia
    ) {

        melhorEstrategia.textContent =
            "Aguardando os 7 giros...";
    }


    const scorePrincipal =
        document.getElementById(
            "scorePrincipal"
        );


    if (
        scorePrincipal
    ) {

        scorePrincipal.textContent =
            "0%";
    }


    const barraPrincipal =
        document.getElementById(
            "barraPrincipal"
        );


    if (
        barraPrincipal
    ) {

        barraPrincipal.style.width =
            "0%";
    }


    const statusPrincipal =
        document.getElementById(
            "statusPrincipal"
        );


    if (
        statusPrincipal
    ) {

        statusPrincipal.textContent =
            "⏳ AGUARDAR";


        statusPrincipal.className =
            "status aguardar";
    }


    const mensagemPrincipal =
        document.getElementById(
            "mensagemPrincipal"
        );


    if (
        mensagemPrincipal
    ) {

        mensagemPrincipal.textContent =
            "Informe os 7 últimos resultados para iniciar a leitura.";
    }


    /*
       SETORES
    */

    const idsPercentuais = [

        "voisinsPct",

        "tiersPct",

        "orphelinsPct",

        "corPct",

        "parImparPct",

        "altoBaixoPct"
    ];


    idsPercentuais.forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                elemento
            ) {

                elemento.textContent =
                    "0%";
            }
        }
    );


    /*
       BARRAS DE SETORES
    */

    [
        "voisinsBar",
        "tiersBar",
        "orphelinsBar"
    ].forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                elemento
            ) {

                elemento.style.width =
                    "0%";
            }
        }
    );


    /*
       DOMINANTES
    */

    [
        "setorDominante",
        "corDominante",
        "parImparDominante",
        "altoBaixoDominante"
    ].forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                elemento
            ) {

                elemento.textContent =
                    "--";
            }
        }
    );


    /*
       TENDÊNCIAS
    */

    [
        "corTendencia",
        "parImparTendencia",
        "altoBaixoTendencia"
    ].forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                elemento
            ) {

                elemento.textContent =
                    "--";
            }
        }
    );


    /*
       TEXTOS
    */

    const corTexto =
        document.getElementById(
            "corTexto"
        );


    if (
        corTexto
    ) {

        corTexto.textContent =
            "Nenhum padrão identificado.";
    }


    const parTexto =
        document.getElementById(
            "parImparTexto"
        );


    if (
        parTexto
    ) {

        parTexto.textContent =
            "Nenhum padrão identificado.";
    }


    const altoTexto =
        document.getElementById(
            "altoBaixoTexto"
        );


    if (
        altoTexto
    ) {

        altoTexto.textContent =
            "Nenhum padrão identificado.";
    }


    /*
       MINI STATUS
    */

    [
        "statusSetores",
        "statusCores",
        "statusParImpar",
        "statusAltosBaixos"
    ].forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                elemento
            ) {

                elemento.textContent =
                    "⏳ AGUARDAR";


                elemento.className =
                    "mini-status aguardar";
            }
        }
    );


    /*
       PAINEL LATERAL
    */

    resetarSinais();


    /*
       ESTATÍSTICAS
    */

    atualizarEstatisticas();

    atualizarPlacarEstrategiasV3();


    /*
       HISTÓRICO
    */

    atualizarHistorico();


    /*
       RESULTADO DO PRÓXIMO GIRO
    */

    if (
        resultadoProximoGiro
    ) {

        resultadoProximoGiro.textContent =
            "Aguardando análise e próximo resultado...";
    }


    /*
       Volta o foco
       para o Giro 1.
    */

    if (
        inputs.length > 0
    ) {

        inputs[0].focus();
    }
}


/* =========================================================
   BOTÃO ANALISAR
   ========================================================= */

if (
    btnAnalisar
) {

    btnAnalisar.addEventListener(
        "click",
        analisarMesa
    );
}


/* =========================================================
   BOTÃO LIMPAR
   ========================================================= */

if (
    btnLimpar
) {

    btnLimpar.addEventListener(
        "click",
        limparTudo
    );
}


/* =========================================================
   BOTÃO REGISTRAR GIRO
   ========================================================= */

if (
    btnRegistrarGiro
) {

    btnRegistrarGiro.addEventListener(
        "click",
        registrarProximoGiro
    );
}


/* =========================================================
   ENTER NOS 7 CAMPOS
   ========================================================= */

inputs.forEach(
    (
        input,
        index
    ) => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();


                    /*
                       Ainda não chegou
                       ao Giro 7.
                    */

                    if (
                        index <
                        inputs.length - 1
                    ) {

                        inputs[
                            index + 1
                        ].focus();

                    }


                    /*
                       Chegou ao Giro 7.
                       Faz análise.
                    */

                    else {

                        analisarMesa();
                    }
                }
            }
        );
    }
);


/* =========================================================
   ENTER NO PRÓXIMO GIRO
   ========================================================= */

if (
    proximoNumero
) {

    proximoNumero.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();


                registrarProximoGiro();
            }
        }
    );
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

atualizarEstatisticas();

atualizarHistorico();

resetarSinais();


/*
   Foco inicial.
*/

if (
    inputs.length > 0
) {

    inputs[0].focus();
}


/* =========================================================
   🃏 FIM DO APP.JS

   LÓGICA FINAL:

   ANALISA 7 GIROS
          ↓
   ENTRADA ≥ 58%
          ↓
   TRAVA O ALVO
          ↓
       1ª TENTATIVA
          ↓
   GREEN? → ENCERRA
          ↓ NÃO
       2ª TENTATIVA
          ↓
   GREEN? → ENCERRA
          ↓ NÃO
       3ª TENTATIVA
          ↓
   GREEN OU RED FINAL
          ↓
   ⏸️ AGUARDA 1 GIRO
          ↓
   GIRO ENTRA NOS ÚLTIMOS 7
          ↓
   🧠 MESA É RECALCULADA
          ↓
   NOVO SINAL SOMENTE SE
   A NOVA LEITURA AUTORIZAR

   Cada estratégia trabalha
   independentemente.
   ========================================================= */
   

/* =========================================================
   V3.2 — PLACAR GREEN / RED POR ESTRATÉGIA
   Usa o estado real do motor (desempenhoEstrategias).
   ========================================================= */
function atualizarPlacarEstrategiasV3() {
    const mapa = {
        setores: { green: "setoresGreen", red: "setoresRed", acerto: null },
        cores: { green: "coresGreen", red: "coresRed", acerto: "coresAcerto" },
        parImpar: { green: "parImparGreen", red: "parImparRed", acerto: "parImparAcerto" },
        altosBaixos: { green: "altosBaixosGreen", red: "altosBaixosRed", acerto: "altosBaixosAcerto" }
    };

    Object.entries(mapa).forEach(([chave, ids]) => {
        const dados = desempenhoEstrategias[chave] || { green: 0, red: 0 };
        const g = dados.green || 0;
        const r = dados.red || 0;
        const total = g + r;

        const ge = document.getElementById(ids.green);
        const re = document.getElementById(ids.red);

        if (ge) ge.textContent = g;
        if (re) re.textContent = r;

        if (ids.acerto) {
            const ae = document.getElementById(ids.acerto);
            if (ae) {
                ae.textContent = total
                    ? Math.round((g / total) * 100) + "%"
                    : "0%";
            }
        }
    });
}

setTimeout(atualizarPlacarEstrategiasV3, 0);
