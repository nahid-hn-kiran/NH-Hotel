import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { ragService } from './rag.service.js';

const ingestDocument = catchAsync(async (req: Request, res: Response) => {
  const { title, content, metadata } = req.body;
  const result = await ragService.ingestDocument(title, content, metadata);

  sendResponse(res, {
    statusCode: 201,
    message: 'Document chunk ingested successfully with vector embedding',
    data: result,
  });
});

const askConcierge = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.body;
  const result = await ragService.askConcierge(query);

  sendResponse(res, {
    statusCode: 200,
    message: 'AI Concierge response generated successfully',
    data: result,
  });
});

export const ragController = {
  ingestDocument,
  askConcierge,
};
