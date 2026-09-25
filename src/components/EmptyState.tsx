import React from 'react';
import { CalendarX, AlertCircle, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No Records Found',
  description = 'There are currently no active items or appointments to display here.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  compact = false
}) => {
  return (
    <div
      className="empty-state-card"
      style={{
        padding: compact ? '2rem 1.25rem' : '3.5rem 2rem',
        textAlign: 'center',
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px dashed var(--neutral-300)',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: '50%',
          background: 'var(--primary-navy-50)',
          color: 'var(--primary-navy-700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}
      >
        {icon || <CalendarX size={compact ? 24 : 32} />}
      </div>

      <h3
        style={{
          fontSize: compact ? '1.1rem' : '1.35rem',
          color: 'var(--primary-navy-900)',
          fontWeight: 700,
          marginBottom: '0.5rem'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--neutral-600)',
          maxWidth: 480,
          margin: '0 auto 1.5rem',
          lineHeight: 1.6
        }}
      >
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>{actionText}</span>
              <ArrowRight size={14} />
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button onClick={onSecondaryAction} className="btn btn-outline btn-sm">
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
