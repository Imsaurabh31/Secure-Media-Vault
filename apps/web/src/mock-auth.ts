// Mock authentication for demo
let currentUser: any = null;

export const mockAuth = {
  getSession: async () => ({
    data: {
      session: currentUser ? {
        access_token: 'demo-token',
        user: currentUser
      } : null
    }
  }),
  
  signInWithPassword: async ({ email, password }: any) => {
    if (email && password) {
      currentUser = { id: 'demo-user-123', email };
      return {
        data: {
          user: currentUser,
          session: { access_token: 'demo-token' }
        },
        error: null
      };
    }
    return { data: null, error: new Error('Invalid credentials') };
  },
  
  signUp: async ({ email, password }: any) => {
    if (email && password) {
      currentUser = { id: 'demo-user-123', email };
      return {
        data: {
          user: currentUser,
          session: { access_token: 'demo-token' }
        },
        error: null
      };
    }
    return { data: null, error: new Error('Invalid input') };
  },
  
  signOut: async () => {
    currentUser = null;
    return { error: null };
  },
  
  onAuthStateChange: (callback: any) => {
    // Don't auto-sign in, wait for user action
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
};