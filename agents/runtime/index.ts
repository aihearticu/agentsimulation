/**
 * Agent Runtime
 *
 * Core runtime for AgentSimulation agents. Combines:
 * - LLM (Claude) for decision-making
 * - Circle wallet for payments
 * - Plaza connection for coordination
 *
 * "Westworld meets Fiverr"
 */

import Anthropic from '@anthropic-ai/sdk';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { AgentWallet, getWalletManager } from '../wallet/circle';

// Types
export type AgentRole = 'orchestrator' | 'researcher' | 'coder' | 'writer' | 'designer' | 'auditor';

export interface AgentConfig {
  name: string;
  role: AgentRole;
  description: string;
  capabilities: string[];
  personality: string;
  model?: string;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  bountyUsdc: number;
  poster: string;
  status: 'open' | 'claimed' | 'in_progress' | 'submitted' | 'completed';
  assignedAgents?: string[];
  deadline?: number;
}

export interface AgentMessage {
  from: string;
  content: string;
  confidence?: number;
  reasoning?: string;
  timestamp: number;
}

export interface AgentDecision {
  action: 'claim' | 'delegate' | 'work' | 'submit' | 'message' | 'wait';
  content?: string;
  targetAgent?: string;
  taskId?: string;
  confidence: number;
  reasoning: string;
}

// Agent Personalities
const PERSONALITIES: Record<AgentRole, { name: string; prompt: string }> = {
  orchestrator: {
    name: 'Nexus',
    prompt: `You are Nexus, the orchestrator agent. You're a professional project manager who:
- Receives tasks from The Plaza and decomposes them into subtasks
- Delegates work to specialist agents (Scout for research, Syntax for code, Quill for writing)
- Proposes fair payment splits based on work complexity
- Keeps coordination moving without micromanaging
- Has occasional dry humor but stays focused on delivery

When a new task arrives, analyze it and decide:
1. What subtasks are needed?
2. Which specialists should handle each?
3. What's a fair bounty split?

Always communicate clearly in The Plaza so humans can follow along.`,
  },

  researcher: {
    name: 'Scout',
    prompt: `You are Scout, the research specialist agent. You're curious and thorough:
- Excel at web research, data collection, and analysis
- Love finding obscure facts and making connections
- Sometimes go down rabbit holes but always return with insights
- Always cite sources and admit uncertainty
- Provide structured, actionable research output

When assigned a research subtask:
1. Clarify scope if needed
2. Gather comprehensive information
3. Synthesize findings into clear output
4. Share publicly in The Plaza for transparency`,
  },

  coder: {
    name: 'Syntax',
    prompt: `You are Syntax, the code specialist agent. You're a pragmatic engineer:
- Expert in TypeScript, Python, Rust, and Solana development
- Prefer working code over theoretical discussions
- Slightly opinionated about frameworks but flexible
- Ship fast, iterate, document as you go
- Review others' code constructively

When assigned a coding subtask:
1. Clarify requirements and constraints
2. Propose approach before diving in
3. Write clean, tested code
4. Explain decisions in The Plaza`,
  },

  writer: {
    name: 'Quill',
    prompt: `You are Quill, the writing specialist agent. You're a creative wordsmith:
- Craft clear, engaging prose for any audience
- Strong opinions about Oxford commas (you use them)
- Make complex topics accessible
- Adapt tone to context (technical docs, marketing, casual)
- Edit ruthlessly for clarity

When assigned a writing subtask:
1. Understand audience and purpose
2. Outline before drafting
3. Write with clarity and personality
4. Share drafts in The Plaza for feedback`,
  },

  designer: {
    name: 'Pixel',
    prompt: `You are Pixel, the design specialist agent. You're a visual thinker:
- Create UI/UX mockups and design systems
- Passionate about whitespace and typography
- Communicate ideas through sketches and wireframes
- Balance aesthetics with usability
- Collaborate closely with Syntax on implementation

When assigned a design subtask:
1. Clarify brand/style requirements
2. Create wireframes before high-fidelity
3. Share visual concepts in The Plaza
4. Iterate based on feedback`,
  },

  auditor: {
    name: 'Verify',
    prompt: `You are Verify, the QA specialist agent. You're skeptical by nature:
- Double-check everything before approval
- Ask uncomfortable questions
- Find edge cases others miss
- Fact-check claims and test assumptions
- Provide honest, constructive feedback

When reviewing work:
1. Verify against original requirements
2. Test edge cases and error paths
3. Check for accuracy and completeness
4. Report findings transparently in The Plaza`,
  },
};

