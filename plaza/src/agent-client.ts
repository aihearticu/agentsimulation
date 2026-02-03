/**
 * Agent Client - Base class for agents connecting to The Plaza
 * 
 * Extend this class to create specialized agents (Scout, Syntax, Quill, etc.)
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  specializations: string[];
  wallet: string;
  plazaUrl?: string;
}

interface TaskInfo {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  bountyAmount: number;
  poster: string;
  taskHash: string;
  status: string;
}

abstract class AgentClient {
  protected ws: WebSocket | null = null;
  protected agentId: string;
  protected config: AgentConfig;
  protected isConnected = false;
  protected currentTask: TaskInfo | null = null;
  protected heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(config: AgentConfig) {
    this.agentId = uuidv4();
    this.config = config;
  }
  
  // === Connection ===
  
  async connect(): Promise<void> {
    const url = this.config.plazaUrl || 'ws://localhost:8080';
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        console.log(`🔗 ${this.config.name} connected to The Plaza`);
        this.register();
        this.startHeartbeat();
        this.isConnected = true;
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });
      
      this.ws.on('close', () => {
        console.log(`❌ ${this.config.name} disconnected from The Plaza`);
        this.isConnected = false;
        this.stopHeartbeat();
      });
      
      this.ws.on('error', (err) => {
        console.error(`Error: ${err.message}`);
        reject(err);
      });
    });
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  // === Core Protocol ===
  
  private register(): void {
    this.send({
      type: 'register',
      payload: {
        id: this.agentId,
        name: this.config.name,
        description: this.config.description,
        capabilities: this.config.capabilities,
        specializations: this.config.specializations,
        wallet: this.config.wallet,
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
        from: this.agentId,
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
  
  protected send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  // === Message Handling ===
  
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'registered':
        console.log(`✅ ${this.config.name} registered with ID: ${message.payload.agentId}`);
        break;
        
      case 'new_task':
        this.onNewTask(message.payload.task);
        break;
        
      case 'open_tasks':
        message.payload.tasks.forEach((task: TaskInfo) => this.onNewTask(task));
        break;
        
      case 'task_claimed':
        this.onTaskClaimed(message.payload);
        break;
        
      case 'plaza_message':
        this.onPlazaMessage(message.payload);
        break;
        
      case 'direct_message':
        this.onDirectMessage(message.payload);
        break;
        
      case 'coordination_opportunity':
        this.onCoordinationOpportunity(message.payload);
        break;
        
      case 'work_progress':
        this.onWorkProgress(message.payload);
        break;
        
      default:
        // Override in subclass if needed
        break;
    }
  }
  
  // === Actions ===
  
  protected claimTask(taskId: string): void {
    this.send({
      type: 'task_claim',
      from: this.agentId,
      payload: { taskId, agentId: this.agentId },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  protected sayInPlaza(content: string, confidenceLevel?: number): void {
    this.send({
      type: 'agent_message',
      from: this.agentId,
      payload: { to: 'plaza', content, confidenceLevel },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  protected messageAgent(toAgentId: string, content: string): void {
    this.send({
      type: 'agent_message',
      from: this.agentId,
      payload: { to: toAgentId, content },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  protected updateProgress(taskId: string, status: string, progress: number, workHash?: string): void {
    this.send({
      type: 'work_update',
      from: this.agentId,
      payload: { taskId, status, progress, workHash },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  protected requestCoordination(taskId: string, subtask: string, requiredCapabilities: string[]): void {
    this.send({
      type: 'coordination_request',
      from: this.agentId,
      payload: { taskId, subtask, requiredCapabilities },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  // === Abstract methods - implement in subclasses ===
  
  /**
   * Called when a new task is announced.
   * Decide whether to claim it based on capabilities.
   */
  protected abstract onNewTask(task: TaskInfo): void;
  
  /**
   * Called when a task is claimed by any agent.
   */
  protected abstract onTaskClaimed(info: { taskId: string; agentId: string; agentName: string }): void;
  
  /**
   * Called for public messages in The Plaza.
   */
  protected abstract onPlazaMessage(message: { from: string; content: string; confidenceLevel?: number }): void;
  
  /**
   * Called for direct messages to this agent.
   */
  protected abstract onDirectMessage(message: { from: string; content: string }): void;
  
  /**
   * Called when another agent requests coordination help.
   */
  protected abstract onCoordinationOpportunity(opportunity: any): void;
  
  /**
   * Called when work progress is updated on any task.
   */
  protected abstract onWorkProgress(progress: any): void;
}

// === Example: Scout Agent (Research Specialist) ===

class ScoutAgent extends AgentClient {
  constructor(wallet: string) {
    super({
      name: 'Scout',
      description: 'Research and information gathering specialist. Excels at web research, data collection, and competitive analysis.',
      capabilities: ['research', 'web_search', 'data_collection', 'summarization'],
      specializations: ['market_research', 'competitive_analysis', 'fact_checking'],
      wallet,
    });
  }
  
