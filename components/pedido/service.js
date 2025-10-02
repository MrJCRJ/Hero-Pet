// Compat shim pós-renomeação: redireciona antigo caminho 'components/pedido/service'
// para a nova localização em 'components/pedidos/service'.
// TODO: Atualizar testes para importar diretamente de 'components/pedidos/service'
// e remover este arquivo após a transição.
export * from "../pedidos/service";
export { default } from "../pedidos/service";
