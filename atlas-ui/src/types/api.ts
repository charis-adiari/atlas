/**
 * Represents the problem details body the API returns for every error. Validation failures carry one message per
 * field under errors, and problems the client must react to in a particular way carry a machine-readable code.
 */
export interface ApiProblemDetail {
  statusCode: number;
  title: string;
  detail: string;
  errors?: Record<string, string>;
  code?: string;
}
