/**
 * @component PasswordStrengthIndicator
 * @description Componente visual que exibe a força da senha em tempo real
 * 
 * @usage
 * ```tsx
 * <PasswordStrengthIndicator password={password} />
 * ```
 * 
 * @props
 * - password: string - A senha a ser avaliada
 * 
 * @returns JSX com barra de progresso colorida e texto indicando força:
 * - Fraca (vermelho): menos de 6 caracteres
 * - Média (amarelo): 6+ caracteres com letras e números
 * - Forte (verde): 8+ caracteres com letras, números e caracteres especiais
 * 
 * @route Utilizado em /auth (formulário de cadastro)
 * @since 2024-12-08
 */

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = 'weak' | 'medium' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
}

/**
 * Calcula a força da senha baseado em múltiplos critérios
 * @param password - Senha a ser avaliada
 * @returns Objeto com nível, pontuação, label e cor
 */
const calculateStrength = (password: string): StrengthResult => {
  let score = 0;
  
  // Critérios de avaliação
  if (password.length >= 6) score += 20;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;
  
  if (score < 40) {
    return { level: 'weak', score: Math.min(score, 33), label: 'Fraca', color: 'bg-destructive' };
  } else if (score < 70) {
    return { level: 'medium', score: Math.min(score, 66), label: 'Média', color: 'bg-yellow-500' };
  } else {
    return { level: 'strong', score: Math.min(score, 100), label: 'Forte', color: 'bg-green-500' };
  }
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);
  
  if (!password) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Força da senha:</span>
        <span className={`font-medium ${
          strength.level === 'weak' ? 'text-destructive' :
          strength.level === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
          'text-green-600 dark:text-green-400'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {strength.level === 'weak' && 'Use pelo menos 6 caracteres com letras e números'}
        {strength.level === 'medium' && 'Adicione caracteres especiais para maior segurança'}
        {strength.level === 'strong' && 'Excelente! Senha segura'}
      </p>
    </div>
  );
}
