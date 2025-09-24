// Este arquivo foi mantido como ponte de compatibilidade temporária.
// TODO: Remover após confirmar que nenhum import usa "lib/pdf/promissoria/sections".
let warned = false;
function warnOnce() {
  if (!warned && typeof console !== "undefined") {
    console.warn(
      "[DEPRECATION] Importe de 'lib/pdf/promissoria/sections' migrado para 'lib/pdf/duplicadas/sections'. Atualize seus imports."
    );
    warned = true;
  }
}
warnOnce();

export { drawPromissoriaCard, PROMISSORIA_CARD_HEIGHT } from "../duplicadas/sections";
