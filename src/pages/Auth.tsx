/**
 * Public platform entry — login only; invitation activation remains separate.
 * @author Diogo Devitte
 * @copyright © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformEntry } from '@/modules/lps/components/PlatformEntry';
export default function Auth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);
  return <PlatformEntry />;
}
