'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onOpenChange, title, children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(16, 32, 43, 0.55)',
            backdropFilter: 'blur(2px)',
          }}
          className="modal-overlay"
        />
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            width: 'min(480px, calc(100vw - 32px))',
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '24px 24px 20px',
            boxShadow: '0 20px 60px rgba(16,32,43,0.18), 0 4px 16px rgba(16,32,43,0.10)',
          }}
          className="modal-content"
          aria-describedby={undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <DialogPrimitive.Title style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)', margin: 0 }}>
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--trait)',
                background: 'transparent',
                color: 'var(--encre-douce)',
                cursor: 'pointer',
                flexShrink: 0,
                minHeight: 'unset',
              }}
              aria-label="Fermer"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          <div style={{ color: 'var(--encre-douce)', fontSize: 15, lineHeight: 1.65 }}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
