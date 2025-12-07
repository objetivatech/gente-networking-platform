import { supabase } from '@/integrations/supabase/client';

interface ContactData {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  tags?: string[];
}

interface ConversionData {
  conversion_identifier: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  cf_cargo?: string;
  cf_empresa?: string;
}

export function useRDStation() {
  const syncContact = async (data: ContactData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('rdstation', {
        body: {
          action: 'create_contact',
          data: {
            email: data.email,
            name: data.name,
            phone: data.phone,
            company: data.company,
            tags: data.tags || ['gente-networking', 'membro'],
          },
        },
      });

      if (error) {
        console.error('Erro ao sincronizar com RD Station:', error);
        return { success: false, error };
      }

      console.log('Contato sincronizado com RD Station:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro ao sincronizar com RD Station:', error);
      return { success: false, error };
    }
  };

  const createConversion = async (data: ConversionData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('rdstation', {
        body: {
          action: 'create_conversion',
          data: {
            conversion_identifier: data.conversion_identifier,
            email: data.email,
            name: data.name,
            personal_phone: data.phone,
            company_name: data.company,
            tags: data.tags || ['gente-networking'],
            cf_cargo: data.cf_cargo,
            cf_empresa: data.cf_empresa,
          },
        },
      });

      if (error) {
        console.error('Erro ao criar conversão no RD Station:', error);
        return { success: false, error };
      }

      console.log('Conversão criada no RD Station:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro ao criar conversão no RD Station:', error);
      return { success: false, error };
    }
  };

  const addTags = async (email: string, tags: string[]) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('rdstation', {
        body: {
          action: 'add_tags',
          data: { email, tags },
        },
      });

      if (error) {
        console.error('Erro ao adicionar tags no RD Station:', error);
        return { success: false, error };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Erro ao adicionar tags no RD Station:', error);
      return { success: false, error };
    }
  };

  const syncNewMember = async (userId: string) => {
    try {
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Erro ao buscar perfil para sync:', profileError);
        return { success: false, error: profileError };
      }

      // Skip if no email
      if (!profile.email) {
        console.log('Perfil sem email, pulando sync com RD Station');
        return { success: false, error: 'No email' };
      }

      // Create conversion for new member signup
      const conversionResult = await createConversion({
        conversion_identifier: 'cadastro-gente-networking',
        email: profile.email,
        name: profile.full_name,
        phone: profile.phone || undefined,
        company: profile.company || undefined,
        cf_cargo: profile.position || undefined,
        cf_empresa: profile.company || undefined,
        tags: ['gente-networking', 'novo-membro'],
      });

      if (conversionResult.success) {
        // Update profile to mark as synced
        await supabase
          .from('profiles')
          .update({ rd_station_synced_at: new Date().toISOString() })
          .eq('id', userId);
      }

      return conversionResult;
    } catch (error) {
      console.error('Erro ao sincronizar novo membro com RD Station:', error);
      return { success: false, error };
    }
  };

  return {
    syncContact,
    createConversion,
    addTags,
    syncNewMember,
  };
}
