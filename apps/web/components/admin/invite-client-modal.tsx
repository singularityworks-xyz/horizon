'use client';

import { useState } from 'react';
import { X, RefreshCw, Link2, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part1 = 'pse';
  const part2 = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  const part3 = Array.from({ length: 3 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return `${part1}-${part2}-${part3}`;
}

export function InviteClientModal({ isOpen, onClose, onSuccess }: InviteClientModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
  };

  const handleGenerateLink = async () => {
    if (!companyName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      const loginUrl = `${window.location.origin}/auth/login`;
      setGeneratedLink(loginUrl);
      toast.success('Client created successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create client';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDetails = async () => {
    const details = `Client Credentials
------------------
Company: ${companyName}
Email: ${email}
Password: ${password}
Login URL: ${generatedLink}`;

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      toast.success('Details copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    // Reset form state
    setCompanyName('');
    setEmail('');
    setPassword('');
    setGeneratedLink(null);
    setCopied(false);
    setError('');
    onClose();
    if (generatedLink) {
      onSuccess?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Invite New Client</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Company Name */}
          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium text-foreground">
              Company/Organization Name
            </label>
            <input
              id="companyName"
              type="text"
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!!generatedLink}
              className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!generatedLink}
              className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                type="text"
                placeholder="pse-xxxx-xxx"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!generatedLink}
                className="flex-1 px-4 py-3 bg-background border border-input rounded-xl text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={!!generatedLink}
                className="px-4 py-3 bg-muted hover:bg-muted/80 border border-input rounded-xl text-foreground transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Generate Password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the refresh icon to generate a random password
            </p>
          </div>

          {/* Generated Link Display */}
          {generatedLink && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                ✓ Client created successfully!
              </p>
              <p className="text-xs text-muted-foreground break-all font-mono">{generatedLink}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>

          {!generatedLink ? (
            <button
              onClick={handleGenerateLink}
              disabled={isLoading || !companyName.trim() || !email.trim() || !password.trim()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Generate Link
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCopyDetails}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Details
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
