let db;

window.onload = () => {
  const request = indexedDB.open("orcamentosDB", 1);

  request.onerror = () => alert("Erro ao abrir o banco de dados.");
  request.onsuccess = () => {
    db = request.result;
    carregarBackup();
  };

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    db.createObjectStore("orcamento", { keyPath: "id" });
  };

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR");
  document.getElementById("data-atual").textContent = dataFormatada;
};

// Ajusta a largura do input considerando prefixo/sufixo
function ajustarLargura(input, prefix = '', suffix = '') {
  const texto = prefix + input.value + suffix;
  const comprimento = Math.max(2, texto.length + 1);
  input.style.width = comprimento + "ch";
}

// Adiciona uma nova linha na tabela de itens
function adicionarLinha(dados = []) {
  const tbody = document.querySelector("#tabela-itens tbody");
  const linha = document.createElement("tr");

  const placeholders = ["Código", "Descrição", "Qtd.", "R$", "R$", "%", "R$"];
  for (let i = 0; i < 7; i++) {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholders[i];
    input.value = dados[i] || "";

    let prefix = '';
    let suffix = '';
    if (i === 3 || i === 4 || i === 6) prefix = 'R$ ';
    if (i === 5) suffix = '%';

    ajustarLargura(input, prefix, suffix);

    input.style.minWidth = "3ch";
    input.style.boxSizing = "content-box";
    input.style.transition = "width 0.2s ease-in-out";
    input.style.overflow = "hidden";
    input.style.whiteSpace = "nowrap";

    input.addEventListener("input", () => {
      ajustarLargura(input, prefix, suffix);
    });

    if (i === 1) input.style.minWidth = "150px";

    input.oninput = () => {
      if (i === 2 || i === 3 || i === 5) {
        validarNumerico(input, i);
      }
      if (i === 3) {
        input.value = aplicarMascaraMoeda(input.value);
      }
      calcularTotais();
    };

    if (i === 4 || i === 6) input.readOnly = true;

    td.appendChild(input);
    linha.appendChild(td);
  }

  // Botão excluir linha
  const tdExcluir = document.createElement("td");
  const btnExcluir = document.createElement("button");

  btnExcluir.textContent = "✖";
  btnExcluir.title = "Excluir linha";
  btnExcluir.className = "btn-excluir no-print";

  btnExcluir.onclick = () => {
    linha.remove();
    calcularTotais();
  };

  btnExcluir.style.fontSize = "12px";
  btnExcluir.style.padding = "0";
  btnExcluir.style.margin = "0";
  btnExcluir.style.cursor = "pointer";
  btnExcluir.style.width = "auto";
  btnExcluir.style.display = "inline";
  btnExcluir.style.lineHeight = "1";
  btnExcluir.style.height = "auto";

  tdExcluir.appendChild(btnExcluir);
  linha.appendChild(tdExcluir);
  tbody.appendChild(linha);
}

// Validação numérica e limite de desconto
function validarNumerico(input, colunaIndex) {
  let val = input.value.replace(',', '.').replace(/[^\d.]/g, '');
  if (colunaIndex === 5) {
    val = val.replace(/[^0-9.]/g, '');
    if (val !== '') {
      let num = parseFloat(val);
      if (num > 100) num = 100;
      input.value = num.toString();
      input.style.borderColor = '';
      return;
    }
  }
  if (val === '' || isNaN(val)) {
    input.style.borderColor = 'red';
  } else {
    input.style.borderColor = '';
    input.value = val;
  }
}

// Máscara de moeda
function aplicarMascaraMoeda(valor) {
  valor = valor.replace(/\D/g, "");
  valor = (valor / 100).toFixed(2) + "";
  valor = valor.replace(".", ",");
  valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return valor;
}

