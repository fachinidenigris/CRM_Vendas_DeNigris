let baseApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://crm-vendas-denigris.onrender.com/api/v1';
if (baseApiUrl && !baseApiUrl.endsWith('/api/v1')) {
  baseApiUrl = baseApiUrl.endsWith('/') ? `${baseApiUrl}api/v1` : `${baseApiUrl}/api/v1`;
}
const API_URL = baseApiUrl;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'gestor' | 'vendedor';
  team_id: string | null;
  is_paused: boolean;
}

export interface Team {
  id: string;
  name: string;
  manager_id: string | null;
}

export interface SystemLog {
  id: string;
  log_type: string;
  source: string;
  message: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  product_interest: string | null;
  city_region: string | null;
  source: string;
  status: string;
  urgency_level: string | null;
  ai_summary: string | null;
  last_contact_at: string | null;
  last_interaction_at?: string | null;
  created_at: string;
  updated_at?: string;
  
  // Categorias
  category?: string;
  subcategory?: string;
  client_type?: string;
  tags?: string;
  
  // Primeiro Contato
  visualized_at?: string;
  vehicle_type?: string;
  application?: string;
  segment?: string;
  quantity?: number;
  financial_need?: string;
  purchase_timeline?: string;
  urgency?: string;
  quick_contact_status?: string;
  
  // Qualificação
  value_range?: string;
  down_payment?: string;
  finance_amount?: string;
  trade_in_used?: string;
  next_action_title?: string;
  
  // Negociação
  negotiated_value?: string;
  finance_institution?: string;
  close_probability?: string;
  billing_forecast?: string;
  
  // Perda
  loss_reason?: string;
  assigned_to_id?: string | null;
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  task_type: string;
}

export const api = {
  // --- USERS & TEAMS ---
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/users`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Falha ao criar profissional');
      }
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getTeams: async (): Promise<Team[]> => {
    try {
      const res = await fetch(`${API_URL}/teams`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar equipes');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  createTeam: async (name: string, managerId?: string | null): Promise<Team | null> => {
    try {
      const res = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, manager_id: managerId })
      });
      if (!res.ok) throw new Error('Falha ao criar equipe');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  updateUserTeam: async (userId: string, teamId: string | null): Promise<User | null> => {
    try {
      const url = new URL(`${API_URL}/users/${userId}`);
      if (teamId) url.searchParams.append('team_id', teamId);
      
      const res = await fetch(url.toString(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Falha ao associar usuário à equipe');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  updateUser: async (userId: string, userUpdate: Partial<Omit<User, 'id'>>): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userUpdate)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Falha ao atualizar profissional');
      }
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir profissional');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateTeam: async (teamId: string, name: string, managerId?: string | null): Promise<Team | null> => {
    try {
      const res = await fetch(`${API_URL}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, manager_id: managerId })
      });
      if (!res.ok) throw new Error('Falha ao atualizar equipe');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  deleteTeam: async (teamId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/teams/${teamId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir equipe');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // --- SYSTEM LOGS ---
  getSystemLogs: async (): Promise<SystemLog[]> => {
    try {
      const res = await fetch(`${API_URL}/system-logs`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar logs do sistema');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  getLeads: async (): Promise<Lead[]> => {
    try {
      const res = await fetch(`${API_URL}/leads`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar leads');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  createLead: async (lead: Omit<Lead, 'id' | 'created_at' | 'last_contact_at'>): Promise<Lead | null> => {
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, source: lead.source || 'Manual' })
      });
      if (!res.ok) throw new Error('Falha ao criar lead manualmente');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  
  updateLeadStatus: async (leadId: string, status: string): Promise<Lead | null> => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Falha ao atualizar lead');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  updateLead: async (leadId: string, leadUpdate: Partial<Lead>): Promise<Lead | null> => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadUpdate)
      });
      if (!res.ok) throw new Error('Falha ao atualizar lead');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getTasks: async (): Promise<Task[]> => {
    try {
      const res = await fetch(`${API_URL}/tasks`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar tarefas');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  createTask: async (task: Omit<Task, 'id' | 'is_completed'>): Promise<Task | null> => {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error('Falha ao criar tarefa');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  completeTask: async (taskId: string, isCompleted: boolean): Promise<Task | null> => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted })
      });
      if (!res.ok) throw new Error('Falha ao atualizar status da tarefa');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getActivities: async (leadId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}/activities`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar timeline');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  addActivity: async (leadId: string, activityType: string, content: string): Promise<any | null> => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, activity_type: activityType, content })
      });
      if (!res.ok) throw new Error('Falha ao adicionar nota');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },

  setCurrentUser: (user: User | null): void => {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }
};
