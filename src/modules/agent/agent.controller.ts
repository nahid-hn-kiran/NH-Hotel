import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { agentService } from './agent.service.js';
import { AgentRunStatus } from '@prisma/client';

const triggerRun = catchAsync(async (req: Request, res: Response) => {
  const { triggerEvent, prompt } = req.body;
  const result = await agentService.createAndExecuteRun(triggerEvent, prompt);

  sendResponse(res, {
    statusCode: 201,
    message: 'Agent run dispatched successfully',
    data: result,
  });
});

const getRun = catchAsync(async (req: Request, res: Response) => {
  const runId = req.params.id as string;
  const result = await agentService.getRunDetails(runId);

  sendResponse(res, {
    statusCode: 200,
    message: 'Agent run details fetched successfully',
    data: result,
  });
});

const approveStep = catchAsync(async (req: Request, res: Response) => {
  const runId = req.params.id as string;
  const stepId = req.params.stepId as string;
  const { approved } = req.body;

  const result = await agentService.approveStep(runId, stepId, approved);

  sendResponse(res, {
    statusCode: 200,
    message: `Agent step ${approved ? 'approved' : 'rejected'} successfully`,
    data: result,
  });
});

const streamRunLogs = (req: Request, res: Response): void => {
  const runId = req.params.id as string;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ message: 'Connected to agent SSE stream', runId })}\n\n`);

  let isClosed = false;

  req.on('close', () => {
    isClosed = true;
  });

  const interval = setInterval(async () => {
    if (isClosed) {
      clearInterval(interval);
      return;
    }

    try {
      const run = await agentService.getRunDetails(runId);

      res.write(`data: ${JSON.stringify({ type: 'STATUS_UPDATE', run })}\n\n`);

      if (
        run.status === AgentRunStatus.COMPLETED ||
        run.status === AgentRunStatus.FAILED ||
        run.status === AgentRunStatus.AWAITING_APPROVAL
      ) {
        res.write(`data: ${JSON.stringify({ type: 'TERMINATED', status: run.status })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'ERROR', error: err.message })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 1000);
};

export const agentController = {
  triggerRun,
  getRun,
  approveStep,
  streamRunLogs,
};