  protected onNewTask(task: TaskInfo): void {
    console.log(`📋 [Scout] New task: ${task.title}`);
    
    // Check if task matches capabilities
    const isResearchTask = task.requirements.some(req => 
      ['research', 'analysis', 'data', 'search', 'find'].some(keyword => 
        req.toLowerCase().includes(keyword)
      )
    );
    
    if (isResearchTask && !this.currentTask) {
      console.log(`🔍 [Scout] This looks like a research task. Considering claiming...`);
      this.sayInPlaza(`I see task "${task.title}" - this matches my research capabilities. Anyone else interested?`, 0.8);
      
      // In a real implementation, add decision logic here
      // For demo, auto-claim research tasks
      setTimeout(() => {
        if (!this.currentTask) {
          this.claimTask(task.id);
          this.currentTask = task;
        }
      }, 2000);
    }
  }
  
  protected onTaskClaimed(info: { taskId: string; agentId: string; agentName: string }): void {
    if (info.agentId === this.agentId) {
      console.log(`✅ [Scout] I claimed task ${info.taskId}. Starting research...`);
      this.sayInPlaza(`I've claimed this task. Beginning research phase...`, 0.9);
    } else {
      console.log(`ℹ️  [Scout] Task ${info.taskId} claimed by ${info.agentName}`);
    }
  }
  
  protected onPlazaMessage(message: { from: string; content: string; confidenceLevel?: number }): void {
    if (message.from !== this.agentId) {
      console.log(`💬 [Plaza] ${message.from}: ${message.content}`);
    }
  }
  
  protected onDirectMessage(message: { from: string; content: string }): void {
    console.log(`📩 [Scout] DM from ${message.from}: ${message.content}`);
  }
  
  protected onCoordinationOpportunity(opportunity: any): void {
    const { requiredCapabilities, subtask } = opportunity;
    
    const canHelp = requiredCapabilities.some((cap: string) => 
      this.config.capabilities.includes(cap)
    );
    
    if (canHelp && !this.currentTask) {
      console.log(`🤝 [Scout] I can help with: ${subtask}`);
      this.sayInPlaza(`I can assist with "${subtask}" - my research capabilities match.`, 0.85);
    }
  }
  
  protected onWorkProgress(progress: any): void {
    console.log(`📊 [Scout] Progress update: Task ${progress.taskId} - ${progress.status} (${progress.progress}%)`);
  }
}

// === Example: Syntax Agent (Code Specialist) ===

class SyntaxAgent extends AgentClient {
  constructor(wallet: string) {
    super({
      name: 'Syntax',
      description: 'Code generation and software development specialist. Expert in multiple languages and frameworks.',
      capabilities: ['coding', 'code_review', 'debugging', 'refactoring'],
      specializations: ['typescript', 'python', 'rust', 'solana', 'smart_contracts'],
      wallet,
    });
  }
  
  protected onNewTask(task: TaskInfo): void {
    console.log(`📋 [Syntax] New task: ${task.title}`);
    
    const isCodingTask = task.requirements.some(req => 
      ['code', 'develop', 'build', 'implement', 'program', 'smart contract'].some(keyword => 
        req.toLowerCase().includes(keyword)
      )
    );
    
    if (isCodingTask && !this.currentTask) {
      console.log(`💻 [Syntax] This looks like a coding task. Analyzing requirements...`);
      this.sayInPlaza(`Task "${task.title}" requires development work. I'm available to take this on.`, 0.85);
    }
  }
  
  protected onTaskClaimed(info: { taskId: string; agentId: string; agentName: string }): void {
    if (info.agentId === this.agentId) {
      console.log(`✅ [Syntax] I claimed task ${info.taskId}. Initializing development environment...`);
    }
  }
  
  protected onPlazaMessage(message: { from: string; content: string }): void {
    if (message.from !== this.agentId) {
      console.log(`💬 [Plaza] ${message.from}: ${message.content}`);
    }
  }
  
  protected onDirectMessage(message: { from: string; content: string }): void {
    console.log(`📩 [Syntax] DM from ${message.from}: ${message.content}`);
  }
  
  protected onCoordinationOpportunity(opportunity: any): void {
    const { requiredCapabilities, subtask } = opportunity;
    
    const canHelp = requiredCapabilities.some((cap: string) => 
      this.config.capabilities.includes(cap) || this.config.specializations.includes(cap)
    );
    
    if (canHelp && !this.currentTask) {
      console.log(`🤝 [Syntax] I can code that: ${subtask}`);
      this.messageAgent(opportunity.requestingAgent, `I can handle the coding for "${subtask}". Want to coordinate?`);
    }
  }
  
  protected onWorkProgress(progress: any): void {
    // Monitor others' progress
  }
}

export { AgentClient, AgentConfig, TaskInfo, ScoutAgent, SyntaxAgent };
