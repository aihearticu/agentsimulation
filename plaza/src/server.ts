/**
 * The Plaza - Real-time Agent Coordination Server
 * 
 * WebSocket server for agent discovery, task announcements, and inter-agent messaging.
 * Implements A2A-style Agent Cards for capability advertisement.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// === Types ===

interface AgentCard {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  specializations: string[];
  reputation: {
    tasksCompleted: number;
    successRate: number;
    avgRating: number;
  };
  wallet: string;
  status: 'available' | 'busy' | 'offline';
  registeredAt: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  bountyAmount: number;  // USDC (6 decimals)
  poster: string;        // wallet address
  taskHash: string;      // IPFS hash
  status: 'open' | 'claimed' | 'in_progress' | 'submitted' | 'completed';
  assignedAgent?: string;
  createdAt: number;
  deadline?: number;
}

interface PlazaMessage {
  type: 'register' | 'heartbeat' | 'task_announce' | 'task_claim' | 'agent_message' | 
        'work_update' | 'coordination_request' | 'subscribe' | 'unsubscribe';
  payload: any;
  from?: string;
  to?: string;
  timestamp: number;
  messageId: string;
}

interface ConnectedAgent {
  ws: WebSocket;
  card: AgentCard;
  subscriptions: Set<string>;  // task IDs or topic channels
  lastHeartbeat: number;
}

// === Plaza Server ===

class PlazaServer {
  private wss: WebSocketServer;
  private agents: Map<string, ConnectedAgent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private messageLog: PlazaMessage[] = [];
  
  constructor(port: number) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    server.listen(port, () => {
      console.log(`🏛️  The Plaza is open on port ${port}`);
    });
    
    // Cleanup stale connections every 30s
    setInterval(() => this.cleanupStaleAgents(), 30000);
  }
  
  private handleConnection(ws: WebSocket) {
    console.log('New connection to The Plaza');
    
    ws.on('message', (data) => {
      try {
        const message: PlazaMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      // Find and remove agent
      for (const [id, agent] of this.agents) {
        if (agent.ws === ws) {
          console.log(`Agent ${agent.card.name} left The Plaza`);
          this.agents.delete(id);
          this.broadcast({
            type: 'agent_offline',
            payload: { agentId: id },
            timestamp: Date.now(),
            messageId: uuidv4(),
          });
          break;
        }
      }
    });
  }
  
  private handleMessage(ws: WebSocket, message: PlazaMessage) {
    // Log all messages for transparency (core feature)
    this.messageLog.push(message);
    if (this.messageLog.length > 10000) {
      this.messageLog = this.messageLog.slice(-5000);
    }
    
    switch (message.type) {
      case 'register':
        this.handleRegister(ws, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'task_announce':
        this.handleTaskAnnounce(message);
        break;
      case 'task_claim':
        this.handleTaskClaim(ws, message);
        break;
      case 'agent_message':
        this.handleAgentMessage(message);
        break;
      case 'work_update':
        this.handleWorkUpdate(message);
        break;
      case 'coordination_request':
        this.handleCoordinationRequest(message);
        break;
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
      default:
        ws.send(JSON.stringify({ error: `Unknown message type: ${message.type}` }));
    }
  }
  
  private handleRegister(ws: WebSocket, message: PlazaMessage) {
    const card: AgentCard = message.payload;
    
    // Validate required fields
    if (!card.id || !card.name || !card.wallet) {
      ws.send(JSON.stringify({ error: 'Missing required agent card fields' }));
      return;
    }
    
    this.agents.set(card.id, {
      ws,
      card: { ...card, status: 'available', registeredAt: Date.now() },
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
    });
    
    console.log(`🤖 Agent registered: ${card.name} (${card.id})`);
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'registered',
      payload: { agentId: card.id },
      timestamp: Date.now(),
      messageId: uuidv4(),
    }));
    
    // Broadcast to others
    this.broadcast({
      type: 'agent_online',
      payload: { agent: card },
      timestamp: Date.now(),
      messageId: uuidv4(),
    }, card.id);
    
    // Send current open tasks
    const openTasks = Array.from(this.tasks.values()).filter(t => t.status === 'open');
    ws.send(JSON.stringify({
      type: 'open_tasks',
      payload: { tasks: openTasks },
      timestamp: Date.now(),
      messageId: uuidv4(),
    }));
  }
  
  private handleHeartbeat(message: PlazaMessage) {
    const agent = this.agents.get(message.from!);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.card.status = message.payload.status || 'available';
    }
  }
  
  private handleTaskAnnounce(message: PlazaMessage) {
    const task: Task = {
      ...message.payload,
      id: message.payload.id || uuidv4(),
      status: 'open',
      createdAt: Date.now(),
    };
    
    this.tasks.set(task.id, task);
    console.log(`📋 New task announced: ${task.title} (${task.bountyAmount / 1e6} USDC)`);
    
    // Broadcast to all available agents
    this.broadcast({
      type: 'new_task',
      payload: { task },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  private handleTaskClaim(ws: WebSocket, message: PlazaMessage) {
    const { taskId, agentId } = message.payload;
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);
    
    if (!task) {
      ws.send(JSON.stringify({ error: 'Task not found' }));
      return;
    }
    
    if (task.status !== 'open') {
      ws.send(JSON.stringify({ error: 'Task is no longer available' }));
      return;
    }
    
    if (!agent) {
      ws.send(JSON.stringify({ error: 'Agent not registered' }));
      return;
    }
    
    // Claim the task
    task.status = 'claimed';
    task.assignedAgent = agentId;
    agent.card.status = 'busy';
    
    console.log(`✅ Task claimed: ${task.title} by ${agent.card.name}`);
    
    // Notify all
    this.broadcast({
      type: 'task_claimed',
      payload: { taskId, agentId, agentName: agent.card.name },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  private handleAgentMessage(message: PlazaMessage) {
    const { to, content, confidenceLevel } = message.payload;
    
    // Public message to all (The Plaza's core feature - visible coordination)
    if (!to || to === 'plaza') {
      console.log(`💬 [${message.from}]: ${content}`);
      this.broadcast({
        type: 'plaza_message',
        payload: { 
          from: message.from, 
          content, 
          confidenceLevel,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        messageId: uuidv4(),
      });
      return;
    }
    
    // Direct message to specific agent
    const targetAgent = this.agents.get(to);
    if (targetAgent) {
      targetAgent.ws.send(JSON.stringify({
        type: 'direct_message',
        payload: { from: message.from, content, confidenceLevel },
        timestamp: Date.now(),
        messageId: uuidv4(),
      }));
    }
  }
  
  private handleWorkUpdate(message: PlazaMessage) {
    const { taskId, status, progress, workHash } = message.payload;
    const task = this.tasks.get(taskId);
    
    if (task) {
      task.status = status;
      
      // Broadcast progress (visible to viewers)
      this.broadcast({
        type: 'work_progress',
        payload: { 
          taskId, 
          agentId: message.from,
          status, 
          progress, 
          workHash,
        },
        timestamp: Date.now(),
        messageId: uuidv4(),
      });
    }
  }
  
  private handleCoordinationRequest(message: PlazaMessage) {
    const { taskId, requiredCapabilities, subtask } = message.payload;
    
    // Find available agents with required capabilities
    const candidates = Array.from(this.agents.values())
      .filter(a => a.card.status === 'available')
      .filter(a => requiredCapabilities.some((cap: string) => 
        a.card.capabilities.includes(cap) || a.card.specializations.includes(cap)
      ))
      .sort((a, b) => b.card.reputation.successRate - a.card.reputation.successRate);
    
    // Broadcast coordination request
    this.broadcast({
      type: 'coordination_opportunity',
      payload: {
        taskId,
        requestingAgent: message.from,
        subtask,
        requiredCapabilities,
        candidates: candidates.map(c => ({
          id: c.card.id,
          name: c.card.name,
          capabilities: c.card.capabilities,
          reputation: c.card.reputation,
        })),
      },
      timestamp: Date.now(),
      messageId: uuidv4(),
    });
  }
  
  private handleSubscribe(ws: WebSocket, message: PlazaMessage) {
    const { agentId, topics } = message.payload;
    const agent = this.agents.get(agentId);
    
    if (agent) {
      topics.forEach((topic: string) => agent.subscriptions.add(topic));
      ws.send(JSON.stringify({
        type: 'subscribed',
        payload: { topics },
        timestamp: Date.now(),
        messageId: uuidv4(),
      }));
    }
  }
  
  private broadcast(message: any, excludeAgentId?: string) {
    const data = JSON.stringify(message);
    for (const [id, agent] of this.agents) {
      if (id !== excludeAgentId && agent.ws.readyState === WebSocket.OPEN) {
        agent.ws.send(data);
      }
    }
  }
  
  private cleanupStaleAgents() {
    const now = Date.now();
    const timeout = 60000; // 1 minute
    
    for (const [id, agent] of this.agents) {
      if (now - agent.lastHeartbeat > timeout) {
        console.log(`⚠️  Agent ${agent.card.name} timed out`);
        agent.ws.close();
        this.agents.delete(id);
      }
    }
  }
  
  // === Public API for external queries ===
  
  getAgents(): AgentCard[] {
    return Array.from(this.agents.values()).map(a => a.card);
  }
  
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
  
  getMessageLog(limit = 100): PlazaMessage[] {
    return this.messageLog.slice(-limit);
  }
}

// === REST API for viewers/frontends ===

function createRestApi(plaza: PlazaServer, port: number) {
  const http = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/agents') {
      res.end(JSON.stringify(plaza.getAgents()));
    } else if (req.url === '/tasks') {
      res.end(JSON.stringify(plaza.getTasks()));
    } else if (req.url === '/messages') {
      res.end(JSON.stringify(plaza.getMessageLog()));
    } else if (req.url === '/.well-known/agent.json') {
      // A2A Agent Card for The Plaza itself
      res.end(JSON.stringify({
        name: 'The Plaza',
        description: 'AgentSimulation task marketplace coordination server',
        url: `http://localhost:${port}`,
        capabilities: ['task_discovery', 'agent_coordination', 'reputation_tracking'],
        protocol: 'websocket',
      }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  http.listen(port + 1, () => {
    console.log(`📡 Plaza REST API on port ${port + 1}`);
  });
}

// === Main ===

const WS_PORT = parseInt(process.env.PLAZA_PORT || '8080');
const plaza = new PlazaServer(WS_PORT);
createRestApi(plaza, WS_PORT);

export { PlazaServer, AgentCard, Task, PlazaMessage };
