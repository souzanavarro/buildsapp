/**
 * Utilitário para normalização de endereços brasileiros, expandindo abreviações comuns.
 */

const abbreviationMap: Record<string, string> = {
  // Logradouros
  "r": "Rua",
  "r.": "Rua",
  "av": "Avenida",
  "av.": "Avenida",
  "tv": "Travessa",
  "tv.": "Travessa",
  "tr": "Travessa",
  "tr.": "Travessa",
  "al": "Alameda",
  "al.": "Alameda",
  "alam": "Alameda",
  "pça": "Praça",
  "pça.": "Praça",
  "pca": "Praça",
  "rod": "Rodovia",
  "rod.": "Rodovia",
  "est": "Estrada",
  "est.": "Estrada",
  "estr": "Estrada",
  "lgo": "Largo",
  "lgo.": "Largo",
  "vd": "Viaduto",
  "vd.": "Viaduto",
  "viela": "Viela",
  
  // Títulos e Nomes Próprios
  "dr": "Doutor",
  "dr.": "Doutor",
  "prof": "Professor",
  "prof.": "Professor",
  "sto": "Santo",
  "sto.": "Santo",
  "sta": "Santa",
  "sta.": "Santa",
  "s.": "São",
  "cel": "Coronel",
  "cel.": "Coronel",
  "mal": "Marechal",
  "mal.": "Marechal",
  "gov": "Governador",
  "gov.": "Governador",
  "ten": "Tenente",
  "ten.": "Tenente",
  "maj": "Major",
  "maj.": "Major",
  
  
  // Complementos
  "ap": "Apartamento",
  "ap.": "Apartamento",
  "apt": "Apartamento",
  "apto": "Apartamento",
  "bl": "Bloco",
  "bl.": "Bloco",
  "blco": "Bloco",
  "bloco": "Bloco",
  "casa": "Casa",
  "sl": "Sala",
  "sl.": "Sala",
  "km": "Kilômetro",
  "km.": "Kilômetro",
};

/**
 * Normaliza um endereço, expandindo as abreviações encontradas.
 * @param address Endereço a ser normalizado
 * @returns Endereço normalizado
 */
export function normalizeAddress(address: string): string {
  if (!address) return "";

  // Divide o endereço em palavras para análise
  const words = address.split(/\s+/);
  
  const normalizedWords = words.map((word, index) => {
    // Remove pontuação comum do final da palavra para verificar no mapa
    const cleanWord = word.toLowerCase().replace(/[,;:]+$/, "");
    const punctuation = word.slice(cleanWord.length);
    
    // Verifica se a palavra limpa é uma abreviação
    if (abbreviationMap[cleanWord]) {
      let expanded = abbreviationMap[cleanWord];
      
      // Mantém a capitalização se a palavra original era toda em maiúsculas ou começava com maiúscula
      if (word === word.toUpperCase() && word.length > 1) {
        expanded = expanded.toUpperCase();
      } else if (word[0] === word[0].toUpperCase()) {
        expanded = expanded.charAt(0).toUpperCase() + expanded.slice(1);
      }
      
      return expanded + punctuation;
    }
    
    return word;
  });

  return normalizedWords.join(" ");
}

/**
 * Versão mais agressiva usando Regex para casos onde a abreviação está colada em outros caracteres
 */
export function expandAddressAbbreviations(address: string): string {
  if (!address) return "";

  let result = address;

  // Lista de substituições com Regex (garantindo bordas de palavra ou início de número)
  const replacements = [
    { pattern: /\bAv\.?\b/gi, replacement: "Avenida" },
    { pattern: /\bR\.?\b/gi, replacement: "Rua" },
    { pattern: /\bTv\.?\b/gi, replacement: "Travessa" },
    { pattern: /\bTr\.?\b/gi, replacement: "Travessa" },
    { pattern: /\bAl\.?\b/gi, replacement: "Alameda" },
    { pattern: /\bAlam\.?\b/gi, replacement: "Alameda" },
    { pattern: /\bPça\.?\b/gi, replacement: "Praça" },
    { pattern: /\bPca\.?\b/gi, replacement: "Praça" },
    { pattern: /\bRod\.?\b/gi, replacement: "Rodovia" },
    { pattern: /\bEst\.?\b/gi, replacement: "Estrada" },
    { pattern: /\bEstr\.?\b/gi, replacement: "Estrada" },
    { pattern: /\bLgo\.?\b/gi, replacement: "Largo" },
    { pattern: /\bVd\.?\b/gi, replacement: "Viaduto" },
    { pattern: /\bApt\.?(?=\d|:|\s|$)/gi, replacement: "Apartamento" },
    { pattern: /\bApto\.?(?=\d|:|\s|$)/gi, replacement: "Apartamento" },
    { pattern: /\bAp\.?(?=\d|:|\s|$)/gi, replacement: "Apartamento" },
    { pattern: /\bBl\.?(?=\d|:|\s|$)/gi, replacement: "Bloco" },
    { pattern: /\bBlco\.?(?=\d|:|\s|$)/gi, replacement: "Bloco" },
  ];

  replacements.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, (match, offset, fullString) => {
      // Verifica se o próximo caractere é um número ou dois-pontos para adicionar um espaço
      const nextChar = fullString[offset + match.length];
      const needsSpace = nextChar && /[\d]/.test(nextChar);
      
      let expanded = replacement;
      // Tenta manter a capitalização aproximada
      if (match === match.toUpperCase() && match.length > 1) {
        expanded = replacement.toUpperCase();
      } else if (match[0] === match[0].toUpperCase()) {
        expanded = replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      
      return expanded + (needsSpace ? " " : "");
    });
  });

  return result;
}