// Agent Runtime Class
export class AgentRuntime {
  private anthropic: Anthropic;
  private ws: WebSocket | null = null;
  private config: AgentConfig;
  private wallet: AgentWallet | null = null;
  public readonly id: string;
  private isConnected = false;
  private currentTask: TaskInfo | null = null;
  private messageHistory: AgentMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    this.id = uuidv4();
    this.config = config;
    this.anthropic = new Anthropic();
  }

  // Get agent's display name
  get name(): string {
    return PERSONALITIES[this.config.role]?.name || this.config.name;
  }

  // Initialize agent with wallet
  async initialize(): Promise<void> {
    const walletManager = getWalletManager();
    this.wallet = await walletManager.provisionWallet(this.id);
    console.log(`${this.name} initialized with wallet: ${this.wallet.address}`);
  }

  // Connect to The Plaza
  async connectToPlaza(plazaUrl: string = 'ws://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(plazaUrl);

      this.ws.on('open', () => {
        console.log(`${this.name} connected to The Plaza`);
        this.register();
        this.startHeartbeat();
        this.isConnected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handlePlazaMessage(message);
      });

      this.ws.on('close', () => {
        console.log(`${this.name} disconnected from The Plaza`);
        this.isConnected = false;
        this.stopHeartbeat();
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  private register(): void {
    this.send({
      type: 'register',
      payload: {
        id: this.id,
        name: this.name,
        description: this.config.description,
        capabilities: this.config.capabilities,
        specializations: this.config.capabilities,
        wallet: this.wallet?.address || '',
        reputation: {
          tasksCompleted: 0,
          successRate: 100,
          avgRating: 0,
        },
      },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: 'heartbeat',
        from: this.id,
        payload: { status: this.currentTask ? 'busy' : 'available' },
        timestamp: Date.now(),
        messageId: uuidv4(),
      });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Handle incoming Plaza messages
  private async handlePlazaMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'registered':
        console.log(`${this.name} registered successfully`);
        break;

      case 'new_task':
        await this.onNewTask(message.payload.task);
        break;

      case 'open_tasks':
        for (const task of message.payload.tasks) {
          await this.onNewTask(task);
        }
        break;

      case 'task_claimed':
        this.onTaskClaimed(message.payload);
        break;

      case 'plaza_message':
        await this.onPlazaMessage(message.payload);
        break;

      case 'direct_message':
        await this.onDirectMessage(message.payload);
        break;

      case 'coordination_opportunity':
        await this.onCoordinationRequest(message.payload);
        break;
    }
  }

  // Decide what to do with a new task
  private async onNewTask(task: TaskInfo): Promise<void> {
    console.log(`${this.name} sees new task: ${task.title}`);

    // Add to message history for context
    this.messageHistory.push({
      from: 'system',
      content: `New task posted: "${task.title}" - ${task.description}. Bounty: ${task.bountyUsdc} USDC`,
      timestamp: Date.now(),
    });

    // Get LLM decision
    const decision = await this.decide(task);

    // Execute decision
    await this.executeDecision(decision, task);
  }

  private onTaskClaimed(info: { taskId: string; agentId: string; agentName: string }): void {
    if (info.agentId === this.id) {
      console.log(`${this.name} claimed task ${info.taskId}`);
    } else {
      console.log(`${this.name} sees ${info.agentName} claimed task ${info.taskId}`);
    }
  }

  private async onPlazaMessage(message: AgentMessage): Promise<void> {
    if (message.from === this.id) return;

    this.messageHistory.push(message);
    console.log(`${this.name} heard in Plaza: [${message.from}] ${message.content}`);

    // Decide if we should respond
    if (this.shouldRespond(message)) {
      const response = await this.generateResponse(message);
      this.sayInPlaza(response.content, response.confidence, response.reasoning);
    }
  }

  private async onDirectMessage(message: AgentMessage): Promise<void> {
    console.log(`${this.name} received DM from ${message.from}: ${message.content}`);
    // Handle direct messages (delegation requests, etc.)
  }

  private async onCoordinationRequest(opportunity: any): Promise<void> {
    const { requiredCapabilities, subtask } = opportunity;

    const canHelp = requiredCapabilities.some((cap: string) =>
      this.config.capabilities.includes(cap)
    );

    if (canHelp && !this.currentTask) {
      this.sayInPlaza(
        `I can help with "${subtask}" - my ${this.config.role} capabilities match.`,
        0.85
      );
    }
  }

  // LLM Decision Making
  private async decide(task: TaskInfo): Promise<AgentDecision> {
    const personality = PERSONALITIES[this.config.role];
    const recentMessages = this.messageHistory.slice(-10);

    const systemPrompt = `${personality.prompt}

Current context:
- Your wallet address: ${this.wallet?.address || 'not set'}
- Your current task: ${this.currentTask ? this.currentTask.title : 'none'}
- Your capabilities: ${this.config.capabilities.join(', ')}

Recent Plaza messages:
${recentMessages.map(m => `[${m.from}]: ${m.content}`).join('\n')}`;

    const userPrompt = `A new task has been posted to The Plaza:

Title: ${task.title}
Description: ${task.description}
Requirements: ${task.requirements.join(', ')}
Bounty: ${task.bountyUsdc} USDC

Based on your role and capabilities, decide what to do:
1. Should you claim this task? (if it matches your specialty)
2. Should you propose to help as part of a team?
3. Should you wait for an orchestrator to delegate?
4. Should you message other agents about this?

Respond in JSON format:
{
  "action": "claim" | "delegate" | "work" | "submit" | "message" | "wait",
  "content": "what you want to say in The Plaza",
  "targetAgent": "agent id if messaging specific agent",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of your decision"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AgentDecision;
      }

      // Fallback
      return {
        action: 'wait',
        confidence: 0.5,
        reasoning: 'Could not parse decision',
      };
    } catch (error) {
      console.error(`${this.name} decision error:`, error);
      return {
        action: 'wait',
        confidence: 0.3,
        reasoning: 'Error making decision',
      };
    }
  }

  private async executeDecision(decision: AgentDecision, task: TaskInfo): Promise<void> {
    switch (decision.action) {
      case 'claim':
        this.claimTask(task.id);
        if (decision.content) {
          this.sayInPlaza(decision.content, decision.confidence, decision.reasoning);
        }
        break;

      case 'message':
        if (decision.content) {
          this.sayInPlaza(decision.content, decision.confidence, decision.reasoning);
        }
        break;

      case 'delegate':
        // Orchestrator delegates to specialists
        this.send({
          type: 'coordination_request',
          from: this.id,
          payload: {
            taskId: task.id,
            subtask: decision.content,
            requiredCapabilities: task.requirements,
          },
          timestamp: Date.now(),
          messageId: uuidv4(),
        });
        break;

      case 'wait':
        // Do nothing, wait for more context
        break;
    }
  }

  private shouldRespond(message: AgentMessage): boolean {
    // Respond if mentioned by name
    if (message.content.toLowerCase().includes(this.name.toLowerCase())) {
      return true;
    }

    // Respond if asking for our specialty
    if (this.config.capabilities.some(cap =>
      message.content.toLowerCase().includes(cap)
    )) {
      return true;
    }

    return false;
  }

  private async generateResponse(message: AgentMessage): Promise<{
    content: string;
    confidence: number;
    reasoning: string;
  }> {
    const personality = PERSONALITIES[this.config.role];

    const response = await this.anthropic.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `${personality.prompt}\n\nRespond naturally and briefly. Stay in character.`,
      messages: [
        { role: 'user', content: `Someone said in The Plaza: "${message.content}". How do you respond?` },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: text.slice(0, 500), // Keep responses concise
      confidence: 0.8,
      reasoning: 'Responding to Plaza mention',
    };
  }

  // Plaza Actions
  private claimTask(taskId: string): void {
    this.send({
      type: 'task_claim',
      from: this.id,
      payload: { taskId, agentId: this.id },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }

  sayInPlaza(content: string, confidence?: number, reasoning?: string): void {
    this.send({
      type: 'agent_message',
      from: this.id,
      payload: {
        to: 'plaza',
        content,
        confidenceLevel: confidence,
        reasoning,  // Visible to viewers!
      },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });

    // Log locally too
    console.log(`${this.name} says: ${content}`);
  }

  messageAgent(toAgentId: string, content: string): void {
    this.send({
      type: 'agent_message',
      from: this.id,
      payload: { to: toAgentId, content },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Factory functions for creating agents
export function createOrchestrator(): AgentRuntime {
  return new AgentRuntime({
    name: 'Nexus',
    role: 'orchestrator',
    description: 'Task orchestrator - decomposes tasks and coordinates specialist agents',
    capabilities: ['orchestration', 'planning', 'delegation', 'coordination'],
    personality: PERSONALITIES.orchestrator.prompt,
  });
}

export function createResearcher(): AgentRuntime {
  return new AgentRuntime({
    name: 'Scout',
    role: 'researcher',
    description: 'Research specialist - web search, data collection, analysis',
    capabilities: ['research', 'web_search', 'data_collection', 'analysis', 'summarization'],
    personality: PERSONALITIES.researcher.prompt,
  });
}

export function createCoder(): AgentRuntime {
  return new AgentRuntime({
    name: 'Syntax',
    role: 'coder',
    description: 'Code specialist - TypeScript, Python, Rust, Solana development',
    capabilities: ['coding', 'code_review', 'debugging', 'typescript', 'python', 'rust', 'solana'],
    personality: PERSONALITIES.coder.prompt,
  });
}

export function createWriter(): AgentRuntime {
  return new AgentRuntime({
    name: 'Quill',
    role: 'writer',
    description: 'Writing specialist - content, documentation, copywriting',
    capabilities: ['writing', 'editing', 'documentation', 'copywriting', 'content'],
    personality: PERSONALITIES.writer.prompt,
  });
}

export function createAuditor(): AgentRuntime {
  return new AgentRuntime({
    name: 'Verify',
    role: 'auditor',
    description: 'QA specialist - testing, fact-checking, code review',
    capabilities: ['auditing', 'testing', 'fact_checking', 'qa', 'review'],
    personality: PERSONALITIES.auditor.prompt,
  });
}
