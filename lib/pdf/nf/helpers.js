// lib/pdf/nf/helpers.js
// Helpers compartilhados para geração de NF com PDFKit
import fs from "fs";
import path from "path";

export const STR = (v, fb = "—") => (v == null || v === "" ? fb : String(v));
export const stripDigits = (value = "") =>
  String(value || "").replace(/\D+/g, "");
export const BRL = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
// Formata data para pt-BR (dd/mm/aaaa) sem sofrer drift de timezone.
// Aceita:
// - string "YYYY-MM-DD" (preferido)
// - string ISO com timestamp "YYYY-MM-DDTHH:MM:SSZ" (usa apenas a parte da data)
// - Date (converte via toISOString e usa a parte da data)
export const DATE = (d) => {
  if (!d) return "—";
  let s;
  if (typeof d === "string") s = d;
  else if (d instanceof Date) s = d.toISOString();
  else s = String(d || "");

  const isoDate = String(s).slice(0, 10); // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, dd] = isoDate.split("-");
    return `${dd}/${m}/${y}`;
  }
  // Fallback seguro: retorna string crua quando formato desconhecido
  return String(s);
};

export const formatCep = (raw = "") => {
  const d = stripDigits(raw).slice(0, 8);
  return d ? d.replace(/(\d{5})(\d)/, "$1-$2") : "—";
};

export const formatTelefone = (raw = "") => {
  const d = stripDigits(raw).slice(0, 11);
  if (!d) return "—";
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export const formatCpfCnpj = (raw = "") => {
  const d = stripDigits(raw).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const abbreviateLogradouro = (s = "") => {
  const map = [
    [/^rua\b/i, "R."],
    [/^avenida\b/i, "Av."],
    [/^travessa\b/i, "Tv."],
    [/^alameda\b/i, "Al."],
    [/^praça\b/i, "Pç."],
    [/^rodovia\b/i, "Rod."],
    [/^estrada\b/i, "Est."],
    [/^loteamento\b/i, "Lot."],
    [/^condomínio\b/i, "Cond."],
    [/^quadra\b/i, "Qd."],
    [/^setor\b/i, "St."],
  ];
  const trimmed = String(s || "").trim();
  const [first, ...rest] = trimmed.split(/\s+/);
  if (!first) return trimmed;
  const found = map.find(([re]) => re.test(first));
  if (found) return `${found[1]} ${rest.join(" ")}`.trim();
  return trimmed;
};

export const abbreviateCity = (s = "") => {
  let out = String(s || "");
  out = out.replace(/\bNossa Senhora\b/gi, "Nossa Sra.");
  out = out.replace(/\bSanta\b/gi, "Sta.");
  out = out.replace(/\bSanto\b/gi, "Sto.");
  out = out.replace(/\bSenhora\b/gi, "Sra.");
  out = out.replace(/\bSenhor\b/gi, "Sr.");
  return out;
};

export const composeEnderecoFromViaCep = (
  viaCepAddr,
  numeroRaw = "",
  complementoRaw = "",
  cepDigits = "",
) => {
  const logradouro = viaCepAddr?.logradouro
    ? abbreviateLogradouro(viaCepAddr.logradouro)
    : "";
  const bairro = viaCepAddr?.bairro ? String(viaCepAddr.bairro) : "";
  const cidade = viaCepAddr?.localidade
    ? abbreviateCity(viaCepAddr.localidade)
    : "";
  const uf = viaCepAddr?.uf ? String(viaCepAddr.uf) : "";
  const num = STR(numeroRaw, "").trim();
  const compl = STR(complementoRaw, "").trim();
  const cepFmt = formatCep(cepDigits);

  let linha = "";
  if (logradouro) linha += logradouro;
  if (num) linha += (linha ? ", " : "") + num;
  if (compl) linha += (linha ? ", " : "") + compl;
  if (bairro) linha += (linha ? " - " : "") + bairro;
  if (cidade || uf) {
    const cityUf = [cidade, uf].filter(Boolean).join(" - ");
    linha += (linha ? ", " : "") + cityUf;
  }
  if (cepFmt && cepFmt !== "—") linha += (linha ? ", " : "") + cepFmt;

  return linha || "—";
};

export const tryFetchViaCep = async (cepDigits, timeoutMs = 1500) => {
  const cleanCep = stripDigits(cepDigits || "").slice(0, 8);
  if (!cleanCep || typeof fetch !== "function") return null;
  try {
    const ctrl =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    const resp = await fetch(
      `https://viacep.com.br/ws/${cleanCep}/json/`,
      ctrl ? { signal: ctrl.signal } : undefined,
    );
    if (timer) clearTimeout(timer);
    if (resp && resp.ok) {
      const json = await resp.json();
      if (json && !json.erro) return json;
    }
  } catch (_) {
    // ignore network/timeout
  }
  return null;
};

export const tryLoadLogoPng = () => {
  try {
    const pngPath = path.join(process.cwd(), "Logo.png");
    return fs.existsSync(pngPath) ? pngPath : null;
  } catch (_) {
    return null;
  }
};

export const tryLoadPixQrPng = () => {
  // Tenta localizar o QR code do PIX em alguns nomes/pastas comuns
  try {
    const candidates = [path.join(process.cwd(), "public", "pix-qr.png")];
    const found = candidates.find((p) => fs.existsSync(p));
    return found || null;
  } catch (_) {
    return null;
  }
};
