// hooks/useFormManager.js
import React from "react";

const initialForms = {
  entity: {
    show: false,
    form: {
      entityType: "client",
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
    setForms((prev) => {
      const prevForm = prev[formType].form;
      // Permite função (prev => next) ou objeto direto
      const nextForm =
        typeof newData === "function" ? newData(prevForm) : newData;
      return {
        ...prev,
        [formType]: {
          ...prev[formType],
          form: nextForm,
        },
      };
    });
  }

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
