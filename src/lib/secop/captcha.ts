const CAPSOLVER_API_URL = "https://api.capsolver.com";
const DEFAULT_SITEKEY = "6LcMmakZAAAAAB157Q90hORUGtNd790TCws4vBNw";
const DEFAULT_MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 3_000;

export class CaptchaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaError";
  }
}

interface CapSolverTask {
  clientKey: string;
  task: Record<string, unknown>;
}

interface CreateTaskResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
}

interface GetTaskResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status?: string;
  solution?: {
    gRecaptchaResponse?: string;
    token?: string;
  };
}

function getApiKey(): string {
  const key = process.env.CAPSOLVER_API_KEY;
  if (!key) {
    throw new CaptchaError(
      "CAPSOLVER_API_KEY no está configurada. No se puede resolver el reCAPTCHA.",
    );
  }
  return key;
}

function getSitekey(): string {
  return process.env.SECOP_RECAPTCHA_SITEKEY ?? DEFAULT_SITEKEY;
}

export async function solveCaptcha(
  pageUrl: string,
  options?: { sitekey?: string; maxWaitMs?: number },
): Promise<string> {
  const apiKey = getApiKey();
  const sitekey = options?.sitekey ?? getSitekey();
  const maxWait = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;

  const createPayload: CapSolverTask = {
    clientKey: apiKey,
    task: {
      type: "ReCaptchaV2TaskProxyless",
      websiteURL: pageUrl,
      websiteKey: sitekey,
    },
  };

  const createResponse = await fetch(`${CAPSOLVER_API_URL}/createTask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createPayload),
  });

  if (!createResponse.ok) {
    throw new CaptchaError(
      `CapSolver createTask falló (status ${createResponse.status}).`,
    );
  }

  const createData = (await createResponse.json()) as CreateTaskResponse;
  if (createData.errorId !== 0 || !createData.taskId) {
    throw new CaptchaError(
      `CapSolver error: ${createData.errorDescription ?? createData.errorCode ?? "desconocido"}`,
    );
  }

  const taskId = createData.taskId;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const resultResponse = await fetch(`${CAPSOLVER_API_URL}/getTaskResult`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey: apiKey, taskId }),
    });

    if (!resultResponse.ok) {
      throw new CaptchaError(
        `CapSolver getTaskResult falló (status ${resultResponse.status}).`,
      );
    }

    const resultData = (await resultResponse.json()) as GetTaskResultResponse;
    if (resultData.errorId !== 0) {
      throw new CaptchaError(
        `CapSolver error: ${resultData.errorDescription ?? resultData.errorCode ?? "desconocido"}`,
      );
    }

    if (resultData.status === "ready") {
      const token =
        resultData.solution?.gRecaptchaResponse ??
        resultData.solution?.token;
      if (!token) {
        throw new CaptchaError("CapSolver no retornó token de solución.");
      }
      return token;
    }
  }

  throw new CaptchaError(
    `CapSolver timeout después de ${Math.round(maxWait / 1000)}s esperando solución.`,
  );
}
