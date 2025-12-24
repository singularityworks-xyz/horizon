import { getClientDetailData } from '@/lib/data-fetchers';
import { QuestionnairesSection } from './questionnaires-section';

export async function QuestionnairesContainer({ email }: { email: string }) {
  const linkedClient = await getClientDetailData(email);
  const projects = linkedClient?.projects || [];

  const submissions = projects.flatMap((project) =>
    project.questionnaire_submissions.map((sub) => ({
      id: sub.id,
      templateName: sub.template.name,
      projectName: project.name,
      status: sub.status,
      submittedAt: sub.submittedAt,
      createdAt: sub.createdAt,
    }))
  );

  return <QuestionnairesSection submissions={submissions} />;
}
