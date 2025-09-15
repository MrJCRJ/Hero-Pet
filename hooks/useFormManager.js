// hooks/useFormManager.js
import React from "react";

const initialForms = {
  client: {
    show: false,
    form: {
      nome: "",
      documento: "",
      cep: "",
      numero: "",
      complemento: "",
      telefone: "",
      email: "",
      ativo: true,
    },
  },
  supplier: {
    show: false,
    form: {
      nomeEmpresa: "",
      cnpj: "",
      endereco: "",
      telefone: "",
      email: "",
      ativo: true,
    },
  },
  order: {
    show: false,
    form: {
      clienteId: "",
      produto: "",
      quantidade: 1,
      observacao: "",
    },
  },
};

export function useFormManager() {
  const [forms, setForms] = React.useState(initialForms);

  // Handler para atualizar o estado do formulário
  const handleFormData = (formType, newData) => {
    setForms((prev) => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        form: newData,
      },
    }));
  };

  // Handler para alternar visibilidade dos formulários
  const handleShowForm = (formType) => {
    setForms((prev) => {
      const newForms = { ...prev };
      // Esconde todos os formulários
      Object.keys(newForms).forEach((key) => {
        newForms[key] = {
          ...newForms[key],
          show: false,
        };
      });
      // Mostra apenas o formulário selecionado
      newForms[formType] = {
        ...newForms[formType],
        show: true,
      };
      return newForms;
    });
  };

  // Getters para facilitar acesso aos dados
  const getFormProps = (formType) => ({
    form: forms[formType].form,
    setForm: (newData) => handleFormData(formType, newData),
  });

  const isFormVisible = (formType) => forms[formType].show;

  return {
    forms,
    handleShowForm,
    getFormProps,
    isFormVisible,
  };
}
