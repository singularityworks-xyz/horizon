// Re-export all server actions for convenient imports

// Project Actions
// biome-ignore lint/performance/noBarrelFile: This is an intentional barrel file for convenient imports
export {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getProjectsByClient,
  type ProjectWithClient,
  updateProject,
} from "./project";
// Answer Actions
export {
  getAnswersByQuestionnaire,
  getQuestionnaireProgress,
  saveAnswer,
  saveAnswers,
  submitQuestionnaire,
} from "./questionnaire/answer";
// Assignment Actions (ProjectQuestionnaire)
export {
  assignTemplateToProject,
  deleteProjectQuestionnaire,
  getClientPendingQuestionnaires,
  getProjectQuestionnaire,
  getQuestionnairesByProject,
  type ProjectQuestionnaireWithDetails,
  updateQuestionnaireStatus,
} from "./questionnaire/assignment";
// Question Actions
export {
  addBulkQuestions,
  addQuestion,
  deleteQuestion,
  getQuestionsByTemplate,
  reorderQuestions,
  updateQuestion,
} from "./questionnaire/question";
// Questionnaire Template Actions
export {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getAllTemplates,
  getTemplateById,
  getTemplatesByType,
  type TemplateWithQuestions,
  updateTemplate,
} from "./questionnaire/template";
