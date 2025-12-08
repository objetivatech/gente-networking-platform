import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface MemberSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  excludeSelf?: boolean;
}

export default function MemberSelect({
  value,
  onChange,
  placeholder = 'Selecione um membro',
  excludeSelf = true,
}: MemberSelectProps) {
  const { user } = useAuth();
  const { members, isLoading } = useMembers();

  const filteredMembers = excludeSelf
    ? members?.filter((m) => m.id !== user?.id)
    : members;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredMembers?.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{member.full_name}</span>
              {member.company && (
                <span className="text-muted-foreground text-xs">
                  ({member.company})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
