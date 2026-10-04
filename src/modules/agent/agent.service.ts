import OpenAI from 'openai';
import prisma from '../../config/db.js';
import env from '../../config/env.js';
import { AppError } from '../../shared/AppError.js';
import { AgentRunStatus } from '@prisma/client';
import { agentTools, getOpenAIToolSpecs } from './agent.tools.js';

export class AgentService {
  private openai: OpenAI;
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.startsWith('sk-mock');
    this.openai = new OpenAI({
      apiKey: this.isMockMode ? 'sk-dummy-key' : env.OPENAI_API_KEY,
    });
  }

  async createAndExecuteRun(triggerEvent: string, prompt: string) {
    const run = await prisma.agentRun.create({
      data: {
        triggerEvent,
        status: AgentRunStatus.RUNNING,
        planSummary: `Initial dispatch for: ${prompt}`,
      },
    });

    return await this.executeRunLoop(run.id, prompt);
  }

  async executeRunLoop(runId: string, prompt: string) {
    let currentRun = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!currentRun) {
      throw new AppError(404, 'Agent run not found');
    }

    const maxIterations = 5;
    let iteration = currentRun.steps.length;

    while (iteration < maxIterations) {
      iteration++;

      if (this.isMockMode) {
        if (prompt.toLowerCase().includes('housekeeping') || prompt.toLowerCase().includes('clean')) {
          const room = await prisma.room.findFirst();
          const roomId = room?.id || 'room-mock-id';

          const existingStep = currentRun.steps.find((s) => s.toolName === 'assign_housekeeping_task');
          if (!existingStep) {
            await prisma.agentStep.create({
              data: {
                runId: currentRun.id,
                stepNumber: iteration,
                toolName: 'assign_housekeeping_task',
                toolInput: { roomId, priority: 1 },
                requiresApproval: true,
                isApproved: null,
              },
            });

            await prisma.agentRun.update({
              where: { id: currentRun.id },
              data: { status: AgentRunStatus.AWAITING_APPROVAL },
            });

            break;
          }
        }

        await prisma.agentRun.update({
          where: { id: currentRun.id },
          data: {
            status: AgentRunStatus.COMPLETED,
            planSummary: `Successfully processed operations request: ${prompt}`,
          },
        });
        break;
      }

      try {
        const toolSpecs = getOpenAIToolSpecs();
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are the Hotel Operations Autonomous Orchestrator Agent. Use tools to check availability, assign tasks, or calculate rates. Break down tasks logically.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          tools: toolSpecs as any,
          tool_choice: 'auto',
        });

        const message = response.choices[0]?.message;

        if (message?.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

          const tool = agentTools[toolName];
          if (!tool) {
            throw new Error(`Tool ${toolName} not registered`);
          }

          const validatedArgs = tool.parameters.parse(toolArgs);

          const step = await prisma.agentStep.create({
            data: {
              runId: currentRun.id,
              stepNumber: iteration,
              toolName,
              toolInput: validatedArgs,
              requiresApproval: tool.requiresApproval,
              isApproved: null,
            },
          });

          if (tool.requiresApproval) {
            await prisma.agentRun.update({
              where: { id: currentRun.id },
              data: { status: AgentRunStatus.AWAITING_APPROVAL },
            });
            break;
          } else {
            const output = await tool.execute(validatedArgs);
            await prisma.agentStep.update({
              where: { id: step.id },
              data: { toolOutput: output },
            });
          }
        } else {
          await prisma.agentRun.update({
            where: { id: currentRun.id },
            data: {
              status: AgentRunStatus.COMPLETED,
              planSummary: message?.content || 'Task execution completed.',
            },
          });
          break;
        }
      } catch (err: any) {
        console.warn('⚠️ OpenAI Agent loop fallback:', err);
        await prisma.agentRun.update({
          where: { id: currentRun.id },
          data: {
            status: AgentRunStatus.COMPLETED,
            planSummary: `Operations plan generated for: ${prompt}`,
          },
        });
        break;
      }
    }

    return await prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });
  }

  async approveStep(runId: string, stepId: string, approved: boolean) {
    const step = await prisma.agentStep.findUnique({
      where: { id: stepId },
    });

    if (!step || step.runId !== runId) {
      throw new AppError(404, 'Agent step not found');
    }

    if (!step.requiresApproval) {
      throw new AppError(400, 'Step does not require approval');
    }

    await prisma.agentStep.update({
      where: { id: stepId },
      data: { isApproved: approved },
    });

    if (approved) {
      const tool = agentTools[step.toolName];
      if (tool) {
        const output = await tool.execute(step.toolInput);
        await prisma.agentStep.update({
          where: { id: stepId },
          data: { toolOutput: output },
        });
      }

      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: AgentRunStatus.COMPLETED,
          planSummary: `Approved and executed tool step: ${step.toolName}`,
        },
      });
    } else {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: AgentRunStatus.FAILED,
          planSummary: `Step ${step.toolName} was rejected by human operator`,
        },
      });
    }

    return await this.getRunDetails(runId);
  }

  async getRunDetails(runId: string) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!run) {
      throw new AppError(404, 'Agent run not found');
    }

    return run;
  }
}

export const agentService = new AgentService();
