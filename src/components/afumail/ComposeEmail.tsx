import React, { useState } from 'react';
import { X, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ComposeEmailData } from '@/hooks/useAfuMail';

interface ComposeEmailProps {
  initialTo?: string[];
  initialSubject?: string;
  initialBody?: string;
  replyTo?: { from: string; subject: string; body: string };
  forwardFrom?: { subject: string; body: string };
  onSend: (email: ComposeEmailData) => Promise<boolean>;
  onDiscard: () => void;
  sending?: boolean;
  senderEmail?: string;
}

export function ComposeEmail({
  initialTo = [],
  initialSubject = '',
  initialBody = '',
  replyTo,
  forwardFrom,
  onSend,
  onDiscard,
  sending,
  senderEmail,
}: ComposeEmailProps) {
  const [to, setTo] = useState<string[]>(initialTo);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` :
    forwardFrom ? `Fwd: ${forwardFrom.subject}` :
    initialSubject
  );
  const [body, setBody] = useState(
    forwardFrom ? `\n\n---------- Forwarded message ----------\n${forwardFrom.body}` :
    replyTo ? `\n\n> ${replyTo.body.split('\n').join('\n> ')}` :
    initialBody
  );
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  const addRecipient = (input: string, setInput: (v: string) => void, list: string[], setList: (v: string[]) => void) => {
    const email = input.trim();
    if (email && !list.includes(email)) {
      setList([...list, email]);
      setInput('');
    }
  };

  const removeRecipient = (email: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent, input: string, setInput: (v: string) => void, list: string[], setList: (v: string[]) => void) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(input, setInput, list, setList);
    }
  };

  const handleSend = async () => {
    if (to.length === 0) return;
    const success = await onSend({
      to, cc: cc.length > 0 ? cc : undefined, bcc: bcc.length > 0 ? bcc : undefined,
      subject, body_text: body,
    });
    if (success) onDiscard();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">
            {replyTo ? 'Reply' : forwardFrom ? 'Forward' : 'New Message'}
          </h2>
          {senderEmail && <p className="text-xs text-muted-foreground">From: {senderEmail}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={onDiscard}><X className="h-5 w-5" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-start gap-2">
          <label className="text-sm text-muted-foreground w-12 pt-2">To</label>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg min-h-[40px]">
              {to.map(email => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button onClick={() => removeRecipient(email, to, setTo)}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <Input
                type="text" value={toInput} onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, toInput, setToInput, to, setTo)}
                onBlur={() => addRecipient(toInput, setToInput, to, setTo)}
                placeholder="user@afuchat.com or external email"
                className="flex-1 min-w-[150px] border-0 p-0 h-6 focus-visible:ring-0"
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-muted-foreground">
            Cc/Bcc {showCcBcc ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        {showCcBcc && (
          <>
            <div className="flex items-start gap-2">
              <label className="text-sm text-muted-foreground w-12 pt-2">Cc</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg min-h-[40px]">
                  {cc.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">{email}<button onClick={() => removeRecipient(email, cc, setCc)}><X className="h-3 w-3" /></button></Badge>
                  ))}
                  <Input type="text" value={ccInput} onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, ccInput, setCcInput, cc, setCc)}
                    onBlur={() => addRecipient(ccInput, setCcInput, cc, setCc)}
                    placeholder="Add Cc" className="flex-1 min-w-[150px] border-0 p-0 h-6 focus-visible:ring-0" />
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <label className="text-sm text-muted-foreground w-12 pt-2">Bcc</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg min-h-[40px]">
                  {bcc.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">{email}<button onClick={() => removeRecipient(email, bcc, setBcc)}><X className="h-3 w-3" /></button></Badge>
                  ))}
                  <Input type="text" value={bccInput} onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, bccInput, setBccInput, bcc, setBcc)}
                    onBlur={() => addRecipient(bccInput, setBccInput, bcc, setBcc)}
                    placeholder="Add Bcc" className="flex-1 min-w-[150px] border-0 p-0 h-6 focus-visible:ring-0" />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground w-12">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1" />
        </div>

        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Compose email..." className="min-h-[300px] resize-none" />
      </div>

      <div className="border-t border-border p-4 flex items-center justify-end">
        <Button onClick={handleSend} disabled={to.length === 0 || sending}>
          <Send className="h-4 w-4 mr-2" />{sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
