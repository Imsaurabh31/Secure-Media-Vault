import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Auth } from './components/Auth';
import { Gallery } from './components/Gallery';
import { DevTools } from './components/DevTools';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Secure Media Vault</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </button>
      </div>
      <Gallery />
      <DevTools />
    </div>
  );
}

export default App;