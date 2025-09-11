import { Card } from "components/common/Card";
import { InfoList } from "components/common/InfoList";

// 🔹 Componente de card do commit
export function CommitCard({ webserver }) {
  if (!webserver.last_commit_author) {
    return (
      <Card title="Último Commit">
        <p className="text-gray-500 text-xs">Nenhuma informação disponível</p>
      </Card>
    );
  }

  const commitData = {
    Autor: webserver.last_commit_author,
    Mensagem: webserver.last_commit_message,
    SHA: webserver.last_commit_message_sha?.substring(0, 7),
  };

  return (
    <Card title="Último Commit">
      <InfoList data={commitData} />
    </Card>
  );
}
