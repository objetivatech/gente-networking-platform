/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: string;
  onExpire?: () => void;
  primaryColor?: string;
}

export function CountdownTimer({ targetDate, onExpire, primaryColor = 'hsl(var(--secondary))' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        onExpire?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (isExpired) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl font-bold text-primary-foreground">O evento está acontecendo!</p>
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div 
        className="w-20 h-20 md:w-24 md:h-24 rounded-lg flex items-center justify-center shadow-lg"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="text-3xl md:text-4xl font-bold text-primary-foreground">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="mt-2 text-sm md:text-base text-primary-foreground/80 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex justify-center gap-4 md:gap-6">
      <TimeBlock value={timeLeft.days} label="Dias" />
      <TimeBlock value={timeLeft.hours} label="Horas" />
      <TimeBlock value={timeLeft.minutes} label="Min" />
      <TimeBlock value={timeLeft.seconds} label="Seg" />
    </div>
  );
}
