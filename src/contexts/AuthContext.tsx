import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// RD Station sync helper
async function syncUserToRDStation(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, phone, company, position, business_segment, rd_station_synced_at')
      .eq('id', userId)
      .single();

    if (!profile?.email || profile.rd_station_synced_at) return;

    await supabase.functions.invoke('rdstation', {
      body: {
        action: 'create_conversion',
        data: {
          conversion_identifier: 'cadastro-gente-networking',
          email: profile.email,
          name: profile.full_name,
          phone: profile.phone,
          company: profile.company,
          cf_cargo: profile.position,
          cf_empresa: profile.company,
          cf_segmento: profile.business_segment,
          tags: ['gente-networking', 'novo-membro'],
        },
      },
    });

    await supabase
      .from('profiles')
      .update({ rd_station_synced_at: new Date().toISOString() })
      .eq('id', userId);

    console.log('Usuário sincronizado com RD Station');
  } catch (error) {
    console.error('Erro ao sincronizar com RD Station:', error);
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string, company: string, businessSegment: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Sync new users to RD Station
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to not block the auth flow
          setTimeout(() => syncUserToRDStation(session.user.id), 1000);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, company: string, businessSegment: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          company: company,
          business_segment: businessSegment,
        },
      },
    });
    return { error: error as Error | null, data: data ? { user: data.user } : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}