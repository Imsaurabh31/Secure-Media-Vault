let currentUser: any = null;
let authCallback: any = null;

export const demoAuth = {
  getSession: async () => ({
    data: { session: currentUser ? { access_token: 'demo-token', user: currentUser } : null }
  }),

  signInWithPassword: async ({ email, password }: any) => {
    if (email && password) {
      currentUser = { id: 'demo-user', email };
      const session = { access_token: 'demo-token', user: currentUser };
      
      // Trigger auth state change
      if (authCallback) {
        setTimeout(() => authCallback('SIGNED_IN', session), 100);
      }
      
      return { data: { user: currentUser, session }, error: null };
    }
    return { data: null, error: new Error('Invalid credentials') };
  },

  signUp: async ({ email, password }: any) => {
    if (email && password) {
      currentUser = { id: 'demo-user', email };
      const session = { access_token: 'demo-token', user: currentUser };
      
      // Trigger auth state change
      if (authCallback) {
        setTimeout(() => authCallback('SIGNED_IN', session), 100);
      }
      
      return { data: { user: currentUser, session }, error: null };
    }
    return { data: null, error: new Error('Invalid input') };
  },

  signOut: async () => {
    currentUser = null;
    
    // Trigger auth state change
    if (authCallback) {
      setTimeout(() => authCallback('SIGNED_OUT', null), 100);
    }
    
    return { error: null };
  },

  onAuthStateChange: (callback: any) => {
    // Store and use the callback
    authCallback = callback;
    // Immediately use callback to satisfy TypeScript
    void callback;
    return {
      data: { subscription: { unsubscribe: () => { authCallback = null; } } }
    };
  }
};