// Cálculo dos totais
function calcularTotais() {
  let totalCheio = 0;
  let totalComDesconto = 0;

  document.querySelectorAll("#tabela-itens tbody tr").forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length === 7) {
      const qtd = parseFloat(inputs[2].value.replace(',', '.') || 0);
      const precoStr = inputs[3].value.replace(/[R$\s.]/g, '').replace(',', '.');
      const preco = parseFloat(precoStr || 0);
      const desconto = parseFloat(inputs[5].value.replace('%', '') || 0);

      if (isNaN(qtd) || isNaN(preco) || isNaN(desconto)) {
        inputs[4].value = "";
        inputs[6].value = "";
        ajustarLargura(inputs[4], 'R$ ');
        ajustarLargura(inputs[6], 'R$ ');
        return;
      }

      const total = qtd * preco;
      const totalDesc = total - (total * (desconto / 100));

      inputs[4].value = total ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";
      inputs[6].value = totalDesc ? totalDesc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";

      ajustarLargura(inputs[4], 'R$ ');
      ajustarLargura(inputs[6], 'R$ ');

      totalCheio += total;
      totalComDesconto += totalDesc;
    }
  });

  document.getElementById("total-cheio").textContent = totalCheio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById("total-desconto").textContent = totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Backup no IndexedDB
function salvarBackup() {
  const nome = document.getElementById("nome-orcamento").value || "orcamento_padrao";
  const linhas = [];

  document.querySelectorAll("#tabela-itens tbody tr").forEach(row => {
    const inputs = row.querySelectorAll("input");
    linhas.push(Array.from(inputs).map(input => input.value));
  });

  const dados = {
    id: nome,
    nome: nome,
    itens: linhas
  };

  const transacao = db.transaction(["orcamento"], "readwrite");
  const store = transacao.objectStore("orcamento");
  store.put(dados);
  alert("Backup salvo com sucesso!");
}

// Carrega backup do IndexedDB
function carregarBackup() {
  const nome = document.getElementById("nome-orcamento").value || "orcamento_padrao";
  const transacao = db.transaction(["orcamento"], "readonly");
  const store = transacao.objectStore("orcamento");
  const request = store.get(nome);

  request.onsuccess = () => {
    if (request.result) {
      const tbody = document.querySelector("#tabela-itens tbody");
      tbody.innerHTML = "";
      request.result.itens.forEach(dados => adicionarLinha(dados));
      calcularTotais();
    }
  };
}

// Limpa dados e IndexedDB
function limparDados() {
  if (!confirm("Deseja realmente limpar todos os dados do orçamento atual?")) return;

  document.querySelector("#tabela-itens tbody").innerHTML = "";
  document.getElementById("total-cheio").textContent = "R$ 0,00";
  document.getElementById("total-desconto").textContent = "R$ 0,00";

  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = "");

  const nome = document.getElementById("nome-orcamento").value || "orcamento_padrao";
  const transacao = db.transaction(["orcamento"], "readwrite");
  const store = transacao.objectStore("orcamento");
  const request = store.delete(nome);

  request.onsuccess = () => {
    console.log(`Backup "${nome}" excluído com sucesso.`);
  };

  request.onerror = () => {
    console.warn(`Falha ao excluir backup "${nome}".`);
  };
}

// Exporta a página para PDF ocultando elementos com .no-print
async function exportarParaPDF() {
  const { jsPDF } = window.jspdf;
  const titulo = document.getElementById("nome-orcamento")?.value || "Orçamento";

  const elementosOcultos = document.querySelectorAll('.no-print');
  elementosOcultos.forEach(el => el.style.display = 'none');

  await new Promise(resolve => setTimeout(resolve, 300));

  const element = document.body;
  const canvas = await html2canvas(element, { scale: 2 });

  elementosOcultos.forEach(el => el.style.display = '');

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvas.width, canvas.height]
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${titulo}.pdf`);
}

// Substitui inputs por spans para impressão
function prepararParaImpressao() {
  document.querySelectorAll("#tabela-itens tbody tr").forEach(row => {
    const inputs = row.querySelectorAll("input");
    inputs.forEach(input => {
      const span = document.createElement("span");
      span.textContent = input.value;
      input.parentNode.replaceChild(span, input);
    });
  });

  ["nome-orcamento", "prazo-entrega", "validade-orcamento"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const span = document.createElement("span");
      span.textContent = el.value;
      el.parentNode.replaceChild(span, el);
    }
  });

  window.print();
}
